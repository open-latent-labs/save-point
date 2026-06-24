from loguru import logger

import httpx
import json
from app.config import get_settings

settings = get_settings()

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
                
                "options" : {
                    "num_ctx" : 12000,
                },
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
    }
    if json_mode:
        payload["format"] = "json"

    async with httpx.AsyncClient(timeout=180) as client:
        response = await client.post(
            f"{settings.ollama_generate_url}",
            json=payload,
        )

        logger.info(f"Ollama status: {response.status_code}")

        response.raise_for_status()

        data = response.json()
        return data.get("response", "")
