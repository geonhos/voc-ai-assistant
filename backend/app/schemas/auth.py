"""Pydantic schemas for authentication endpoints."""

from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Request body for POST /api/v1/auth/login."""

    email: str
    password: str


class RefreshRequest(BaseModel):
    """Request body for POST /api/v1/auth/refresh."""

    refresh_token: str


class MeResponse(BaseModel):
    """Response body for GET /api/v1/auth/me."""

    id: int
    email: str
    role: str


class TokenResponse(BaseModel):
    """Response body containing JWT tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
