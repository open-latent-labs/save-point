import asyncio
import httpx
from sentence_transformers import CrossEncoder
from app.config import get_settings

settings = get_settings()

_reranker = None

# 리랭크 점수 threshold (rank-1 제외, 2위~top_k에만 적용)
RERANK_SCORE_THRESHOLD = 0.1

# 싱글톤 구조 (로컬 모드에서만 사용)
def get_reranker() -> CrossEncoder:
    global _reranker
    if _reranker is None:
        print("리랭커 모델 로드 중...")
        _reranker = CrossEncoder(settings.rerank_model)
        print("리랭커 모델 로드 완료")
    return _reranker


# 덴스-스파스 40개 문서 가져와서 top_k만큼 거름
async def rerank(question: str, search_results: list[dict], top_k: int = 5) -> list[dict]:
    if not search_results:
        return []

    if settings.rerank_url:
        return await _rerank_remote(question, search_results, top_k)
    return await _rerank_local(question, search_results, top_k)


async def _rerank_local(question: str, search_results: list[dict], top_k: int) -> list[dict]:
    reranker = get_reranker()

    # 리랭커 용 질문-문서 쌍 포장
    pairs = [(question, r["chunk_text"]) for r in search_results]
    scores = await asyncio.to_thread(reranker.predict, pairs)

    # 높은 순서대로 정렬
    reranked = sorted(zip(scores, search_results), key=lambda x: x[0], reverse=True)

    # 결과 확인용(터미널)
    print(f"\n[리랭킹 결과 - 로컬]")
    for score, result in reranked:
        print(f"  score: {score:.4f} | {result['filename']} chunk_{result['chunk_index']}")
    print()

    # rank-1(가장 높은 점수)은 threshold 무관 항상 통과.
    # far-paraphrase 질의에서는 reranker가 정답을 1위로 정확히 찾아도 절대 점수가
    # 낮게(0.02~0.09대) 나오는 경우가 있어, 그런 경우까지 threshold로 걸러내고 있었음.
    # near-paraphrase는 1위가 거의 항상 threshold를 넘기고 있어서 이 변경으로 영향 없음.
    # rank 2~top_k는 기존과 동일하게 threshold 적용 (애매한 후보 컷 기능 유지).
    return [
        result
        for rank, (score, result) in enumerate(reranked[:top_k])
        if rank == 0 or score > RERANK_SCORE_THRESHOLD
    ]


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

    # 높은 순서대로 정렬
    ranked = sorted(response.json(), key=lambda x: x["score"], reverse=True)

    # 결과 확인용(터미널)
    print(f"\n[리랭킹 결과 - RunPod]")
    for item in ranked:
        result = search_results[item["index"]]
        print(f"  score: {item['score']:.4f} | {result['filename']} chunk_{result['chunk_index']}")
    print()

    # rank-1은 threshold 무관 항상 통과 (_rerank_local과 동일한 이유, 동일한 정책)
    return [
        search_results[item["index"]]
        for rank, item in enumerate(ranked[:top_k])
        if rank == 0 or item["score"] > RERANK_SCORE_THRESHOLD
    ]