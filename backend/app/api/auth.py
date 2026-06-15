import re
import secrets
import string
import asyncio
import json
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, Request
from fastapi.responses import RedirectResponse, StreamingResponse
from loguru import logger
from passlib.context import CryptContext
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.presence import service
from app.presence.pubsub import manager

from app.config import settings
from app.dependencies import get_db, require_auth, get_current_user_id
from app.models.bookmarked_document import BookmarkedDocument
from app.models.chat_session import ChatSession
from app.models.document import Document
from app.models.enums import UserBan, UserRole
from app.models.notification import Notification
from app.models.pinned_document import PinnedDocument
from app.models.user import User
from app.models.user_oauth_account import UserOAuthAccount
from app.schemas.user import (
    LinkedOAuthResponse,
    LoginRequest,
    OAuthAccountInfo,
    SignupRequest,
    SignupResponse,
    TokenResponse,
    UserInfo,
)
from app.utils.jwt import create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_DUMMY_HASH = pwd_context.hash("__dummy_timing_guard__")

USER_ID_RE = re.compile(r'^[a-zA-Z0-9_]{4,20}$')


def _generate_id() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(26))


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    response.set_cookie(key="sp_token", value=access_token, httponly=True,
                        max_age=settings.access_token_expire_minutes * 60, samesite="strict", secure=False)
    response.set_cookie(key="sp_refresh", value=refresh_token, httponly=True,
                        max_age=settings.refresh_token_expire_days * 86400, samesite="strict", secure=False)


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("sp_token", path="/", samesite="strict")
    response.delete_cookie("sp_refresh", path="/", samesite="strict")


def _user_info(user: User) -> UserInfo:
    return UserInfo(
        id=user.id,
        email=user.email,
        name=user.name,
        user_id=user.user_id,
        role=user.role.value,
        ask_count=user.ask_count,
        created_at=user.created_at.strftime("%Y-%m-%d") if user.created_at else "",
    )


async def _merge_into(db: AsyncSession, keep_id: str, drop_id: str) -> None:
    """drop_id 계정의 모든 데이터를 keep_id로 이전하고 drop_id 계정을 삭제."""
    if keep_id == drop_id:
        return

    # 1. 소셜 연동 이전
    rows = await db.execute(select(UserOAuthAccount).where(UserOAuthAccount.user_id == drop_id))
    for row in rows.scalars().all():
        row.user_id = keep_id

    # 2. 채팅 세션 이전
    rows = await db.execute(select(ChatSession).where(ChatSession.user_id == drop_id))
    for row in rows.scalars().all():
        row.user_id = keep_id

    # 3. 핀 이전 — keep_id에 이미 있는 문서는 스킵
    existing = await db.execute(select(PinnedDocument.document_id).where(PinnedDocument.user_id == keep_id))
    keep_pin_ids = set(existing.scalars().all())
    rows = await db.execute(select(PinnedDocument).where(PinnedDocument.user_id == drop_id))
    for row in rows.scalars().all():
        if row.document_id not in keep_pin_ids:
            row.user_id = keep_id

    # 4. 북마크 이전 — keep_id에 이미 있는 문서는 스킵
    existing = await db.execute(select(BookmarkedDocument.document_id).where(BookmarkedDocument.user_id == keep_id))
    keep_bm_ids = set(existing.scalars().all())
    rows = await db.execute(select(BookmarkedDocument).where(BookmarkedDocument.user_id == drop_id))
    for row in rows.scalars().all():
        if row.document_id not in keep_bm_ids:
            row.user_id = keep_id

    # 5. 알림 이전
    rows = await db.execute(select(Notification).where(Notification.user_id == drop_id))
    for row in rows.scalars().all():
        row.user_id = keep_id

    # 6. 업로드 문서 이전
    rows = await db.execute(select(Document).where(Document.uploaded_by_id == drop_id))
    for row in rows.scalars().all():
        row.uploaded_by_id = keep_id

    await db.flush()
    drop_user = await db.get(User, drop_id)
    if drop_user:
        await db.delete(drop_user)
    await db.flush()
    logger.success(f"계정 병합 완료 — keep={keep_id}, drop={drop_id}")


