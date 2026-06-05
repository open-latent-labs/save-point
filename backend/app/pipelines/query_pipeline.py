from typing import AsyncGenerator
from qdrant_client import AsyncQdrantClient

# TODO: 검색 파이프라인 구현
async def run_search_pipeline(
    vector_db: AsyncQdrantClient,
    query: str,
    top_k: int = 10,
    category: str | None = None,
) -> list[dict]:
    pass


# TODO: RAG 챗봇 SSE 파이프라인 구현
async def run_chat_pipeline(
    vector_db: AsyncQdrantClient,
    query: str,
    top_k: int = 5,
) -> AsyncGenerator[str, None]:
    pass
