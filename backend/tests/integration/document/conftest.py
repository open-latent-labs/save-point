"""문서 통합테스트 전용 fixture [담당: 남정희].

루트 conftest는 팀 공용이라 손대지 않고, 문서 도메인에서만 쓰는 인메모리 DB
세션 fixture를 여기에 둔다. (플랜의 "PostgreSQL: integration=testcontainers
또는 인메모리 세션" 중 가벼운 인메모리 SQLite 경로)
"""
import pytest
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

import app.models  # noqa: F401  — 모든 모델을 import 해 메타데이터 테이블 등록
from app.db.rdb import Base

# JSONB/ARRAY 등 PostgreSQL 전용 타입을 쓰는 테이블은 SQLite에서 생성되지 않으므로,
# 문서 CRUD가 실제로 건드리는 테이블만 골라서 만든다.
_NEEDED_TABLES = {"users", "documents", "bookmarked_documents", "pinned_documents"}


@pytest.fixture
async def db_session():
    """함수마다 새로 띄우는 인메모리 SQLite AsyncSession.

    실제 RDB(asyncpg/PostgreSQL) 대신 동일한 SQLAlchemy 모델/쿼리를 SQLite로
    검증한다 — 외부 컨테이너 없이 CRUD 로직(상태 전이·제약)을 빠르게 확인.
    """
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    tables = [t for t in Base.metadata.sorted_tables if t.name in _NEEDED_TABLES]
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: Base.metadata.create_all(c, tables=tables))

    session_factory = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )
    async with session_factory() as session:
        yield session

    await engine.dispose()
