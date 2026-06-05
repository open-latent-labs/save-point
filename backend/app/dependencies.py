from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from qdrant_client import AsyncQdrantClient
from app.db.rdb import AsyncSessionLocal
from app.db.vector_db import get_qdrant_client


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def get_vector_db() -> AsyncQdrantClient:
    return get_qdrant_client()
