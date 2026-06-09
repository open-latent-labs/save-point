import re
import secrets
import string

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from loguru import logger
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.dependencies import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import LoginRequest, SignupRequest, SignupResponse, TokenResponse, UserInfo
from app.utils.jwt import create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 아이디 허용 형식: 영문·숫자·언더스코어, 4~20자
USER_ID_RE = re.compile(r'^[a-zA-Z0-9_]{4,20}$')


def _generate_id() -> str:
    # 26자리 랜덤 대문자+숫자 ID (ULID 길이 호환)
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(26))


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    # access token: 30분, refresh token: 7일 / HttpOnly + SameSite=Strict
    response.set_cookie(
        key="sp_token",
        value=access_token,
        httponly=True,
        max_age=settings.access_token_expire_minutes * 60,
        samesite="strict",
        secure=False,  # 운영 환경에서는 True로 변경
    )
    response.set_cookie(
        key="sp_refresh",
        value=refresh_token,
        httponly=True,
        max_age=settings.refresh_token_expire_days * 86400,
        samesite="strict",
        secure=False,
    )


def _clear_auth_cookies(response: Response) -> None:
    # 쿠키 설정 시와 동일한 path/samesite 지정해야 확실히 삭제됨
    response.delete_cookie("sp_token", path="/", samesite="strict")
    response.delete_cookie("sp_refresh", path="/", samesite="strict")


@router.post("/signup", response_model=SignupResponse, status_code=201)
async def signup(body: SignupRequest, response: Response, db: AsyncSession = Depends(get_db)):
    logger.info("=== 회원가입 요청 수신 ===")
    logger.info(f"이름     : {body.name}")
    logger.info(f"아이디   : {body.user_id}")
    logger.info(f"이메일   : {body.email}")
    logger.info(f"비밀번호 : {'*' * len(body.password)}")

    if not USER_ID_RE.match(body.user_id):
        raise HTTPException(status_code=422, detail="아이디는 영문, 숫자, _만 사용 가능하며 4~20자여야 합니다.")

    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        logger.warning(f"이메일 중복: {body.email}")
        raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")

    result = await db.execute(select(User).where(User.user_id == body.user_id))
    if result.scalar_one_or_none():
        logger.warning(f"아이디 중복: {body.user_id}")
        raise HTTPException(status_code=409, detail="이미 사용 중인 아이디입니다.")

    user = User(
        id=_generate_id(),
        email=body.email,
        name=body.name,
        user_id=body.user_id,
        password=pwd_context.hash(body.password),
        role=UserRole.USER,
    )
    db.add(user)
    await db.flush()

    logger.success(f"DB 저장 완료 — id={user.id}, name={user.name}, user_id={user.user_id}, email={user.email}, role={user.role}")

    # 가입 즉시 로그인 처리 (쿠키 발급)
    payload = {"sub": user.id, "role": user.role.value}
    _set_auth_cookies(response, create_access_token(payload), create_refresh_token(payload))

    return SignupResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        user_id=user.user_id,
        role=user.role.value,
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    logger.info(f"=== 로그인 요청 수신 === 아이디: {body.user_id}")

    result = await db.execute(select(User).where(User.user_id == body.user_id))
    user = result.scalar_one_or_none()

    if not user or not pwd_context.verify(body.password, user.password):
        logger.warning(f"로그인 실패 — 아이디: {body.user_id}")
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    await db.refresh(user)
    payload = {"sub": user.id, "role": user.role.value}
    _set_auth_cookies(response, create_access_token(payload), create_refresh_token(payload))

    logger.success(f"로그인 성공 — id={user.id}, user_id={user.user_id}, role={user.role.value}")

    # 토큰은 쿠키로 전달, 바디에는 유저 정보만 반환
    return TokenResponse(
        user=UserInfo(
            id=user.id,
            email=user.email,
            name=user.name,
            user_id=user.user_id,
            role=user.role.value,
        ),
    )


@router.post("/refresh")
async def refresh(response: Response, sp_refresh: str = Cookie(None), db: AsyncSession = Depends(get_db)):
    # refresh token은 HttpOnly 쿠키로 자동 수신
    if not sp_refresh:
        raise HTTPException(status_code=401, detail="Refresh token이 없습니다.")

    payload = decode_token(sp_refresh)
    if not payload or payload.get("type") != "refresh":
        _clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="유효하지 않은 refresh token입니다.")

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다.")

    await db.refresh(user)
    new_payload = {"sub": user.id, "role": user.role.value}
    _set_auth_cookies(response, create_access_token(new_payload), create_refresh_token(new_payload))

    logger.info(f"토큰 재발급 — user_id={user.user_id}")
    return {"message": "토큰이 재발급되었습니다."}


@router.post("/logout")
async def logout(response: Response):
    _clear_auth_cookies(response)
    logger.info("로그아웃")
    return {"message": "로그아웃 되었습니다."}


@router.get("/me", response_model=UserInfo)
async def me(sp_token: str = Cookie(None), db: AsyncSession = Depends(get_db)):
    # 앱 시작 시 프론트에서 호출 — 쿠키의 access token으로 현재 유저 반환
    if not sp_token:
        raise HTTPException(status_code=401, detail="인증이 필요합니다.")

    payload = decode_token(sp_token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다.")

    return UserInfo(
        id=user.id,
        email=user.email,
        name=user.name,
        user_id=user.user_id,
        role=user.role.value,
    )
