from typing import AsyncGenerator
from fastapi import Cookie, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from qdrant_client import AsyncQdrantClient
from app.db.rdb import AsyncSessionLocal
from app.db.vector_db import get_qdrant_client
from app.models.enums import UserBan
from app.models.user import User
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


async def _verify_token(sp_token: str | None) -> dict:
    if not sp_token:
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")
    payload = decode_token(sp_token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")
    return payload


async def _get_live_user(payload: dict, db: AsyncSession) -> User:
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다.")
    if user.ban == UserBan.BAN:
        raise HTTPException(status_code=403, detail="정지된 계정입니다.")
    return user


async def require_auth(sp_token: str = Cookie(None), db: AsyncSession = Depends(get_db)) -> dict:
    payload = await _verify_token(sp_token)
    user = await _get_live_user(payload, db)
    return {**payload, "role": user.role.value}


async def get_current_user_id(sp_token: str = Cookie(None), db: AsyncSession = Depends(get_db)) -> str:
    payload = await _verify_token(sp_token)
    user = await _get_live_user(payload, db)
    return user.id


async def require_admin(sp_token: str = Cookie(None), db: AsyncSession = Depends(get_db)) -> dict:
    payload = await _verify_token(sp_token)
    user = await _get_live_user(payload, db)
    if user.role.value not in ("ADMIN", "SUPER_ADMIN"):
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
    return {**payload, "role": user.role.value}


async def require_super_admin(sp_token: str = Cookie(None), db: AsyncSession = Depends(get_db)) -> dict:
    payload = await _verify_token(sp_token)
    user = await _get_live_user(payload, db)
    if user.role.value != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다.")
    return {**payload, "role": user.role.value}