def _sanitize_user_id(base: str) -> str:
    sanitized = re.sub(r"[^a-zA-Z0-9_]", "_", base)[:20]
    return sanitized.ljust(4, "0")


async def _get_or_create_oauth_user(
    db: AsyncSession,
    provider: str,
    provider_user_id: str,
    email: str | None,
    name: str,
) -> User:
    """
    OAuth 로그인 공통 로직.
    ① provider_user_id로 기존 연동 계정 조회
    ② 없으면 이메일로 기존 유저 조회 → 자동 연동
    ③ 그것도 없으면 신규 유저 생성
    """
    # ① provider 고유 ID로 조회
    result = await db.execute(
        select(UserOAuthAccount).where(
            UserOAuthAccount.provider == provider,
            UserOAuthAccount.provider_user_id == provider_user_id,
        )
    )
    oauth_row = result.scalar_one_or_none()

    if oauth_row:
        result = await db.execute(select(User).where(User.id == oauth_row.user_id))
        user = result.scalar_one_or_none()
        if user:
            logger.info(f"{provider} 기존 연동 계정 로그인 — user_id={user.user_id}")
            return user

    # ② 이메일로 기존 유저 조회 (자동 연동)
    user = None
    if email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            logger.info(f"{provider} 이메일 자동 연동 — email={email}, user_id={user.user_id}")

    # ③ 없으면 신규 생성
    if not user:
        base_uid = _sanitize_user_id(email.split("@")[0] if email else f"{provider}_{provider_user_id[-8:]}")
        uid = base_uid
        for _ in range(5):
            dup = await db.execute(select(User).where(User.user_id == uid))
            if not dup.scalar_one_or_none():
                break
            uid = base_uid[:16] + "_" + secrets.token_hex(2)

        fallback_email = email or f"{provider}_{provider_user_id}@oauth.local"
        user = User(
            id=_generate_id(),
            email=fallback_email,
            name=name,
            user_id=uid,
            password=pwd_context.hash(secrets.token_hex(32)),
            role=UserRole.USER,
            ban=UserBan.UNBAN,
            is_active=True,
        )
        db.add(user)
        await db.flush()
        logger.success(f"{provider} 신규 사용자 생성 — email={fallback_email}, user_id={user.user_id}")

    # oauth_account 행 추가 (없는 경우만)
    db.add(UserOAuthAccount(
        user_id=user.id,
        provider=provider,
        provider_user_id=provider_user_id,
        email=email,
    ))
    await db.flush()

    return user


# ── 일반 회원가입/로그인 ────────────────────────────────────────────────────────

@router.post("/signup", response_model=SignupResponse, status_code=201)
async def signup(body: SignupRequest, response: Response, db: AsyncSession = Depends(get_db)):
    logger.info(f"=== 회원가입 요청 === user_id={body.user_id}, email={body.email}")

    if not USER_ID_RE.match(body.user_id):
        raise HTTPException(status_code=422, detail="아이디는 영문, 숫자, _만 사용 가능하며 4~20자여야 합니다.")

    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")

    result = await db.execute(select(User).where(User.user_id == body.user_id))
    if result.scalar_one_or_none():
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

    payload = {"sub": user.id, "role": user.role.value}
    _set_auth_cookies(response, create_access_token(payload), create_refresh_token(payload))
    return SignupResponse(id=user.id, email=user.email, name=user.name, user_id=user.user_id, role=user.role.value)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    logger.info(f"=== 로그인 요청 === user_id={body.user_id}")

    result = await db.execute(select(User).where(User.user_id == body.user_id))
    user = result.scalar_one_or_none()

    # user가 없어도 bcrypt 연산을 수행해 응답 시간을 일정하게 유지 (타이밍 어택 방지)
    password_ok = pwd_context.verify(body.password, user.password if user else _DUMMY_HASH)
    if not user or not password_ok:
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")

    if user.ban == UserBan.BAN:
        raise HTTPException(status_code=403, detail="정지된 계정입니다.")

    payload = {"sub": user.id, "role": user.role.value}
    _set_auth_cookies(response, create_access_token(payload), create_refresh_token(payload))
    await service.heartbeat(user.id)
    return TokenResponse(user=_user_info(user))


