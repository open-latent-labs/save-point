from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.rdb import Base
from app.models.enums import ChatRole


class ChatMessage(Base):
    __tablename__ = "chat_message"
    __table_args__ = (Index("idx_messages_session", "session_id"),)
    id: Mapped[str] = mapped_column(String(26), primary_key=True)

    session_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
    )

    role: Mapped[ChatRole] = mapped_column(
        Enum(ChatRole, name="chat_role", create_constraint=True),
        nullable=False,
    )

    content_ko: Mapped[str] = mapped_column(Text, nullable=False, comment="한국어 (사용자 질문 or AI 답변)")
    retrieved_chunk_ids: Mapped[dict | None] = mapped_column(JSONB)
    model_name: Mapped[str | None] = mapped_column(String(100))
    latency_ms: Mapped[int | None] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    session = relationship("ChatSession", back_populates="messages")
