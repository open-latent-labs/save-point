from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams,SparseVectorParams, SparseIndexParams
from app.config import get_settings
from qdrant_client.models import Filter, FieldCondition, MatchValue, FilterSelector

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
            sparse_vectors_config={
                "sparse": SparseVectorParams(
                    index=SparseIndexParams(on_disk=False)
                )
            },
        )

# 종료시 연결 닫기(세션 느낌)
async def close_qdrant_client() -> None:
    global _qdrant_client
    if _qdrant_client is not None:
        await _qdrant_client.close()
        _qdrant_client = None

# ========================================================

# 문서 삭제
async def delete_document(document_id: str) -> None:
    """document_id에 해당하는 벡터 전부 삭제"""
    client = get_qdrant_client()
    await client.delete(
        collection_name=settings.qdrant_collection_name,
        points_selector=FilterSelector(
            filter=Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id),
                    )
                ]
            )
        ),
    )


# 문서 상태 업데이트 (승인/거절 시)
async def update_document_status(
    document_id: str,
    new_status: str,
    new_access_type: str | None = None,
) -> None:
    """문서 상태 변경 시 Qdrant payload 동기화"""
    client = get_qdrant_client()

    payload = {"status": new_status}
    if new_access_type is not None:
        payload["access_type"] = new_access_type

    await client.set_payload(
        collection_name=settings.qdrant_collection_name,
        payload=payload,
        points=FilterSelector(
            filter=Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id),
                    )
                ]
            )
        ),
    )