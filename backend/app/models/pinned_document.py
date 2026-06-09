from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.rdb import Base


class PinnedDocument(Base):
    __tablename__ = "pinned_documents"

    user_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )

    document_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("documents.id", ondelete="CASCADE"),
        primary_key=True,
    )

    pin_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="고정 순서 조정용",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    user = relationship("User", back_populates="pinned_documents")
    document = relationship("Document", back_populates="pinned_by")
