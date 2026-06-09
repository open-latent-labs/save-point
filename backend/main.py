from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.rdb import init_db
from app.db.vector_db import init_qdrant_collection, close_qdrant_client
from app.api.document import router as document_router
from app.api.auth import router as auth_router
import app.models

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
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(document_router)
app.include_router(auth_router)

@app.get("/")
async def root():
    return {"message": "GameDev Doc Platform API"}