@router.post("/refresh")
async def refresh(response: Response, sp_refresh: str = Cookie(None), db: AsyncSession = Depends(get_db)):
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

    if user.ban == UserBan.BAN:
        _clear_auth_cookies(response)
        raise HTTPException(status_code=403, detail="정지된 계정입니다.")

    new_payload = {"sub": user.id, "role": user.role.value}
    _set_auth_cookies(response, create_access_token(new_payload), create_refresh_token(new_payload))
    return {"message": "토큰이 재발급되었습니다."}


@router.post("/logout")
async def logout(response: Response, payload: dict = Depends(require_auth)):
    try:
        await service.go_offline(payload["sub"])
    except Exception as e:
        logger.warning(f"[logout] presence 정리 실패 (무시하고 진행) user={payload['sub']}: {e}")
    _clear_auth_cookies(response)
    return {"status": "offline", "message": "로그아웃 되었습니다."}


@router.get("/me", response_model=UserInfo)
async def me(payload: dict = Depends(require_auth), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="사용자를 찾을 수 없습니다.")
    return _user_info(user)


@router.delete("/unlink/{provider}", status_code=204)
async def unlink_oauth(
    provider: str,
    payload: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserOAuthAccount).where(
            UserOAuthAccount.user_id == payload["sub"],
            UserOAuthAccount.provider == provider,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="연결된 계정이 없습니다.")
    await db.delete(row)
    logger.info(f"{provider} 연동 해제 — user_id={payload['sub']}")


@router.get("/me/oauth", response_model=LinkedOAuthResponse)
async def me_oauth(payload: dict = Depends(require_auth), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(UserOAuthAccount).where(UserOAuthAccount.user_id == payload["sub"])
    )
    rows = result.scalars().all()
    return LinkedOAuthResponse(
        accounts=[OAuthAccountInfo(provider=r.provider, email=r.email) for r in rows]
    )


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.get("/google/init")
async def google_init():
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google 로그인이 설정되지 않았습니다.")

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
    }
    return RedirectResponse("https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params))


@router.get("/google/callback")
async def google_callback(code: str | None = None, error: str | None = None, db: AsyncSession = Depends(get_db)):
    error_url = f"{settings.frontend_url}/login?error="

    if error or not code:
        return RedirectResponse(url=error_url + ("google_cancelled" if error == "access_denied" else "google_failed"))

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={"code": code, "client_id": settings.google_client_id,
                  "client_secret": settings.google_client_secret,
                  "redirect_uri": settings.google_redirect_uri, "grant_type": "authorization_code"},
        )
    if token_res.status_code != 200:
        return RedirectResponse(url=error_url + "google_failed")

    async with httpx.AsyncClient() as client:
        info_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {token_res.json().get('access_token')}"},
        )
    if info_res.status_code != 200:
        return RedirectResponse(url=error_url + "google_failed")

    g = info_res.json()
    email: str = g.get("email", "")
    if not email:
        return RedirectResponse(url=error_url + "google_failed")

    user = await _get_or_create_oauth_user(db, "google", g.get("id", ""), email, g.get("name") or email.split("@")[0])

    if user.ban == UserBan.BAN:
        return RedirectResponse(url=error_url + "banned")

    token_payload = {"sub": user.id, "role": user.role.value}
    redirect_path = "/superAdmin" if user.role == UserRole.SUPER_ADMIN else "/home"
    redirect = RedirectResponse(url=f"{settings.frontend_url}{redirect_path}", status_code=302)
    _set_auth_cookies(redirect, create_access_token(token_payload), create_refresh_token(token_payload))
    return redirect


# ── Kakao OAuth ───────────────────────────────────────────────────────────────

@router.get("/kakao/init")
async def kakao_init():
    if not settings.kakao_client_id:
        raise HTTPException(status_code=503, detail="Kakao 로그인이 설정되지 않았습니다.")

    params = {
        "client_id": settings.kakao_client_id,
        "redirect_uri": settings.kakao_redirect_uri,
        "response_type": "code",
    }
    return RedirectResponse("https://kauth.kakao.com/oauth/authorize?" + urlencode(params))


