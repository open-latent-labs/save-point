import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from app.db.rdb import init_db
from app.db.vector_db import init_qdrant_collection, close_qdrant_client
from app.presence.pubsub import manager as presence_manager, expiry_watcher
from app.presence import service as presence_service
from app.utils.jwt import decode_token
from app.api.document import router as document_router
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.superAdmin import router as superAdmin_router
from app.api.admin import router as admin_router
from app.api.summary import router as summary_router
from app.api.notification import router as notification_router
from app.services.flag_model import get_flag_model
from app.services.reranker import get_reranker
from app.config import settings
import app.models
import asyncio

# SSE 및 인증 자체 엔드포인트는 제외 (이미 heartbeat를 직접 호출하거나 의미 없음)
_SKIP_PRESENCE = frozenset({
    "/",
    "/auth/stream",
    "/auth/login",
    "/auth/signup",
    "/auth/refresh",
    "/auth/logout",
})

async def _safe_throttled_heartbeat(user_id: str) -> None:
    try:
        await presence_service.throttled_heartbeat(user_id)
    except Exception:
        pass


class PresenceMiddleware(BaseHTTPMiddleware):
    """인증된 API 요청마다 presence heartbeat를 갱신한다.
    JWT 디코드만 수행(DB 조회 없음)하여 오버헤드를 최소화하고,
    실제 Redis write는 30초 단위 throttle로 제한한다."""

    async def dispatch(self, request: Request, call_next):
        if request.url.path not in _SKIP_PRESENCE:
            token = request.cookies.get("sp_token")
            if token:
                payload = decode_token(token)
                if payload and payload.get("type") == "access":
                    user_id = payload.get("sub")
                    if user_id:
                        asyncio.create_task(_safe_throttled_heartbeat(user_id))
        return await call_next(request)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    await init_qdrant_collection()
    await presence_manager.start()
    await expiry_watcher.start()

    # 서버 시작 시 모델 미리 로드 (ML 라이브러리 불가 환경에서도 서버는 기동)
    try:
        print("모델 로드 중...")
        await asyncio.to_thread(get_flag_model)
        await asyncio.to_thread(get_reranker)
        print("모델 로드 완료")
    except asyncio.TimeoutError:
        print("[경고] ML 모델 로드 타임아웃 (검색/리랭킹 기능 비활성화)")
    except Exception as e:
        print(f"[경고] ML 모델 로드 실패 (검색/리랭킹 기능 비활성화): {e}")

    yield
    await close_qdrant_client()
    await presence_manager.stop()
    await expiry_watcher.stop()


app = FastAPI(
    title="GameDev Doc Platform",
    version="0.1.0",
    lifespan=lifespan,
)

# PresenceMiddleware 먼저 추가(inner), CORSMiddleware 나중에 추가(outer)
# → 요청 처리 순서: CORS → Presence → route handler
app.add_middleware(PresenceMiddleware)

_origins = [o.strip() for o in settings.frontend_url.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(document_router)
app.include_router(chat_router)
app.include_router(auth_router)
app.include_router(superAdmin_router)
app.include_router(admin_router)
app.include_router(summary_router)
app.include_router(notification_router)

# @app.exception_handler(Exception)
# async def unhandled_exception_handler(_request: Request, exc: Exception):
#     return JSONResponse(status_code=500, content={"detail": str(exc)})

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
    } if origin else {}
    return JSONResponse(
        status_code=500,
        content={"detail": "서버 오류가 발생했습니다."},
        headers=headers
    )



@app.get("/")
async def root():
    return {"message": "GameDev Doc Platform API"}