import asyncio
import json

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.crud.document import bookmark as bookmark_crud, bookmark_delete as bookmark_delete_crud
from app.crud.document import cancel_public_request as cancel_public_request_crud
from app.crud.document import list as list_crud
from app.crud.document import pin as pin_crud, pin_delete as pin_delete_crud, pin_list as pin_list_crud
from app.crud.upload_document import get_document, get_processing_jobs
from app.db.rdb import AsyncSessionLocal
from app.dependencies import get_current_user_id, get_db
from app.models.enums import DocumentStatus, JobStatus
from app.crud.document import request_public as request_public_crud, cancel_public_request as cancel_public_request_crud
from app.crud.document import public_list as public_list_crud

from app.schemas.document import DocumentUploadResponse, ListRequest
from app.services.document_service import run_processing_pipeline, start_upload

router = APIRouter(prefix="/documents", tags=["documents"])

_TERMINAL_STATUSES = {DocumentStatus.DONE, DocumentStatus.PENDING, DocumentStatus.APPROVED}
_POLL_INTERVAL = 3.0
_MAX_POLLS = 300  # 15분


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


@router.get("/{document_id}/status/stream")
async def stream_processing_status(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    try:
        doc = await get_document(db, document_id)
    except NoResultFound:
        raise HTTPException(status_code=404, detail="문서를 찾을 수 없습니다.")

    if doc.uploaded_by_id != user_id:
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")

    async def generate():
        for _ in range(_MAX_POLLS):
            async with AsyncSessionLocal() as poll_db:
                try:
                    current_doc = await get_document(poll_db, document_id)
                    jobs = await get_processing_jobs(poll_db, document_id)
                except Exception:
                    yield {"event": "failed", "data": json.dumps({"message": "서버 오류가 발생했습니다."})}
                    return

            job_data = [
                {"type": j.job_type.value, "status": j.job_status.value}
                for j in jobs
            ]
            payload = {"document_status": current_doc.status.value, "jobs": job_data}
            yield {"event": "status", "data": json.dumps(payload)}

            if current_doc.status in _TERMINAL_STATUSES:
                return

            # OCR 실패 등으로 파이프라인이 조기 종료된 경우
            if jobs and all(j.job_status == JobStatus.FAILED for j in jobs):
                yield {
                    "event": "failed",
                    "data": json.dumps({
                        "message": "문서 처리 중 오류가 발생했습니다.",
                        "document_status": current_doc.status.value,
                    }),
                }
                return

            await asyncio.sleep(_POLL_INTERVAL)

        yield {"event": "timeout", "data": json.dumps({"message": "처리 시간이 초과되었습니다."})}

    return EventSourceResponse(generate())

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