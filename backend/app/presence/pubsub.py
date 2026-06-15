import asyncio
import contextlib

from app.utils.redis_client import get_redis
from app.presence import keys


class PubSubManager:
    """인스턴스(프로세스)당 1개. Redis presence:events 를 1회만 구독하고
    로컬에 등록된 모든 SSE 큐로 메시지를 분배한다."""

    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue] = set()
        self._task: asyncio.Task | None = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        self._task = asyncio.create_task(self._listen())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task

    async def _listen(self) -> None:
        r = get_redis()
        pubsub = r.pubsub()
        await pubsub.subscribe(keys.EVENTS_CHANNEL)
        try:
            async for msg in pubsub.listen():
                if msg["type"] != "message":
                    continue
                data = msg["data"]
                # 등록된 모든 SSE 큐에 비차단 분배 (느린 클라이언트가 전체를 막지 않도록)
                for q in list(self._subscribers):
                    try:
                        q.put_nowait(data)
                    except asyncio.QueueFull:
                        pass  # 느린 소비자는 드롭 (presence는 최신 상태가 중요)
        finally:
            await pubsub.unsubscribe(keys.EVENTS_CHANNEL)
            await pubsub.aclose()

    async def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._subscribers.add(q)
        return q

    async def unsubscribe(self, q: asyncio.Queue) -> None:
        async with self._lock:
            self._subscribers.discard(q)


manager = PubSubManager()


class ExpiryWatcher:
    """Redis keyspace 알림을 구독해 presence:{user_id} 키 TTL 만료를 감지한다.
    만료 감지 시 go_offline_on_expiry를 호출해 Dashboard에 offline 이벤트를 전달한다."""

    def __init__(self) -> None:
        self._task: asyncio.Task | None = None

    async def start(self) -> None:
        self._task = asyncio.create_task(self._watch())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task

    async def _watch(self) -> None:
        from loguru import logger
        from app.presence import service

        r = get_redis()
        try:
            # 기존 설정에 E(keyevent), x(expired) 플래그만 추가 — 기존 설정 보존
            current = await r.config_get("notify-keyspace-events")
            current_val = current.get("notify-keyspace-events", "")
            new_val = current_val
            if "E" not in new_val:
                new_val += "E"
            if "x" not in new_val:
                new_val += "x"
            if new_val != current_val:
                await r.config_set("notify-keyspace-events", new_val)
        except Exception as e:
            logger.warning(
                f"[ExpiryWatcher] Redis keyspace notifications 활성화 실패 "
                f"— presence TTL 만료 감지 비활성화됨: {e}"
            )
            return

        pubsub = r.pubsub()
        await pubsub.subscribe("__keyevent@0__:expired")
        logger.info("[ExpiryWatcher] presence key 만료 감지 시작")
        try:
            async for msg in pubsub.listen():
                if msg["type"] != "message":
                    continue
                key = msg["data"]
                uid = keys.parse_presence_key(key)
                if uid:
                    with contextlib.suppress(Exception):
                        await service.go_offline_on_expiry(uid)
        finally:
            with contextlib.suppress(Exception):
                await pubsub.unsubscribe("__keyevent@0__:expired")
                await pubsub.aclose()


expiry_watcher = ExpiryWatcher()