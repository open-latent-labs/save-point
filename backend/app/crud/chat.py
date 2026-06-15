from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat_session import ChatSession
from app.models.chat_message import ChatMessage
from app.models.enums import ChatRole

# 채팅방 생성
async def create_session(db: AsyncSession, session_id: str, user_id: str, session_name: str = "새 채팅") -> ChatSession:
    session = ChatSession(id=session_id, user_id=user_id, session_name=session_name)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session

# 채팅방 목록 불러오기
async def get_sessions(db: AsyncSession, user_id: str) -> list[ChatSession]:
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.last_active_at.desc())
    )
    return result.scalars().all()

# 채팅방 삭제 
async def delete_session(db: AsyncSession, session_id: str) -> None:
    session = await db.get(ChatSession, session_id)
    if session:
        await db.delete(session)
        await db.commit()

# 채팅방 이름 변경
async def rename_session(db: AsyncSession, session_id: str, name: str) -> None:
    await db.execute(
        update(ChatSession)
        .where(ChatSession.id == session_id)
        .values(session_name=name)
    )
    await db.commit()

# 채팅 저장
async def save_message(
    db: AsyncSession,
    message_id: str,
    session_id: str,
    role: ChatRole,
    content_ko: str,
    retrieved_chunk_ids: list | None = None,
    model_name: str | None = None,
    latency_ms: int | None = None,
) -> ChatMessage:
    message = ChatMessage(
        id=message_id,
        session_id=session_id,
        role=role,
        content_ko=content_ko,
        retrieved_chunk_ids=retrieved_chunk_ids,
        model_name=model_name,
        latency_ms=latency_ms,
    )
    db.add(message)
    await db.commit()
    return message

# 채팅 내역 불러오기
async def get_messages(db: AsyncSession, session_id: str) -> list[ChatMessage]:
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return result.scalars().all()

# 마지막 활동 저장
async def update_session_last_active(db: AsyncSession, session_id: str) -> None:
    await db.execute(
        update(ChatSession)
        .where(ChatSession.id == session_id)
        .values(last_active_at=datetime.now(timezone.utc))
    )
    await db.commit()