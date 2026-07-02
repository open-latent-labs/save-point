"""챗 SSE 엔드포인트 통합 테스트 [담당: 김윤] — 스타일은 tests/test_reference_sample.py 참고.
대상: POST /v1/chat (StreamingResponse, text/event-stream)

방식: SSE 스트리밍은 httpx.AsyncClient(ASGITransport)로 검증한다(conftest의 chat_client).
LLM(Ollama chat)은 respx(mock_ollama_chat)로 가로채고, RAG 파이프라인(query)은 패치해
검색·임베딩 스택을 격리한다(그쪽은 rag/test_qdrant_repository.py에서 별도 검증).
"""
import json

import pytest

pytestmark = pytest.mark.integration

_CHAT_REQUEST = {
    "question": "MonoBehaviour.Update는 언제 호출돼?",
    "user_id": "user-1",
    "session_id": "sess-1",
}


def _patch_query_with_docs(monkeypatch):
    """query가 문서를 찾은 것처럼 고정 결과를 돌려주게 한다(→ LLM 스트림 경로)."""
    async def _fake_query(*args, **kwargs):
        return {
            "context_chunks": [
                {
                    "chunk_text": "Update is called once per frame.",
                    "document_id": "doc-A",
                    "filename": "unity.pdf",
                    "chunk_index": 0,
                }
            ],
            "sources": [{"document_id": "doc-A", "filename": "unity.pdf"}],
        }

    monkeypatch.setattr("app.services.chat_service.query", _fake_query)


# ── 해피패스: 응답 content-type이 text/event-stream 이다 ─────────────────────
async def test_chat_endpoint_returns_event_stream_content_type(
    chat_client, mock_ollama_chat, monkeypatch
):
    """POST /v1/chat 응답이 SSE(text/event-stream)로 내려온다."""
    # Arrange: 문서 검색 결과 고정 + Ollama chat 토큰 스트림 mock
    _patch_query_with_docs(monkeypatch)
    mock_ollama_chat(["안", "녕"])

    # Act
    resp = await chat_client.post("/v1/chat", json=_CHAT_REQUEST)

    # Assert
    assert resp.headers["content-type"].startswith("text/event-stream")


# ── 해피패스: LLM 토큰이 SSE data 프레임으로 흘러오고 [DONE]으로 끝난다 ──────
async def test_chat_endpoint_streams_llm_tokens_until_done(
    chat_client, mock_ollama_chat, monkeypatch
):
    """Ollama가 준 토큰이 그대로 data: 프레임으로 스트리밍되고 종료 신호가 온다."""
    # Arrange
    _patch_query_with_docs(monkeypatch)
    mock_ollama_chat(["안", "녕"])

    # Act: ASGITransport에서 post는 전체 스트림을 읽어 body에 담아준다
    resp = await chat_client.post("/v1/chat", json=_CHAT_REQUEST)
    body = resp.text

    # Assert: 토큰들이 이어 붙여 재구성되고 종료 프레임까지 왔는가
    streamed = "".join(
        json.loads(line[len("data: "):])
        for line in body.splitlines()
        if line.startswith("data: ")
        and not line.startswith(("data: [DONE]", "data: [SOURCES]", "data: [ERROR]"))
    )
    assert "안녕" in streamed and "data: [DONE]" in body


# ── 엣지: 참고 문서가 없으면 LLM 없이 안내 메시지를 스트리밍한다 ─────────────
async def test_chat_endpoint_streams_guidance_when_no_docs(chat_client, monkeypatch):
    """query가 no_docs면 Ollama chat을 호출하지 않고 고정 안내 메시지를 내려준다."""
    # Arrange: 검색 결과 없음(no_docs). Ollama는 mock하지 않음 —
    #          만약 호출을 시도하면 실제 연결 실패로 안내 메시지가 나오지 않아 테스트가 깨진다.
    async def _no_docs_query(*args, **kwargs):
        return {"context_chunks": [], "sources": [], "no_docs": True}

    monkeypatch.setattr("app.services.chat_service.query", _no_docs_query)

    # Act
    resp = await chat_client.post("/v1/chat", json=_CHAT_REQUEST)

    # Assert: no_docs 안내 문구가 스트림에 실려 온다
    assert "참고할 문서를 찾지 못했습니다" in resp.text
