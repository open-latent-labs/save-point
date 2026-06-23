from loguru import logger

import asyncio
import random
import httpx
import json
from app.config import get_settings

settings = get_settings()

_MAX_RETRIES = 3       # generate 요청 최대 시도 횟수
_BACKOFF_BASE = 0.5    # 지수 백오프 기준 대기 시간(초): 0.5 → 1.0 → 2.0
_MAX_CONCURRENT_REQUESTS = 2  # Ollama 단일 서버 보호: 동시 요청 수 상한

ollama_semaphore = asyncio.Semaphore(_MAX_CONCURRENT_REQUESTS)

# 채팅 SSE
async def generate_stream(prompt: str):
    # 비동기 HTTP 클라이언트 열기
    # AsyncClient -> requests의 비동기 버전 -> Ollama 서버에 HTTP 요청 보낼 때 사용
    # timeout=60 -> 응답 없으면 오류 처리
    async with httpx.AsyncClient(timeout=180) as client:
        async with client.stream(
            "POST",
            f"{settings.ollama_generate_url}",
            json={
                "model": settings.chat_model,
                "prompt": prompt,
                "stream": True, # True -> 토큰 생성 될 때마다 조금씩 전달 (SSE)
            },
        ) as response:
            async for line in response.aiter_lines():
                if not line:
                    continue
                data = json.loads(line)
                if not data.get("done"):
                    yield data.get("response", "")

# 요약
async def generate(
    prompt: str,
    model: str | None = None,
    json_mode: bool = False,
) -> str:
    payload: dict = {
        "model": model or settings.summary_model,
        "prompt": prompt,
        "stream": False,
        "options" : {
            "num_ctx" : 12000,
            "temperature" : 0
        },
    }
    if json_mode:
        payload["format"] = "json"

    last_exc: Exception | None = None
    async with httpx.AsyncClient(timeout=180) as client:
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                async with ollama_semaphore:
                    response = await client.post(
                        f"{settings.ollama_generate_url}",
                        json=payload,
                    )

                logger.info(f"Ollama status: {response.status_code}")

                response.raise_for_status()

                data = response.json()
                return data.get("response", "")

            except httpx.HTTPStatusError as e:
                if e.response.status_code < 500:
                    raise
                last_exc = e  # 5xx(서버 일시 과부하·모델 로딩 등)는 재시도
            except httpx.TransportError as e:
                last_exc = e

            if attempt < _MAX_RETRIES:
                delay = _BACKOFF_BASE * 2 ** (attempt - 1) * (1 + random.random())
                logger.warning(
                    f"[LLM 요청 실패 — 재시도 {attempt}/{_MAX_RETRIES - 1}] "
                    f"{delay}s 후 재시도: {last_exc}"
                )
                await asyncio.sleep(delay)
            else:
                logger.error(f"[LLM 요청 최종 실패] {last_exc}")

    raise last_exc
