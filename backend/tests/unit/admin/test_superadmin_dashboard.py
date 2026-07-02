"""superAdmin 대시보드·목록 단위 테스트 [담당: 최원익]
대상:
  - app/crud/superAdmin.py  all_user_list, dashboard_num, get_user_role_log
외부 의존성: DB=AsyncMock, UserResponse.model_validate=patch
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.enums import UserBan, UserRole

pytestmark = pytest.mark.unit


# ── 공용 fixture ──────────────────────────────────────────────────────────────

@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.add = MagicMock()
    return db


def _scalar_result(value):
    """db.execute(...).scalar() 가 value를 반환하도록 설정."""
    r = MagicMock()
    r.scalar.return_value = value
    return r


def _scalars_result(items):
    """db.execute(...).scalars().all() 가 items를 반환하도록 설정."""
    r = MagicMock()
    r.scalars.return_value.all.return_value = items
    return r


def _make_user(role: UserRole = UserRole.USER, ban: UserBan = UserBan.UNBAN):
    u = MagicMock()
    u.id = "user-1"
    u.email = "user@example.com"
    u.name = "테스트유저"
    u.user_id = "testuser"
    u.role = role
    u.ban = ban
    u.upload_file_count = 0
    u.ask_count = 0
    u.img_url = None
    u.created_at = datetime.now(timezone.utc)
    u.updated_at = datetime.now(timezone.utc)
    u.last_active_at = None
    u.is_active = True
    return u


# ════════════════════════════════════════════════════════════════════════════
#  all_user_list — 페이지네이션
# ════════════════════════════════════════════════════════════════════════════

async def test_all_user_list_returns_correct_pagination_meta(mock_db):
    """all_user_list 호출 시 total/page/page_size/total_pages가 올바르게 계산된다."""
    from app.crud.superAdmin import all_user_list
    from app.schemas.superAdmin import UserListQuery

    mock_db.execute.side_effect = [
        _scalar_result(15),       # COUNT 쿼리
        _scalars_result([]),      # 유저 목록 쿼리
    ]

    with patch("app.crud.superAdmin.UserResponse.model_validate", side_effect=lambda u: u):
        body = UserListQuery(page=2, size=8)
        result = await all_user_list(mock_db, body)

    assert result["total"] == 15
    assert result["page"] == 2
    assert result["page_size"] == 8
    assert result["total_pages"] == 2  # ceil(15 / 8) = 2


async def test_all_user_list_returns_users_from_db(mock_db):
    """all_user_list 호출 시 DB에서 가져온 유저 목록을 반환한다."""
    from app.crud.superAdmin import all_user_list
    from app.schemas.superAdmin import UserListQuery

    users = [_make_user() for _ in range(3)]
    mock_db.execute.side_effect = [
        _scalar_result(3),
        _scalars_result(users),
    ]

    with patch("app.crud.superAdmin.UserResponse.model_validate", side_effect=lambda u: u):
        body = UserListQuery(page=1, size=8)
        result = await all_user_list(mock_db, body)

    assert len(result["users"]) == 3


async def test_all_user_list_executes_count_and_select_queries(mock_db):
    """all_user_list 호출 시 COUNT와 SELECT 두 번의 DB 쿼리를 실행한다."""
    from app.crud.superAdmin import all_user_list
    from app.schemas.superAdmin import UserListQuery

    mock_db.execute.side_effect = [
        _scalar_result(0),
        _scalars_result([]),
    ]

    with patch("app.crud.superAdmin.UserResponse.model_validate", side_effect=lambda u: u):
        await all_user_list(mock_db, UserListQuery(page=1, size=8))

    assert mock_db.execute.call_count == 2


# ════════════════════════════════════════════════════════════════════════════
#  dashboard_num — 집계 숫자
# ════════════════════════════════════════════════════════════════════════════

async def test_dashboard_num_returns_all_four_count_fields(mock_db):
    """dashboard_num 호출 시 total/active/blocked/admin 네 가지 집계값을 반환한다."""
    from app.crud.superAdmin import dashboard_num

    mock_db.execute.side_effect = [
        _scalar_result(100),   # 전체 유저
        _scalar_result(70),    # 활성 유저
        _scalar_result(30),    # 정지 유저
        _scalar_result(5),     # 관리자
    ]

    result = await dashboard_num(mock_db)

    assert result["total"] == 100
    assert result["active"] == 70
    assert result["blocked"] == 30
    assert result["admin"] == 5


async def test_dashboard_num_all_zeros_when_no_users(mock_db):
    """유저가 없을 때 dashboard_num은 모든 값이 0인 딕셔너리를 반환한다."""
    from app.crud.superAdmin import dashboard_num

    mock_db.execute.side_effect = [
        _scalar_result(0),
        _scalar_result(0),
        _scalar_result(0),
        _scalar_result(0),
    ]

    result = await dashboard_num(mock_db)

    assert result == {"total": 0, "active": 0, "admin": 0, "blocked": 0}


# ════════════════════════════════════════════════════════════════════════════
#  get_user_role_log — 권한 변경 이력
# ════════════════════════════════════════════════════════════════════════════

async def test_get_user_role_log_returns_formatted_rows(mock_db):
    """get_user_role_log 호출 시 역할 변경 이력이 딕셔너리 리스트로 반환된다."""
    from app.crud.superAdmin import get_user_role_log

    log = MagicMock()
    log.id = 1
    log.before_role = MagicMock()
    log.before_role.value = "USER"
    log.after_role = MagicMock()
    log.after_role.value = "ADMIN"
    log.reason = "USER에서 ADMIN으로 변경"
    log.created_at = datetime.now(timezone.utc)

    result_mock = MagicMock()
    result_mock.all.return_value = [(log, "슈퍼관리자")]
    mock_db.execute.return_value = result_mock

    rows = await get_user_role_log(mock_db, "user-1")

    assert len(rows) == 1
    assert rows[0]["before_role"] == "USER"
    assert rows[0]["after_role"] == "ADMIN"
    assert rows[0]["changed_by_name"] == "슈퍼관리자"
    assert rows[0]["reason"] == "USER에서 ADMIN으로 변경"


async def test_get_user_role_log_empty_returns_empty_list(mock_db):
    """이력이 없는 유저에 get_user_role_log 호출 시 빈 리스트를 반환한다."""
    from app.crud.superAdmin import get_user_role_log

    result_mock = MagicMock()
    result_mock.all.return_value = []
    mock_db.execute.return_value = result_mock

    rows = await get_user_role_log(mock_db, "unknown-user")

    assert rows == []
