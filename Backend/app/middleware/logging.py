import time

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = structlog.get_logger()

_SKIP_BODY_LOG_PATHS = {"/api/v1/documents/"}  # file upload — don't log body

# Paths skipped entirely from request logging (browser noise, health polls)
_SKIP_LOG_PATHS = {"/favicon.ico", "/", "/docs", "/redoc", "/openapi.json"}


class LoggingMiddleware(BaseHTTPMiddleware):
    """Log every request/response with method, path, status, duration, request_id, user_id."""

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path

        # Skip noisy browser/tool paths entirely
        if path in _SKIP_LOG_PATHS:
            return await call_next(request)

        start = time.perf_counter()
        request_id = getattr(request.state, "request_id", None)

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=path,
        )

        response = await call_next(request)

        # user_id set by get_current_user() inside route handler — read after call_next
        user_id = getattr(request.state, "user_id", None)
        structlog.contextvars.bind_contextvars(user_id=user_id)

        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        logger.info(
            "http_request",
            status=response.status_code,
            duration_ms=duration_ms,
        )
        return response
