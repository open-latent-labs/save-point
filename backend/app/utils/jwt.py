from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import settings


def create_access_token(data: dict) -> str:
    # 만료 시간: settings.access_token_expire_minutes (기본 30분)
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({**data, "type": "access", "exp": expire}, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(data: dict) -> str:
    # 만료 시간: settings.refresh_token_expire_days (기본 7일)
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    return jwt.encode({**data, "type": "refresh", "exp": expire}, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict:
    # 만료/변조 시 빈 dict 반환 → 호출부에서 type 체크로 유효성 판단
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return {}
