from typing import Any


class AppException(Exception):
    def __init__(self, message: str, status_code: int = 500, detail: Any = None) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.detail = detail


class NotFoundError(AppException):
    def __init__(self, resource: str, resource_id: str | None = None) -> None:
        msg = f"{resource} not found" if not resource_id else f"{resource} '{resource_id}' not found"
        super().__init__(msg, status_code=404)


class UnauthorizedError(AppException):
    def __init__(self, message: str = "Unauthorized") -> None:
        super().__init__(message, status_code=401)


class ForbiddenError(AppException):
    def __init__(self, message: str = "Forbidden") -> None:
        super().__init__(message, status_code=403)


class ValidationError(AppException):
    def __init__(self, message: str, detail: Any = None) -> None:
        super().__init__(message, status_code=422, detail=detail)


class ConflictError(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(message, status_code=409)


class ExternalServiceError(AppException):
    def __init__(self, service: str, message: str) -> None:
        super().__init__(f"{service}: {message}", status_code=502)


class RateLimitError(AppException):
    def __init__(self, message: str = "Rate limit exceeded") -> None:
        super().__init__(message, status_code=429)
