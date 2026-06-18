from fastapi import APIRouter, UploadFile, File, Form, HTTPException,Depends, Query
from app.utils.minio_client import upload_file, BUCKET_NAME
from typing import Annotated
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user_id, require_admin
from app.crud.admin import admin_approval_list, admin_approval_count, admin_approved_docs, admin_rejected_docs, admin_cancel_pending, admin_publish_docs

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/health")
async def health_check():
    return {"status": "ok"}

@router.post("/approval/list")
async def approval_list(page: int = Query(1, ge=1), db: AsyncSession = Depends(get_db), _: dict = Depends(require_admin)):
    return await admin_approval_list(db, page=page, page_size=7)

@router.get("/approval/count")
async def approval_count(db: AsyncSession = Depends(get_db), _: dict = Depends(require_admin)):
    return await admin_approval_count(db)


@router.post("/documents/approve/{document_id}")
async def publish_document(document_id: str, db: AsyncSession = Depends(get_db), payload: dict = Depends(require_admin)):
    admin_id = payload["sub"]
    logger.info(f"[Admin] Document approve requested | document_id={document_id}, admin_id={admin_id}")
    result = await admin_approved_docs(db, document_id, admin_id)
    logger.info(f"[Admin] Document approved | document_id={document_id}, admin_id={admin_id}")
    return result


@router.post("/documents/reject/{document_id}")
async def reject_document(document_id: str, db: AsyncSession = Depends(get_db), payload: dict = Depends(require_admin)):
    admin_id = payload["sub"]
    logger.info(f"[Admin] Document reject requested | document_id={document_id}, admin_id={admin_id}")
    result = await admin_rejected_docs(db, document_id, admin_id)
    logger.info(f"[Admin] Document rejected | document_id={document_id}, admin_id={admin_id}")
    return result


@router.post("/documents/cancel-pending/{document_id}")
async def cancel_pending_document(document_id: str, db: AsyncSession = Depends(get_db), payload: dict = Depends(require_admin)):
    admin_id = payload["sub"]
    logger.info(f"[Admin] Document cancel-pending requested | document_id={document_id}, admin_id={admin_id}")
    result = await admin_cancel_pending(db, document_id, admin_id)
    logger.info(f"[Admin] Document cancel-pending | document_id={document_id}, admin_id={admin_id}")
    return result
    return await admin_cancel_pending(db, document_id)


# admin 계정 공인 문서 승인x
@router.put("/documents/publish/{document_id}")
async def admin_publish_document(document_id: str, db: AsyncSession = Depends(get_db), payload: dict = Depends(require_admin)):
    admin_id = payload["sub"]
    logger.info(f"[Admin] Document publish requested | document_id={document_id}, admin_id={admin_id}")
    result = await admin_publish_docs(db, document_id, admin_id)
    logger.info(f"[Admin] Document published | document_id={document_id}, admin_id={admin_id}")
    return result