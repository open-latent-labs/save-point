import math
import secrets
import string
from datetime import datetime, timezone
import json
import redis.asyncio as aioredis

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func


def _generate_id() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(26))

from app.models.document import Document
from app.models.notification import Notification
from app.models.approval_log import ApprovalLog
from app.models.enums import DocumentAccess, DocumentStatus
from app.models.summary_llm_result import SummaryLlmResult
from app.models.enums import NotificationType
from app.models.enums import ApprovalAction


from app.config import settings



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


async def admin_approved_docs(db: AsyncSession, document_id: str, admin_id: str):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    doc.access_type = DocumentAccess.PUBLIC
    doc.status = DocumentStatus.APPROVED
    doc.approved_by_id = admin_id
    doc.approved_at = datetime.now(timezone.utc)

    # approval log 테이블에도 저장
    approval_log = ApprovalLog(
        document_id=document_id,
        action=ApprovalAction.APPROVED,
        actor_id=admin_id,
        reason="공공 문서 요청 승인",
    )
    db.add(approval_log)
    await db.flush()  # DB가 approval_log.id(BIGINT Identity)를 할당하도록

    notification = Notification(
        id=_generate_id(),
        user_id=doc.uploaded_by_id,
        type=NotificationType.DOCUMENT_APPROVED,
        ref_id=approval_log.id,
        message="공공 문서 요청이 승인되었습니다.",
    )
    db.add(notification)
    await db.commit()

    redis = aioredis.from_url(settings.redis_url)
    try:
        await redis.publish(
            f"user:{doc.uploaded_by_id}:notifications",
            json.dumps({"type": "DOCUMENT_APPROVED", "document_id": document_id, "message": "공공 문서 요청이 승인되었습니다."}),
        )
    finally:
        await redis.aclose()
    return {"id": doc.uploaded_by_id}


async def admin_rejected_docs(db: AsyncSession, document_id: str, admin_id: str):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    doc.status = DocumentStatus.REJECTED


    # approval log 테이블에도 저장
    approval_log = ApprovalLog(
        document_id=document_id,
        action=ApprovalAction.REJECTED,
        actor_id=admin_id,
        reason="공공 문서 요청 반려",
    )
    db.add(approval_log)
    await db.flush()  # DB가 approval_log.id(BIGINT Identity)를 할당하도록

    notification = Notification(
        id=_generate_id(),
        user_id=doc.uploaded_by_id,
        type=NotificationType.DOCUMENT_REJECTED,
        ref_id=approval_log.id,
        message="공공 문서 요청이 반려되었습니다.",
    )
    db.add(notification)
    await db.commit()

    redis = aioredis.from_url(settings.redis_url)
    try:
        await redis.publish(
            f"user:{doc.uploaded_by_id}:notifications",
            json.dumps({"type": "DOCUMENT_REJECTED", "document_id": document_id, "message": "공공 문서 요청이 반려되었습니다."}),
        )
    finally:
        await redis.aclose()
    return {"id": doc.uploaded_by_id}


async def admin_cancel_pending(db: AsyncSession, document_id: str):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")
    doc.status = DocumentStatus.DONE
    await db.commit()

    
    return {"id": document_id}
