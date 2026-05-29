"""Unit tests for app/lib/upload_jwt.py."""
import time
from uuid import uuid4

import pytest
from jose import jwt

from tests.conftest import TEST_JWT_SECRET, TEST_PATIENT_ID, TEST_USER_ID


class TestCreateUploadJwt:
    def test_returns_valid_jwt(self):
        from app.lib.upload_jwt import create_upload_jwt

        token = create_upload_jwt(TEST_USER_ID, TEST_PATIENT_ID)
        assert isinstance(token, str)
        assert len(token.split(".")) == 3

    def test_claims_are_correct(self):
        from app.lib.upload_jwt import create_upload_jwt

        token = create_upload_jwt(TEST_USER_ID, TEST_PATIENT_ID)
        claims = jwt.decode(token, TEST_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})

        assert claims["sub"] == str(TEST_USER_ID)
        assert claims["patient_id"] == str(TEST_PATIENT_ID)
        assert claims["purpose"] == "whatsapp_upload"

    def test_expiry_is_15_minutes(self):
        from app.lib.upload_jwt import create_upload_jwt

        before = int(time.time())
        token = create_upload_jwt(TEST_USER_ID, TEST_PATIENT_ID)
        after = int(time.time())

        claims = jwt.decode(token, TEST_JWT_SECRET, algorithms=["HS256"], options={"verify_aud": False})
        exp = claims["exp"]
        iat = claims["iat"]

        assert exp - iat == 15 * 60
        assert before <= iat <= after + 1


class TestVerifyUploadJwt:
    def test_valid_token_returns_claims(self):
        from app.lib.upload_jwt import create_upload_jwt, verify_upload_jwt

        token = create_upload_jwt(TEST_USER_ID, TEST_PATIENT_ID)
        claims = verify_upload_jwt(token)
        assert claims["purpose"] == "whatsapp_upload"
        assert claims["sub"] == str(TEST_USER_ID)

    def test_wrong_purpose_raises_unauthorized(self):
        from app.core.exceptions import UnauthorizedError
        from app.lib.upload_jwt import verify_upload_jwt

        # Build a token with a different purpose
        payload = {
            "sub": str(TEST_USER_ID),
            "purpose": "something_else",
            "exp": 9_999_999_999,
        }
        bad_token = jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")
        with pytest.raises(UnauthorizedError, match="upload flow"):
            verify_upload_jwt(bad_token)

    def test_expired_token_raises_unauthorized(self):
        from app.core.exceptions import UnauthorizedError
        from app.lib.upload_jwt import verify_upload_jwt

        payload = {
            "sub": str(TEST_USER_ID),
            "purpose": "whatsapp_upload",
            "exp": int(time.time()) - 1,
        }
        expired = jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")
        with pytest.raises(UnauthorizedError):
            verify_upload_jwt(expired)

    def test_tampered_token_raises_unauthorized(self):
        from app.core.exceptions import UnauthorizedError
        from app.lib.upload_jwt import create_upload_jwt, verify_upload_jwt

        token = create_upload_jwt(TEST_USER_ID, TEST_PATIENT_ID)
        tampered = token[:-5] + "XXXXX"
        with pytest.raises(UnauthorizedError):
            verify_upload_jwt(tampered)
