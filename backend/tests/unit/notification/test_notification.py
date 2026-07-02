"""알림 단위 테스트 [담당: 최원익] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/api/notification.py + app/crud/notification.py
외부 의존성: DB=AsyncMock
"""
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.enums import NotificationType

pytestmark = pytest.mark.unit


# ── 공용 fixture ──────────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.add = MagicMock()
    return db


def _make_notification(**overrides):
    noti = MagicMock()
    defaults = {
        "id": "noti-1",
        "type": NotificationType.DOCUMENT_APPROVED,
        "ref_id": 1,
        "message": "문서가 승인되었습니다.",
        "is_read": False,
        "read_at": None,
        "created_at": None,
    }
    defaults.update(overrides)
    for key, value in defaults.items():
        setattr(noti, key, value)
    return noti


def _db_all_returns(mock_db, rows):
    """db.execute(...).all() 이 rows를 반환하도록 설정."""
    result = MagicMock()
    result.all.return_value = rows
    mock_db.execute.return_value = result


def _db_scalar_returns(mock_db, value):
    """db.execute(...).scalar_one_or_none() 이 value를 반환하도록 설정."""
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    mock_db.execute.return_value = result


# ── 목록: 유저의 알림 목록을 반환한다 ───────────────────────────────────────
async def test_notification_list_returns_user_notifications(mock_db):
    """해당 유저의 미확인 알림이 document_id와 함께 items로 반환된다."""
    from app.crud.notification import notification_list

    # Arrange
    noti = _make_notification()
    _db_all_returns(mock_db, [(noti, "doc-1")])

    # Act
    result = await notification_list(mock_db, user_id="A")

    # Assert
    assert result["items"][0]["id"] == "noti-1"


# ── 목록 엣지: 알림이 없으면 빈 목록을 반환한다 ─────────────────────────────
async def test_notification_list_returns_empty_when_no_notifications(mock_db):
    """조회 결과가 없으면 items가 빈 리스트다."""
    from app.crud.notification import notification_list

    # Arrange
    _db_all_returns(mock_db, [])

    # Act
    result = await notification_list(mock_db, user_id="A")

    # Assert
    assert result["items"] == []


# ── 카운트: 유저의 미확인 알림 개수를 반환한다 ──────────────────────────────
async def test_notification_count_returns_unread_count(mock_db):
    """notification_count 는 db가 돌려준 미확인 개수를 그대로 반환한다."""
    from app.crud.notification import notification_count

    # Arrange
    _db_scalar_returns(mock_db, 3)

    # Act
    count = await notification_count(mock_db, user_id="A")

    # Assert
    assert count == 3


# ── 읽음 처리: 알림을 읽음 상태로 바꾼다 ────────────────────────────────────
async def test_notification_read_marks_as_read(mock_db):
    """notification_read 호출 시 UPDATE 실행 후 commit 된다."""
    from app.crud.notification import notification_read

    # Act
    await notification_read("noti-1", "A", mock_db)

    # Assert
    mock_db.execute.assert_awaited_once()
    mock_db.commit.assert_awaited_once()
