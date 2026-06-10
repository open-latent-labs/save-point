from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
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
    ollama_base_url: str = "http://localhost:11434"
    summary_model: str = "gemma2:9b"
    chat_model: str = "gemma2:9b"

    algorithm: str
    access_token_expire_minutes: int
    refresh_token_expire_days: int

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

    # ── Google OAuth ──────────────────────────────────────────────────────────
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""
    frontend_url: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()