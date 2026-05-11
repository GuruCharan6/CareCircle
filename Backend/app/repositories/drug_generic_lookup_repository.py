from app.models.drug_generic_lookup import DrugGenericLookup
from app.repositories.base import BaseRepository


class DrugGenericLookupRepository(BaseRepository):
    async def lookup_brand(self, brand_name: str) -> DrugGenericLookup | None:
        """Case-insensitive brand name lookup."""
        row = await self.conn.fetchrow(
            "SELECT * FROM public.drug_generic_lookup WHERE lower(brand_name) = lower($1)",
            brand_name,
        )
        return DrugGenericLookup.from_record(row) if row else None

    async def search_brand(self, partial: str) -> list[DrugGenericLookup]:
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.drug_generic_lookup
            WHERE lower(brand_name) LIKE lower($1)
            ORDER BY brand_name
            LIMIT 20
            """,
            f"%{partial}%",
        )
        return [DrugGenericLookup.from_record(r) for r in rows]

    async def get_by_generic(self, generic_name: str) -> list[DrugGenericLookup]:
        rows = await self.conn.fetch(
            """
            SELECT * FROM public.drug_generic_lookup
            WHERE lower(generic_name) = lower($1)
            """,
            generic_name,
        )
        return [DrugGenericLookup.from_record(r) for r in rows]
