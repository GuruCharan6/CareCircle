from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

from app.config import settings
from app.core.redis import get_redis
from app.lib.upload_shortlink import resolve_short_link

router = APIRouter(tags=["shortlink"])


@router.get("/r/{code}", include_in_schema=False)
async def redirect_upload_link(code: str) -> RedirectResponse:
    """Resolve a short upload link and redirect to the upload page."""
    redis = get_redis()
    token = await resolve_short_link(redis, code)
    if not token:
        raise HTTPException(status_code=410, detail="Link expired or not found")
    return RedirectResponse(
        url=f"{settings.frontend_base_url}/upload?token={token}",
        status_code=302,
    )
