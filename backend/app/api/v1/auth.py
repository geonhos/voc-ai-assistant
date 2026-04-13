"""Authentication router — login and token refresh."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
    verify_token,
)
from app.models.merchant import Merchant
from app.models.user import User
from app.schemas.auth import LoginRequest, MeResponse, RefreshRequest, TokenResponse
from app.schemas.merchant import MerchantLoginRequest

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate with email and password",
)
@limiter.limit("5/minute")
async def login(
    request: Request,
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate a user and return access + refresh JWT tokens.

    Args:
        payload: Login credentials (email, password).
        db: Active async database session.

    Returns:
        TokenResponse containing access_token, refresh_token, and token_type.

    Raises:
        HTTPException 401: If credentials are invalid.
    """
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = {"sub": str(user.id), "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.get(
    "/me",
    response_model=MeResponse,
    summary="Get current authenticated user info",
)
async def me(user: User = Depends(get_current_user)) -> MeResponse:
    """Return the currently authenticated user's profile."""
    return MeResponse(id=user.id, email=user.email, role=user.role)


@router.post(
    "/merchant/login",
    response_model=TokenResponse,
    summary="Authenticate a merchant with MID and password",
)
@limiter.limit("5/minute")
async def merchant_login(
    request: Request,
    payload: MerchantLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate a merchant account using MID and password.

    Args:
        payload: Merchant login credentials (mid, password).
        db: Active async database session.

    Returns:
        TokenResponse containing access_token, refresh_token, and token_type.

    Raises:
        HTTPException 401: If the MID or password is invalid.
    """
    merchant_result = await db.execute(
        select(Merchant).where(Merchant.mid == payload.mid)
    )
    merchant = merchant_result.scalar_one_or_none()
    if merchant is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid merchant ID or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_result = await db.execute(
        select(User).where(User.merchant_id == merchant.id)
    )
    user = user_result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid merchant ID or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = {
        "sub": str(user.id),
        "role": user.role,
        "merchant_id": merchant.id,
    }
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token using a valid refresh token",
)
async def refresh(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Issue a new access token using a valid refresh token.

    Args:
        payload: Contains the refresh_token string.
        db: Active async database session.

    Returns:
        TokenResponse with a new access_token (refresh_token unchanged).

    Raises:
        HTTPException 401: If the refresh token is invalid or expired.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token_payload = verify_token(payload.refresh_token)
        if token_payload.get("type") != "refresh":
            raise credentials_exception
        user_id: str | None = token_payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    token_data = {"sub": str(user.id), "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


@router.post(
    "/customer/login",
    response_model=TokenResponse,
    summary="Authenticate a customer with email and password",
)
@limiter.limit("5/minute")
async def customer_login(
    request: Request,
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate a customer account using email and password."""
    result = await db.execute(
        select(User).where(User.email == payload.email, User.role == "CUSTOMER")
    )
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = {"sub": str(user.id), "role": user.role}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )
