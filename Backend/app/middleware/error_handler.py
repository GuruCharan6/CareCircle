import structlog
from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.exceptions import AppException

logger = structlog.get_logger()


class ErrorHandlerMiddleware(BaseHTTPMiddleware):
    """Catch all unhandled exceptions → standard ErrorResponse.
    AppException subclasses → their status_code.
    Unknown exceptions → 500. Never leaks stack traces to client.
    """

    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except AppException as exc:
            logger.warning(
                "app_exception",
                error=exc.message,
                status=exc.status_code,
                path=request.url.path,
            )
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "error": exc.message,
                    "detail": exc.detail,
                    "request_id": getattr(request.state, "request_id", None),
                },
            )
        except Exception as exc:
            logger.exception(
                "unhandled_exception",
                error=str(exc),
                path=request.url.path,
            )
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal server error",
                    "detail": None,
                    "request_id": getattr(request.state, "request_id", None),
                },
            )