@router.get("/kakao/callback")
async def kakao_callback(code: str | None = None, error: str | None = None, db: AsyncSession = Depends(get_db)):
    error_url = f"{settings.frontend_url}/login?error="

    if error or not code:
        return RedirectResponse(url=error_url + ("kakao_cancelled" if error == "access_denied" else "kakao_failed"))

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://kauth.kakao.com/oauth/token",
            data={"grant_type": "authorization_code", "client_id": settings.kakao_client_id,
                  "client_secret": settings.kakao_client_secret,
                  "redirect_uri": settings.kakao_redirect_uri, "code": code},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if token_res.status_code != 200:
        return RedirectResponse(url=error_url + "kakao_failed")

    async with httpx.AsyncClient() as client:
        info_res = await client.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {token_res.json().get('access_token')}"},
        )
    if info_res.status_code != 200:
        return RedirectResponse(url=error_url + "kakao_failed")

    k = info_res.json()
    provider_id: str = str(k.get("id", ""))
    kakao_account = k.get("kakao_account", {})
    email: str | None = kakao_account.get("email") or None
    name: str = (
        kakao_account.get("profile", {}).get("nickname")
        or k.get("properties", {}).get("nickname")
        or f"카카오유저{provider_id[-4:]}"
    )

    user = await _get_or_create_oauth_user(db, "kakao", provider_id, email, name)

    if user.ban == UserBan.BAN:
        return RedirectResponse(url=error_url + "banned")

    token_payload = {"sub": user.id, "role": user.role.value}
    redirect_path = "/superAdmin" if user.role == UserRole.SUPER_ADMIN else "/home"
    redirect = RedirectResponse(url=f"{settings.frontend_url}{redirect_path}", status_code=302)
    _set_auth_cookies(redirect, create_access_token(token_payload), create_refresh_token(token_payload))
    return redirect


# ── 수동 계정 연동 ─────────────────────────────────────────────────────────────

@router.get("/link/kakao/init")
async def link_kakao_init(payload: dict = Depends(require_auth)):
    if not settings.kakao_client_id:
        raise HTTPException(status_code=503, detail="Kakao 로그인이 설정되지 않았습니다.")

    params = {
        "client_id": settings.kakao_client_id,
        "redirect_uri": f"{settings.kakao_redirect_uri.replace('/callback', '/link/callback')}",
        "response_type": "code",
    }
    redirect = RedirectResponse("https://kauth.kakao.com/oauth/authorize?" + urlencode(params))
    redirect.set_cookie("sp_link_uid", payload["sub"], httponly=True, max_age=300, samesite="lax")
    return redirect


@router.get("/kakao/link/callback")
async def link_kakao_callback(
    code: str | None = None,
    error: str | None = None,
    sp_link_uid: str = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    error_url = f"{settings.frontend_url}/home?link_error="

    if not sp_link_uid:
        return RedirectResponse(url=error_url + "session_expired")
    if error or not code:
        return RedirectResponse(url=error_url + "kakao_cancelled")

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://kauth.kakao.com/oauth/token",
            data={"grant_type": "authorization_code", "client_id": settings.kakao_client_id,
                  "client_secret": settings.kakao_client_secret,
                  "redirect_uri": settings.kakao_redirect_uri.replace("/callback", "/link/callback"),
                  "code": code},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if token_res.status_code != 200:
        return RedirectResponse(url=error_url + "kakao_failed")

    async with httpx.AsyncClient() as client:
        info_res = await client.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {token_res.json().get('access_token')}"},
        )
    if info_res.status_code != 200:
        return RedirectResponse(url=error_url + "kakao_failed")

    k = info_res.json()
    provider_id: str = str(k.get("id", ""))
    email: str | None = k.get("kakao_account", {}).get("email") or None

    dup = await db.execute(
        select(UserOAuthAccount).where(
            UserOAuthAccount.provider == "kakao",
            UserOAuthAccount.provider_user_id == provider_id,
        )
    )
    dup_row = dup.scalar_one_or_none()
    if dup_row:
        if dup_row.user_id != sp_link_uid:
            # 다른 계정에 이미 연결됨 → 병합 확인 모달로 이동
            redirect = RedirectResponse(url=f"{settings.frontend_url}/home?merge_confirm=kakao")
            redirect.set_cookie("sp_merge_drop", dup_row.user_id, httponly=True, max_age=300, samesite="lax")
            return redirect
        redirect = RedirectResponse(url=f"{settings.frontend_url}/home?link_success=kakao")
    else:
        db.add(UserOAuthAccount(user_id=sp_link_uid, provider="kakao", provider_user_id=provider_id, email=email))
        await db.flush()
        logger.success(f"Kakao 계정 연동 완료 — user_id={sp_link_uid}")
        redirect = RedirectResponse(url=f"{settings.frontend_url}/home?link_success=kakao")

    redirect.delete_cookie("sp_link_uid")
    return redirect


