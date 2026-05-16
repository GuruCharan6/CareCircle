import json
from contextlib import asynccontextmanager

import asyncpg

from app.config import settings


@asynccontextmanager
async def worker_conn(min_size: int = 1, max_size: int = 3, command_timeout: int = 60):
    """
    Yields one DB connection with JSON codecs registered.

    Starlette background task path: app pool already exists — reuse it.
    Celery worker path: separate process with no app pool — create a fresh pool.
    """
    # Reuse the FastAPI app pool when running inside the web process (background tasks).
    # Avoids creating a second pool that exhausts Supabase connection limits.
    from app.core import database as _db_module
    if _db_module._service_role_pool is not None:
        async with _db_module.get_service_conn() as conn:
            yield conn
        return

    # Celery worker process — no app pool exists, create a temporary one.
    pool = await asyncpg.create_pool(
        dsn=settings.supabase_db_url,
        min_size=min_size,
        max_size=max_size,
        command_timeout=command_timeout,
    )
    try:
        async with pool.acquire() as conn:
            await conn.set_type_codec(
                "jsonb",
                encoder=json.dumps,
                decoder=json.loads,
                schema="pg_catalog",
                format="text",
            )
            await conn.set_type_codec(
                "json",
                encoder=json.dumps,
                decoder=json.loads,
                schema="pg_catalog",
                format="text",
            )
            yield conn
    finally:
        await pool.close()
