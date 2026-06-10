from math import ceil

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, literal

from app.models.document import Document
from app.models.bookmarked_document import BookmarkedDocument
from app.models.pinned_document import PinnedDocument
from app.models.summary_llm_result import SummaryLlmResult

from app.schemas.document import ListRequest, SortBy


async def list(db: AsyncSession, body: ListRequest, user_id: str):
    is_bookmarked = (
        select(literal(1))
        .select_from(BookmarkedDocument)
        .where(
            BookmarkedDocument.document_id == Document.id,
            BookmarkedDocument.user_id == user_id,
        )
        .exists()
        .label("is_bookmarked")
    )

    is_pinned = (
        select(literal(1))
        .select_from(PinnedDocument)
        .where(
            PinnedDocument.document_id == Document.id,
            PinnedDocument.user_id == user_id,
        )
        .exists()
        .label("is_pinned")
    )

    sort_map = {
        SortBy.LATEST: Document.created_at.desc(),
        SortBy.NAME: Document.filename.asc(),
        SortBy.FILE_SIZE: Document.file_size.desc(),
        SortBy.BOOKMARKED: is_bookmarked.desc(),
    }

    conditions = [Document.uploaded_by_id == user_id]
    if body.status:
        conditions.append(Document.status == body.status)
    if body.access_type:
        conditions.append(Document.access_type == body.access_type)
    if body.category:
        conditions.append(SummaryLlmResult.category == body.category)

    count_result = await db.execute(
        select(func.count(Document.id))
        .outerjoin(SummaryLlmResult, SummaryLlmResult.document_id == Document.id)
        .where(*conditions)
    )
    total = count_result.scalar_one()
    total_pages = ceil(total / body.size) if total > 0 else 1

    result = await db.execute(
        select(Document, SummaryLlmResult, is_bookmarked, is_pinned)
        .outerjoin(SummaryLlmResult, SummaryLlmResult.document_id == Document.id)
        .where(*conditions)
        .order_by(sort_map[body.sort])
        .offset((body.page - 1) * body.size)
        .limit(body.size)
    )

    rows = result.fetchall()
    documents = [
        {
            "id": doc.id,
            "filename": doc.filename,
            "extension": doc.extension,
            "file_size": doc.file_size,
            "status": doc.status,
            "access_type": doc.access_type,
            "created_at": doc.created_at.isoformat() if doc.created_at else None,
            "category": summary.category if summary else None,
            "is_bookmarked": bool(bookmarked),
            "is_pinned": bool(pinned),
        }
        for doc, summary, bookmarked, pinned in rows
    ]

    return {"documents": documents, "total_pages": total_pages}
