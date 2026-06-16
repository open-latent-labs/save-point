#충돌 방지 목적을 파일 별도 생성, 이후에 document.py 파일에 합치기
import secrets
import string
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.enums import (
    DocumentAccess,
    DocumentStatus,
    JobStatus,
    JobType,
    OcrEngine,
    OcrStatus,
)
from app.models.ocr_result import OcrResult
from app.models.processing_job import ProcessingJob
from app.models.summary_llm_result import SummaryLlmResult
from app.schemas.extraction import DocumentExtractionResult, ExtractionMethod
from app.schemas.chunk import ChunkResult

# 

def _generate_id() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(26))

async def get_document(db: AsyncSession, document_id: str) -> Document:
    result = await db.execute(select(Document).where(Document.id == document_id))
    return result.scalar_one()


async def get_processing_jobs(db: AsyncSession, document_id: str) -> list[ProcessingJob]:
    result = await db.execute(
        select(ProcessingJob)
        .where(ProcessingJob.document_id == document_id)
        .order_by(ProcessingJob.queued_at)
    )
    return list(result.scalars().all())


async def create_document_record(
    db: AsyncSession,
    user_id: str,
    filename: str,
    extension: str,
    file_size: int,
    access_type: DocumentAccess = DocumentAccess.PRIVATE,
) -> Document:
    doc = Document(
        id=_generate_id(),
        filename=filename,
        extension=extension,
        file_size=file_size,
        status=DocumentStatus.INITIAL,
        access_type=access_type,
        uploaded_by_id=user_id,
    )
    db.add(doc)
    await db.flush()
    return doc

async def set_document_status(db: AsyncSession, doc: Document, status: DocumentStatus) -> None:
    doc.status = status
    await db.flush()

async def create_processing_job(
    db: AsyncSession, document_id: str, job_type: JobType
) -> ProcessingJob:
    job = ProcessingJob(document_id=document_id, job_type=job_type)
    db.add(job)
    await db.flush()
    return job

async def update_job(
    db: AsyncSession,
    job: ProcessingJob,
    status: JobStatus,
    error: str | None = None,
) -> None:
    job.job_status = status
    if status == JobStatus.RUNNING:
        job.started_at = datetime.now(timezone.utc)
        job.attempt_count += 1
    elif status in (JobStatus.DONE, JobStatus.FAILED):
        job.finished_at = datetime.now(timezone.utc)
    if error:
        job.error_message = error[:1000]
    await db.flush()

_ENGINE_MAP = {
    ExtractionMethod.PADDLE: OcrEngine.PADDLE,
    ExtractionMethod.SURYA: OcrEngine.SURYA,
    ExtractionMethod.NATIVE: OcrEngine.NATIVE,
}

async def save_ocr_result(
    db: AsyncSession, document_id: str, extraction: DocumentExtractionResult
) -> None:
    pages = extraction.pages
    total = len(pages)

    engine_counts: dict[ExtractionMethod, int] = {}
    for page in pages:
        engine_counts[page.method] = engine_counts.get(page.method, 0) + 1
    dominant = max(engine_counts, key=engine_counts.get) if engine_counts else ExtractionMethod.NATIVE
    avg_quality = sum(p.quality_score for p in pages) / total if total else 0.0

    db.add(OcrResult(
        document_id=document_id,
        raw_text=extraction.full_text,
        total_pages=total,
        confidence_score=avg_quality,
        ocr_engine=_ENGINE_MAP.get(dominant, OcrEngine.NATIVE),
        status=OcrStatus.DONE,
    ))

async def save_ocr_failure(db: AsyncSession, document_id: str, error: str) -> None:
    db.add(OcrResult(
        document_id=document_id,
        status=OcrStatus.FAILED,
        error_message=error[:1000],
    ))

async def save_summary_result(
    db: AsyncSession,
    document_id: str,
    classify_result: dict,
    model_name: str,
) -> None:
    db.add(SummaryLlmResult(
        document_id=document_id,
        category=classify_result["category"],
        summary_ko=classify_result["summary_ko"],
        model_name=model_name,
        processed_at=datetime.now(timezone.utc),
    ))

async def save_document_chunks(
    db: AsyncSession, document_id: str, chunk_results: list[ChunkResult]
) -> None:
    now = datetime.now(timezone.utc)
    for cr in chunk_results:
        db.add(DocumentChunk(
            document_id=document_id,
            chunk_index=cr.chunk_index,
            chunk_text_en=cr.chunk_text,
            page_number=cr.page_number,
            vector_point_id=cr.vector_point_id,
            is_indexed=True,
            indexed_at=now,
        ))