@router.get("/link/google/init")
async def link_google_init(payload: dict = Depends(require_auth)):
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google 로그인이 설정되지 않았습니다.")

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri.replace("/callback", "/link/callback"),
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
    }
    redirect = RedirectResponse("https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params))
    redirect.set_cookie("sp_link_uid", payload["sub"], httponly=True, max_age=300, samesite="lax")
    return redirect


@router.get("/google/link/callback")
async def link_google_callback(
    code: str | None = None,
    error: str | None = None,
    sp_link_uid: str = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    error_url = f"{settings.frontend_url}/home?link_error="

    if not sp_link_uid:
        return RedirectResponse(url=error_url + "session_expired")
    if error or not code:
        return RedirectResponse(url=error_url + "google_cancelled")

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={"code": code, "client_id": settings.google_client_id,
                  "client_secret": settings.google_client_secret,
                  "redirect_uri": settings.google_redirect_uri.replace("/callback", "/link/callback"),
                  "grant_type": "authorization_code"},
        )
    if token_res.status_code != 200:
        return RedirectResponse(url=error_url + "google_failed")

    async with httpx.AsyncClient() as client:
        info_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {token_res.json().get('access_token')}"},
        )
    if info_res.status_code != 200:
        return RedirectResponse(url=error_url + "google_failed")

    g = info_res.json()
    provider_id: str = g.get("id", "")
    email: str = g.get("email", "")

    dup = await db.execute(
        select(UserOAuthAccount).where(
            UserOAuthAccount.provider == "google",
            UserOAuthAccount.provider_user_id == provider_id,
        )
    )
    dup_row = dup.scalar_one_or_none()
    if dup_row:
        if dup_row.user_id != sp_link_uid:
            # 다른 계정에 이미 연결됨 → 병합 확인 모달로 이동
            redirect = RedirectResponse(url=f"{settings.frontend_url}/home?merge_confirm=google")
            redirect.set_cookie("sp_merge_drop", dup_row.user_id, httponly=True, max_age=300, samesite="lax")
            return redirect
        redirect = RedirectResponse(url=f"{settings.frontend_url}/home?link_success=google")
    else:
        db.add(UserOAuthAccount(user_id=sp_link_uid, provider="google", provider_user_id=provider_id, email=email))
        await db.flush()
        logger.success(f"Google 계정 연동 완료 — user_id={sp_link_uid}")
        redirect = RedirectResponse(url=f"{settings.frontend_url}/home?link_success=google")

    redirect.delete_cookie("sp_link_uid")
    return redirect


# ── Naver OAuth ───────────────────────────────────────────────────────────────

@router.get("/naver/init")
async def naver_init():
    if not settings.naver_client_id:
        raise HTTPException(status_code=503, detail="Naver 로그인이 설정되지 않았습니다.")

    params = {
        "client_id": settings.naver_client_id,
        "redirect_uri": settings.naver_redirect_uri,
        "response_type": "code",
        "state": secrets.token_hex(16),
    }
    return RedirectResponse("https://nid.naver.com/oauth2.0/authorize?" + urlencode(params))


