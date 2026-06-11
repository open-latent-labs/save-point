import math

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func

from app.models.document import Document
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
                "id": doc.id,
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
