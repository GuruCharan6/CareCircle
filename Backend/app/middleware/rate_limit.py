import time

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.redis import get_redis

# Auth endpoints get stricter limit — OTP brute-force protection
_AUTH_PATHS = {"/api/v1/auth/otp/send", "/api/v1/auth/otp/verify", "/api/v1/auth/google"}
_AUTH_LIMIT = 10        # requests
_AUTH_WINDOW = 60       # seconds
_API_LIMIT = 100        # requests
_API_WINDOW = 60        # seconds


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Redis-backed per-user (or per-IP for unauthenticated) rate limiting.
    Returns 429 with Retry-After header when limit exceeded.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip health + docs
        if request.url.path in {"/health", "/ready", "/docs", "/redoc", "/openapi.json"}:
            return await call_next(request)

        # Key: user_id if authenticated, else client IP
        user_id = getattr(request.state, "user_id", None)
        identifier = user_id or request.client.host if request.client else "unknown"

        is_auth = request.url.path in _AUTH_PATHS
        limit = _AUTH_LIMIT if is_auth else _API_LIMIT
        window = _AUTH_WINDOW if is_auth else _API_WINDOW
        bucket = "auth" if is_auth else "api"

        key = f"ratelimit:{bucket}:{identifier}:{int(time.time()) // window}"

        try:
            redis = get_redis()
            count = await redis.incr(key)
            if count == 1:
                await redis.expire(key, window)

            if count > limit:
                retry_after = window - (int(time.time()) % window)
                return JSONResponse(
                    status_code=429,
                    content={"error": "Rate limit exceeded", "detail": f"Try again in {retry_after}s"},
                    headers={"Retry-After": str(retry_after)},
                )
        except Exception:
            # Redis down → fail open (don't block requests)
            pass

        return await call_next(request)
