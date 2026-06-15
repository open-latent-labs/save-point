import uuid
from qdrant_client.models import FieldCondition,Filter,FilterSelector,MatchValue,PointStruct,SparseVector

from app.config import get_settings
from app.db.vector_db import get_qdrant_client
from app.schemas.chunk import ChunkMetadata, ChunkResult

settings = get_settings()

# 벡터 저장(새 칼럼)
async def store_vectors(
    chunks: list[str],
    dense_vectors: list[list[float]],
    sparse_vectors: list[dict],
    metadata: ChunkMetadata,
) -> list[ChunkResult]:
    client = get_qdrant_client()
    point_ids = [str(uuid.uuid4()) for _ in chunks]

    points = [
        PointStruct(
            id=point_id,
            vector={
                "dense": dense_vector,
                "sparse": SparseVector(
                    indices=sparse["indices"],
                    values=sparse["values"],
                ),
            },
            payload={
                "document_id": metadata.document_id,
                "user_id": metadata.user_id,
                "access_type": metadata.access_type,
                "filename": metadata.filename,
                "page_number": metadata.page_number,
                "chunk_index": i,
                "chunk_text": chunk,
                "deleted_file": "none",
            },
        )
        for i, (point_id, chunk, dense_vector, sparse) in enumerate(
            zip(point_ids, chunks, dense_vectors, sparse_vectors)
        )
    ]

    await client.upsert(
        collection_name=settings.qdrant_collection_name,
        points=points,
    )

    return [
        ChunkResult(
            vector_point_id=point_id,
            chunk_index=i,
            chunk_text=chunk,
            page_number=metadata.page_number,
        )
        for i, (point_id, chunk) in enumerate(zip(point_ids, chunks))
    ]

# 상태 업데이튼
async def update_document_payload(document_id: str, *, access_type: str | None = None, deleted_file: str | None = None,) -> None:
    payload: dict = {}
    if access_type is not None:
        payload["access_type"] = access_type
    if deleted_file is not None:
        payload["deleted_file"] = deleted_file
    if not payload:
        return

    client = get_qdrant_client()
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
