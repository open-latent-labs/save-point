from fastapi import APIRouter, UploadFile, File, Form, HTTPException,Depends, Query
from app.utils.minio_client import upload_file, BUCKET_NAME
from typing import Annotated
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user_id, require_admin
from app.crud.admin import admin_approval_list, admin_approval_count, admin_publish_document, admin_reject_document, admin_cancel_pending

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


@router.post("/documents/{document_id}/publish")
async def publish_document(document_id: str, db: AsyncSession = Depends(get_db), payload: dict = Depends(require_admin)):
    return await admin_publish_document(db, document_id, payload["sub"])


@router.post("/documents/{document_id}/reject")
async def reject_document(document_id: str, db: AsyncSession = Depends(get_db), _: dict = Depends(require_admin)):
    return await admin_reject_document(db, document_id)


@router.post("/documents/{document_id}/cancel-pending")
async def cancel_pending_document(document_id: str, db: AsyncSession = Depends(get_db), _: dict = Depends(require_admin)):
    return await admin_cancel_pending(db, document_id)