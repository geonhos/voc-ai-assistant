"""Pydantic schemas for authentication endpoints."""

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Request body for POST /api/v1/auth/login."""

    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    """Request body for POST /api/v1/auth/refresh."""

    refresh_token: str


class TokenResponse(BaseModel):
    """Response body containing JWT tokens."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
