"""챗 단위 테스트 [담당: 김윤] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/services/chat_service.py (stream_answer), app/crud/chat.py
"""
import pytest

pytestmark = pytest.mark.unit


# ── 스트리밍 답변: 토큰이 순서대로 흘러나온다 (retrieve·LLM 모두 mock) ──────
async def test_stream_answer_yields_tokens_in_order(mock_ollama_chat):
    """stream_answer는 LLM이 준 토큰을 순서대로 yield 한다."""
    pytest.skip("TODO(A): 구현 — retrieve는 mock, Ollama chat은 mock_ollama_chat")
    # from app.services.chat_service import stream_answer
    # # Arrange: mock_ollama_chat(["안", "녕"]); rag retrieve/ db는 mock
    # # Act: chunks = [c async for c in stream_answer(q, user_id, session_id, db)]
    # # Assert: assert "".join(chunks) == "안녕"


# ── 세션 생성: crud.create_session이 세션을 만들고 반환한다 ──────────────────
async def test_create_session_persists_and_returns_session():
    """create_session 호출 시 ChatSession이 생성되어 반환된다."""
    pytest.skip("TODO(A): 구현 — db 세션은 인메모리/mock")
    # from app.crud.chat import create_session
    # # Arrange: db
    # # Act: session = await create_session(db, "sid", "uid", "새 채팅")
    # # Assert: assert session.id == "sid"
