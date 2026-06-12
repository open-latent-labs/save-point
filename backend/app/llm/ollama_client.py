import httpx
import json
from app.config import get_settings

settings = get_settings()
   
# 스트리밍 버전
async def generate_stream(prompt: str):
    # 비동기 HTTP 클라이언트 열기
    # AsyncClient -> requests의 비동기 버전 -> Ollama 서버에 HTTP 요청 보낼 때 사용
    # timeout=60 -> 응답 없으면 오류 처리
    async with httpx.AsyncClient(timeout=180) as client:
        async with client.stream(
            "POST",
            f"{settings.ollama_base_url}/api/generate",
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

# 스트리밍 없는 버전 (필요할 때 쓸 수도 있어서 남겨둠)
# async def generate(prompt: str) -> str:
#     async with httpx.AsyncClient(timeout=60) as client:
#         response = await client.post(
#             f"{settings.ollama_base_url}/api/generate",
#             json={
#                 "model": settings.chat_model,
#                 "prompt": prompt,
#                 "stream": False, # False -> LLM 답변 전체 완료 후 전달
#             },
#         )
#         data = response.json()
#         return data["response"]

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
            f"{settings.ollama_base_url}/api/generate",
            json=payload,
        )
        data = response.json()
        return data.get("response", "")