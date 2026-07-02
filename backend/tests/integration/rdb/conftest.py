"""RDB 통합테스트 전용 fixture [담당: 최원익].

플랜의 "PostgreSQL: integration=testcontainers+schema.sql(선택)" 중, Docker 부담이
없는 가벼운 경로를 택한다 — 동일한 SQLAlchemy 모델을 인메모리 SQLite에 올려
모델 매핑·기본값·제약(UNIQUE/Enum/FK)을 검증한다.

문서 도메인 conftest와 달리 여기서는 FK 제약(CASCADE)까지 확인하므로:
  · StaticPool 로 단일 커넥션을 공유해 :memory: DB가 세션마다 갈리지 않게 하고,
  · SQLite는 기본적으로 FK를 강제하지 않으므로 커넥션마다 PRAGMA foreign_keys=ON.
"""
import pytest
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  — 모든 모델을 import 해 메타데이터 테이블 등록
from app.db.rdb import Base

# JSONB/ARRAY 등 PostgreSQL 전용 타입을 쓰는 테이블은 SQLite에서 생성되지 않으므로,
# RDB 매핑/제약을 확인할 핵심 테이블만 골라서 만든다.
_NEEDED_TABLES = {"users", "documents", "notifications"}


@pytest.fixture
async def db_session():
    """함수마다 새로 띄우는 인메모리 SQLite AsyncSession (FK 강제 ON)."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,  # 단일 커넥션 공유 → 세션이 달라도 같은 인메모리 DB
    )

    # SQLite는 커넥션마다 FK 강제가 꺼져 있다 → 연결 시 PRAGMA로 켠다.
    @event.listens_for(engine.sync_engine, "connect")
    def _enable_sqlite_fk(dbapi_conn, _record):
        cur = dbapi_conn.cursor()
        cur.execute("PRAGMA foreign_keys=ON")
        cur.close()

    tables = [t for t in Base.metadata.sorted_tables if t.name in _NEEDED_TABLES]
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=tables))

    session_factory = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session

    await engine.dispose()
