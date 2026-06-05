from sqlalchemy.ext.asyncio import AsyncSession
from qdrant_client import AsyncQdrantClient

# TODO: OCR → RDB 저장 → VectorDB 저장 파이프라인 구현

async def run_ingest_pipeline(
    db: AsyncSession,
    vector_db: AsyncQdrantClient,
    file_path: str,
    original_filename: str,
):
    pass
