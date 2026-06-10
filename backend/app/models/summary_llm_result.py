from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Identity, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.rdb import Base
from app.models.enums import Category


class SummaryLlmResult(Base):
    __tablename__ = "summary_llm_results"

    __table_args__ = (
        Index("idx_document_category", "category"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)

    document_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    category: Mapped[Category | None] = mapped_column(
        Enum(Category, name="category", create_constraint=True),
        comment="카테고리",
    )

    summary_ko: Mapped[str | None] = mapped_column(Text)

    model_name: Mapped[str | None] = mapped_column(String(100))

    model_version: Mapped[str | None] = mapped_column(String(50))

    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    document = relationship("Document", back_populates="summary_llm_result")
