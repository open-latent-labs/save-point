import httpx
import asyncio
from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchAny, SparseVector, FusionQuery, Fusion, Prefetch
from app.config import get_settings
from app.db.vector_db import get_qdrant_client
from app.services.flag_model import get_flag_model

settings = get_settings()

# DENSE :: 의미 기반 
# 질문을 임베딩(숫자 리스트)로 변경
async def embed_query_dense(query: str) -> list[float]:
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{settings.ollama_base_url}/api/embed",
            json={"model": settings.embed_model, "input": query},
        )
        return response.json()["embeddings"][0]

# SPARSE :: 키워드 기반 
# 질문을 임베딩(숫자 리스트)로 변경
def _run_sparse(query: str) -> dict:
    # 같은 bge 모델을 사용하는데 왜 SPARSE 모드로 사용하겠다고 따로 모델을 불러와야하는가?
    # 설정만 변경하면 되는게 아닌지?
    # -> 올라마는 dense 벡터만 반환하기 때문에.(과일 가게긴 한데 여긴 망고만 팔지 애플 망고는 안 판다는 소리)
    # sparse는 bge-m3의 lexical_weights를 직접 뽑아야 하는데, 이건 FlagEmbedding 라이브러리를 통해서만 접근 가능
    # = 올라마가 쓰려는 모드를 지원 안해서 다른 루트로 모델 가져온다는 뜻
    model = get_flag_model()

    # SPARSE를 사용하게 변경
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

# 스파스 임베딩은 스레드 풀로 비동기 동작하게 하는 중.
# 덴스 임베딩 -> 올라마에 HTTP 요청을 보내기 때문에 애당초 비동기.
# 스파스 임베딩 -> cpu에서 직접 연산하기 때문에 블로깅 발생(동기)
async def embed_query_sparse(query: str) -> dict:
    return await asyncio.to_thread(_run_sparse, query)


# 질문을 덴스 임베딩, 스파스 임베딩 한걸 가져와서 벡터 db에 검색
async def search_vectors(dense_vector: list[float], sparse_vector: dict, user_id: str, limit: int = 20, document_ids: list[str] | None = None) -> list[dict]:
    client = get_qdrant_client()

    if document_ids:
        # 사용자가 직접 선택한 문서만 검색
        search_filter = Filter(
            must=[
                FieldCondition(key="document_id", match=MatchAny(any=document_ids)),
            ],
            must_not=[
                FieldCondition(key="deleted_file", match=MatchValue(value="yes")),
            ],
        )
    else:
        # 기존 방식: 내 문서 + 승인된 공용 문서 전체 검색
        search_filter = Filter(
            must_not=[
                FieldCondition(key="deleted_file", match=MatchValue(value="yes")),
            ],
            should=[
                Filter(
                    must=[
                        FieldCondition(key="user_id", match=MatchValue(value=user_id))
                    ]
                ),
                Filter(
                    must=[
                        FieldCondition(key="access_type", match=MatchValue(value="PUBLIC")),
                    ],
                    must_not=[
                        FieldCondition(key="user_id", match=MatchValue(value=user_id)),
                    ]
                ),
            ]
        )

    # 위에서 필터된 문서에서
    # 
    results = await client.query_points(
        collection_name=settings.qdrant_collection_name,
        # 덴스, 스파스 모두 20개씩 뽑음 (총 40개: 중복되면 더 적을 수 있음)
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

        # 두 결과를 합쳐서 의미도 유사하고, 키워드 점수도 높은 문서만 골라내기
        # 덴스 픽, 스파스 픽 둘 다 받은 애가 점수 높음
        query=FusionQuery(fusion=Fusion.RRF),  # RRF로 두 결과 합치기
        query_filter=search_filter,
        limit=limit,
    )

    # 찾은 문서 확인용 (터미널)
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
    ]