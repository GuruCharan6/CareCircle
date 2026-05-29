"""Unit tests for app/core/exceptions.py."""
from app.core.exceptions import (
    AppException,
    ConflictError,
    ExternalServiceError,
    ForbiddenError,
    NotFoundError,
    RateLimitError,
    UnauthorizedError,
    ValidationError,
)


class TestAppException:
    def test_defaults(self):
        exc = AppException("something failed")
        assert exc.message == "something failed"
        assert exc.status_code == 500
        assert exc.detail is None

    def test_custom_status_and_detail(self):
        exc = AppException("bad", status_code=400, detail={"field": "value"})
        assert exc.status_code == 400
        assert exc.detail == {"field": "value"}


class TestNotFoundError:
    def test_without_id(self):
        exc = NotFoundError("Patient")
        assert "Patient" in exc.message
        assert "not found" in exc.message
        assert exc.status_code == 404

    def test_with_id(self):
        exc = NotFoundError("Patient", "abc-123")
        assert "abc-123" in exc.message
        assert exc.status_code == 404


class TestUnauthorizedError:
    def test_default_message(self):
        exc = UnauthorizedError()
        assert "Unauthorized" in exc.message
        assert exc.status_code == 401

    def test_custom_message(self):
        exc = UnauthorizedError("Token expired")
        assert "Token expired" in exc.message


class TestForbiddenError:
    def test_status_code(self):
        exc = ForbiddenError()
        assert exc.status_code == 403


class TestValidationError:
    def test_status_code_and_detail(self):
        exc = ValidationError("bad input", detail={"field": "name"})
        assert exc.status_code == 422
        assert exc.detail == {"field": "name"}


class TestConflictError:
    def test_status_code(self):
        exc = ConflictError("duplicate entry")
        assert exc.status_code == 409


class TestExternalServiceError:
    def test_message_format(self):
        exc = ExternalServiceError("Gemini", "timeout")
        assert "Gemini" in exc.message
        assert "timeout" in exc.message
        assert exc.status_code == 502


class TestRateLimitError:
    def test_status_code(self):
        exc = RateLimitError()
        assert exc.status_code == 429
