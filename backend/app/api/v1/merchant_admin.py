"""Admin router — CRUD operations for merchant management."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_admin
from app.core.security import hash_password
from app.models.merchant import Merchant
from app.models.user import User
from app.schemas.merchant import (
    MerchantCreate,
    MerchantResponse,
    MerchantUserCreate,
)

router = APIRouter(prefix="/admin/merchants", tags=["merchant-admin"])


@router.post(
    "/",
    response_model=MerchantResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new merchant",
)
async def create_merchant(
    data: MerchantCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> MerchantResponse:
    """Create a new merchant record.

    Args:
        data: Merchant creation payload.
        db: Active async database session.

    Returns:
        The newly created merchant.

    Raises:
        HTTPException 409: If a merchant with the same MID already exists.
    """
    existing = await db.execute(select(Merchant).where(Merchant.mid == data.mid))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Merchant with MID '{data.mid}' already exists",
        )

    merchant = Merchant(**data.model_dump())
    db.add(merchant)
    await db.commit()
    await db.refresh(merchant)
    return merchant


@router.get(
    "/",
    response_model=list[MerchantResponse],
    summary="List all merchants",
)
async def list_merchants(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> list[MerchantResponse]:
    """Return a paginated list of all merchants ordered by creation date.

    Args:
        skip: Number of records to skip (offset).
        limit: Maximum number of records to return.
        db: Active async database session.

    Returns:
        List of merchant records.
    """
    result = await db.execute(
        select(Merchant)
        .order_by(Merchant.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()


@router.get(
    "/{merchant_id}",
    response_model=MerchantResponse,
    summary="Get a merchant by ID",
)
async def get_merchant(
    merchant_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> MerchantResponse:
    """Retrieve a single merchant by primary key.

    Args:
        merchant_id: Primary key of the merchant.
        db: Active async database session.

    Returns:
        The matching merchant record.

    Raises:
        HTTPException 404: If the merchant does not exist.
    """
    result = await db.execute(select(Merchant).where(Merchant.id == merchant_id))
    merchant = result.scalar_one_or_none()
    if merchant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Merchant {merchant_id} not found",
        )
    return merchant


@router.post(
    "/{merchant_id}/users",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user account linked to a merchant",
)
async def create_merchant_user(
    merchant_id: int,
    data: MerchantUserCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
) -> dict:
    """Create a MERCHANT-role user account linked to the given merchant.

    Args:
        merchant_id: Primary key of the merchant to link.
        data: User creation payload (email, password, merchant_id).
        db: Active async database session.

    Returns:
        Dict containing the new user's id, email, role, and merchant_id.

    Raises:
        HTTPException 404: If the merchant does not exist.
        HTTPException 409: If a user with the same email already exists.
    """
    merchant_result = await db.execute(
        select(Merchant).where(Merchant.id == merchant_id)
    )
    if merchant_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Merchant {merchant_id} not found",
        )

    existing_user = await db.execute(
        select(User).where(User.email == data.email)
    )
    if existing_user.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email '{data.email}' already exists",
        )

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        role="MERCHANT",
        merchant_id=merchant_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "merchant_id": user.merchant_id,
    }
