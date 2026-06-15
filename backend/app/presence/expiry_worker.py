import asyncio
import json
from datetime import datetime, timezone

from sqlalchemy import update

from app.config import settings
from app.db.rdb import AsyncSessionLocal
from app.models import User
from app.utils.redis_client import get_redis
from app.presence import keys


async def _flush_offline(user_id: str) -> None:
    r = get_redis()

    raw = await r.getdel(keys.last_seen_key(user_id))
    if not raw:
        return  # 이미 다른 경로(ExpiryWatcher 등)에서 처리됨

    last_active = datetime.fromtimestamp(float(raw), tz=timezone.utc)

    async with AsyncSessionLocal() as db:
        await db.execute(
            update(User).where(User.id == user_id).values(last_active_at=last_active)
        )
        await db.commit()

    await r.publish(
        keys.EVENTS_CHANNEL,
        json.dumps({"user_id": user_id, "status": "offline", "ts": last_active.timestamp()}),
    )


async def run() -> None:
    r = get_redis()
    # DB 0번이면 __keyevent@0__:expired
    db_index = settings.redis_url.rsplit("/", 1)[-1] or "0"
    channel = f"__keyevent@{db_index}__:expired"

    pubsub = r.pubsub()
    await pubsub.psubscribe(channel)
    print(f"[expiry-worker] subscribed: {channel}")

    async for msg in pubsub.listen():
        if msg["type"] != "pmessage":
            continue
        expired_key = msg["data"]
        user_id = keys.parse_presence_key(expired_key)
        if user_id is not None:
            try:
                await _flush_offline(user_id)
            except Exception as e:  # 워커가 죽지 않도록 개별 처리
                print(f"[expiry-worker] flush 실패 user={user_id}: {e}")


if __name__ == "__main__":
    asyncio.run(run())