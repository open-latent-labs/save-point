"""가짜 Ollama 응답/스트림 빌더 [담당: 김윤, 남정희] — 실제 LLM 서버 없이 httpx 호출을 채운다.

ollama_client.py 의 두 호출 형태에 맞춘다.
  1) generate (요약/분류): POST {ollama_generate_url} → JSON {"response": "..."}
  2) chat   (SSE 스트림): POST {ollama_chat_url} → NDJSON 줄들
        각 줄: {"message": {"content": "<토큰>"}, "done": false}
        마지막: {"done": true}
     (client는 done이 아닌 줄의 message.content 만 yield)

응답 "바디 빌더"와, respx에 라우트를 바로 거는 "헬퍼"를 함께 제공한다.
실 호출이 httpx이므로 respx가 그대로 가로챈다.

사용 예)
    from tests.support import fake_ollama
    fake_ollama.respond_generate(respx_mock, '{"category":"UI","summary_ko":"..."}')
    fake_ollama.respond_chat_stream(respx_mock, ["안", "녕"])
"""
from __future__ import annotations

import json

import httpx


# ── generate (단발 요약/분류) ───────────────────────────────────────────────
def generate_body(response_text: str) -> dict:
    """Ollama generate 응답 바디. response_text는 LLM이 낸 문자열(JSON 문자열일 수도)."""
    return {"response": response_text}


def respond_generate(respx_mock, response_text: str, *, status_code: int = 200):
    """respx_mock에 generate 라우트를 등록. mock 라우트 객체를 반환."""
    from app.config import get_settings

    return respx_mock.post(get_settings().ollama_generate_url).mock(
        return_value=httpx.Response(status_code, json=generate_body(response_text))
    )


# ── chat (SSE 토큰 스트림) ──────────────────────────────────────────────────
def chat_ndjson(tokens: list[str], *, final_done: bool = True) -> str:
    """토큰 리스트를 NDJSON(줄바꿈 구분 JSON) 문자열로. aiter_lines가 줄 단위로 읽는다."""
    lines = [
        json.dumps({"message": {"content": tok}, "done": False}, ensure_ascii=False)
        for tok in tokens
    ]
    if final_done:
        lines.append(json.dumps({"message": {"content": ""}, "done": True}))
    return "\n".join(lines)


def respond_chat_stream(respx_mock, tokens: list[str], *, status_code: int = 200):
    """respx_mock에 chat 스트림 라우트를 등록. mock 라우트 객체를 반환."""
    from app.config import get_settings

    body = chat_ndjson(tokens).encode("utf-8")
    return respx_mock.post(get_settings().ollama_chat_url).mock(
        return_value=httpx.Response(status_code, content=body)
    )
