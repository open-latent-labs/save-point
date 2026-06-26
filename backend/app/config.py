from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
import os

_env = os.getenv("APP_ENV", "prod") # runpod 서버 사용 원할시 dev -> prod로 수정!

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=f"env/.env.{_env}",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── JWT ──────────────────────────────────────────────────────────────────
    secret_key: str

    # ===============================================
    # Chat
    # ===============================================
    qdrant_host: str
    qdrant_port: int
    qdrant_collection_name: str

    embed_model: str
    embed_dim: int

    chunk_size: int
    chunk_overlap: int

    # Ollama
    ollama_generate_url: str
    ollama_chat_url: str
    ollama_embed_url: str
    chat_model: str
    new_chat_model: str
    summary_model: str
    judge_model:str
    rewrite_model:str

    algorithm: str
    access_token_expire_minutes: int
    refresh_token_expire_days: int

    # Hugging Face
    flag_model: str
    rerank_model: str
    rerank_url: str = ""  # prod: RunPod 엔드포인트, dev: 빈 문자열 (로컬 모델 사용)

    # ── App ──────────────────────────────────────────────────────────────────
    app_name: str
    app_version: str
    debug: bool
 
    # ── Database ─────────────────────────────────────────────────────────────
    database_url: str
 
    # ── MinIO ─────────────────────────────────────────────────────────────────
    minio_endpoint: str
    minio_root_user: str
    minio_root_password: str
    minio_use_ssl: bool

    # ── Redis ────────────────────────────────────────────────────────────────
    redis_url: str
    presence_ttl: int
    heartbeat_interval: int

    # ── Google OAuth ──────────────────────────────────────────────────────────
    google_client_id: str 
    google_client_secret: str
    google_redirect_uri: str
    frontend_url: str

    # ── Kakao OAuth ───────────────────────────────────────────────────────────
    kakao_client_id: str
    kakao_client_secret: str
    kakao_redirect_uri: str

    # ── Naver OAuth ───────────────────────────────────────────────────────────
    naver_client_id: str
    naver_client_secret: str
    naver_redirect_uri: str


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()