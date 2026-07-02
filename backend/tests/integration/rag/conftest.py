"""RAG(Qdrant) 통합테스트 전용 fixture [담당: 김윤].

루트 conftest는 팀 공용이라 손대지 않고, Qdrant 저장/검색 테스트에서만 쓰는
인메모리 Qdrant 클라이언트 fixture를 여기에 둔다.
(플랜: "Qdrant integration = QdrantClient(':memory:')")
"""
import pytest
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams

import app.db.vector_db as vector_db
from app.config import get_settings


@pytest.fixture
async def qdrant_memory(fake_embedder, monkeypatch):
    """인메모리 Qdrant + 실제와 동일한 컬렉션 스키마.

    실제 코드(vector_docs.store_vectors / rag_service.search_vectors)는
    get_qdrant_client()가 돌려주는 전역 클라이언트를 쓰므로, 그 전역을
    인메모리 클라이언트로 바꿔치기한다. 네트워크·서버 없이 저장→검색을 검증한다.

    컬렉션은 init_qdrant_collection()과 똑같이 'dense' 네임드 벡터로 만들되,
    차원은 fake_embedder.dim 에 맞춰 저장 벡터와 어긋나지 않게 한다.
    """
    settings = get_settings()
    client = AsyncQdrantClient(location=":memory:")
    await client.create_collection(
        collection_name=settings.qdrant_collection_name,
        vectors_config={
            "dense": VectorParams(size=fake_embedder.dim, distance=Distance.COSINE),
        },
    )
    monkeypatch.setattr(vector_db, "_qdrant_client", client)

    yield client

    await client.close()
