from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_current_user_id
from app.schemas.document import ListRequest
from app.crud.document import list as list_crud, bookmark as bookmark_crud, bookmark_delete as bookmark_delete_crud
from app.crud.document import pin as pin_crud, pin_delete as pin_delete_crud, pin_list as pin_list_crud
from app.crud.document import request_public as request_public_crud, cancel_public_request as cancel_public_request_crud
from app.crud.document import public_list as public_list_crud

from app.schemas.document import DocumentUploadResponse, ListRequest
from app.services.document_service import run_processing_pipeline, start_upload

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload", response_model=DocumentUploadResponse, status_code=202)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    file_bytes = await file.read()
    doc = await start_upload(db, user_id, file_bytes, file.filename, 
                             file.content_type or "application/octet-stream")
    
    background_tasks.add_task(
        run_processing_pipeline,
        document_id=doc.id,
        file_bytes=file_bytes,
        extension=doc.extension,
        user_id=user_id,
        access_type=doc.access_type.value,
        filename=doc.filename,
    )

    return DocumentUploadResponse(
        document_id=doc.id,
        status="PROCESSING",
        message="파일 업로드가 완료되었습니다. 백그라운드에서 처리 중입니다.",
    )


@router.get("/public")
async def public_list(db: AsyncSession = Depends(get_db)):
    return await public_list_crud(db)

@router.post("/list")
async def list(body: ListRequest, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return await list_crud(db, body, user_id)


@router.post("/{document_id}/bookmark")
async def bookmark_document(document_id: str, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return await bookmark_crud(db, document_id, user_id)

@router.delete("/{document_id}/bookmark/delete")
async def delete_bookmark_document(document_id: str, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return await bookmark_delete_crud(db, document_id, user_id)

@router.post("/{document_id}/pin")
async def pin_document(document_id: str, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return await pin_crud(db, document_id, user_id)

@router.delete("/{document_id}/pin/delete")
async def delete_pin_document(document_id: str, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return await pin_delete_crud(db, document_id, user_id)

@router.get("/pin/list")
async def pin_list(db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return await pin_list_crud(db, user_id)


@router.post("/{document_id}/request-public")
async def request_public(document_id: str, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return await request_public_crud(db, document_id, user_id)


@router.delete("/{document_id}/request-public")
async def cancel_public_request(document_id: str, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return await cancel_public_request_crud(db, document_id, user_id)
