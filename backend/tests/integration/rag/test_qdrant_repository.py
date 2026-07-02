"""Qdrant 리포지토리 통합 테스트 [담당: 김윤] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/crud/vector_docs.py(store_vectors, 저장) + app/services/rag_service.py(search_vectors, 검색)

외부 의존성: QdrantClient(":memory:") 로컬 모드(conftest의 qdrant_memory) + FakeEmbedder(결정적 벡터).
실제 Ollama/네트워크 없이 store→search 파이프라인과 검색 필터를 검증한다.
"""
import pytest

from app.crud.vector_docs import store_vectors
from app.schemas.chunk import ChunkMetadata
from app.services.rag_service import search_vectors

pytestmark = pytest.mark.integration


def _metadata(**overrides) -> ChunkMetadata:
    """저장에 필요한 청크 메타데이터. 테스트마다 필요한 필드만 덮어쓴다."""
    defaults = dict(
        document_id="doc-1",
        user_id="user-1",
        access_type="PRIVATE",
        filename="unity_scripting.pdf",
        page_number=1,
        chunk_index=0,
        chunk_text="unused-in-payload",  # payload의 chunk_text는 chunks 인자에서 채워짐
        deleted_file="no",
    )
    defaults.update(overrides)
    return ChunkMetadata(**defaults)


# ── 해피패스: 저장 후 같은 벡터로 검색하면 방금 넣은 문서가 나온다 ────────────
async def test_store_then_search_returns_inserted_chunk(fake_embedder, qdrant_memory):
    """store_vectors로 넣은 청크를 동일 임베딩으로 검색하면 결과에 포함된다."""
    # Arrange: 결정적 임베딩으로 청크 1개 저장 (소유자 user-1)
    chunk = "MonoBehaviour.Update runs once every frame."
    await store_vectors(
        [chunk],
        [fake_embedder.dense(chunk)],
        _metadata(document_id="doc-A", user_id="user-1"),
    )

    # Act: 같은 텍스트의 벡터로 user-1이 검색
    results = await search_vectors(fake_embedder.dense(chunk), "user-1")

    # Assert: 핵심 한 가지 — 넣은 document_id가 검색 결과에 있다
    assert any(r["document_id"] == "doc-A" for r in results)


# ── 엣지: 소프트 삭제(deleted_file="yes")된 청크는 검색에서 제외된다 ──────────
async def test_search_excludes_soft_deleted_chunk(fake_embedder, qdrant_memory):
    """deleted_file='yes'로 저장한 청크는 소유자가 검색해도 나오지 않는다."""
    # Arrange: 소프트 삭제 표시된 내 문서
    chunk = "This physics note was soft-deleted."
    await store_vectors(
        [chunk],
        [fake_embedder.dense(chunk)],
        _metadata(document_id="doc-deleted", user_id="user-1", deleted_file="yes"),
    )

    # Act
    results = await search_vectors(fake_embedder.dense(chunk), "user-1")

    # Assert
    assert all(r["document_id"] != "doc-deleted" for r in results)


# ── 엣지: 남의 비공개(PRIVATE) 문서는 검색에서 제외된다 ─────────────────────
async def test_search_excludes_other_users_private_chunk(fake_embedder, qdrant_memory):
    """다른 유저 소유의 PRIVATE 청크는 내 검색 결과에 포함되지 않는다."""
    # Arrange: user-2가 소유한 비공개 문서
    chunk = "Private design notes owned by another user."
    await store_vectors(
        [chunk],
        [fake_embedder.dense(chunk)],
        _metadata(document_id="doc-other", user_id="user-2", access_type="PRIVATE"),
    )

    # Act: user-1이 검색
    results = await search_vectors(fake_embedder.dense(chunk), "user-1")

    # Assert
    assert all(r["document_id"] != "doc-other" for r in results)
