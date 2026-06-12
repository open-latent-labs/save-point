import httpx
import uuid
from qdrant_client.models import PointStruct, SparseVector

from app.config import get_settings
from app.db.vector_db import get_qdrant_client
from app.schemas.chunk import ChunkMetadata, ChunkResult
from app.services.flag_model import get_flag_model

settings = get_settings()

# Dense 임베딩 (Ollama)
async def embed_dense(chunks: list[str]) -> list[list[float]]:
    vectors = []
    async with httpx.AsyncClient(timeout=60) as client:
        for chunk in chunks:
            response = await client.post(
                f"{settings.ollama_base_url}/api/embed",
                json={
                    "model": settings.embed_model,
                    "input": chunk,
                },
            )
            data = response.json()
            vectors.append(data["embeddings"][0])
    return vectors


# Sparse 임베딩 (FlagEmbedding)
def embed_sparse(chunks: list[str]) -> list[dict]:
    model = get_flag_model()
    output = model.encode(
        chunks,
        return_dense=False,
        return_sparse=True,
        return_colbert_vecs=False,
    )
    sparse_vectors = []
    for lexical_weights in output["lexical_weights"]:
        indices = [int(k) for k in lexical_weights.keys()]
        values = [float(v) for v in lexical_weights.values()]
        sparse_vectors.append({"indices": indices, "values": values})
    return sparse_vectors


# 벡터 저장
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