import httpx
from loguru import logger

from app.config import get_settings
from app.llm.ollama_client import ollama_semaphore
# from app.services.flag_model import get_flag_model  # [SPARSE 비활성화]


settings = get_settings()

_LOG_INTERVAL = 50  # 몇 청크마다 진행 로그를 찍을지
_MAX_RETRIES = 3    # 청크당 최대 재시도 횟수

# Dense 임베딩 (Ollama)
async def embed_dense(chunks: list[str]) -> list[list[float]]:
    total = len(chunks)
    vectors = []
    async with httpx.AsyncClient(timeout=300) as client:
        for batch_start in range(0, total, _LOG_INTERVAL):
            batch = chunks[batch_start:batch_start + _LOG_INTERVAL]
            batch_end = min(batch_start + _LOG_INTERVAL, total)
            batch_success = False

            for attempt in range(1, _MAX_RETRIES + 1):
                try:
                    async with ollama_semaphore:
                        response = await client.post(
                            f"{settings.ollama_embed_url}",
                            json={"model": settings.embed_model, "input": batch},
                        )
                    response.raise_for_status()
                    vectors.extend(response.json()["embeddings"])
                    batch_success = True
                    break
                except Exception as e:
                    if attempt < _MAX_RETRIES:
                        logger.warning(f"[Dense 임베딩] 배치 {batch_start+1}~{batch_end}/{total} 실패 (재시도 {attempt}/{_MAX_RETRIES - 1}): {e}")
                    else:
                        logger.warning(f"[Dense 임베딩] 배치 {batch_start+1}~{batch_end}/{total} 최종 실패, 청크 단위 fallback: {e}")

            if not batch_success:
                for j, chunk in enumerate(batch):
                    global_idx = batch_start + j
                    for attempt in range(1, _MAX_RETRIES + 1):
                        try:
                            async with ollama_semaphore:
                                response = await client.post(
                                    f"{settings.ollama_base_url}/api/embed",
                                    json={"model": settings.embed_model, "input": chunk},
                                )
                            response.raise_for_status()
                            vectors.append(response.json()["embeddings"][0])
                            break
                        except Exception as e:
                            if attempt < _MAX_RETRIES:
                                logger.warning(f"[Dense 임베딩] 청크 {global_idx+1}/{total} 실패 (재시도 {attempt}/{_MAX_RETRIES - 1}): {e}")
                            else:
                                logger.error(f"[Dense 임베딩] 청크 {global_idx+1}/{total} 최종 실패, 건너뜀: {e}")
                                vectors.append([])

            logger.info(f"[Dense 임베딩] {batch_end}/{total} 완료")
    return vectors


# [SPARSE 비활성화] Sparse 임베딩 (FlagEmbedding) — 덴스+리랭킹으로 전환
'''def embed_sparse(chunks: list[str]) -> list[dict]:
    model = get_flag_model()
    total = len(chunks)
    sparse_vectors = []
    for batch_start in range(0, total, _LOG_INTERVAL):
        batch = chunks[batch_start:batch_start + _LOG_INTERVAL]
        batch_end = min(batch_start + _LOG_INTERVAL, total)
        batch_success = False

        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                output = model.encode(
                    batch,
                    return_dense=False,
                    return_sparse=True,
                    return_colbert_vecs=False,
                )
                for lexical_weights in output["lexical_weights"]:
                    indices = [int(k) for k in lexical_weights.keys()]
                    values = [float(v) for v in lexical_weights.values()]
                    sparse_vectors.append({"indices": indices, "values": values})
                batch_success = True
                break
            except Exception as e:
                if attempt < _MAX_RETRIES:
                    logger.warning(f"[Sparse 임베딩] 배치 {batch_start+1}~{batch_end}/{total} 실패 (재시도 {attempt}/{_MAX_RETRIES - 1}): {e}")
                else:
                    logger.warning(f"[Sparse 임베딩] 배치 {batch_start+1}~{batch_end}/{total} 최종 실패, 청크 단위 fallback: {e}")

        if not batch_success:
            for j, chunk in enumerate(batch):
                global_idx = batch_start + j
                for attempt in range(1, _MAX_RETRIES + 1):
                    try:
                        output = model.encode(
                            [chunk],
                            return_dense=False,
                            return_sparse=True,
                            return_colbert_vecs=False,
                        )
                        lexical_weights = output["lexical_weights"][0]
                        indices = [int(k) for k in lexical_weights.keys()]
                        values = [float(v) for v in lexical_weights.values()]
                        sparse_vectors.append({"indices": indices, "values": values})
                        break
                    except Exception as e:
                        if attempt < _MAX_RETRIES:
                            logger.warning(f"[Sparse 임베딩] 청크 {global_idx+1}/{total} 실패 (재시도 {attempt}/{_MAX_RETRIES - 1}): {e}")
                        else:
                            logger.error(f"[Sparse 임베딩] 청크 {global_idx+1}/{total} 최종 실패, 건너뜀: {e}")
                            sparse_vectors.append({"indices": [], "values": []})

        logger.info(f"[Sparse 임베딩] {batch_end}/{total} 완료")
    return sparse_vectors'''