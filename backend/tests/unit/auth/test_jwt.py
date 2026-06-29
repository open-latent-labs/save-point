"""인증 단위 테스트 [담당: 조형우] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/utils/jwt.py (순수 함수라 mock 불필요한 모범 단위 테스트)
"""
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt

from app.config import settings
from app.utils.jwt import create_access_token, create_refresh_token, decode_token

pytestmark = pytest.mark.unit


def _make_expired_token() -> str:
    """exp를 과거로 설정한 만료 토큰 생성 헬퍼."""
    payload = {
        "sub": "user-1",
        "type": "access",
        "exp": datetime.now(timezone.utc) - timedelta(hours=1),
    }
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


# ── 해피패스: access 토큰 발급 → 디코드 시 sub 복원 ──────────────────────────
async def test_decode_token_valid_access_returns_sub():
    """create_access_token으로 만든 토큰을 decode하면 sub가 복원된다."""
    # Arrange
    token = create_access_token({"sub": "user-1"})

    # Act
    payload = decode_token(token)

    # Assert
    assert payload["sub"] == "user-1"


# ── 해피패스: refresh 토큰 type 확인 ─────────────────────────────────────────
async def test_decode_token_valid_refresh_type_is_refresh():
    """create_refresh_token으로 만든 토큰의 type은 'refresh'다."""
    # Arrange
    token = create_refresh_token({"sub": "user-2"})

    # Act
    payload = decode_token(token)

    # Assert
    assert payload["type"] == "refresh"


# ── 엣지: 변조된 토큰 → 빈 dict 반환 ────────────────────────────────────────
async def test_decode_token_tampered_returns_empty_dict():
    """서명이 맞지 않는 토큰은 빈 dict를 반환한다(예외 X)."""
    # Act
    result = decode_token("not.a.valid.token")

    # Assert
    assert result == {}


# ── 엣지: 만료된 토큰 → 빈 dict 반환 ────────────────────────────────────────
async def test_decode_token_expired_returns_empty_dict():
    """exp가 지난 토큰은 빈 dict를 반환한다."""
    # Arrange
    expired_token = _make_expired_token()

    # Act
    result = decode_token(expired_token)

    # Assert
    assert result == {}
