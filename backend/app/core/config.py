"""Application configuration loaded from environment variables."""

import logging

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

_INSECURE_JWT_DEFAULTS = {"your-secret-key-change-in-production", "change-this-to-a-random-secret-key"}


class Settings(BaseSettings):
    """Application settings sourced from environment variables or .env file."""

    DATABASE_URL: str = "postgresql+asyncpg://voc:vocpassword@localhost:5432/voc_ai"
    JWT_SECRET_KEY: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    OLLAMA_URL: str = "http://localhost:11434"
    SLACK_WEBHOOK_URL: str = ""
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # AI / RAG settings
    OLLAMA_CHAT_MODEL: str = "exaone3.5:7.8b"
    OLLAMA_EMBED_MODEL: str = "bge-m3"
    EMBEDDING_DIM: int = 1024
    RAG_TOP_K: int = 3
    RAG_SIMILARITY_THRESHOLD: float = 0.3
    CONFIDENCE_ESCALATE_THRESHOLD: float = 0.5
    MAX_LOW_CONFIDENCE_STREAK: int = 3

    # Tool classification settings
    TOOL_CLASSIFICATION_TEMPERATURE: float = 0.1
    TOOL_CLASSIFICATION_MAX_TOKENS: int = 200

    model_config = SettingsConfigDict(env_file=".env")

    # Environment flag — set TESTING=1 in test fixtures to allow insecure defaults
    TESTING: bool = False

    @model_validator(mode="after")
    def _validate_secrets(self) -> "Settings":
        if self.JWT_SECRET_KEY in _INSECURE_JWT_DEFAULTS:
            if self.TESTING:
                logger.warning(
                    "⚠️  JWT_SECRET_KEY is using an insecure default (allowed in TESTING mode)."
                )
            else:
                raise ValueError(
                    "JWT_SECRET_KEY is using an insecure default! "
                    "Set a secure random value via the JWT_SECRET_KEY environment variable."
                )
        return self


settings = Settings()
