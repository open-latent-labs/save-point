# pipelines/query_pipeline.py
from app.services.rag_service import search_vectors, embed_query_dense, embed_query_sparse
from app.llm.chat_prompt import build_prompt
# from app.services.reranker import rerank
import time
import psutil
import os

async def query(question: str, user_id: str) -> dict:
    process = psutil.Process(os.getpid())

    # ── Dense + Sparse 임베딩 ──
    start = time.time()
    ram_before = process.memory_info().rss / 1024 / 1024
    cpu_before = process.cpu_percent(interval=None)

    dense_vector = await embed_query_dense(question)
    sparse_vector = embed_query_sparse(question)

    ram_after = process.memory_info().rss / 1024 / 1024
    cpu_after = process.cpu_percent(interval=None)
    print(f"\n{'='*60}")
    print(f"[임베딩]")
    print(f"  소요 시간: {time.time() - start:.2f}초")
    print(f"  CPU 사용률: {cpu_after:.1f}%")
    print(f"  RAM 사용량: {ram_after:.1f}MB (변화: {ram_after - ram_before:+.1f}MB)")
    print(f"{'='*60}")

    # ── 벡터 검색 ──
    start = time.time()
    ram_before = process.memory_info().rss / 1024 / 1024
    cpu_before = process.cpu_percent(interval=None)

    search_results = await search_vectors(dense_vector, sparse_vector, user_id)

    ram_after = process.memory_info().rss / 1024 / 1024
    cpu_after = process.cpu_percent(interval=None)
    print(f"[벡터 검색]")
    print(f"  소요 시간: {time.time() - start:.2f}초")
    print(f"  CPU 사용률: {cpu_after:.1f}%")
    print(f"  RAM 사용량: {ram_after:.1f}MB (변화: {ram_after - ram_before:+.1f}MB)")
    print(f"  결과: {len(search_results)}개")
    print(f"{'='*60}")

    if not search_results:
        return {"prompt": None, "sources": []}

    # ── 리랭킹 ──
    # reranked_results = rerank(question, search_results, top_k=3)
    # print(f"{'='*60}")

    # if not reranked_results:
    #     return {"prompt": None, "sources": []}

    # ── 프롬프트 구성 ──
    prompt = build_prompt(question, search_results)

    # 찾은 문서 데이터(출처)
    sources = [
        {
            "document_id": r["document_id"],
            "filename": r["filename"],
            "page_number": r["page_number"],
        }
        for r in search_results
    ]

    return {"prompt": prompt, "sources": sources}