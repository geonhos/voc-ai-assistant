"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings sourced from environment variables or .env file."""

    DATABASE_URL: str = "postgresql+asyncpg://voc:vocpassword@localhost:5432/voc_ai"
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    OPENAI_API_KEY: str = ""
    SLACK_WEBHOOK_URL: str = ""
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # AI / RAG settings
    OPENAI_MODEL: str = "gpt-4o-mini"
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    RAG_TOP_K: int = 3
    RAG_SIMILARITY_THRESHOLD: float = 0.3
    CONFIDENCE_ESCALATE_THRESHOLD: float = 0.5
    MAX_LOW_CONFIDENCE_STREAK: int = 3

    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()
