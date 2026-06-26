from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Identity, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.rdb import Base
from app.models.enums import UserBan


class UserBanLog(Base):
    __tablename__ = "user_ban_log"
    __table_args__ = (
        Index("idx_ban_log_target", "target_user_id"),
        {"comment": "계정 정지·해제 이력"},
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)

    target_user_id: Mapped[str | None] = mapped_column(
        String(26),
        ForeignKey("users.id", ondelete="SET NULL"),
        comment="대상 유저 (탈퇴 시 NULL)",
    )

    changed_by_user_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("users.id"),
        nullable=False,
    )

    before_ban: Mapped[UserBan] = mapped_column(
        Enum(UserBan, name="user_ban", create_constraint=True),
        nullable=False,
        comment="변경 전 BAN 상태",
    )

    after_ban: Mapped[UserBan] = mapped_column(
        Enum(UserBan, name="user_ban", create_constraint=True),
        nullable=False,
        comment="변경 후 BAN 상태",
    )

    reason: Mapped[str | None] = mapped_column(Text, comment="정지·해제 사유")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    target_user = relationship("User", foreign_keys=[target_user_id])
    changed_by = relationship("User", foreign_keys=[changed_by_user_id])
