from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Routes that don't require auth token extraction
_SKIP_PATHS = {"/health", "/ready", "/docs", "/redoc", "/openapi.json"}
_SKIP_PREFIXES = ("/api/v1/whatsapp/",)  # webhook — validated by Twilio signature


class AuthExtractionMiddleware(BaseHTTPMiddleware):
    """Extract JWT from Authorization header → request.state.token.
    Does NOT validate — validation happens in api/deps.py get_current_user().
    Skips health, docs, webhook routes.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        request.state.token = None
        request.state.user_id = None

        if request.url.path not in _SKIP_PATHS and not any(
            request.url.path.startswith(p) for p in _SKIP_PREFIXES
        ):
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                request.state.token = auth_header[len("Bearer "):]

        return await call_next(request)