@router.get("/naver/callback")
async def naver_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    error_url = f"{settings.frontend_url}/login?error="

    if error or not code:
        return RedirectResponse(url=error_url + ("naver_cancelled" if error == "access_denied" else "naver_failed"))

    async with httpx.AsyncClient() as client:
        token_res = await client.get(
            "https://nid.naver.com/oauth2.0/token",
            params={"grant_type": "authorization_code", "client_id": settings.naver_client_id,
                    "client_secret": settings.naver_client_secret,
                    "redirect_uri": settings.naver_redirect_uri, "code": code, "state": state},
        )
    if token_res.status_code != 200:
        return RedirectResponse(url=error_url + "naver_failed")

    async with httpx.AsyncClient() as client:
        info_res = await client.get(
            "https://openapi.naver.com/v1/nid/me",
            headers={"Authorization": f"Bearer {token_res.json().get('access_token')}"},
        )
    if info_res.status_code != 200:
        return RedirectResponse(url=error_url + "naver_failed")

    n = info_res.json().get("response", {})
    provider_id: str = str(n.get("id", ""))
    email: str | None = n.get("email") or None
    name: str = n.get("name") or n.get("nickname") or f"네이버유저{provider_id[-4:]}"

    user = await _get_or_create_oauth_user(db, "naver", provider_id, email, name)

    if user.ban == UserBan.BAN:
        return RedirectResponse(url=error_url + "banned")

    token_payload = {"sub": user.id, "role": user.role.value}
    redirect_path = "/superAdmin" if user.role == UserRole.SUPER_ADMIN else "/home"
    redirect = RedirectResponse(url=f"{settings.frontend_url}{redirect_path}", status_code=302)
    _set_auth_cookies(redirect, create_access_token(token_payload), create_refresh_token(token_payload))
    return redirect


@router.get("/link/naver/init")
async def link_naver_init(payload: dict = Depends(require_auth)):
    if not settings.naver_client_id:
        raise HTTPException(status_code=503, detail="Naver 로그인이 설정되지 않았습니다.")

    params = {
        "client_id": settings.naver_client_id,
        "redirect_uri": settings.naver_redirect_uri.replace("/callback", "/link/callback"),
        "response_type": "code",
        "state": secrets.token_hex(16),
    }
    redirect = RedirectResponse("https://nid.naver.com/oauth2.0/authorize?" + urlencode(params))
    redirect.set_cookie("sp_link_uid", payload["sub"], httponly=True, max_age=300, samesite="lax")
    return redirect


@router.get("/naver/link/callback")
async def link_naver_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    sp_link_uid: str = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    error_url = f"{settings.frontend_url}/home?link_error="

    if not sp_link_uid:
        return RedirectResponse(url=error_url + "session_expired")
    if error or not code:
        return RedirectResponse(url=error_url + "naver_cancelled")

    async with httpx.AsyncClient() as client:
        token_res = await client.get(
            "https://nid.naver.com/oauth2.0/token",
            params={"grant_type": "authorization_code", "client_id": settings.naver_client_id,
                    "client_secret": settings.naver_client_secret,
                    "redirect_uri": settings.naver_redirect_uri.replace("/callback", "/link/callback"),
                    "code": code, "state": state},
        )
    if token_res.status_code != 200:
        return RedirectResponse(url=error_url + "naver_failed")

    async with httpx.AsyncClient() as client:
        info_res = await client.get(
            "https://openapi.naver.com/v1/nid/me",
            headers={"Authorization": f"Bearer {token_res.json().get('access_token')}"},
        )
    if info_res.status_code != 200:
        return RedirectResponse(url=error_url + "naver_failed")

    n = info_res.json().get("response", {})
    provider_id: str = str(n.get("id", ""))
    email: str | None = n.get("email") or None

    dup = await db.execute(
        select(UserOAuthAccount).where(
            UserOAuthAccount.provider == "naver",
            UserOAuthAccount.provider_user_id == provider_id,
        )
    )
    dup_row = dup.scalar_one_or_none()
    if dup_row:
        if dup_row.user_id != sp_link_uid:
            # 다른 계정에 이미 연결됨 → 병합 확인 모달로 이동
            redirect = RedirectResponse(url=f"{settings.frontend_url}/home?merge_confirm=naver")
            redirect.set_cookie("sp_merge_drop", dup_row.user_id, httponly=True, max_age=300, samesite="lax")
            return redirect
        redirect = RedirectResponse(url=f"{settings.frontend_url}/home?link_success=naver")
    else:
        db.add(UserOAuthAccount(user_id=sp_link_uid, provider="naver", provider_user_id=provider_id, email=email))
        await db.flush()
        logger.success(f"Naver 계정 연동 완료 — user_id={sp_link_uid}")
        redirect = RedirectResponse(url=f"{settings.frontend_url}/home?link_success=naver")

    redirect.delete_cookie("sp_link_uid")
    return redirect


