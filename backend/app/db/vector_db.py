from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams
# from qdrant_client.models import SparseVectorParams, SparseIndexParams  # [SPARSE 비활성화]
from app.config import get_settings

# https://qdrant.tech/documentation/
# config 설정값 불러오기 + qdrant 클라이언트 변수 전역 설정
settings = get_settings()
_qdrant_client: AsyncQdrantClient | None = None

# qdrant 연결 클라이언트 생성(최초 1회, 이후 재사용)
def get_qdrant_client() -> AsyncQdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = AsyncQdrantClient(
            host=settings.qdrant_host,
            port=settings.qdrant_port,
        )
    return _qdrant_client

# 컬렉션(테이블) 검사 및 미보유시 생성
async def init_qdrant_collection() -> None:
    client = get_qdrant_client()

    existing = await client.collection_exists(settings.qdrant_collection_name)
    if not existing:
        await client.create_collection(
            collection_name=settings.qdrant_collection_name,
            vectors_config={
                "dense": VectorParams(
                    size=settings.embed_dim,
                    distance=Distance.COSINE,
                )
            },
            # [SPARSE 비활성화] sparse 컬렉션 설정 제거
            # sparse_vectors_config={
            #     "sparse": SparseVectorParams(
            #         index=SparseIndexParams(on_disk=False)
            #     )
            # },
        )

# 종료시 연결 닫기(세션 느낌)
async def close_qdrant_client() -> None:
    global _qdrant_client
    if _qdrant_client is not None:
        await _qdrant_client.close()
        _qdrant_client = None
