import redis.asyncio as redis
from app.config import settings

# decode_responses=True 로 문자열 그대로 다룸.
# max_connections 로 풀 상한을 둬 SSE 다수 커넥션에서도 소켓 폭증 방지.
pool = redis.ConnectionPool.from_url(
    settings.redis_url,
    decode_responses=True,
    max_connections=200,
)


def get_redis() -> redis.Redis:
    return redis.Redis(connection_pool=pool)