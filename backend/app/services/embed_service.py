import httpx
from loguru import logger

from app.config import get_settings
from app.services.flag_model import get_flag_model

settings = get_settings()

_LOG_INTERVAL = 50  # 몇 청크마다 진행 로그를 찍을지
_MAX_RETRIES = 3    # 청크당 최대 재시도 횟수

# Dense 임베딩 (Ollama)
async def embed_dense(chunks: list[str]) -> list[list[float]]:
    total = len(chunks)
    vectors = []
    async with httpx.AsyncClient(timeout=60) as client:
        i = 0
        while i < total:
            chunk = chunks[i]
            for attempt in range(1, _MAX_RETRIES + 1):
                try:
                    response = await client.post(
                        f"{settings.ollama_base_url}/api/embed",
                        json={"model": settings.embed_model, "input": chunk},
                    )
                    response.raise_for_status()
                    vectors.append(response.json()["embeddings"][0])
                    break
                except Exception as e:
                    if attempt < _MAX_RETRIES:
                        logger.warning(f"[Dense 임베딩] 청크 {i+1}/{total} 실패 (재시도 {attempt}/{_MAX_RETRIES - 1}): {e}")
                    else:
                        logger.error(f"[Dense 임베딩] 청크 {i+1}/{total} 최종 실패, 건너뜀: {e}")
                        vectors.append([])
            i += 1
            if i % _LOG_INTERVAL == 0 or i == total:
                logger.info(f"[Dense 임베딩] {i}/{total} 완료")
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
