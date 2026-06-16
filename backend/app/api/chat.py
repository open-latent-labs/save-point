from ulid import ULID
from fastapi import APIRouter, Depends 
from fastapi.responses import StreamingResponse # SSE(Server-Sent Events)나 청크 단위 응답을 스트리밍으로 보낼 때 사용하는 응답 클래스
from sqlalchemy.ext.asyncio import AsyncSession # DB 쿼리를 await으로 실행할 수 있게 해줌

from app.dependencies import get_db
from app.services.chat_service import stream_answer
from app.crud.chat import create_session, get_sessions, delete_session, get_messages, rename_session
from app.schemas.chat import ChatRequest, SessionCreateRequest, SessionRenameRequest

router = APIRouter(prefix="/v1")

# 채팅방 생성
@router.post("/sessions")
async def create_chat_session(req: SessionCreateRequest, db: AsyncSession = Depends(get_db)):
    session_id = str(ULID())
    session = await create_session(db, session_id, req.user_id, req.session_name)
    return {"session_id": session.id, "session_name": session.session_name, "created_at": session.created_at}

# 채팅방 목록 불러오기
@router.get("/users/{user_id}/sessions")
async def get_chat_sessions(user_id: str, db: AsyncSession = Depends(get_db)):
    sessions = await get_sessions(db, user_id)
    return [{"session_id": s.id, "session_name": s.session_name, "last_active_at": s.last_active_at} for s in sessions]

# 채팅방 이름 바꾸기
@router.patch("/sessions/{session_id}")
async def rename_chat_session(session_id: str, req: SessionRenameRequest, db: AsyncSession = Depends(get_db)):
    await rename_session(db, session_id, req.session_name)
    return {"ok": True}

# 채팅방 삭제
@router.delete("/sessions/{session_id}")
async def delete_chat_session(session_id: str, db: AsyncSession = Depends(get_db)):
    await delete_session(db, session_id)
    return {"ok": True}

# 채팅 내역 불러오기
@router.get("/sessions/{session_id}/messages")
async def get_chat_messages(session_id: str, db: AsyncSession = Depends(get_db)):
    messages = await get_messages(db, session_id)
    return [
        {
            "id": m.id,
            "role": m.role,
            "content_ko": m.content_ko,
            "created_at": m.created_at,
            "retrieved_chunk_ids": m.retrieved_chunk_ids,  # 출처 포함
        }
        for m in messages
    ]

# 채팅 보내기
@router.post("/chat")
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    return StreamingResponse(
        stream_answer(req.question, req.user_id, req.session_id, db),
        media_type="text/event-stream" # SSE 형식임을 클라이언트에 알려주는 MIME 타입
    )