import io
import uuid
from minio import Minio
from app.config import settings

BUCKET_NAME = "documents"

_client: Minio | None = None


def get_client() -> Minio:
    global _client
    if _client is None:
        _client = Minio(
            endpoint=settings.minio_endpoint,
            access_key=settings.minio_root_user,
            secret_key=settings.minio_root_password,
            secure=settings.minio_use_ssl,
        )
    return _client


def _ensure_bucket(client: Minio, bucket: str) -> None:
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)


def upload_file(bucket: str, file_bytes: bytes, filename: str, content_type: str) -> str:
    client = get_client()
    _ensure_bucket(client, bucket)
    object_name = f"{uuid.uuid4().hex}/{filename}"
    client.put_object(
        bucket_name=bucket,
        object_name=object_name,
        data=io.BytesIO(file_bytes),
        length=len(file_bytes),
        content_type=content_type,
    )
    return object_name
