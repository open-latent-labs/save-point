# rag_service.py
import httpx
from qdrant_client.models import Filter, FieldCondition, MatchValue, SparseVector, FusionQuery, Fusion, Prefetch
from app.config import get_settings
from app.db.vector_db import get_qdrant_client
from app.services.flag_model import get_flag_model

settings = get_settings()


# 질문 받아서 임베딩 처리
async def embed_query_dense(query: str) -> list[float]:
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{settings.ollama_base_url}/api/embed",
            json={"model": settings.embed_model, "input": query},
        )
        return response.json()["embeddings"][0]


def embed_query_sparse(query: str) -> dict:
    model = get_flag_model()
    output = model.encode(
        [query],
        return_dense=False,
        return_sparse=True,
        return_colbert_vecs=False,
    )
    lexical_weights = output["lexical_weights"][0]
    return {
        "indices": [int(k) for k in lexical_weights.keys()],
        "values": [float(v) for v in lexical_weights.values()],
    }


# 질문 받아서 벡터 db에서 관련 문서 검색
async def search_vectors(dense_vector: list[float], sparse_vector: dict, user_id: str, limit: int = 5) -> list[dict]:
    client = get_qdrant_client()

    search_filter = Filter(
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
    )

    results = await client.query_points(
        collection_name=settings.qdrant_collection_name,
        prefetch=[
            Prefetch(query=dense_vector, using="dense", limit=20),
            Prefetch(
                query=SparseVector(
                    indices=sparse_vector["indices"],
                    values=sparse_vector["values"],
                ),
                using="sparse",
                limit=20,
            ),
        ],
        query=FusionQuery(fusion=Fusion.RRF),  # RRF로 두 결과 합치기
        query_filter=search_filter,
        limit=limit,
    )

    # 찾은 문서 확인용
    print(f"\n[벡터 검색 결과]")
    for r in results.points:
        print(f"  score: {r.score:.4f} | {r.payload['filename']} p.{r.payload['page_number']} chunk_{r.payload['chunk_index']}")
    print()

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
        # if r.score >= 0.5
    ]