import httpx
from qdrant_client.models import Filter, FieldCondition, MatchValue
from app.config import get_settings
from app.db.vector_db import get_qdrant_client

settings = get_settings()

# 질문 받아서 임베딩 처리
async def embed_query(query: str) -> list[float]:
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{settings.ollama_base_url}/api/embed",
            json={
                "model": settings.embed_model,
                "input": query,
            },
        )

        data = response.json()
        return data["embeddings"][0]


# 질문 받아서 벡터 db에서 관련 문서 검색
async def search_vectors(query_vector: list[float], user_id: str, limit: int = 5) -> list[dict]:
    client = get_qdrant_client()

    results = await client.query_points(
        collection_name=settings.qdrant_collection_name,
        query=query_vector,
        query_filter=Filter(
            # https://qdrant.tech/documentation/search/filtering/
            # 내 문서이거나 공용문서(인데 내꺼 아닌거) 탐색
            should=[
                # 내 문서
                Filter(
                    must=[
                        FieldCondition(key="user_id", match=MatchValue(value=user_id))
                    ]
                ),
                # 공용 문서 (APPROVED 상태), 그리고 내 문서 아닌거
                Filter(
                    must=[
                        FieldCondition(key="access_type", match=MatchValue(value="PUBLIC")),
                        FieldCondition(key="status", match=MatchValue(value="APPROVED")),
                    ],
                    must_not=[
                        FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                    ]
                ),
            ]
        ),
        limit=limit,
    )

    return [
        {
            "score": r.score,
            "chunk_text": r.payload["chunk_text"],
            "document_id": r.payload["document_id"],
            "filename": r.payload["filename"],
            "page_number": r.payload["page_number"],
            "chunk_index": r.payload["chunk_index"],
        }
        for r in results.points
    ]