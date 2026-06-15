from app.utils.chunker import split_into_chunks
from app.schemas.chunk import ChunkMetadata, ChunkResult
from app.services.embed_service import embed_dense, embed_sparse, store_vectors

async def ingest(raw_text: str, metadata: ChunkMetadata) -> list[ChunkResult]:
    # 추출본 -> (청킹) -> 청크
    chunks = split_into_chunks(raw_text)

    # 청크 -> (Dense 임베딩) -> 덴스 벡터
    dense_vectors = await embed_dense(chunks)

    # 청크 -> Sparse 임베딩 -> 스파스 벡터
    sparse_vectors = embed_sparse(chunks)

    # 벡터+페이로드 -> 벡터 저장 -> RDB 저장용 청크 정보 반환
    return await store_vectors(chunks, dense_vectors, sparse_vectors, metadata)