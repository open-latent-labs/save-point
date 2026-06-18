import asyncio
import httpx
from sentence_transformers import CrossEncoder
from app.config import get_settings

settings = get_settings()

_reranker = None

# 싱글톤 구조 (로컬 모드에서만 사용)
def get_reranker() -> CrossEncoder:
    global _reranker
    if _reranker is None:
        print("리랭커 모델 로드 중...")
        _reranker = CrossEncoder(settings.rerank_model)
        print("리랭커 모델 로드 완료")
    return _reranker


async def rerank(question: str, search_results: list[dict], top_k: int = 5) -> list[dict]:
    if not search_results:
        return []

    if settings.rerank_url:
        return await _rerank_remote(question, search_results, top_k)
    return await _rerank_local(question, search_results, top_k)


async def _rerank_local(question: str, search_results: list[dict], top_k: int) -> list[dict]:
    reranker = get_reranker()
    pairs = [(question, r["chunk_text"]) for r in search_results]
    scores = await asyncio.to_thread(reranker.predict, pairs)
    reranked = sorted(zip(scores, search_results), key=lambda x: x[0], reverse=True)

    print(f"\n[리랭킹 결과 - 로컬]")
    for score, result in reranked:
        print(f"  score: {score:.4f} | {result['filename']} chunk_{result['chunk_index']}")
    print()

    return [result for _, result in reranked[:top_k]]


async def _rerank_remote(question: str, search_results: list[dict], top_k: int) -> list[dict]:
    """RunPod TEI 호환 엔드포인트 호출.
    Request:  POST RERANK_URL  {"query": "...", "texts": [...]}
    Response: [{"index": 0, "score": 0.99}, ...]
    """
    texts = [r["chunk_text"] for r in search_results]

    async with httpx.AsyncClient() as client:
        response = await client.post(
            settings.rerank_url,
            json={"query": question, "texts": texts},
            timeout=30.0,
        )
        response.raise_for_status()

    ranked = sorted(response.json(), key=lambda x: x["score"], reverse=True)

    print(f"\n[리랭킹 결과 - RunPod]")
    for item in ranked:
        result = search_results[item["index"]]
        print(f"  score: {item['score']:.4f} | {result['filename']} chunk_{result['chunk_index']}")
    print()

    return [search_results[item["index"]] for item in ranked[:top_k]]
