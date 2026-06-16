import json
import time
from datetime import datetime, timezone

from sqlalchemy import update

from app.config import settings
from app.db.rdb import AsyncSessionLocal
from app.models.user import User
from app.utils.redis_client import get_redis
from app.presence import keys


async def _publish(event: str, user_id: str) -> None:
    r = get_redis()
    await r.publish(
        keys.EVENTS_CHANNEL,
        json.dumps({"user_id": user_id, "status": event, "ts": time.time()}),
    )


async def heartbeat(user_id: str) -> None:
    """online 전환 또는 TTL 연장. 신규 online 전환일 때만 이벤트 발행."""
    r = get_redis()
    now = str(time.time())

    # last_seen 은 항상 갱신 (offline flush 시 정확한 시각 확보)
    await r.set(keys.last_seen_key(user_id), now)

    # NX: 키가 없을 때만 생성 성공 → 신규 online 전환 신호
    created = await r.set(keys.presence_key(user_id), now, ex=settings.presence_ttl, nx=True)
    if created:
        await _publish("online", user_id)
    else:
        # 이미 online → TTL만 연장 (publish 안 함)
        await r.expire(keys.presence_key(user_id), settings.presence_ttl)


async def go_offline(user_id: str) -> None:
    """명시적 로그아웃 또는 SSE 연결 종료 시 호출.
    presence 키 삭제 → last_active_at DB 반영 → last_seen 정리 → offline 이벤트 발행."""
    r = get_redis()
    deleted = await r.delete(keys.presence_key(user_id))
    if not deleted:
        return  # 이미 offline (중복 호출 방어)

    raw = await r.get(keys.last_seen_key(user_id))
    last_active = (
        datetime.fromtimestamp(float(raw), tz=timezone.utc) if raw else datetime.now(timezone.utc)
    )

    async with AsyncSessionLocal() as db:
        await db.execute(
            update(User).where(User.id == user_id).values(last_active_at=last_active)
        )
        await db.commit()

    await r.delete(keys.last_seen_key(user_id))
    await _publish("offline", user_id)


async def is_online(user_id: str) -> bool:
    r = get_redis()
    return bool(await r.exists(keys.presence_key(user_id)))


async def online_user_ids() -> list[str]:
    """초기 스냅샷용. 대규모에서는 SCAN으로 논블로킹 순회."""
    r = get_redis()
    result: list[str] = []
    async for key in r.scan_iter(match=f"{keys.PRESENCE_PREFIX}*", count=500):
        uid = keys.parse_presence_key(key)
        if uid is not None:
            result.append(uid)
    return result


_THROTTLE_SECONDS = 30


async def throttled_heartbeat(user_id: str) -> None:
    """API 미들웨어용. 30초에 한 번만 heartbeat를 실제로 실행한다.
    hb_throttle:{user_id} 키의 NX SET이 성공한 경우에만 heartbeat를 호출하여
    Redis write를 초당 수십 번 발생시키지 않도록 제한한다."""
    r = get_redis()
    throttle_key = f"hb_throttle:{user_id}"
    if await r.set(throttle_key, "1", ex=_THROTTLE_SECONDS, nx=True):
        await heartbeat(user_id)


async def go_offline_on_expiry(user_id: str) -> None:
    """presence key TTL 만료 시 호출.
    getdel로 last_seen을 원자적으로 획득+삭제하여 중복 처리를 방지한다.
    presence key는 이미 만료되었으므로 삭제를 시도하지 않는다."""
    r = get_redis()
    raw = await r.getdel(keys.last_seen_key(user_id))
    if not raw:
        return  # 이미 logout/SSE disconnect 경로에서 처리됨

    last_active = datetime.fromtimestamp(float(raw), tz=timezone.utc)
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(User).where(User.id == user_id).values(last_active_at=last_active)
        )
        await db.commit()
    await _publish("offline", user_id)
