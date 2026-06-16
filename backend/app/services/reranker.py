import asyncio
from sentence_transformers import CrossEncoder
from app.config import get_settings
settings = get_settings()

_reranker = None
RERANK_SCORE_THRESHOLD = 0.7 # 리랭킹 임계값

# 싱글톤 구조
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

    reranker = get_reranker()
    # 리랭커 용 질문-문서 쌍 포장
    pairs = [(question, r["chunk_text"]) for r in search_results] 

    # 점수 예측
    scores = await asyncio.to_thread(reranker.predict, pairs)

    # 높은 순서대로 정렬
    reranked = sorted(zip(scores, search_results), key=lambda x: x[0], reverse=True)

    # 결과 확인용(터미널)
    print(f"\n[리랭킹 결과]")
    for score, result in reranked:
        filtered_mark = "" if score >= RERANK_SCORE_THRESHOLD else " ← 필터됨"
        print(f"  score: {score:.4f} | {result['filename']} p.{result['page_number']} chunk_{result['chunk_index']}{filtered_mark}")
    print()

    # 지정한 임계값에 따라 필터링
    filtered = [result for score, result in reranked if score >= RERANK_SCORE_THRESHOLD]

    # 전부 임계값 이하인 경우
    if not filtered:
        print(f"  ⚠️ 임계값({RERANK_SCORE_THRESHOLD}) 이상 결과 없음\n")

    return filtered[:top_k]