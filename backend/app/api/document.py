from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.utils.minio_client import upload_file, BUCKET_NAME


router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload")
async def upload_document(file: UploadFile = File(...), title: str = Form(...)):
    try:
        file_bytes = await file.read()
        object_name = upload_file(
            bucket=BUCKET_NAME,
            file_bytes=file_bytes,
            filename=file.filename,
            content_type=file.content_type or "application/octet-stream",
        )
        return {
            "title": title,
            "filename": file.filename,
            "object_name": object_name,
            "bucket": BUCKET_NAME,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
