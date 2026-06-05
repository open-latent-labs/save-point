from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.rdb import init_db
from app.db.vector_db import init_qdrant_collection, close_qdrant_client

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await init_qdrant_collection()
    yield
    await close_qdrant_client()


app = FastAPI(
    title="GameDev Doc Platform",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 완성되면 아래에 등록
# from app.api import document, chat, search, admin
# app.include_router(document.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "GameDev Doc Platform API"}
