"""Qdrant 리포지토리 통합 테스트 [담당: 김윤] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/crud/vector_docs.py (저장/검색)

외부 의존성: QdrantClient(":memory:") 로컬 모드 + FakeEmbedder(결정적 벡터).
실제 Ollama/네트워크 없이 store→search 파이프라인을 검증한다.
"""
import pytest

pytestmark = pytest.mark.integration


# ── 저장 후 검색하면 방금 넣은 문서가 상위로 나온다 ─────────────────────────
async def test_store_then_search_returns_inserted_chunk(fake_embedder):
    """store_vectors로 넣은 청크를 같은 벡터로 검색하면 결과에 포함된다."""
    pytest.skip("TODO(A): 구현 — QdrantClient(':memory:')로 컬렉션 생성 후 저장/검색")
    # from qdrant_client import QdrantClient
    # # Arrange: client = QdrantClient(":memory:")
    # #          컬렉션을 fake_embedder.dim 차원으로 생성
    # #          vec = fake_embedder.dense("청크 텍스트")  # 결정적
    # # Act: 저장 후 동일 쿼리 벡터로 검색
    # # Assert: 넣은 document_id 가 결과에 있음
