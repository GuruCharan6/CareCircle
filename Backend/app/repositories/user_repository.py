from typing import Any
from uuid import UUID

import asyncpg

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository):
    async def get_by_id(self, user_id: UUID) -> User | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.users WHERE id = $1", user_id
        )
        return User.from_record(row) if row else None

    async def get_by_phone(self, phone_number: str) -> User | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.users WHERE phone_number = $1", phone_number
        )
        return User.from_record(row) if row else None

    async def get_by_email(self, email: str) -> User | None:
        row = await self.conn.fetchrow(
            "SELECT * FROM public.users WHERE email = $1", email
        )
        return User.from_record(row) if row else None

    async def create(
        self,
        *,
        id: UUID,
        name: str,
        auth_provider: str,
        phone_number: str | None = None,
        email: str | None = None,
        role: str = "family_caregiver",
    ) -> User:
        row = await self.conn.fetchrow(
            """
            INSERT INTO public.users (id, phone_number, email, auth_provider, name, role)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            """,
            id, phone_number, email, auth_provider, name, role,
        )
        return User.from_record(row)

    async def update_preferences(self, user_id: UUID, preferences: dict[str, Any]) -> User | None:
        row = await self.conn.fetchrow(
            """
            UPDATE public.users SET preferences = $2
            WHERE id = $1 RETURNING *
            """,
            user_id, preferences,
        )
        return User.from_record(row) if row else None

    async def update_profile(
        self,
        user_id: UUID,
        *,
        name: str | None = None,
        preferences: dict[str, Any] | None = None,
    ) -> User | None:
        fields: list[str] = []
        values: list[Any] = [user_id]
        idx = 2
        if name is not None:
            fields.append(f"name = ${idx}")
            values.append(name)
            idx += 1
        if preferences is not None:
            fields.append(f"preferences = ${idx}")
            values.append(preferences)
            idx += 1
        if not fields:
            return await self.get_by_id(user_id)
        row = await self.conn.fetchrow(
            f"UPDATE public.users SET {', '.join(fields)} WHERE id = $1 RETURNING *",
            *values,
        )
        return User.from_record(row) if row else None

    async def remove_phone_number(self, user_id: UUID) -> User | None:
        row = await self.conn.fetchrow(
            "UPDATE public.users SET phone_number = NULL WHERE id = $1 RETURNING *",
            user_id,
        )
        return User.from_record(row) if row else None

    async def update_phone_number(self, user_id: UUID, phone_number: str) -> User | None:
        row = await self.conn.fetchrow(
            "UPDATE public.users SET phone_number = $2 WHERE id = $1 RETURNING *",
            user_id, phone_number,
        )
        return User.from_record(row) if row else None

    async def update_last_login(self, user_id: UUID) -> None:
        await self.conn.execute(
            "UPDATE public.users SET last_login_at = now() WHERE id = $1",
            user_id,
        )
