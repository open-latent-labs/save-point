# from sqlalchemy.ext.asyncio import AsyncSession
# from qdrant_client import AsyncQdrantClient

# # TODO: OCR → RDB 저장 → VectorDB 저장 파이프라인 구현

# async def run_ingest_pipeline(
#     db: AsyncSession,
#     vector_db: AsyncQdrantClient,
#     file_path: str,
#     original_filename: str,
# ):
#     pass

from app.utils.chunker import split_into_chunks, ChunkMetadata, ChunkResult
from app.services.embed_service import embed_chunks, store_vectors

async def ingest(raw_text: str, metadata: ChunkMetadata) -> list[ChunkResult]:
    # 추출본 -> 청크
    chunks = split_into_chunks(raw_text)

    # 청크 -> 임베딩
    vectors = await embed_chunks(chunks)

    # 임베딩 -> 벡터 저장 -> RDB 저장용 청크 정보 반환
    return await store_vectors(chunks, vectors, metadata)