from math import ceil
from loguru import logger

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import func, literal

from app.models.document import Document
from app.models.ocr_result import OcrResult
from app.models.summary_llm_result import SummaryLlmResult
from app.models.bookmarked_document import BookmarkedDocument
from app.models.pinned_document import PinnedDocument
from app.crud.vector_docs import update_document_payload


async def document_content(db: AsyncSession, document_id: str, user_id: str = None):
    result = await db.execute(
        select(Document, SummaryLlmResult)
        .join(SummaryLlmResult, SummaryLlmResult.document_id == Document.id)
        .where(Document.id == document_id)
    )
    row = result.one_or_none()
    if row is None:
        return None

    is_bookmarked = False
    is_pinned = False
    if user_id:
        bm = await db.execute(
            select(BookmarkedDocument).where(
                BookmarkedDocument.document_id == document_id,
                BookmarkedDocument.user_id == user_id,
            )
        )
        is_bookmarked = bm.scalar_one_or_none() is not None

        pm = await db.execute(
            select(PinnedDocument).where(
                PinnedDocument.document_id == document_id,
                PinnedDocument.user_id == user_id,
            )
        )
        is_pinned = pm.scalar_one_or_none() is not None

    return {
        "document": {
            "id": row[0].id,
            "filename": row[0].filename,
            "extension": row[0].extension,
            "file_size": row[0].file_size,
            "access_type": row[0].access_type,
            "status": row[0].status,
            "created_at": row[0].created_at.isoformat() if row[0].created_at else None,
            "is_bookmarked": is_bookmarked,
            "is_pinned": is_pinned,
        },
        "summary": {
            "category": row[1].category,
            "summary": row[1].summary_ko,
        },
    }

async def delete_documnet(db: AsyncSession, document_id: str,user_id: str):

    result = await db.execute(
        select(Document)
        .where(Document.id == document_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return None
    row.deleted_by_id = user_id
    row.deleted_at = func.now()
    
    try:
        await update_document_payload(document_id, deleted_file="yes")
        logger.info("삭제 플래그 업데이트 성공")
        await db.commit()
        logger.info("DB 저장 성공")
    except Exception:
        await db.rollback()
        logger.error("document delete failed: document_id=%s, user_id=%s", document_id, user_id, exc_info=True)
        raise
    return {"deleted": True}

async def document_original(db: AsyncSession, document_id: str):
    result = await db.execute(
        select(Document, OcrResult)
        .outerjoin(OcrResult, OcrResult.document_id == Document.id)
        .where(Document.id == document_id)
    )
    row = result.one_or_none()
    if row is None:
        return None
    doc, ocr = row
    return {
        "document": {
            "id": doc.id,
            "filename": doc.filename,
            "extension": doc.extension,
            "file_size": doc.file_size,
            "access_type": doc.access_type,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
        },
        "raw_text": ocr.raw_text if ocr else "",
    }


async def document_update_access(db: AsyncSession, document_id: str, content: str):
    result = await db.execute(
        select(SummaryLlmResult)
        .where(SummaryLlmResult.document_id == document_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        return None
    row.summary_ko = content
    await db.commit()
    return {"updated": True}


