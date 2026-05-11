from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.database import get_pool
from app.core.redis import get_redis

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok"})


@router.get("/ready")
async def ready() -> JSONResponse:
    checks: dict[str, str] = {}
    ok = True

    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        checks["database"] = "ok"
    except Exception as exc:
        checks["database"] = str(exc)
        ok = False

    try:
        redis = get_redis()
        await redis.ping()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = str(exc)
        ok = False

    status_code = 200 if ok else 503
    return JSONResponse({"status": "ready" if ok else "not_ready", "checks": checks}, status_code=status_code)
