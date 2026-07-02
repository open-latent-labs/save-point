"""Presence service 단위 테스트 [담당: 최원익]
대상: app/presence/service.py
  - heartbeat        : online 전환 및 TTL 연장
  - go_offline       : 명시적 offline 전환 + DB 반영
  - is_online        : 온라인 여부 조회
  - online_user_ids  : 전체 온라인 유저 목록
  - throttled_heartbeat    : 30초 쓰로틀 heartbeat
  - go_offline_on_expiry   : TTL 만료 기반 offline 처리
외부 의존성: Redis=AsyncMock/patch, DB=AsyncMock/patch
"""
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

pytestmark = pytest.mark.unit


# ── 공용 fixture ──────────────────────────────────────────────────────────────

@pytest.fixture
def mock_redis():
    r = AsyncMock()
    r.set = AsyncMock(return_value=None)
    r.get = AsyncMock(return_value=None)
    r.getdel = AsyncMock(return_value=None)
    r.delete = AsyncMock(return_value=0)
    r.expire = AsyncMock()
    r.exists = AsyncMock(return_value=0)
    r.publish = AsyncMock()
    return r


def _make_db_session_cm():
    """AsyncSessionLocal() 이 반환하는 async context manager를 흉내냄."""
    db = AsyncMock()
    db.execute = AsyncMock()
    db.commit = AsyncMock()

    cm = AsyncMock()
    cm.__aenter__ = AsyncMock(return_value=db)
    cm.__aexit__ = AsyncMock(return_value=False)
    return cm, db


# ════════════════════════════════════════════════════════════════════════════
#  heartbeat — online 전환 / TTL 연장
# ════════════════════════════════════════════════════════════════════════════

async def test_heartbeat_publishes_online_event_on_first_seen(mock_redis):
    """최초 heartbeat 시 presence 키가 생성되고 online 이벤트를 publish한다."""
    from app.presence.service import heartbeat

    # last_seen set → None, presence NX set → True(생성 성공 = 신규 online)
    mock_redis.set = AsyncMock(side_effect=[None, True])

    with patch("app.presence.service.get_redis", return_value=mock_redis):
        await heartbeat("user-1")

    mock_redis.publish.assert_awaited_once()
    channel = mock_redis.publish.call_args[0][0]
    assert channel == "presence:events"


async def test_heartbeat_extends_ttl_only_when_already_online(mock_redis):
    """이미 online인 경우 publish 없이 expire로 TTL만 연장한다."""
    from app.presence.service import heartbeat

    # presence NX set → None(생성 실패 = 이미 online)
    mock_redis.set = AsyncMock(side_effect=[None, None])

    with patch("app.presence.service.get_redis", return_value=mock_redis):
        await heartbeat("user-1")

    mock_redis.publish.assert_not_awaited()
    mock_redis.expire.assert_awaited_once()


# ════════════════════════════════════════════════════════════════════════════
#  go_offline — 명시적 로그아웃
# ════════════════════════════════════════════════════════════════════════════

async def test_go_offline_publishes_offline_event(mock_redis):
    """go_offline 호출 시 presence 키를 삭제하고 offline 이벤트를 publish한다."""
    from app.presence.service import go_offline

    mock_redis.delete = AsyncMock(return_value=1)  # 키 삭제 성공
    mock_redis.get = AsyncMock(return_value=str(time.time()))  # last_seen 있음

    cm, _ = _make_db_session_cm()
    with patch("app.presence.service.get_redis", return_value=mock_redis), \
         patch("app.presence.service.AsyncSessionLocal", return_value=cm):
        await go_offline("user-1")

    mock_redis.publish.assert_awaited_once()
    channel = mock_redis.publish.call_args[0][0]
    assert "presence:events" in channel


async def test_go_offline_updates_last_active_at_in_db(mock_redis):
    """go_offline 호출 시 DB의 last_active_at을 갱신한다."""
    from app.presence.service import go_offline

    mock_redis.delete = AsyncMock(return_value=1)
    mock_redis.get = AsyncMock(return_value=str(time.time()))

    cm, db = _make_db_session_cm()
    with patch("app.presence.service.get_redis", return_value=mock_redis), \
         patch("app.presence.service.AsyncSessionLocal", return_value=cm):
        await go_offline("user-1")

    db.execute.assert_awaited_once()
    db.commit.assert_awaited_once()


async def test_go_offline_noop_when_already_offline(mock_redis):
    """이미 offline인 경우(presence 키 없음) DB 업데이트와 publish를 생략한다."""
    from app.presence.service import go_offline

    mock_redis.delete = AsyncMock(return_value=0)  # 키 없음 = 이미 offline

    with patch("app.presence.service.get_redis", return_value=mock_redis):
        await go_offline("user-1")

    mock_redis.publish.assert_not_awaited()
    mock_redis.get.assert_not_awaited()


