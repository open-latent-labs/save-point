from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Identity, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.rdb import Base
from app.models.enums import UserRole


class UserRoleLog(Base):
    __tablename__ = "user_role_log"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)

    target_user_id: Mapped[str | None] = mapped_column(
        String(26),
        ForeignKey("users.id", ondelete="SET NULL"),
    )

    changed_by_user_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("users.id"),
        nullable=False,
    )

    before_role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", create_constraint=True),
        nullable=False,
    )

    after_role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", create_constraint=True),
        nullable=False,
    )

    reason: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    target_user = relationship("User", foreign_keys=[target_user_id])
    changed_by = relationship("User", foreign_keys=[changed_by_user_id])
