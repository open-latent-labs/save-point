"""인증 단위 테스트 [담당: 조형우] — 스타일은 tests/test_reference_sample.py 참고.
대상: app/utils/jwt.py (순수 함수라 mock 불필요한 모범 단위 테스트)
"""
import pytest

pytestmark = pytest.mark.unit


# ── 왕복: 발급한 access 토큰을 디코드하면 원래 sub가 나온다 ──────────────────
def test_decode_token_valid_access_returns_payload():
    """create_access_token으로 만든 토큰을 decode하면 sub/type을 복원한다."""
    pytest.skip("TODO(C): 구현")
    # from app.utils.jwt import create_access_token, decode_token
    # token = create_access_token({"sub": "user-1"})
    # payload = decode_token(token)
    # assert payload["sub"] == "user-1"


# ── 변조: 깨진 토큰은 빈 dict 반환 ──────────────────────────────────────────
def test_decode_token_tampered_returns_empty_dict():
    """서명이 맞지 않는 토큰은 빈 dict를 반환한다(예외 X)."""
    pytest.skip("TODO(C): 구현")
    # from app.utils.jwt import decode_token
    # assert decode_token("not.a.valid.token") == {}


# ── 만료: 만료된 토큰은 빈 dict 반환 ────────────────────────────────────────
def test_decode_token_expired_returns_empty_dict():
    """exp가 지난 토큰은 빈 dict를 반환한다."""
    pytest.skip("TODO(C): 구현 — exp를 과거로 둔 토큰을 jose로 직접 만들어 검증")
    # assert decode_token(expired_token) == {}
