"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

import httpx
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import text

from app.api.v1 import auth, chat, admin, knowledge, merchant_admin, merchant_chat, customer_chat
from app.core.config import settings
from app.core.database import get_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan handler — startup and shutdown hooks.

    Args:
        app: The FastAPI application instance.

    Yields:
        Control back to the application while it is running.
    """
    logger.info("Starting VOC AI Assistant API...")
    yield
    # Cleanup httpx singleton clients on shutdown
    import app.services.embedding as emb_mod
    import app.core.http_client as http_client_mod
    if emb_mod._client is not None:
        await emb_mod._client.aclose()
        emb_mod._client = None
    await http_client_mod.close_client()
    logger.info("Shutting down VOC AI Assistant API...")


app = FastAPI(
    title="VOC AI Assistant API",
    description="AI-powered VOC (Voice of Customer) support assistant backend.",
    version="0.1.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Rate Limiting
# ---------------------------------------------------------------------------

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Conversation-Token"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

API_V1_PREFIX = "/api/v1"

app.include_router(auth.router, prefix=API_V1_PREFIX)
app.include_router(chat.router, prefix=API_V1_PREFIX)
app.include_router(admin.router, prefix=API_V1_PREFIX)
app.include_router(knowledge.router, prefix=API_V1_PREFIX)
app.include_router(merchant_admin.router, prefix=API_V1_PREFIX)
app.include_router(merchant_chat.router, prefix=API_V1_PREFIX)
app.include_router(customer_chat.router, prefix=API_V1_PREFIX)

# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """Convert ValueError into a 400 Bad Request response."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": "Invalid request data"},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler that returns 500 Internal Server Error."""
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/health", tags=["health"], summary="Health check endpoint")
async def health_check() -> dict[str, str]:
    """Return a simple health status.

    Returns:
        Dict with status key set to "ok".
    """
    return {"status": "ok"}


@app.get("/health/ready", tags=["health"], summary="Readiness check — DB and Ollama")
async def health_ready() -> JSONResponse:
    """Check that the database and Ollama service are reachable.

    Returns:
        JSON with status, db, and ollama fields.
    """
    result: dict[str, str] = {"status": "ok", "db": "ok", "ollama": "ok"}
    http_status = status.HTTP_200_OK

    try:
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
    except Exception:
        result["db"] = "error"
        result["status"] = "degraded"
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(settings.OLLAMA_URL + "/api/tags")
            if response.status_code != 200:
                raise ValueError("Non-200 response")
    except Exception:
        result["ollama"] = "error"
        result["status"] = "degraded"
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(content=result, status_code=http_status)
