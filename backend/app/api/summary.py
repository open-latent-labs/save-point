from fastapi import APIRouter, HTTPException, Depends
from app.utils.minio_client import upload_file, BUCKET_NAME
from typing import Annotated
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud.summary import summary_delete as summary_delete_crud, document_update_access as document_update_access_crud
from app.crud.summary import document_content as document_content_crud
from app.schemas.summary import SummaryUpdate


from app.dependencies import get_db, get_current_user_id

router = APIRouter(prefix="/summary", tags=["summary"])

@router.delete("/{document_id}/summary")
async def delete_summary(document_id: str, db: AsyncSession = Depends(get_db)):
    result = await summary_delete_crud(db, document_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Summary not found")
    return result


@router.put("/{document_id}/access")
async def document_update_access(document_id: str, body: SummaryUpdate, db: AsyncSession = Depends(get_db)):
    result = await document_update_access_crud(db, document_id, body.content)
    if result is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return result
    

@router.get("/docs/{id}")
async def document_content(id: str, db: AsyncSession = Depends(get_db)):
    result = await document_content_crud(db, id)
    if result is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return result