# ── 병합 확인 / 취소 ───────────────────────────────────────────────────────────

@router.get("/merge-preview")
async def merge_preview(
    sp_merge_drop: str = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    """병합 예정인 계정의 데이터 현황을 반환한다."""
    if not sp_merge_drop:
        raise HTTPException(status_code=400, detail="병합 세션이 없습니다.")

    async def count(model, col):
        r = await db.execute(select(func.count()).select_from(model).where(col == sp_merge_drop))
        return r.scalar_one()

    return {
        "chat_sessions":        await count(ChatSession,         ChatSession.user_id),
        "pinned_documents":     await count(PinnedDocument,      PinnedDocument.user_id),
        "bookmarked_documents": await count(BookmarkedDocument,  BookmarkedDocument.user_id),
        "uploaded_documents":   await count(Document,            Document.uploaded_by_id),
    }


@router.post("/merge-confirm")
async def merge_confirm_endpoint(
    response: Response,
    sp_link_uid: str = Cookie(None),
    sp_merge_drop: str = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    """병합 확인 — 두 계정을 실제로 합친다."""
    if not sp_link_uid or not sp_merge_drop:
        raise HTTPException(status_code=400, detail="병합 세션이 만료되었습니다.")
    await _merge_into(db, keep_id=sp_link_uid, drop_id=sp_merge_drop)
    response.delete_cookie("sp_merge_drop", path="/", samesite="lax")
    response.delete_cookie("sp_link_uid",   path="/", samesite="lax")
    return {"ok": True}


@router.post("/merge-cancel")
async def merge_cancel(response: Response):
    """병합 취소 — 관련 쿠키를 제거한다."""
    response.delete_cookie("sp_merge_drop", path="/", samesite="lax")
    response.delete_cookie("sp_link_uid",   path="/", samesite="lax")
    return {"ok": True}


@router.get("/stream")
async def stream(request: Request, user_id: str = Depends(get_current_user_id)):
    """SSE. 연결 시 online 마킹 + 초기 스냅샷 전송 후, 로컬 큐를 통해 실시간 이벤트 수신."""
    try:
        await service.heartbeat(user_id)
    except Exception as e:
        logger.warning(f"[stream] heartbeat 실패 (Redis 연결 불가): {e}")

    queue = await manager.subscribe()

    async def event_generator():
        try:
            # 1) 초기 스냅샷
            try:
                snapshot = await service.online_user_ids()
            except Exception:
                snapshot = []
            yield f"event: snapshot\ndata: {json.dumps({'online': snapshot})}\n\n"

            # 2) 실시간 이벤트 + keep-alive
            while True:
                if await request.is_disconnected():
                    break
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"event: presence\ndata: {data}\n\n"
                except asyncio.TimeoutError:
                    # keep-alive 겸 TTL 연장
                    try:
                        await service.heartbeat(user_id)
                    except Exception:
                        pass
                    yield ": keep-alive\n\n"
        finally:
            await manager.unsubscribe(queue)
            try:
                await service.go_offline(user_id)
            except Exception as e:
                logger.warning(f"[stream] go_offline 실패: {e}")

    headers = {
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",  # Nginx 버퍼링 비활성화 (SSE 필수)
    }
    return StreamingResponse(event_generator(), media_type="text/event-stream", headers=headers)