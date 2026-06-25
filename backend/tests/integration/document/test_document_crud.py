"""문서 CRUD 통합 테스트 [담당: 남정희] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/crud/document.py (list / bookmark / request_public 등)

외부 의존성: RDB. testcontainers PostgreSQL + schema.sql (선택) 또는 인메모리 세션.
"""
import pytest

pytestmark = pytest.mark.integration


# ── 공용문서 전환 요청: 일반 유저가 요청하면 PENDING 상태가 된다 ────────────
async def test_request_public_sets_status_pending():
    """일반 유저가 request_public 하면 문서가 승인 대기(PENDING)로 바뀐다."""
    pytest.skip("TODO(B): 구현 — RDB 준비(testcontainers 또는 세션 fixture) 후 활성화")
    # from app.crud.document import request_public
    # from app.models.enums import DocumentStatus
    # # Act: await request_public(db, "doc-1", user_id="owner-1")
    # # Assert: 문서.status == DocumentStatus.PENDING