# ════════════════════════════════════════════════════════════════════════════
#  is_online — 온라인 여부 조회
# ════════════════════════════════════════════════════════════════════════════

async def test_is_online_returns_true_when_presence_key_exists(mock_redis):
    """presence 키가 존재하면 is_online이 True를 반환한다."""
    from app.presence.service import is_online

    mock_redis.exists = AsyncMock(return_value=1)

    with patch("app.presence.service.get_redis", return_value=mock_redis):
        result = await is_online("user-1")

    assert result is True


async def test_is_online_returns_false_when_presence_key_absent(mock_redis):
    """presence 키가 없으면 is_online이 False를 반환한다."""
    from app.presence.service import is_online

    mock_redis.exists = AsyncMock(return_value=0)

    with patch("app.presence.service.get_redis", return_value=mock_redis):
        result = await is_online("user-1")

    assert result is False


# ════════════════════════════════════════════════════════════════════════════
#  online_user_ids — 전체 온라인 목록
# ════════════════════════════════════════════════════════════════════════════

async def test_online_user_ids_returns_all_online_users(mock_redis):
    """scan_iter로 조회한 presence 키에서 user_id를 추출해 리스트로 반환한다."""
    from app.presence.service import online_user_ids

    async def fake_scan_iter(**kwargs):
        yield "presence:user-1"
        yield "presence:user-2"

    mock_redis.scan_iter = fake_scan_iter

    with patch("app.presence.service.get_redis", return_value=mock_redis):
        result = await online_user_ids()

    assert set(result) == {"user-1", "user-2"}


async def test_online_user_ids_returns_empty_when_no_users(mock_redis):
    """온라인 유저가 없으면 빈 리스트를 반환한다."""
    from app.presence.service import online_user_ids

    async def fake_scan_iter(**kwargs):
        return
        yield  # 빈 async generator

    mock_redis.scan_iter = fake_scan_iter

    with patch("app.presence.service.get_redis", return_value=mock_redis):
        result = await online_user_ids()

    assert result == []


# ════════════════════════════════════════════════════════════════════════════
#  throttled_heartbeat — 30초 쓰로틀
# ════════════════════════════════════════════════════════════════════════════

async def test_throttled_heartbeat_calls_heartbeat_when_not_throttled(mock_redis):
    """throttle 키가 없으면(NX 성공) 실제 heartbeat를 호출한다."""
    from app.presence.service import throttled_heartbeat

    mock_redis.set = AsyncMock(return_value=True)  # NX 성공 → 쓰로틀 미적용

    with patch("app.presence.service.get_redis", return_value=mock_redis), \
         patch("app.presence.service.heartbeat", AsyncMock()) as mock_hb:
        await throttled_heartbeat("user-1")

    mock_hb.assert_awaited_once_with("user-1")


async def test_throttled_heartbeat_skips_heartbeat_when_throttled(mock_redis):
    """throttle 키가 있으면(NX 실패) heartbeat를 건너뛴다."""
    from app.presence.service import throttled_heartbeat

    mock_redis.set = AsyncMock(return_value=None)  # NX 실패 → 쓰로틀 적용 중

    with patch("app.presence.service.get_redis", return_value=mock_redis), \
         patch("app.presence.service.heartbeat", AsyncMock()) as mock_hb:
        await throttled_heartbeat("user-1")

    mock_hb.assert_not_awaited()


# ════════════════════════════════════════════════════════════════════════════
#  go_offline_on_expiry — TTL 만료 기반 offline 처리
# ════════════════════════════════════════════════════════════════════════════

async def test_go_offline_on_expiry_updates_db_and_publishes(mock_redis):
    """TTL 만료 시 last_seen으로 DB를 갱신하고 offline 이벤트를 publish한다."""
    from app.presence.service import go_offline_on_expiry

    mock_redis.getdel = AsyncMock(return_value=str(time.time()))  # last_seen 있음

    cm, db = _make_db_session_cm()
    with patch("app.presence.service.get_redis", return_value=mock_redis), \
         patch("app.presence.service.AsyncSessionLocal", return_value=cm):
        await go_offline_on_expiry("user-1")

    db.execute.assert_awaited_once()
    db.commit.assert_awaited_once()
    mock_redis.publish.assert_awaited_once()


async def test_go_offline_on_expiry_noop_when_last_seen_already_consumed(mock_redis):
    """last_seen 키가 없으면(logout 경로에서 이미 처리) DB 업데이트와 publish를 생략한다."""
    from app.presence.service import go_offline_on_expiry

    mock_redis.getdel = AsyncMock(return_value=None)  # last_seen 없음

    with patch("app.presence.service.get_redis", return_value=mock_redis):
        await go_offline_on_expiry("user-1")

    mock_redis.publish.assert_not_awaited()
