from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.rdb import Base
from app.models.enums import UserBan, UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(26),
        primary_key=True,
    )

    password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole,
            name="user_role",
            create_constraint=True,
        ),
        nullable=False,
        default=UserRole.USER,
        comment="회원 역할(권한 구분)",
    )

    ban: Mapped[UserBan] = mapped_column(
        Enum(
            UserBan,
            name="user_ban",
            create_constraint=True,
        ),
        nullable=False,
        default=UserBan.UNBAN,
        comment="회원 계정 상태(계정 상태 구분)",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="회원 접속 상태(접속 여부 구분)",
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    user_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    upload_file_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="업로드한 문서 갯수",
    )

    ask_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="챗봇 질문 수",
    )

    img_url: Mapped[str | None] = mapped_column(
        String(512),
        default="user_image.png",
    )

    ip: Mapped[str | None] = mapped_column(
        String(45),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    last_active_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    uploaded_documents = relationship(
        "Document",
        foreign_keys="Document.uploaded_by_id",
        back_populates="uploaded_by",
    )

    approved_documents = relationship(
        "Document",
        foreign_keys="Document.approved_by_id",
        back_populates="approved_by",
    )

    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    pinned_documents = relationship("PinnedDocument", back_populates="user", cascade="all, delete-orphan")
    bookmarked_documents = relationship("BookmarkedDocument", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    oauth_accounts = relationship("UserOAuthAccount", back_populates="user", cascade="all, delete-orphan")
