"""챗 SSE 엔드포인트 통합 테스트 [담당: 김윤] — 스타일은 tests/test_reference_sample.py 참고.
대상: POST /v1/chat (StreamingResponse, text/event-stream)

방식: SSE 스트리밍은 httpx.AsyncClient(ASGITransport) 로 검증.
(일반 API는 TestClient로 충분하지만, 스트리밍은 async 클라이언트가 필요)
LLM(Ollama)은 respx로 가로채고, DB 의존성은 오버라이드한다.
"""
import pytest

pytestmark = pytest.mark.integration


# ── /v1/chat 호출 시 event-stream으로 토큰이 흘러온다 ───────────────────────
async def test_chat_endpoint_streams_event_stream():
    """POST /v1/chat 응답이 text/event-stream이고 토큰이 스트리밍된다."""
    pytest.skip("TODO(A): 구현 — ASGITransport + respx로 Ollama chat 스트림 mock")
    # import httpx
    # from main import app
    # # Arrange: app.dependency_overrides[get_db] = ...; respx로 ollama_chat_url stream mock
    # # Act: async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app)) as ac:
    # #          async with ac.stream("POST", "/v1/chat", json=...) as resp: ...
    # # Assert: assert resp.headers["content-type"].startswith("text/event-stream")
