import os
import re

from fastapi import HTTPException
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.crud.upload_document import (
    create_document_record,
    create_processing_job,
    get_document,
    save_document_chunks,
    save_ocr_failure,
    save_ocr_result,
    save_summary_result,
    set_document_status,
    update_job,
)
from app.db.rdb import AsyncSessionLocal
from app.models.document import Document
from app.models.enums import DocumentAccess, DocumentStatus, JobStatus, JobType
from app.pipelines.ingest_pipeline import ingest
from app.services.ocr.pipline import run_ocr
from app.services.summary_service import summarize_and_classify
from app.schemas.chunk import ChunkMetadata
from app.utils.minio_client import BUCKET_NAME, upload_file

_ALLOWED_EXT = {".pdf", ".pptx"}
_MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
_UNSAFE_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f\x7f]')
_WINDOWS_RESERVED = re.compile(r'^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$', re.IGNORECASE)

def validate_extension(filename: str) -> str:
    ext = os.path.splitext(filename or "")[1].lower()
    if ext not in _ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail=f"지원하지 않는 파일 형식입니다. 허용: {', '.join(_ALLOWED_EXT)}",
        )
    return ext


def validate_file_size(file_bytes: bytes) -> None:
    if len(file_bytes) > _MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="파일 크기가 50MB를 초과합니다.")


def sanitize_filename(filename: str) -> str:
    name = os.path.basename(filename.replace("\\", "/"))

    name = _UNSAFE_CHARS.sub("_", name)

    stem, dot, ext = name.rpartition(".")

    stem = stem.strip(". ")

    if _WINDOWS_RESERVED.match(stem):
        stem = f"_{stem}"

    if not stem:
        stem = "unnamed"

    return f"{stem}{dot}{ext}" if dot else stem


async def start_upload(
    db: AsyncSession,
    user_id: str,
    file_bytes: bytes,
    filename: str,
    content_type: str,
) -> Document:
    
    ext = validate_extension(filename)
    
    validate_file_size(file_bytes)
    
    filename = sanitize_filename(filename)

    upload_file(
        bucket=BUCKET_NAME,
        file_bytes=file_bytes,
        filename=filename,
        content_type=content_type,
    )
    doc = await create_document_record(
        db=db,
        user_id=user_id,
        filename=filename,
        extension=ext,
        file_size=len(file_bytes),
    )
    await db.commit()
    return doc

async def run_processing_pipeline(
    document_id: str,
    file_bytes: bytes,
    extension: str,
    user_id: str,
    access_type: str,
    filename: str,
) -> None:
    async with AsyncSessionLocal() as db:
        try:
            doc = await get_document(db, document_id)
            await set_document_status(db, doc, DocumentStatus.PROCESSING)

            ocr_job = await create_processing_job(db, document_id, JobType.OCR)
            raw_text = ""
            try:
                await update_job(db, ocr_job, JobStatus.RUNNING)
                logger.info(f"[OCR 시작] doc_id={document_id}, filename={filename}")
                extraction = await run_ocr(file_bytes, extension)
                raw_text = extraction.full_text
                await save_ocr_result(db, document_id, extraction)
                await update_job(db, ocr_job, JobStatus.DONE)
                logger.info(f"[OCR 완료] doc_id={document_id}, 추출 글자수={len(raw_text)}")
            except Exception as e:
                logger.error(f"[OCR 실패] doc_id={document_id}: {e}")
                await update_job(db, ocr_job, JobStatus.FAILED, str(e))
                await save_ocr_failure(db, document_id, str(e))
                await db.commit()
                return

            llm_job = await create_processing_job(db, document_id, JobType.CLASSIFY_SUMMARIZE)
            try:
                await update_job(db, llm_job, JobStatus.RUNNING)
                logger.info(f"[LLM 요약 시작] doc_id={document_id}")
                classify_result = await summarize_and_classify(raw_text)
                await save_summary_result(db, document_id, classify_result, settings.summary_model)
                await update_job(db, llm_job, JobStatus.DONE)
                await db.commit()
                logger.info(f"[LLM 요약 완료] doc_id={document_id}, category={classify_result.get('category')}")
            except Exception as e:
                logger.error(f"[LLM 분류/요약 실패] doc_id={document_id}: {e}")
                await update_job(db, llm_job, JobStatus.FAILED, str(e))

            embed_job = await create_processing_job(db, document_id, JobType.EMBED)
            try:
                await update_job(db, embed_job, JobStatus.RUNNING)
                logger.info(f"[임베딩 시작] doc_id={document_id}, 추출본 글자수={len(raw_text)}")
                chunk_results = await ingest(
                    raw_text,
                    ChunkMetadata(
                        document_id=document_id,
                        user_id=user_id,
                        access_type=access_type,
                        filename=filename,
                        page_number=0,
                        chunk_index=0,
                        chunk_text="",
                        deleted_file="none",
                    ),
                )
                await save_document_chunks(db, document_id, chunk_results)
                await update_job(db, embed_job, JobStatus.DONE)
                logger.info(f"[임베딩 완료] doc_id={document_id}, 청크수={len(chunk_results)}")

            except Exception as e:
                logger.error(f"[임베딩 실패] doc_id={document_id}: {e}")
                await update_job(db, embed_job, JobStatus.FAILED, str(e))

            await set_document_status(db, doc, DocumentStatus.DONE)
            await db.commit()
            logger.info(f"[파이프라인 완료] doc_id={document_id}, status={doc.status}")

        except Exception as e:
            logger.error(f"[파이프라인 수행 중 오류 발생] doc_id={document_id}: {e}")
            await db.rollback()
