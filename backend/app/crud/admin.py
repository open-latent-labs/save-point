import math
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.document import Document
from app.models.enums import DocumentAccess, DocumentStatus
from app.models.summary_llm_result import SummaryLlmResult


async def admin_approval_list(db: AsyncSession, page: int = 1, page_size: int = 7):
    total_result = await db.execute(
        select(func.count(Document.id)).where(Document.status == "PENDING")
    )
    total = total_result.scalar_one()

    offset = (page - 1) * page_size
    items_result = await db.execute(
        select(Document)
        .where(Document.status == "PENDING")
        .offset(offset)
        .limit(page_size)
    )
    docs = items_result.scalars().all()

    return {
        "items": [
            {
                "document_id": doc.id,
                "filename": doc.filename,
                "extension": doc.extension,
                "file_size": doc.file_size,
                "access_type": doc.access_type.value if doc.access_type else None,
                "created_at": doc.created_at.isoformat() if doc.created_at else None,
            }
            for doc in docs
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, math.ceil(total / page_size)),
    }

async def admin_approval_count(db: AsyncSession):
    result = await db.execute(
        select(func.count(Document.id))
        .where(Document.status == "PENDING")
    )
    return result.scalar_one()


async def admin_publish_document(db: AsyncSession, document_id: str, admin_id: str):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    doc.access_type = DocumentAccess.PUBLIC
    doc.status = DocumentStatus.APPROVED
    doc.approved_by_id = admin_id
    doc.approved_at = datetime.now(timezone.utc)
    await db.commit()
    return {"id": document_id}


async def admin_reject_document(db: AsyncSession, document_id: str):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    doc.status = DocumentStatus.REJECTED
    await db.commit()
    return {"id": document_id}


async def admin_cancel_pending(db: AsyncSession, document_id: str):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    doc.status = DocumentStatus.DONE
    await db.commit()
    return {"id": document_id}
