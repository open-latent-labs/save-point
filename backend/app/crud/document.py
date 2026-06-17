from math import ceil

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy import func, literal

from datetime import datetime, timezone

from app.models.document import Document
from app.models.bookmarked_document import BookmarkedDocument
from app.models.pinned_document import PinnedDocument
from app.models.summary_llm_result import SummaryLlmResult
from app.models.user import User
from app.models.enums import DocumentStatus, DocumentAccess, UserRole

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

    # idx_documents_uploader_doc(uploaded_by_id, id WHERE deleted_by_id IS NULL) 활용
    doc_conditions = [
        Document.uploaded_by_id == user_id,
        Document.deleted_by_id.is_(None),
    ]
    if body.status:
        doc_conditions.append(Document.status == body.status)
    if body.access_type:
        doc_conditions.append(Document.access_type == body.access_type)
    if body.is_bookmarked:
        doc_conditions.append(
            select(literal(1))
            .select_from(BookmarkedDocument)
            .where(
                BookmarkedDocument.document_id == Document.id,
                BookmarkedDocument.user_id == user_id,
            )
            .exists()
        )

    # category 필터 유무에 따라 SummaryLlmResult JOIN 방식 분기
    if body.category:
        # INNER JOIN: category 조건 만족하는 rows만 접근
        count_stmt = (
            select(func.count(Document.id))
            .join(SummaryLlmResult, SummaryLlmResult.document_id == Document.id)
            .where(*doc_conditions, SummaryLlmResult.category == body.category)
        )
        main_stmt = (
            select(Document, SummaryLlmResult, is_bookmarked, is_pinned)
            .join(SummaryLlmResult, SummaryLlmResult.document_id == Document.id)
            .where(*doc_conditions, SummaryLlmResult.category == body.category)
            .order_by(sort_map[body.sort])
            .offset((body.page - 1) * body.size)
            .limit(body.size)
        )
    else:
        # category 필터 없음: count는 SummaryLlmResult JOIN 불필요
        count_stmt = select(func.count(Document.id)).where(*doc_conditions)
        main_stmt = (
            select(Document, SummaryLlmResult, is_bookmarked, is_pinned)
            .outerjoin(SummaryLlmResult, SummaryLlmResult.document_id == Document.id)
            .where(*doc_conditions)
            .order_by(sort_map[body.sort])
            .offset((body.page - 1) * body.size)
            .limit(body.size)
        )

    count_result = await db.execute(count_stmt)
    total = count_result.scalar_one()
    total_pages = ceil(total / body.size) if total > 0 else 1

    result = await db.execute(main_stmt)
    rows = result.all()
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

    return {"documents": documents, "total_pages": total_pages, "total_count": total}


async def bookmark(db: AsyncSession, document_id: str, user_id: str):
    existing = await db.execute(
        select(BookmarkedDocument)
        .where(
            BookmarkedDocument.document_id == document_id,
            BookmarkedDocument.user_id == user_id,
        )
    )
    existing = existing.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        is_bookmarked = False
    else:
        await db.execute(
            insert(BookmarkedDocument),
            {"document_id": document_id, "user_id": user_id},
        )
        is_bookmarked = True

    await db.commit()
    return {"is_bookmarked": is_bookmarked}


async def bookmark_delete(db: AsyncSession, document_id: str, user_id: str):
    existing = await db.execute(
        select(BookmarkedDocument)
        .where(
            BookmarkedDocument.document_id == document_id,
            BookmarkedDocument.user_id == user_id,
        )
    )
    existing = existing.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        await db.commit()

    return {"is_bookmarked": False}


async def pin(db: AsyncSession, document_id: str, user_id: str):
    existing = await db.execute(
        select(PinnedDocument)
        .where(
            PinnedDocument.document_id == document_id,
            PinnedDocument.user_id == user_id,
        )
    )
    existing = existing.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        is_pinned = False
    else:
        count_result = await db.execute(
            select(func.count()).select_from(PinnedDocument).where(PinnedDocument.user_id == user_id)
        )
        if count_result.scalar_one() >= 3:
            raise HTTPException(status_code=400, detail="고정 문서는 최대 3개까지 가능합니다.")
        await db.execute(
            insert(PinnedDocument),
            {"document_id": document_id, "user_id": user_id},
        )
        is_pinned = True

    await db.commit()
    return {"is_pinned": is_pinned}


async def pin_delete(db: AsyncSession, document_id: str, user_id: str):
    existing = await db.execute(
        select(PinnedDocument)
        .where(
            PinnedDocument.document_id == document_id,
            PinnedDocument.user_id == user_id,
        )
    )
    existing = existing.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        await db.commit()

    return {"is_pinned": False}

async def request_public(db: AsyncSession, document_id: str, user_id: str):
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.uploaded_by_id == user_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()

    if user and user.role == UserRole.ADMIN:
        doc.status = DocumentStatus.APPROVED
        doc.access_type = DocumentAccess.PUBLIC
        doc.approved_by_id = user_id
        doc.approved_at = datetime.now(timezone.utc)
    else:
        doc.status = DocumentStatus.PENDING

    await db.commit()
    return {"id": document_id}


async def cancel_public_request(db: AsyncSession, document_id: str, user_id: str):
    result = await db.execute(
        select(Document).where(Document.id == document_id, Document.uploaded_by_id == user_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    doc.status = DocumentStatus.DONE
    await db.commit()
    return {"id": document_id}


async def public_list(db: AsyncSession):
    result = await db.execute(
        select(Document, SummaryLlmResult)
        .outerjoin(SummaryLlmResult, SummaryLlmResult.document_id == Document.id)
        .where(
            Document.access_type == DocumentAccess.PUBLIC,
            Document.status == DocumentStatus.APPROVED,
            Document.deleted_by_id.is_(None),
        )
        .order_by(Document.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "extension": doc.extension,
            "category": summary.category if summary else "OTHER",
        }
        for doc, summary in rows
    ]


async def pin_list(db: AsyncSession, user_id: str):
    result = await db.execute(
        select(PinnedDocument, Document)
        .join(Document, Document.id == PinnedDocument.document_id)
        .where(PinnedDocument.user_id == user_id)
        .order_by(PinnedDocument.pin_order.asc(), PinnedDocument.created_at.desc())
    )
    rows = result.all()
    return [
        {
            "document_id": pinned.document_id,
            "filename": doc.filename,
            "pin_order": pinned.pin_order,
            "created_at": pinned.created_at.isoformat() if pinned.created_at else None,
        }
        for pinned, doc in rows
    ]