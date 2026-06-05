from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.utils.minio_client import upload_file, BUCKET_NAME


router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("/upload")
async def upload_document(file: UploadFile = File(...), title: str = Form(...)):
    try:
        return {"message": "Document uploaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
