from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Identity, Index, Integer, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.rdb import Base


class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    __table_args__ = (
        Index("idx_chunks_document_id", "document_id"),
        Index("idx_chunks_not_indexed", "is_indexed", postgresql_where=text("is_indexed = FALSE")),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)

    document_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )

    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)

    chunk_text_en: Mapped[str] = mapped_column(Text, nullable=False, comment="청크 원문(영어)")

    token_count: Mapped[int | None] = mapped_column(Integer, comment="토큰 수 (임베딩 모델 기준)")

    page_number: Mapped[int | None] = mapped_column(Integer, comment="출처 페이지 번호")

    vector_point_id: Mapped[str | None] = mapped_column(String(36), unique=True)

    is_indexed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    indexed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    document = relationship("Document", back_populates="chunks")
