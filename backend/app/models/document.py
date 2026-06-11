from datetime import datetime

from sqlalchemy import BigInteger
from sqlalchemy import DateTime
from sqlalchemy import Enum
from sqlalchemy import ForeignKey
from sqlalchemy import Index
from sqlalchemy import String
from sqlalchemy import func
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import mapped_column
from sqlalchemy.orm import relationship

from app.db.rdb import Base
from app.models.enums import DocumentAccess
from app.models.enums import DocumentStatus


class Document(Base):
    __tablename__ = "documents"

    __table_args__ = (
        Index("idx_documents_status", "status"),
        Index("idx_document_uploaded_by", "uploaded_by_id"),
    )

    id: Mapped[str] = mapped_column(
        String(26),
        primary_key=True,
    )

    filename: Mapped[str | None] = mapped_column(
        String(255),
    )

    extension: Mapped[str | None] = mapped_column(
        String(255),
    )

    file_size: Mapped[int | None] = mapped_column(
        BigInteger,
    )

    status: Mapped[DocumentStatus] = mapped_column(
        Enum(
            DocumentStatus,
            name="document_status",
            create_constraint=True,
        ),
        nullable=False,
        default=DocumentStatus.INITIAL,
    )

    access_type: Mapped[DocumentAccess] = mapped_column(
        Enum(
            DocumentAccess,
            name="document_access",
            create_constraint=True,
        ),
        nullable=False,
        default=DocumentAccess.PRIVATE,
    )

    uploaded_by_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("users.id"),
        nullable=False,
    )

    approved_by_id: Mapped[str | None] = mapped_column(
        String(26),
        ForeignKey(
            "users.id",
            ondelete="SET NULL",
        ),
    )

    deleted_by_id: Mapped[str | None] = mapped_column(
        String(26),
        ForeignKey("users.id"),
        nullable=True,
        default=None,
    )

    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    approved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="업로드, 마지막으로 문서 수정한 시간",
    )

    uploaded_by = relationship(
        "User",
        foreign_keys=[uploaded_by_id],
        back_populates="uploaded_documents",
    )

    approved_by = relationship(
        "User",
        foreign_keys=[approved_by_id],
        back_populates="approved_documents",
    )

    deleted_by = relationship(
        "User",
        foreign_keys=[deleted_by_id],
        back_populates="deleted_documents",
    )

    ocr_result = relationship("OcrResult", back_populates="document", uselist=False, cascade="all, delete-orphan")
    summary_llm_result = relationship("SummaryLlmResult", back_populates="document", uselist=False, cascade="all, delete-orphan")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    processing_jobs = relationship("ProcessingJob", back_populates="document", cascade="all, delete-orphan")
    approval_logs = relationship("ApprovalLog", back_populates="document")
    pinned_by = relationship("PinnedDocument", back_populates="document", cascade="all, delete-orphan")
    bookmarked_by = relationship("BookmarkedDocument", back_populates="document", cascade="all, delete-orphan")
