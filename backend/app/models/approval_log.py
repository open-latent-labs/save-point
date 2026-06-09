from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Identity, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.rdb import Base
from app.models.enums import ApprovalAction


class ApprovalLog(Base):
    __tablename__ = "approval_logs"

    __table_args__ = (
        Index("idx_approval_document_id", "document_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)

    document_id: Mapped[str | None] = mapped_column(
        String(26),
        ForeignKey("documents.id", ondelete="SET NULL"),
    )

    actor_id: Mapped[str | None] = mapped_column(
        String(26),
        ForeignKey("users.id", ondelete="SET NULL"),
    )

    action: Mapped[ApprovalAction] = mapped_column(
        Enum(ApprovalAction, name="approval_action", create_constraint=True),
        nullable=False,
    )

    reason: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    document = relationship("Document", back_populates="approval_logs")
    actor = relationship("User", foreign_keys=[actor_id])
