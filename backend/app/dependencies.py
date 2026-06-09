from typing import AsyncGenerator
from fastapi import Cookie, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from qdrant_client import AsyncQdrantClient
from app.db.rdb import AsyncSessionLocal
from app.db.vector_db import get_qdrant_client
from app.utils.jwt import decode_token


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


async def require_super_admin(sp_token: str = Cookie(None)) -> dict:
    if not sp_token:
        raise HTTPException(status_code=403, detail="인증이 필요합니다.")

    payload = decode_token(sp_token)

    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=403, detail="유효하지 않은 토큰입니다.")

    if payload.get("role") != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")

    return payload
