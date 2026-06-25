"""요약 문서 라우트 단위 테스트 [담당: 최원익] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/api/summary.py + app/crud/summary.py (요약 문서 조회/수정/삭제)
"""
import pytest

pytestmark = pytest.mark.unit


# ── 조회: 문서 id로 요약 문서를 가져온다 ────────────────────────────────────
async def test_document_content_returns_summary():
    """존재하는 document_id로 요약 본문을 조회한다."""
    pytest.skip("TODO(D): 구현 — db는 인메모리/mock, 대상 문서 1건 준비")
    # from app.crud.summary import document_content
    # # Act: result = await document_content(db, "doc-1")
    # # Assert: assert result is not None


# ── 삭제: 본인 문서를 삭제한다 ──────────────────────────────────────────────
async def test_delete_document_owner_removes_doc():
    """소유자가 자신의 문서를 삭제하면 정상 처리된다."""
    pytest.skip("TODO(D): 구현 — 소유자/비소유자 분기까지 검증 권장")
    # from app.crud.summary import delete_documnet
    # # Act: await delete_documnet(db, "doc-1", user_id="owner-1")
    # # Assert: 삭제 결과/상태 검증
