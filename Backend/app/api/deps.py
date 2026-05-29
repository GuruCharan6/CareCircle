from collections.abc import AsyncGenerator
from typing import Annotated
from uuid import UUID

import asyncpg
from fastapi import Depends, Query, Request

from app.core.database import get_service_conn
from app.core.exceptions import ForbiddenError, NotFoundError, UnauthorizedError
from app.core.security import extract_user_id
from app.models.patient import Patient
from app.models.user import User
from app.repositories.patient_repository import PatientRepository
from app.repositories.user_repository import UserRepository


async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    """Yield service_role asyncpg connection (bypasses RLS).
    All writes use this. User-scoped reads: use get_user_conn() directly in service."""
    async with get_service_conn() as conn:
        yield conn


DBConn = Annotated[asyncpg.Connection, Depends(get_db)]


async def get_current_user(request: Request, conn: DBConn) -> User:
    """Verify Supabase JWT → return User model.
    Raises UnauthorizedError if token missing/invalid.
    Raises NotFoundError if user row doesn't exist yet (race condition on signup).
    """
    token = getattr(request.state, "token", None)
    if not token:
        raise UnauthorizedError("Missing Authorization header")

    user_id_str = extract_user_id(token)  # raises UnauthorizedError on bad JWT
    user_id = UUID(user_id_str)

    repo = UserRepository(conn)
    user = await repo.get_by_id(user_id)
    if not user:
        # Fallback: Auto-create user if trigger failed or race condition occurred
        try:
            from app.services.auth_service import AuthService
            auth_svc = AuthService()
            supabase_user = await auth_svc.get_user_by_uid(user_id_str)

            meta = getattr(supabase_user, "user_metadata", {}) or {}
            app_meta = getattr(supabase_user, "app_metadata", {}) or {}

            provider = app_meta.get("provider", "phone_otp")
            if provider != "google":
                provider = "phone_otp"

            name = meta.get("full_name") or meta.get("name") or "User"
            role = meta.get("role", "family_caregiver")

            phone = getattr(supabase_user, "phone", None)
            if phone == "": phone = None
            email = getattr(supabase_user, "email", None)
            if email == "": email = None

            user = await repo.create(
                id=user_id,
                name=name,
                auth_provider=provider,
                phone_number=phone,
                email=email,
                role=role,
            )
        except Exception as exc:
            import logging
            logging.error(f"Failed to auto-create user {user_id_str}: {exc}")
            # If auto-creation fails, we must return 401 to trigger a logout/redirect
            raise UnauthorizedError("User record not found and could not be created. Please sign in again.")

    request.state.user_id = str(user_id)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_patient(
    patient_id: UUID,
    current_user: CurrentUser,
    conn: DBConn,
) -> Patient:
    """Resolve patient_id path param. Enforce ownership (patient.user_id == current_user.id).
    Raises NotFoundError or ForbiddenError.
    """
    repo = PatientRepository(conn)
    patient = await repo.get_by_id(patient_id)
    if not patient:
        raise NotFoundError("Patient", str(patient_id))
    if patient.user_id != current_user.id:
        raise ForbiddenError("Access denied to this patient")
    return patient


CurrentPatient = Annotated[Patient, Depends(get_patient)]


class Pagination:
    def __init__(
        self,
        page: int = Query(1, ge=1),
        page_size: int = Query(20, ge=1, le=100),
    ) -> None:
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


PaginationDep = Annotated[Pagination, Depends(Pagination)]
