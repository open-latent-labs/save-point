from fastapi import APIRouter, UploadFile, File, Form, HTTPException,Depends, Query
from app.utils.minio_client import upload_file, BUCKET_NAME
from typing import Annotated
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user_id
from app.schemas.document import ListRequest
from app.crud.document import list as list_crud

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload")
async def upload_document(file: UploadFile = File(...), title: str = Form(...)):
    try:
        return {"message": "Document uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/list")
async def list(body: ListRequest, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return await list_crud(db, body, user_id)

    