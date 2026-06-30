"""RAG 단위 테스트 [담당: 김윤] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/utils/chunker.py (split_into_chunks), app/services/rag_service.py (search_vectors)

규칙: test_<무엇>_<조건>_<기대결과> / AAA / assert 1개 / async는 데코레이터 없음.

설계 노트
  - split_into_chunks는 settings.chunk_size/chunk_overlap에 의존하는 슬라이딩 윈도우.
    실제 설정값에 테스트가 묶이지 않도록, "환경에서 읽은 chunk_size/overlap 기준으로
    겹치며 분할된다"는 성질을 검증한다(절대 청크 개수를 하드코딩하지 않음).
  - search_vectors는 Qdrant 클라이언트(get_qdrant_client)를 통해 query_points를
    호출한다. unit 범위이므로 실제 Qdrant 연결 없이 클라이언트를 mock으로 대체하고,
    query_points()가 돌려주는 결과(.points)만 흉내낸다.
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.config import get_settings
from app.utils.chunker import split_into_chunks
from app.services import rag_service

pytestmark = pytest.mark.unit

settings = get_settings()


# ── 청킹: 긴 텍스트는 여러 청크로 쪼개진다 ──────────────────────────────────
def test_split_into_chunks_long_text_returns_multiple_chunks():
    """chunk_size보다 긴 텍스트는 2개 이상의 청크로 분할된다."""
    # Arrange: 설정된 chunk_size보다 충분히 긴 단어 시퀀스
    raw_text = " ".join(f"단어{i}" for i in range(settings.chunk_size * 3))

    # Act
    chunks = split_into_chunks(raw_text)

    # Assert
    assert len(chunks) > 1


# ── 청킹: 윈도우가 chunk_overlap만큼 겹치며 슬라이딩한다 ────────────────────
def test_split_into_chunks_overlap_shares_words_between_consecutive_chunks():
    """연속된 두 청크는 chunk_overlap에 해당하는 단어를 공유한다."""
    # Arrange: overlap이 의미를 가지려면 최소 2개 청크가 나올 만큼 길어야 함
    raw_text = " ".join(f"단어{i}" for i in range(settings.chunk_size * 3))

    # Act
    chunks = split_into_chunks(raw_text)
    first_words = chunks[0].split()
    second_words = chunks[1].split()

    # Assert: 첫 청크의 뒤쪽 overlap개 단어 == 두번째 청크의 앞쪽 overlap개 단어
    overlap = settings.chunk_overlap
    assert first_words[-overlap:] == second_words[:overlap]


# ── 청킹 엣지: 빈 텍스트는 빈 리스트를 반환한다 ─────────────────────────────
def test_split_into_chunks_empty_text_returns_empty_list():
    """빈 입력은 단어가 없어 while 루프가 돌지 않고 빈 리스트를 반환한다."""
    # Act / Assert
    assert split_into_chunks("") == []


# ── RAG 검색: 덴스 벡터로 검색하면 정렬된 결과 dict 리스트를 반환한다 ───────
async def test_search_vectors_returns_ranked_results(monkeypatch):
    """query_points가 돌려준 포인트들을 score 내림차순 dict 리스트로 변환한다."""
    # Arrange: Qdrant query_points가 돌려줄 가짜 포인트 2개 (이미 score 내림차순)
    fake_points = [
        SimpleNamespace(
            score=0.9,
            payload={
                "chunk_text": "스크립팅 API 설명",
                "document_id": "doc-1",
                "filename": "unity_scripting.pdf",
                "chunk_index": 0,
            },
        ),
        SimpleNamespace(
            score=0.5,
            payload={
                "chunk_text": "MonoBehaviour 콜백",
                "document_id": "doc-1",
                "filename": "unity_scripting.pdf",
                "chunk_index": 1,
            },
        ),
    ]
    fake_client = SimpleNamespace(
        query_points=AsyncMock(return_value=SimpleNamespace(points=fake_points))
    )
    monkeypatch.setattr(rag_service, "get_qdrant_client", lambda: fake_client)

    # Act
    results = await rag_service.search_vectors(
        dense_vector=[0.1, 0.2, 0.3], user_id="user-1"
    )

    # Assert: 핵심 한 가지 — 반환된 결과 첫 항목의 score가 query_points 결과와 일치
    assert results[0]["score"] == 0.9


# ── RAG 검색: document_ids를 넘기면 해당 문서로만 필터링해 검색한다 ─────────
async def test_search_vectors_with_document_ids_applies_document_filter(monkeypatch):
    """document_ids가 주어지면 query_points의 query_filter에 해당 ID들이 반영된다."""
    # Arrange
    fake_client = SimpleNamespace(
        query_points=AsyncMock(return_value=SimpleNamespace(points=[]))
    )
    monkeypatch.setattr(rag_service, "get_qdrant_client", lambda: fake_client)

    # Act
    await rag_service.search_vectors(
        dense_vector=[0.1, 0.2, 0.3],
        user_id="user-1",
        document_ids=["doc-42"],
    )

    # Assert: 핵심 한 가지 — query_filter.must에 document_id=doc-42 조건이 들어갔는가
    _, kwargs = fake_client.query_points.call_args
    document_id_condition = next(
        cond for cond in kwargs["query_filter"].must if cond.key == "document_id"
    )
    assert document_id_condition.match.any == ["doc-42"]