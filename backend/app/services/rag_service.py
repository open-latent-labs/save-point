import httpx
import asyncio
from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchAny
# from qdrant_client.models import SparseVector, FusionQuery, Fusion, Prefetch  # [SPARSE 비활성화] 하이브리드 → 덴스 전환
from app.config import get_settings
from app.db.vector_db import get_qdrant_client
# from app.services.flag_model import get_flag_model  # [SPARSE 비활성화]

settings = get_settings()

# DENSE :: 의미 기반 
# 질문을 임베딩(숫자 리스트)로 변경
async def embed_query_dense(query: str) -> list[float]:
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{settings.ollama_embed_url}",
            json={"model": settings.embed_model, "input": query},
        )
        return response.json()["embeddings"][0]

# ===================스파스============================== [SPARSE 비활성화 - 덴스+리랭킹으로 전환]

# # 스파스 임베딩은 스레드 풀로 비동기 동작하게 하는 중.
# # 덴스 임베딩 -> 올라마에 HTTP 요청을 보내기 때문에 애당초 비동기.
# # 스파스 임베딩 -> cpu에서 직접 연산하기 때문에 블로깅 발생(동기)
# async def embed_query_sparse(query: str) -> dict:
#     return await asyncio.to_thread(_run_sparse, query)
#
# # SPARSE :: 키워드 기반
# # 질문을 임베딩(숫자 리스트)로 변경
# def _run_sparse(query: str) -> dict:
#     # 같은 bge 모델을 사용하는데 왜 SPARSE 모드로 사용하겠다고 따로 모델을 불러와야하는가?
#     # 설정만 변경하면 되는게 아닌지? -> 올라마는 dense 벡터만 반환하기 때문에.
#     # sparse는 bge-m3의 lexical_weights를 직접 뽑아야 하는데, 이건 FlagEmbedding 라이브러리를 통해서만 접근 가능
#     # = 올라마가 쓰려는 모드를 지원 안해서 다른 루트로 모델 가져온다는 뜻
#     model = get_flag_model()
#
#     # SPARSE를 사용하게 변경
#     output = model.encode(
#         [query],
#         return_dense=False,
#         return_sparse=True,
#         return_colbert_vecs=False,
#     )
#
#     lexical_weights = output["lexical_weights"][0]
#
#     return {
#         "indices": [int(k) for k in lexical_weights.keys()],
#         "values": [float(v) for v in lexical_weights.values()],
#     }

# ====================검색========================

# 질문을 덴스 임베딩 한걸 가져와서 벡터 db에 검색 (덴스+리랭킹 모드)
async def search_vectors(dense_vector: list[float], user_id: str, limit: int = 20, document_ids: list[str] | None = None,
                         sparse_vector: dict | None = None) -> list[dict]:  # [SPARSE 비활성화] sparse_vector 파라미터 잔존
    client = get_qdrant_client()

    if document_ids:
        # 사용자가 직접 선택한 문서만 검색
        search_filter = Filter(
            must=[
                FieldCondition(key="document_id", match=MatchAny(any=document_ids)), # 내꺼 (공용문서도 불러오게 수정해야함)
            ],
            must_not=[
                FieldCondition(key="deleted_file", match=MatchValue(value="yes")), # 소프트 제거 제외
            ],
        )
    else:
        # 기존 방식: 내 문서 + 승인된 공용 문서 전체 검색
        search_filter = Filter(
            must_not=[
                FieldCondition(key="deleted_file", match=MatchValue(value="yes")), # 소프트 제거 제외
            ],
            should=[
                Filter(
                    must=[
                        FieldCondition(key="user_id", match=MatchValue(value=user_id)) # 내꺼 전체
                    ]
                ),
                Filter(
                    must=[
                        FieldCondition(key="access_type", match=MatchValue(value="PUBLIC")), # 공용 전체
                    ],
                    must_not=[
                        FieldCondition(key="user_id", match=MatchValue(value=user_id)), # 그런데 이제 내꺼 아닌거(내껀 위에서 다 불렀음)
                    ]
                ),
            ]
        )

    # ── 덴스 검색 (실제 사용) ────────────────────────────────
    dense_results = await client.query_points(
        collection_name=settings.qdrant_collection_name,
        query=dense_vector,
        using="dense",
        query_filter=search_filter,
        limit=limit,
    )
    print(f"\n[덴스 검색 결과]")
    for r in dense_results.points:
        print(f"  score: {r.score:.4f} | {r.payload['filename']} chunk_{r.payload['chunk_index']}")
    print()

    # ── 스파스 단독 (로깅용) ─────────────────────────────────  [SPARSE 비활성화]
    # sparse_results = await client.query_points(
    #     collection_name=settings.qdrant_collection_name,
    #     query=SparseVector(
    #         indices=sparse_vector["indices"],
    #         values=sparse_vector["values"],
    #     ),
    #     using="sparse",
    #     query_filter=search_filter,
    #     limit=20,
    # )
    # print(f"\n[스파스 검색 결과]")
    # for r in sparse_results.points:
    #     print(f"  score: {r.score:.4f} | {r.payload['filename']} chunk_{r.payload['chunk_index']}")

    # ── 덴스 + 스파스 RRF 퓨전 ───────────────────────────────  [SPARSE 비활성화]
    # results = await client.query_points(
    #     collection_name=settings.qdrant_collection_name,
    #     prefetch=[
    #         Prefetch(query=dense_vector, using="dense", limit=20),
    #         Prefetch(
    #             query=SparseVector(
    #                 indices=sparse_vector["indices"],
    #                 values=sparse_vector["values"],
    #             ),
    #             using="sparse",
    #             limit=20,
    #         ),
    #     ],
    #     query=FusionQuery(fusion=Fusion.RRF),
    #     query_filter=search_filter,
    #     limit=limit,
    # )
    # print(f"\n[RRF 퓨전 결과]")
    # for r in results.points:
    #     print(f"  score: {r.score:.4f} | {r.payload['filename']} chunk_{r.payload['chunk_index']}")
    # print()

    return [
        {
            "score": r.score,
            "chunk_text": r.payload["chunk_text"],
            "document_id": r.payload["document_id"],
            "filename": r.payload["filename"],
            "chunk_index": r.payload["chunk_index"],
        }
        for r in dense_results.points
    ]