import asyncio
import json
import time
from ulid import ULID
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.pipelines.query_pipeline import query
from app.llm.ollama_client import generate_stream
from app.crud.chat import save_message, update_message_content, update_session_last_active
from app.models.enums import ChatRole
from app.models.user import User
from app.db.rdb import AsyncSessionLocal
from app.config import get_settings
from loguru import logger

settings = get_settings()

_PLACEHOLDER = "⚠️ 답변을 받지 못했습니다. (생성 중 연결이 끊겼거나 오류가 발생했습니다)"


async def _finalize_answer(
    ai_message_id: str,
    session_id: str,
    content: str,
    sources: list,
    latency_ms: int,
) -> None:
    """스트리밍 완료 또는 중단 후 독립 세션으로 AI 메시지를 업데이트"""
    final_content = content.strip() or _PLACEHOLDER
    try:
        async with AsyncSessionLocal() as save_db:
            await update_message_content(
                db=save_db,
                message_id=ai_message_id,
                content_ko=final_content,
                retrieved_chunk_ids=sources,
                latency_ms=latency_ms,
            )
            await update_session_last_active(save_db, session_id)
    except Exception as e:
        logger.error(f"[AI 메시지 업데이트 실패] message_id={ai_message_id}: {e}")


async def stream_answer(question: str, user_id: str, session_id: str, db: AsyncSession, selected_document_ids: list[str] = []):
    # 1. 질문 저장
    await save_message(
        db=db,
        message_id=str(ULID()),
        session_id=session_id,
        role=ChatRole.USER,
        content_ko=question,
    )
    await db.execute(update(User).where(User.id == user_id).values(ask_count=User.ask_count + 1))

    # 2. AI 메시지를 플레이스홀더로 먼저 저장
    #    → 이후 연결이 끊겨도 DB에 흔적이 남음
    ai_message_id = str(ULID())
    await save_message(
        db=db,
        message_id=ai_message_id,
        session_id=session_id,
        role=ChatRole.ASSISTANT,
        content_ko=_PLACEHOLDER,
    )
    await db.commit()

    # 3. RAG 파이프라인 실행
    result = await query(question, user_id, selected_document_ids)

    full_answer = ""
    start = time.time()

    try:
        async for token in generate_stream(result["prompt"]):
            full_answer += token
            yield f"data: {json.dumps(token, ensure_ascii=False)}\n\n"

        # 4a. 정상 완료 — 플레이스홀더를 실제 답변으로 업데이트
        latency_ms = int((time.time() - start) * 1000)
        await _finalize_answer(ai_message_id, session_id, full_answer, result["sources"], latency_ms)

        logger.info(f"[답변 완료] session={session_id}, 길이={len(full_answer)}자, {latency_ms}ms")
        yield f"data: [SOURCES]{json.dumps(result['sources'], ensure_ascii=False)}\n\n"
        yield "data: [DONE]\n\n"

    except (GeneratorExit, asyncio.CancelledError) as e:
        # 4b. 클라이언트 연결 끊김 — 부분 답변으로 백그라운드 업데이트
        latency_ms = int((time.time() - start) * 1000)
        asyncio.create_task(
            _finalize_answer(ai_message_id, session_id, full_answer, result.get("sources", []), latency_ms)
        )
        logger.warning(f"[스트리밍 중단] session={session_id}, 부분 길이={len(full_answer)}자")
        raise

    except Exception as e:
        # 4c. 서버 오류 — 플레이스홀더가 이미 DB에 있으므로 에러 신호만 전송
        logger.error(f"[스트리밍 오류] session={session_id}: {e}")
        latency_ms = int((time.time() - start) * 1000)
        asyncio.create_task(
            _finalize_answer(ai_message_id, session_id, full_answer, result.get("sources", []), latency_ms)
        )
        try:
            error_text = full_answer.strip() or _PLACEHOLDER
            yield f"data: [ERROR]{json.dumps(error_text, ensure_ascii=False)}\n\n"
        except Exception:
            pass
