from fastapi import APIRouter, UploadFile, File, Form, HTTPException,Depends, Query
from app.utils.minio_client import upload_file, BUCKET_NAME
from typing import Annotated
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user_id, require_admin
from app.crud.admin import admin_approval_list, admin_approval_count

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