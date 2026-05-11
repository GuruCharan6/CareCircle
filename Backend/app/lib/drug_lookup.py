from __future__ import annotations

import asyncpg

from app.core.logging import get_logger
from app.repositories.drug_generic_lookup_repository import DrugGenericLookupRepository

logger = get_logger(__name__)


async def resolve_generic(conn: asyncpg.Connection, brand_name: str) -> str | None:
    """Translate brand→generic via drug_generic_lookup table. Case-insensitive."""
    repo = DrugGenericLookupRepository(conn)
    result = await repo.lookup_brand(brand_name)
    return result.generic_name if result else None


async def resolve_generic_with_fallback(
    conn: asyncpg.Connection,
    brand_name: str,
    drug_class: str | None = None,
) -> tuple[str, bool]:
    """Returns (name_to_use, is_fallback).

    brand found       → (generic_name, False)
    not found + class → (drug_class, True)   # send drug class to Gemini as fallback
    not found + none  → (brand_name, True)   # last resort; caller should log for manual addition
    """
    generic = await resolve_generic(conn, brand_name)
    if generic:
        return generic, False
    if drug_class:
        logger.warning("drug_lookup.brand_not_found_using_class", brand=brand_name, fallback=drug_class)
        return drug_class, True
    logger.warning("drug_lookup.brand_not_found_no_fallback", brand=brand_name)
    return brand_name, True
