import httpx

from app.config import get_settings
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
