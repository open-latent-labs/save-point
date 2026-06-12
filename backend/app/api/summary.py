from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.crud.summary import delete_documnet as crud_delete_document, document_update_access as crud_update_summary_content
from app.crud.summary import document_content as crud_document_content
from app.schemas.summary import SummaryUpdate
from app.dependencies import get_db, get_current_user_id

router = APIRouter(prefix="/summary", tags=["summary"])

@router.delete("/{document_id}/summary")
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    result = await crud_delete_document(db, document_id, user_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Summary not found")
    return result


@router.put("/{document_id}/content")
async def update_summary_content(document_id: str, body: SummaryUpdate, db: AsyncSession = Depends(get_db)):
    result = await crud_update_summary_content(db, document_id, body.content)
    if result is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return result


@router.get("/docs/{id}")
async def document_content(id: str, db: AsyncSession = Depends(get_db)):
    result = await crud_document_content(db, id)
    if result is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return result