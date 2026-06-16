PRESENCE_PREFIX = "presence:"     # presence:{user_id}  -> online 마커 (TTL)
LAST_SEEN_PREFIX = "last_seen:"   # last_seen:{user_id} -> 마지막 heartbeat unix ts
EVENTS_CHANNEL = "presence:events"  # 상태 변경 Pub/Sub 채널


def presence_key(user_id: str) -> str:
    return f"{PRESENCE_PREFIX}{user_id}"


def last_seen_key(user_id: str) -> str:
    return f"{LAST_SEEN_PREFIX}{user_id}"


def parse_presence_key(key: str) -> str | None:
    if key.startswith(PRESENCE_PREFIX):
        uid = key[len(PRESENCE_PREFIX):]
        return uid if uid else None
    return None
