import json
import time
from ulid import ULID
from sqlalchemy.ext.asyncio import AsyncSession
from app.pipelines.query_pipeline import query
from app.llm.ollama_client import generate_stream
from app.crud.chat import save_message, update_session_last_active
from app.models.enums import ChatRole

async def stream_answer(question: str, user_id: str, session_id: str, db: AsyncSession):
    # 질문 저장
    await save_message(
        db=db,
        message_id=str(ULID()),
        session_id=session_id,
        role=ChatRole.USER,
        content_ko=question,
    )

    # 질문, id -> query_pipeline -> [프롬프트, 출처] 받기
    result = await query(question, user_id)

    # query에서 관련 문서를 찾지 못해 prompt가 None으로 넘어온 경우
    # 다음 채팅 띄우고 종료
    if not result["prompt"]:
        yield "data: 질문에 관한 관련 문서를 찾을 수 없습니다. 다시 질문해주세요.\n\n"
        yield "data: [DONE]\n\n"
        return

    # llm에 파이프라인을 통해 받은 프롬프트, 출처를 전달 -> 답변을 SSE로 실시간 스트리밍 받아 넘김
    full_answer = ""
    start = time.time()
    async for token in generate_stream(result["prompt"]):
        full_answer += token
        yield f"data: {token}\n\n"

    # 답변 저장
    latency_ms = int((time.time() - start) * 1000)
    await save_message(
        db=db,
        message_id=str(ULID()),
        session_id=session_id,
        role=ChatRole.ASSISTANT,
        content_ko=full_answer,
        retrieved_chunk_ids=result["sources"],  # sources 전체 저장
        model_name="bge-m3",
        latency_ms=latency_ms,
    )

    print(f"\n[답변 전달 완료]")
    print(f"  질문: {question}")
    print(f"  답변 길이: {len(full_answer)}자")
    print(f"  소요 시간: {latency_ms / 1000:.2f}초")
    print(f"  출처: {[r['filename'] for r in result['sources']]}")
    print()

    # 토큰 전부 전달하면 출처 전달하고 종료
    yield f"data: [SOURCES]{json.dumps(result['sources'], ensure_ascii=False)}\n\n"
    yield "data: [DONE]\n\n"