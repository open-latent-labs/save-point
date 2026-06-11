# app/pipelines/query_pipeline.py
from app.services.rag_service import search_vectors, embed_query_dense, embed_query_sparse
from app.llm.chat_prompt import build_prompt, none_source_build_prompt
from app.services.reranker import rerank
from app.utils.profiler import profile

async def query(question: str, user_id: str) -> dict:

    dense_vector = await embed_query_dense(question)
    sparse_vector = await embed_query_sparse(question)

    search_results = await search_vectors(dense_vector, sparse_vector, user_id)

    if not search_results:
        return {"prompt": None, "sources": []}

    reranked_results = await rerank(question, search_results, top_k=5)

    if not reranked_results:
        return {"prompt": None, "sources": []}

    prompt = build_prompt(question, reranked_results)

    sources = [
        {
            "document_id": r["document_id"],
            "filename": r["filename"],
            "page_number": r["page_number"],
        }
        for r in reranked_results
    ]

    return {"prompt": prompt, "sources": sources}

# 리소스 확인 용
# async def query(question: str, user_id: str) -> dict:

#     async with profile("임베딩"):
#         dense_vector = await embed_query_dense(question)
#         sparse_vector = await embed_query_sparse(question)

#     async with profile("벡터 검색") as ctx:
#         search_results = await search_vectors(dense_vector, sparse_vector, user_id)
#         ctx["extra"] = f"결과: {len(search_results)}개"

#     if not search_results:
#         return {"prompt": None, "sources": []}

#     # 검색에서 덴스 + 스파스 -> RRF -> 최종 20개 넘어온걸 리랭킹해서 5개만 뽑아냄
#     async with profile("리랭킹") as ctx:
#         reranked_results = await rerank(question, search_results, top_k=5)
#         ctx["extra"] = f"후보 {len(search_results)}개 → Top 5개로 재정렬"

#     if not reranked_results:
#         return {"prompt": None, "sources": []}

#     # 참고문서 넣은 프롬프트 생성
#     prompt = build_prompt(question, reranked_results)

#     # 출처 정리
#     sources = [
#         {
#             "document_id": r["document_id"],
#             "filename": r["filename"],
#             "page_number": r["page_number"],
#         }
#         for r in reranked_results
#     ]

#     # 프롬프트, 출처 반환
#     return {"prompt": prompt, "sources": sources}