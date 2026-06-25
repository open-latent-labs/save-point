"""알림 단위 테스트 [담당: 최원익] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/api/notification.py + app/crud/notification.py
"""
import pytest

pytestmark = pytest.mark.unit


# ── 목록: 유저의 알림 목록을 반환한다 ───────────────────────────────────────
async def test_notification_list_returns_user_notifications():
    """해당 유저의 알림만 목록으로 반환한다."""
    pytest.skip("TODO(D): 구현 — 알림 2건(유저A 1, 유저B 1) 준비 후 유저A 조회")
    # from app.crud.notification import notification_list
    # # Act: items = await notification_list(db, user_id="A")
    # # Assert: assert len(items) == 1


# ── 읽음 처리: 알림을 읽음 상태로 바꾼다 ────────────────────────────────────
async def test_notification_read_marks_as_read():
    """notification_read 호출 시 해당 알림이 읽음으로 바뀐다."""
    pytest.skip("TODO(D): 구현")
    # from app.crud.notification import notification_read
    # # Act: await notification_read("noti-1", "A", db)
    # # Assert: 알림.is_read is True
