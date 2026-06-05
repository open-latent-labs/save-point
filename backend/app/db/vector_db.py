from qdrant_client import AsyncQdrantClient
from app.config import get_settings

settings = get_settings()

_qdrant_client: AsyncQdrantClient | None = None


def get_qdrant_client() -> AsyncQdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = AsyncQdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port,
        )
    return _qdrant_client


async def init_collection() -> None:
    # TODO: 컬렉션 없으면 생성하는 로직 작성
    pass
