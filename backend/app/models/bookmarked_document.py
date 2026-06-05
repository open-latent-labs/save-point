from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.rdb import Base


class BookmarkedDocument(Base):
    __tablename__ = "bookmarked_documents"

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

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    user = relationship("User", back_populates="bookmarked_documents")
    document = relationship("Document", back_populates="bookmarked_by")
