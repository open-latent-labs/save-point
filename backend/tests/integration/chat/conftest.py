"""챗 SSE 통합테스트 전용 fixture [담당: 김윤].

엔드포인트(main.app)를 httpx.ASGITransport로 직접 두드려 SSE 스트리밍을 검증한다.
(TestClient는 스트리밍 응답을 다루기 번거로워 async 클라이언트를 쓴다.)

외부 의존성 처리:
  · RDB   : 공유 커넥션(StaticPool) 인메모리 SQLite로 대체. 요청 세션(get_db)과
            chat_service가 _finalize_answer에서 독립적으로 여는 AsyncSessionLocal을
            같은 엔진으로 바꿔치기해 한 DB를 보게 한다.
  · JSONB : chat_message.retrieved_chunk_ids는 PostgreSQL 전용 타입이라
            SQLite에선 JSON으로 렌더링되도록 컴파일 훅을 건다.
  · Ollama: 각 테스트에서 respx(mock_ollama_chat)로 가로채거나, query를 패치한다.
"""
import httpx
import pytest
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 — 모든 모델을 import해 메타데이터 테이블 등록
from app.db.rdb import Base
from app.models.chat_session import ChatSession
from tests.support.factories import make_user


@compiles(JSONB, "sqlite")
def _compile_jsonb_as_json_on_sqlite(element, compiler, **kw):
    """PG 전용 JSONB 컬럼을 SQLite에선 JSON으로 생성해 create_all이 통과하게 한다."""
    return "JSON"


# 챗 스트리밍 경로가 실제로 건드리는 테이블만 골라서 만든다.
_NEEDED_TABLES = {"users", "chat_sessions", "chat_message"}


@pytest.fixture
async def chat_client(monkeypatch):
    """SSE 검증용 httpx.AsyncClient(ASGITransport). user-1 / sess-1 이 미리 준비돼 있다."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # 단일 커넥션 공유 → 세션이 달라도 같은 인메모리 DB
    )
    tables = [t for t in Base.metadata.sorted_tables if t.name in _NEEDED_TABLES]
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=tables))

    session_factory = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

    # 유저 1명 + 채팅방 1개 시드 (질문/답변 메시지의 FK·ask_count 갱신 대상)
    async with session_factory() as seed:
        seed.add(make_user(id="user-1", user_id="user-1", email="user-1@example.com"))
        seed.add(ChatSession(id="sess-1", user_id="user-1", session_name="테스트 세션"))
        await seed.commit()

    # chat_service._finalize_answer는 요청 세션이 아닌 이 팩토리로 독립 세션을 연다
    monkeypatch.setattr("app.services.chat_service.AsyncSessionLocal", session_factory)

    from app.dependencies import get_db
    from main import app

    async def _override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = _override_get_db

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
    await engine.dispose()
