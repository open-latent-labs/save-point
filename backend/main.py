from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.db.rdb import init_db
from app.db.vector_db import init_qdrant_collection, close_qdrant_client
from app.api.document import router as document_router
from app.api.auth import router as auth_router
from app.api.chat import router as chat_router
from app.api.superAdmin import router as superAdmin_router
from app.api.admin import router as admin_router
from app.api.summary import router as summary_router
from app.services.flag_model import get_flag_model
from app.services.reranker import get_reranker
from app.config import settings
import app.models
import asyncio


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_db()
    await init_qdrant_collection()

    # 서버 시작 시 모델 미리 로드 (ML 라이브러리 불가 환경에서도 서버는 기동)
    try:
        print("모델 로드 중...")
        await asyncio.to_thread(get_flag_model)
        await asyncio.to_thread(get_reranker)
        print("모델 로드 완료")
    except Exception as e:
        print(f"[경고] ML 모델 로드 실패 (검색/리랭킹 기능 비활성화): {e}")

    yield
    await close_qdrant_client()


app = FastAPI(
    title="GameDev Doc Platform",
    version="0.1.0",
    lifespan=lifespan,
)

_origins = [o.strip() for o in settings.frontend_url.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(document_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(superAdmin_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(summary_router, prefix="/api")

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