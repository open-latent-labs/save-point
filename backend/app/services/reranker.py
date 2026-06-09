# services/reranker.py
import time
import psutil
import os
from sentence_transformers import CrossEncoder

_reranker = None

RERANK_SCORE_THRESHOLD = 0.01  # 이 값 조정하면서 테스트

def get_reranker() -> CrossEncoder:
    global _reranker
    if _reranker is None:
        print("리랭커 모델 로드 중...")
        _reranker = CrossEncoder("BAAI/bge-reranker-v2-m3")
        print("리랭커 모델 로드 완료")
    return _reranker


def rerank(question: str, search_results: list[dict], top_k: int = 3) -> list[dict]:
    if not search_results:
        return []

    reranker = get_reranker()
    process = psutil.Process(os.getpid())

    # 리소스 측정 시작
    start_time = time.time()
    cpu_before = process.cpu_percent(interval=None)
    ram_before = process.memory_info().rss / 1024 / 1024

    # 질문 + 각 청크 쌍으로 점수 매기기
    pairs = [(question, r["chunk_text"]) for r in search_results]
    scores = reranker.predict(pairs)

    # 리소스 측정 종료
    elapsed = time.time() - start_time
    cpu_after = process.cpu_percent(interval=None)
    ram_after = process.memory_info().rss / 1024 / 1024

    print(f"\n[리랭킹 리소스]")
    print(f"  소요 시간: {elapsed:.2f}초")
    print(f"  CPU 사용률: {cpu_after:.1f}%")
    print(f"  RAM 사용량: {ram_after:.1f}MB (변화: {ram_after - ram_before:+.1f}MB)")
    print(f"  후보 {len(search_results)}개 → Top {top_k}개로 재정렬")

    # 점수 높은 순으로 재정렬
    reranked = sorted(zip(scores, search_results), key=lambda x: x[0], reverse=True)

    # 점수 출력
    print(f"\n[리랭킹 결과]")
    for score, result in reranked:
        filtered_mark = "" if score >= RERANK_SCORE_THRESHOLD else " ← 필터됨"
        print(f"  score: {score:.4f} | {result['filename']} p.{result['page_number']} chunk_{result['chunk_index']}{filtered_mark}")
    print()

    # 임계값 미만 제거 후 top_k 반환
    filtered = [result for score, result in reranked if score >= RERANK_SCORE_THRESHOLD]

    if not filtered:
        print(f"  ⚠️ 임계값({RERANK_SCORE_THRESHOLD}) 이상 결과 없음\n")

    return filtered[:top_k]