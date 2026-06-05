from qdrant_client import AsyncQdrantClient

# TODO: 쿼리 임베딩 후 Qdrant 유사 청크 검색 구현

async def search_similar_chunks(
    client: AsyncQdrantClient,
    query: str,
    top_k: int = 5,
    category: str | None = None,
) -> list[dict]:
    pass
