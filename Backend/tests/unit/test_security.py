"""Unit tests for app/core/security.py — JWT verification."""
import time

import pytest
from jose import jwt

from tests.conftest import TEST_JWT_SECRET, TEST_USER_ID


def _make_token(payload: dict) -> str:
    return jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


class TestVerifyToken:
    def test_valid_token_returns_claims(self):
        from app.core.security import verify_token

        token = _make_token({
            "sub": str(TEST_USER_ID),
            "role": "authenticated",
            "exp": int(time.time()) + 3600,
        })
        claims = verify_token(token)
        assert claims["sub"] == str(TEST_USER_ID)
        assert claims["role"] == "authenticated"

    def test_expired_token_raises_unauthorized(self):
        from app.core.exceptions import UnauthorizedError
        from app.core.security import verify_token

        token = _make_token({"sub": "x", "exp": int(time.time()) - 1})
        with pytest.raises(UnauthorizedError, match="Invalid token"):
            verify_token(token)

    def test_wrong_secret_raises_unauthorized(self):
        from app.core.exceptions import UnauthorizedError
        from app.core.security import verify_token

        token = jwt.encode({"sub": "x", "exp": 9_999_999_999}, "wrong-secret", algorithm="HS256")
        with pytest.raises(UnauthorizedError):
            verify_token(token)

    def test_malformed_token_raises_unauthorized(self):
        from app.core.exceptions import UnauthorizedError
        from app.core.security import verify_token

        with pytest.raises(UnauthorizedError):
            verify_token("not.a.jwt")


class TestExtractUserId:
    def test_returns_sub_claim(self):
        from app.core.security import extract_user_id

        token = _make_token({"sub": str(TEST_USER_ID), "exp": 9_999_999_999})
        uid = extract_user_id(token)
        assert uid == str(TEST_USER_ID)

    def test_missing_sub_raises_unauthorized(self):
        from app.core.exceptions import UnauthorizedError
        from app.core.security import extract_user_id

        token = _make_token({"role": "authenticated", "exp": 9_999_999_999})
        with pytest.raises(UnauthorizedError, match="sub claim"):
            extract_user_id(token)


class TestExtractClaims:
    def test_returns_user_id_role_email(self):
        from app.core.security import extract_claims

        token = _make_token({
            "sub": str(TEST_USER_ID),
            "role": "authenticated",
            "email": "test@example.com",
            "exp": 9_999_999_999,
        })
        user_id, role, email = extract_claims(token)
        assert user_id == str(TEST_USER_ID)
        assert role == "authenticated"
        assert email == "test@example.com"

    def test_defaults_role_to_authenticated(self):
        from app.core.security import extract_claims

        token = _make_token({"sub": str(TEST_USER_ID), "exp": 9_999_999_999})
        _, role, _ = extract_claims(token)
        assert role == "authenticated"
