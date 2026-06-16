from math import ceil

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import func, literal

from app.models.document import Document
from app.models.ocr_result import OcrResult
from app.models.summary_llm_result import SummaryLlmResult


async def document_content(db: AsyncSession, document_id: str):
    result = await db.execute(
        select(Document, SummaryLlmResult)
        .join(SummaryLlmResult, SummaryLlmResult.document_id == Document.id)
        .where(Document.id == document_id)
    )
    row = result.one_or_none()
    if row is None:
        return None
    return {
        "document": {
            "id": row[0].id,
            "filename": row[0].filename,
            "extension": row[0].extension,
            "file_size": row[0].file_size,
            "access_type": row[0].access_type,
            "created_at": row[0].created_at.isoformat() if row[0].created_at else None,
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
    
    await db.commit()
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


