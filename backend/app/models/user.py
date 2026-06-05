from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import func
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.db.rdb import Base
from app.models.enums import UserRole


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

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
    )

    nickname: Mapped[str] = mapped_column(
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
