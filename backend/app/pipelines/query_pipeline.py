from app.services.rag_service import search_vectors, embed_query_dense, embed_query_sparse
from app.llm.chat_prompt import build_prompt, none_source_build_prompt  # noqa: F401 (기존 코드 참고용)
from app.services.reranker import rerank
from app.utils.profiler import profile # 리소스 확인용

NO_DOCS_MESSAGE = '''현재 질문의 답변에 참고할 문서를 찾지 못했습니다. 
                    질문과 관련하여 참고가 될만한 문서를 찾아서 업로드하거나, 
                    답변에 참고할만한 확실한 키워드를 질문과 함께 제공하거나 더 자세히 질문해주세요.'''

# 채팅 파이프라인
async def query(question: str, user_id: str, selected_document_ids: list[str] = []) -> dict:

    dense_vector = await embed_query_dense(question)
    sparse_vector = await embed_query_sparse(question)

    search_results = await search_vectors(
        dense_vector, sparse_vector, user_id,
        document_ids=selected_document_ids if selected_document_ids else None,
    )

    # 문서 못 찾으면 LLM 없이 바로 안내 메시지 반환
    # 기존: none_source_build_prompt로 LLM 호출
    # prompt = none_source_build_prompt(question)
    # return {"prompt": prompt, "sources": []}
    if not search_results:
        return {"prompt": NO_DOCS_MESSAGE, "sources": [], "no_docs": True}

    reranked_results = await rerank(question, search_results, top_k=5)

    # 리랭킹 후에도 없으면 동일하게 안내 메시지 반환
    # 기존: none_source_build_prompt로 LLM 호출
    # prompt = none_source_build_prompt(question)
    # return {"prompt": prompt, "sources": []}
    if not reranked_results:
        return {"prompt": NO_DOCS_MESSAGE, "sources": [], "no_docs": True}

    # 정상 프롬프트
    prompt = build_prompt(question, reranked_results)

    sources = [
        {
            "document_id": r["document_id"],
            "filename": r["filename"],
        }
        for r in reranked_results
    ]

    return {"prompt": prompt, "sources": sources}

''' 리소스 확인 용 코드
async def query(question: str, user_id: str) -> dict:

    async with profile("임베딩"):
        dense_vector = await embed_query_dense(question)
        sparse_vector = await embed_query_sparse(question)

    async with profile("벡터 검색") as ctx:
        search_results = await search_vectors(dense_vector, sparse_vector, user_id)
        ctx["extra"] = f"결과: {len(search_results)}개"

    if not search_results:
        return {"prompt": None, "sources": []}

    # 검색에서 덴스 + 스파스 -> RRF -> 최종 20개 넘어온걸 리랭킹해서 5개만 뽑아냄
    async with profile("리랭킹") as ctx:
        reranked_results = await rerank(question, search_results, top_k=5)
        ctx["extra"] = f"후보 {len(search_results)}개 → Top 5개로 재정렬"

    if not reranked_results:
        return {"prompt": None, "sources": []}

    # 참고문서 넣은 프롬프트 생성
    prompt = build_prompt(question, reranked_results)

    # 출처 정리
    sources = [
        {
            "document_id": r["document_id"],
            "filename": r["filename"],
            "page_number": r["page_number"],
        }
        for r in reranked_results
    ]

    # 프롬프트, 출처 반환
    return {"prompt": prompt, "sources": sources}
'''