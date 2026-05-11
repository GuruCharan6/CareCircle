import json
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import asyncpg

from app.config import settings
from app.core.logging import logger

_service_role_pool: asyncpg.Pool | None = None


async def _register_json_codecs(conn: asyncpg.Connection) -> None:
    # asyncpg returns jsonb/json as raw strings by default.
    # Must register per-connection — Supabase pooler resets codecs between acquisitions.
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


async def init_db() -> None:
    global _service_role_pool
    _service_role_pool = await asyncpg.create_pool(
        dsn=settings.supabase_db_url,
        min_size=2,
        max_size=10,
        command_timeout=30,
        server_settings={
            "application_name": "carecircle_api",
        },
    )
    logger.info("database_pool_created", dsn_host=_extract_host(settings.supabase_db_url))


async def close_db() -> None:
    global _service_role_pool
    if _service_role_pool:
        await _service_role_pool.close()
        _service_role_pool = None
        logger.info("database_pool_closed")


def get_pool() -> asyncpg.Pool:
    if _service_role_pool is None:
        raise RuntimeError("DB pool not initialised — call init_db() first")
    return _service_role_pool


@asynccontextmanager
async def get_service_conn() -> AsyncGenerator[asyncpg.Connection, None]:
    """Acquire connection from service_role pool — bypasses RLS."""
    pool = get_pool()
    async with pool.acquire() as conn:
        await _register_json_codecs(conn)
        yield conn


@asynccontextmanager
async def get_user_conn(
    user_id: str,
) -> AsyncGenerator[asyncpg.Connection, None]:
    """Acquire connection with RLS claims set for a specific user."""
    pool = get_pool()
    async with pool.acquire() as conn:
        await _register_json_codecs(conn)
        async with conn.transaction():
            await conn.execute("SET LOCAL role = authenticated")
            await conn.execute(
                "SELECT set_config('request.jwt.claims', $1, true)",
                f'{{"sub": "{user_id}", "role": "authenticated"}}',
            )
            yield conn


def _extract_host(dsn: str) -> str:
    try:
        return dsn.split("@")[1].split("/")[0]
    except Exception:
        return "unknown"
