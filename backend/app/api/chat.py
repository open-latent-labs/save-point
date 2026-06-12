from ulid import ULID
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.services.chat_service import stream_answer
from app.crud.chat import create_session, get_sessions, delete_session, get_messages
from app.schemas.chat import ChatRequest, SessionCreateRequest

router = APIRouter(prefix="/api/v1")

# ── 세션 ──

@router.post("/sessions")
async def create_chat_session(req: SessionCreateRequest, db: AsyncSession = Depends(get_db)):
    session_id = str(ULID())
    session = await create_session(db, session_id, req.user_id, req.session_name)
    return {"session_id": session.id, "session_name": session.session_name, "created_at": session.created_at}

@router.get("/users/{user_id}/sessions")
async def get_chat_sessions(user_id: str, db: AsyncSession = Depends(get_db)):
    sessions = await get_sessions(db, user_id)
    return [{"session_id": s.id, "session_name": s.session_name, "last_active_at": s.last_active_at} for s in sessions]

@router.delete("/sessions/{session_id}")
async def delete_chat_session(session_id: str, db: AsyncSession = Depends(get_db)):
    await delete_session(db, session_id)
    return {"ok": True}

# ── 메시지 ──

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

# ── 채팅 ──

@router.post("/chat")
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    return StreamingResponse(
        stream_answer(req.question, req.user_id, req.session_id, db),
        media_type="text/event-stream"
    )