from typing import AsyncGenerator
from qdrant_client import AsyncQdrantClient

# TODO: RAG 검색 후 LLM 스트리밍 응답 구현

async def stream_chat_response(
    client: AsyncQdrantClient,
    query: str,
    top_k: int = 5,
) -> AsyncGenerator[str, None]:
    pass
