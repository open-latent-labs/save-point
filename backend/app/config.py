from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App
    app_env: str = "development"
    secret_key: str

    # PostgreSQL
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str
    postgres_user: str
    postgres_password: str

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ===============================================
    # Chat
    # ===============================================
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_collection_name: str = "game_docs"

    embed_model: str = "bge-m3"
    embed_dim: int = 1024

    chunk_size: int = 300
    chunk_overlap: int = 50



    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    summary_model: str = "gemma2:9b"
    chat_model: str = "gemma2:9b"

    # OCR
    tesseract_cmd: str = "/usr/bin/tesseract"

    # File Upload
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 50


@lru_cache
def get_settings() -> Settings:
    return Settings()
