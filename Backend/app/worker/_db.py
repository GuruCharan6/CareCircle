import json
from contextlib import asynccontextmanager

import asyncpg

from app.config import settings


@asynccontextmanager
async def worker_conn(min_size: int = 1, max_size: int = 3, command_timeout: int = 60):
    """
    Async context manager that creates a fresh asyncpg pool for a Celery task,
    yields one connection with JSON codecs registered, then closes the pool.

    Celery workers are separate processes — they don't share the FastAPI pool.
    Supabase transaction pooler (port 6543) handles real connection reuse server-side.
    """
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
