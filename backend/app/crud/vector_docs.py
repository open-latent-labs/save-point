import uuid
from qdrant_client.models import FieldCondition,Filter,FilterSelector,MatchValue,PointStruct
# from qdrant_client.models import SparseVector  # [SPARSE 비활성화]

from app.config import get_settings
from app.db.vector_db import get_qdrant_client
from app.schemas.chunk import ChunkMetadata, ChunkResult

settings = get_settings()

# 벡터 저장(새 칼럼)
async def store_vectors(
    chunks: list[str],                  # 청크(나눈 텍스트 덩어리)
    dense_vectors: list[list[float]],   # 덴스 벡터
    # sparse_vectors: list[dict],       # [SPARSE 비활성화] 스파스 벡터
    metadata: ChunkMetadata,            # 메타데이터 [문서 id, 유저 id, 문서 타입, 파일 이름, 청크 인덱스, 청크 텍스트. 문서 삭제 상태]
) -> list[ChunkResult]:
    client = get_qdrant_client()
    point_ids = [str(uuid.uuid4()) for _ in chunks]

    points = [
        PointStruct(
            id=point_id,
            vector={
                "dense": dense_vector,
                # [SPARSE 비활성화] sparse 벡터 저장 안 함
                # "sparse": SparseVector(
                #     indices=sparse["indices"],
                #     values=sparse["values"],
                # ),
            },
            payload={
                "document_id": metadata.document_id,
                "user_id": metadata.user_id,
                "access_type": metadata.access_type,
                "filename": metadata.filename,
                "chunk_index": i,
                "chunk_text": chunk,
                "deleted_file": metadata.deleted_file,
            },
        )
        for i, (point_id, chunk, dense_vector) in enumerate(
            zip(point_ids, chunks, dense_vectors)
        )
        # [SPARSE 비활성화] 원래: zip(point_ids, chunks, dense_vectors, sparse_vectors)
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

# 상태 업데이트
    # 가능  :: update_document_payload("doc-1", access_type="PUBLIC")
    # 불가능 :: update_document_payload("doc-1", "PUBLIC")
async def update_document_payload(document_id: str, *, access_type: str | None = None, deleted_file: str | None = None,) -> None:
    payload: dict = {} # 함수 호출시 넘어온 인자값을 저장
    if access_type is not None:
        payload["access_type"] = access_type
    if deleted_file is not None:
        payload["deleted_file"] = deleted_file
    if not payload: # 받은게 없음 -> DB 호출 없이 아웃
        return

    client = get_qdrant_client()
    await client.set_payload(
        collection_name=settings.qdrant_collection_name,
        payload=payload,
        points=FilterSelector(
            filter=Filter(
                must=[
                    FieldCondition(
                        key="document_id", # 일치하는 문서 id의 모든 포인트(청크)를 변경
                        match=MatchValue(value=document_id),
                    )
                ]
            )
        ),
    )
