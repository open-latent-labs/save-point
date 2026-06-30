"""챗 단위 테스트 [담당: 김윤] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/services/chat_service.py (stream_answer), app/crud/chat.py
tests/unit/chat/test_chat_service.py

검증 대상: app/services/chat_service.py 의 stream_answer
  - 질문/플레이스홀더 저장 → RAG 파이프라인 → SSE 토큰 스트리밍 → 정상 완료 시
    플레이스홀더를 최종 답변으로 업데이트한다.
  - 클라이언트 연결이 끊겨 스트리밍이 중단되면(GeneratorExit/CancelledError),
    그 시점까지 모인 "부분 답변"을 백그라운드로 저장한다.

외부 의존성은 모두 monkeypatch로 대체한다 (실제 DB/Ollama/Qdrant 호출 없음):
  - app.db.rdb.AsyncSessionLocal      → _finalize_answer 내부에서 새로 여는 세션
  - app.crud.chat.*                   → save_message / update_message_content /
                                         update_session_last_active / get_messages
  - app.pipelines.query_pipeline.query → RAG 결과
  - app.llm.ollama_client.generate_stream → LLM 토큰 스트림
"""
import asyncio
import json

import pytest

from app.services import chat_service

pytestmark = pytest.mark.unit  # 이 파일의 모든 테스트는 unit 마커


# ── 테스트 더블: crud.chat 호출 기록용 가짜 리포지토리 ──────────────────────
class _FakeChatRepo:
    """save_message / update_message_content / get_messages 등을 기록만 하는 더블.

    실제 DB에 쓰지 않고 호출 인자를 self.calls 에 모아둔다.
    """

    def __init__(self, history: list | None = None):
        self.history = history or []
        self.calls: list[tuple[str, dict]] = []

    async def save_message(self, **kwargs):
        self.calls.append(("save_message", kwargs))

    async def update_message_content(self, **kwargs):
        self.calls.append(("update_message_content", kwargs))

    async def update_session_last_active(self, db, session_id):
        self.calls.append(("update_session_last_active", {"session_id": session_id}))

    async def get_messages(self, db, session_id):
        self.calls.append(("get_messages", {"session_id": session_id}))
        return self.history


class _FakeAsyncSession:
    """`async with AsyncSessionLocal() as save_db:` 를 만족시키는 더블. 아무 동작 없음."""

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def execute(self, *args, **kwargs):
        return None

    async def commit(self):
        return None


@pytest.fixture
def fake_repo(monkeypatch):
    """crud.chat 함수들과 AsyncSessionLocal을 _FakeChatRepo로 일괄 패치."""
    repo = _FakeChatRepo()

    monkeypatch.setattr(chat_service, "save_message", repo.save_message)
    monkeypatch.setattr(chat_service, "update_message_content", repo.update_message_content)
    monkeypatch.setattr(chat_service, "update_session_last_active", repo.update_session_last_active)
    monkeypatch.setattr(chat_service, "get_messages", repo.get_messages)
    monkeypatch.setattr(chat_service, "AsyncSessionLocal", lambda: _FakeAsyncSession())

    # User.ask_count 증가용 db.execute(update(...)) — 인자 그대로 받아주는 더블이면 충분
    monkeypatch.setattr(chat_service, "update", lambda *a, **k: None)

    return repo


def _fake_db():
    """stream_answer에 주입하는 호출측 db 세션(요청 스코프). execute/commit만 필요."""
    return _FakeAsyncSession()


# ── 해피패스: 정상 스트리밍 완료 → 플레이스홀더가 최종 답변으로 업데이트된다 ──
async def test_stream_answer_completes_normally_updates_message_with_full_answer(
    monkeypatch, fake_repo
):
    # Arrange: RAG 결과와 LLM 토큰 스트림을 고정
    fake_result = {
        "no_docs": False,
        "context_chunks": ["dummy chunk"],
        "sources": ["doc-1"],
    }
    monkeypatch.setattr(chat_service, "query", lambda *a, **k: _async_return(fake_result))
    monkeypatch.setattr(chat_service, "build_messages", lambda *a, **k: [])

    async def _fake_generate_stream(messages):
        for tok in ["안", "녕"]:
            yield tok

    monkeypatch.setattr(chat_service, "generate_stream", _fake_generate_stream)

    # Act: 스트림을 끝까지 소비
    chunks = []
    async for chunk in chat_service.stream_answer(
        question="테스트 질문", user_id="user-1", session_id="sess-1", db=_fake_db()
    ):
        chunks.append(chunk)

    # Assert: 핵심 한 가지 — 최종 답변("안녕")으로 update_message_content가 호출됐는가
    update_calls = [c for name, c in fake_repo.calls if name == "update_message_content"]
    assert update_calls[-1]["content_ko"] == "안녕"


# ── 엣지: 스트리밍 중 클라이언트 연결이 끊기면 부분 답변을 백그라운드로 저장한다 ──
async def test_stream_answer_client_disconnect_finalizes_partial_answer_in_background(
    monkeypatch, fake_repo
):
    # Arrange: 토큰 일부만 yield된 후 GeneratorExit가 발생하는 상황을 흉내
    fake_result = {
        "no_docs": False,
        "context_chunks": ["dummy chunk"],
        "sources": ["doc-1"],
    }
    monkeypatch.setattr(chat_service, "query", lambda *a, **k: _async_return(fake_result))
    monkeypatch.setattr(chat_service, "build_messages", lambda *a, **k: [])

    async def _fake_generate_stream(messages):
        yield "부분"
        raise asyncio.CancelledError()

    monkeypatch.setattr(chat_service, "generate_stream", _fake_generate_stream)

    # asyncio.create_task로 던지는 백그라운드 저장을 동기적으로 기다릴 수 있도록
    # create_task 자체를 가짜 코루틴 실행으로 대체
    created_tasks = []

    def _fake_create_task(coro):
        created_tasks.append(coro)
        return coro  # 아래에서 직접 await

    monkeypatch.setattr(chat_service.asyncio, "create_task", _fake_create_task)

    # Act: 스트림 소비 중 CancelledError가 그대로 전파되는지 확인
    gen = chat_service.stream_answer(
        question="테스트 질문", user_id="user-1", session_id="sess-1", db=_fake_db()
    )
    with pytest.raises(asyncio.CancelledError):
        async for _ in gen:
            pass

    # 백그라운드로 등록된 _finalize_answer 코루틴을 직접 실행해 결과 반영
    for coro in created_tasks:
        await coro

    # Assert: 핵심 한 가지 — 끊기기 전까지 모인 부분 답변("부분")으로 저장됐는가
    update_calls = [c for name, c in fake_repo.calls if name == "update_message_content"]
    assert update_calls[-1]["content_ko"] == "부분"


# ── 헬퍼: 동기 lambda에서 awaitable을 돌려주기 위한 코루틴 래퍼 ─────────────
async def _async_return(value):
    return value