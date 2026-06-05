from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, Float, ForeignKey, Identity, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.rdb import Base
from app.models.enums import OcrEngine, OcrStatus


class OcrResult(Base):
    __tablename__ = "ocr_results"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)

    document_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    raw_text: Mapped[str | None] = mapped_column(Text)

    total_pages: Mapped[int | None] = mapped_column(Integer)

    confidence_score: Mapped[float | None] = mapped_column(
        Float,
        comment="0.0 ~ 1.0",
    )

    ocr_engine: Mapped[OcrEngine] = mapped_column(
        Enum(OcrEngine, name="ocr_engine", create_constraint=True),
        nullable=False,
        default=OcrEngine.PADDLE,
    )

    status: Mapped[OcrStatus] = mapped_column(
        Enum(OcrStatus, name="ocr_status", create_constraint=True),
        nullable=False,
        default=OcrStatus.PENDING,
    )

    error_message: Mapped[str | None] = mapped_column(Text)

    processed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    document = relationship("Document", back_populates="ocr_result")
