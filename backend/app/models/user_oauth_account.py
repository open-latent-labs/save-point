from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.rdb import Base


class UserOAuthAccount(Base):
    __tablename__ = "user_oauth_accounts"

    __table_args__ = (
        UniqueConstraint("provider", "provider_user_id", name="uq_provider_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    user_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # "google" | "kakao" | "naver"
    provider: Mapped[str] = mapped_column(String(20), nullable=False)

    # 각 소셜 플랫폼이 부여한 고유 ID
    provider_user_id: Mapped[str] = mapped_column(String(255), nullable=False)

    # 소셜 계정의 이메일 (없을 수 있음)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    user = relationship("User", back_populates="oauth_accounts")
