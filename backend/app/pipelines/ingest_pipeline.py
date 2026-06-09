# ingest_pipeline.py
from app.utils.chunker import split_into_chunks, ChunkMetadata, ChunkResult
from app.services.embed_service import embed_dense, embed_sparse, store_vectors

async def ingest(raw_text: str, metadata: ChunkMetadata) -> list[ChunkResult]:
    # 추출본 -> 청크
    chunks = split_into_chunks(raw_text)

    # 청크 -> Dense 임베딩
    dense_vectors = await embed_dense(chunks)

    # 청크 -> Sparse 임베딩
    sparse_vectors = embed_sparse(chunks)

    # 임베딩 -> 벡터 저장 -> RDB 저장용 청크 정보 반환
    return await store_vectors(chunks, dense_vectors, sparse_vectors, metadata)