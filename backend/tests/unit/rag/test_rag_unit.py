"""RAG 단위 테스트 [담당: 김윤] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/utils/chunker.py, app/services/rag_service.py

규칙: test_<무엇>_<조건>_<기대결과> / AAA / assert 1개 / async는 데코레이터 없음.
본문은 채우고 나면 `pytest.skip(...)` 줄을 지우고 아래 주석을 코드로 바꾼다.
"""
import pytest

pytestmark = pytest.mark.unit


# ── 청킹: 긴 텍스트는 여러 청크로 쪼개진다 ──────────────────────────────────
def test_split_into_chunks_long_text_returns_multiple_chunks():
    """chunk_size보다 긴 텍스트는 2개 이상의 청크로 분할된다."""
    pytest.skip("TODO(A): 구현")
    # from app.utils.chunker import split_into_chunks
    # # Arrange
    # raw_text = "문장. " * 500
    # # Act
    # chunks = split_into_chunks(raw_text)
    # # Assert
    # assert len(chunks) > 1


# ── 청킹 엣지: 빈 텍스트는 빈 리스트(또는 정의된 동작) ──────────────────────
def test_split_into_chunks_empty_text_returns_empty_list():
    """빈 입력에 대한 정의된 동작을 검증한다."""
    pytest.skip("TODO(A): 구현 — 실제 동작 확인 후 기대값 확정")
    # from app.utils.chunker import split_into_chunks
    # assert split_into_chunks("") == []


# ── RAG 검색: 임베딩→벡터검색이 결과 리스트를 돌려준다 (FakeEmbedder 사용) ──
async def test_search_vectors_returns_ranked_results(fake_embedder):
    """dense/sparse 벡터로 검색하면 정렬된 결과 dict 리스트를 반환한다."""
    pytest.skip("TODO(A): 구현 — Qdrant 클라이언트는 mock, 임베딩은 fake_embedder")
    # from app.services import rag_service
    # # Arrange: dense = fake_embedder.dense("질문"); sparse = fake_embedder.sparse("질문")
    # #          rag_service가 쓰는 Qdrant 클라이언트를 mock으로 패치
    # # Act: results = await rag_service.search_vectors(dense, sparse, user_id="u1")
    # # Assert: assert isinstance(results, list)
