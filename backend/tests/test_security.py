"""Unit tests for JWT token creation/validation and password hashing."""

from unittest.mock import patch

import pytest
from jose import jwt

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
    verify_token,
)


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------


def test_hash_password_returns_bcrypt_hash():
    """Hashed password should start with bcrypt prefix."""
    hashed = hash_password("secret123")
    assert hashed.startswith("$2b$")


def test_verify_password_correct():
    """Correct password should verify successfully."""
    hashed = hash_password("mypassword")
    assert verify_password("mypassword", hashed) is True


def test_verify_password_incorrect():
    """Wrong password should fail verification."""
    hashed = hash_password("mypassword")
    assert verify_password("wrongpassword", hashed) is False


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------


def test_create_access_token_contains_type():
    """Access token payload should contain type='access'."""
    token = create_access_token({"sub": "1", "role": "ADMIN"})
    payload = verify_token(token)
    assert payload["type"] == "access"
    assert payload["sub"] == "1"


def test_create_refresh_token_contains_type():
    """Refresh token payload should contain type='refresh'."""
    token = create_refresh_token({"sub": "1", "role": "ADMIN"})
    payload = verify_token(token)
    assert payload["type"] == "refresh"


def test_access_token_has_expiry():
    """Access token should contain an 'exp' claim."""
    token = create_access_token({"sub": "1"})
    payload = verify_token(token)
    assert "exp" in payload


def test_verify_token_rejects_tampered_token():
    """Tampered token should raise JWTError."""
    token = create_access_token({"sub": "1"})
    tampered = token[:-5] + "XXXXX"

    from jose import JWTError
    with pytest.raises(JWTError):
        verify_token(tampered)


def test_refresh_token_cannot_be_used_as_access():
    """Refresh token type should be 'refresh', not 'access'."""
    token = create_refresh_token({"sub": "1"})
    payload = verify_token(token)
    assert payload["type"] != "access"
