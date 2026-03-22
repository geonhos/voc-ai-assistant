"""Pydantic schemas for merchant endpoints."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class MerchantCreate(BaseModel):
    """Request body for creating a new merchant."""

    mid: str
    name: str
    business_number: str
    settings: Optional[dict] = None


class MerchantResponse(BaseModel):
    """Response body representing a merchant record."""

    id: int
    mid: str
    name: str
    business_number: str
    status: str
    settings: Optional[dict]
    created_at: datetime
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class MerchantUserCreate(BaseModel):
    """Request body for creating a user account linked to a merchant."""

    email: str
    password: str
    merchant_id: int


class MerchantLoginRequest(BaseModel):
    """Request body for merchant login using MID and password."""

    mid: str
    password: str
