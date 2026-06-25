"""권한/승인 단위 테스트 [담당: 조형우] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/crud/superAdmin.py(change_role 등), app/crud/admin.py(승인 흐름)

※ "진짜 로직"(권한 분기·승인 흐름)이라 API로만 덮지 말고 로직 계층 단위 테스트 필수.
"""
import pytest

pytestmark = pytest.mark.unit


# ── 역할 변경: USER → ADMIN 으로 승격된다 ───────────────────────────────────
async def test_change_role_user_to_admin_promotes():
    """USER 유저에 change_role을 적용하면 ADMIN으로 바뀐다."""
    pytest.skip("TODO(C): 구현 — db 세션은 인메모리/mock, 대상 유저는 USER로 준비")
    # from app.crud.superAdmin import change_role
    # from app.models.enums import UserRole
    # # Arrange: USER 1명, body.id=그 유저, body.role != "ADMIN"
    # # Act: user = await change_role(db, body, user_id="super-1")
    # # Assert: assert user.role == UserRole.ADMIN


# ── 역할 변경 엣지: 없는 유저면 404 ─────────────────────────────────────────
async def test_change_role_missing_user_raises_404():
    """존재하지 않는 유저에 change_role 호출 시 HTTPException(404)."""
    pytest.skip("TODO(C): 구현")
    # from fastapi import HTTPException
    # from app.crud.superAdmin import change_role
    # with pytest.raises(HTTPException) as exc:
    #     await change_role(db, body_with_unknown_id, user_id="super-1")
    # assert exc.value.status_code == 404


# ── 승인 흐름: 관리자가 승인하면 문서가 APPROVED 가 된다 ────────────────────
async def test_admin_approved_docs_sets_status_approved():
    """admin_approved_docs 호출 시 문서 상태가 APPROVED로 전환된다."""
    pytest.skip("TODO(C): 구현 — PENDING 문서 준비 후 승인 → 상태 검증")
    # from app.crud.admin import admin_approved_docs
    # from app.models.enums import DocumentStatus
    # # Assert: 문서.status == DocumentStatus.APPROVED
