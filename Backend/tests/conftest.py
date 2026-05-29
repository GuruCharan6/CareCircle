"""
Shared fixtures for CareCircle test suite.

Env vars set at module level — pydantic-settings reads them at import time,
so they must be in place before any `from app.*` import.
"""
import os

# ── Required env vars (set before any app import) ─────────────────────────────
os.environ.update({
    "SUPABASE_URL": "https://test.supabase.co",
    "SUPABASE_ANON_KEY": "test-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "test-service-role-key",
    "SUPABASE_JWT_SECRET": "test-secret-minimum-32-chars-long-here",
    "SUPABASE_DB_URL": "postgresql://test:test@localhost:5432/testdb",
    "REDIS_URL": "redis://localhost:6379/15",
    "CELERY_BROKER_URL": "redis://localhost:6379/15",
    "CELERY_RESULT_BACKEND": "redis://localhost:6379/15",
    "ENVIRONMENT": "test",
    "DEBUG": "true",
})

# Mock heavy provider SDKs before any app import — prevents OOM + network calls
import sys
from unittest.mock import MagicMock

_mock = MagicMock()
for _mod in [
    # Google / Gemini — must cover ALL submodules imported transitively
    "google",
    "google.ai",
    "google.ai.generativelanguage_v1beta",
    "google.generativeai",
    "google.generativeai.types",
    "google.generativeai.client",
    "google.genai",
    "google.genai.types",
    "google.api_core",
    "google.api_core.exceptions",
    "google.auth",
    "google.auth.credentials",
    # Anthropic
    "anthropic",
    # Firebase
    "firebase_admin",
    "firebase_admin.credentials",
    "firebase_admin.messaging",
    # Twilio
    "twilio",
    "twilio.rest",
    "twilio.twiml",
    "twilio.twiml.messaging_response",
    "twilio.request_validator",
    # Supabase (create_client makes network calls at module level)
    "supabase",
    "supabase.client",
    "gotrue",
    "gotrue.types",
    "postgrest",
    "storage3",
    # Celery (avoid broker connection on import)
    "celery",
    "celery.schedules",
    # ReportLab
    "reportlab",
    "reportlab.lib",
    "reportlab.lib.pagesizes",
    "reportlab.lib.styles",
    "reportlab.lib.units",
    "reportlab.platypus",
]:
    sys.modules[_mod] = MagicMock()


import asyncio

import pytest


# pytest-asyncio 1.x manages its own event loop — must use the fixture, not set_event_loop_policy()
@pytest.fixture(scope="session")
def event_loop_policy():
    if sys.platform == "win32":
        return asyncio.WindowsSelectorEventLoopPolicy()
    return asyncio.DefaultEventLoopPolicy()

from datetime import date, datetime
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

import pytest
from httpx import ASGITransport, AsyncClient
from jose import jwt as jose_jwt

# ── Test constants ─────────────────────────────────────────────────────────────
TEST_JWT_SECRET: str = os.environ["SUPABASE_JWT_SECRET"]
TEST_USER_ID: UUID = UUID("11111111-1111-1111-1111-111111111111")
TEST_PATIENT_ID: UUID = UUID("22222222-2222-2222-2222-222222222222")
TEST_DOC_ID: UUID = UUID("33333333-3333-3333-3333-333333333333")


# ── JWT helpers ────────────────────────────────────────────────────────────────

def make_jwt(user_id: UUID = TEST_USER_ID, role: str = "authenticated") -> str:
    """Generate a signed HS256 JWT with far-future expiry."""
    payload = {
        "sub": str(user_id),
        "role": role,
        "email": "test@carecircle.app",
        "iat": 1_700_000_000,
        "exp": 9_999_999_999,
    }
    return jose_jwt.encode(payload, TEST_JWT_SECRET, algorithm="HS256")


def make_patient_record(
    patient_id: UUID = TEST_PATIENT_ID,
    user_id: UUID = TEST_USER_ID,
    name: str = "Ramesh Kumar",
    conditions: list | None = None,
) -> dict:
    """Return a dict that asyncpg Record.from_record() will accept."""
    return {
        "id": patient_id,
        "user_id": user_id,
        "name": name,
        "date_of_birth": date(1950, 6, 15),
        "gender": "male",
        "blood_type": "B+",
        "known_conditions": conditions or ["Type 2 Diabetes"],
        "known_allergies": [],
        "primary_city": "Lucknow",
        "emergency_notes": None,
        "created_at": datetime(2026, 1, 1, 0, 0, 0),
        "updated_at": datetime(2026, 1, 1, 0, 0, 0),
    }


def make_user_record(
    user_id: UUID = TEST_USER_ID,
    name: str = "Meera Sharma",
) -> dict:
    return {
        "id": user_id,
        "phone_number": "+91-9876543210",
        "email": "meera@example.com",
        "auth_provider": "otp",
        "name": name,
        "role": "family_caregiver",
        "preferences": {},
        "created_at": datetime(2026, 1, 1, 0, 0, 0),
        "last_login_at": None,
    }


# ── Model fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture
def test_user():
    from app.models.user import User
    return User(**make_user_record())


@pytest.fixture
def test_patient():
    from app.models.patient import Patient
    return Patient(**make_patient_record())


# ── Mock DB connection ─────────────────────────────────────────────────────────

@pytest.fixture
def mock_conn():
    conn = AsyncMock()
    conn.fetchrow = AsyncMock(return_value=None)
    conn.fetch = AsyncMock(return_value=[])
    conn.execute = AsyncMock(return_value="OK")
    conn.fetchval = AsyncMock(return_value=1)
    return conn


# ── FastAPI test client ────────────────────────────────────────────────────────

@pytest.fixture
async def client(test_user, mock_conn):
    """
    Authenticated async test client.
    - DB replaced with mock_conn (no real Supabase)
    - get_current_user returns test_user (no JWT verification against DB)
    - init_db / init_redis patched to no-ops (no real connections on startup)
    """
    # Import modules before patching — patch() needs the module in sys.modules
    import app.main as _main
    from app.api.deps import get_current_user, get_db

    async def override_get_db():
        yield mock_conn

    def override_get_current_user():
        return test_user

    with (
        patch.object(_main, "init_db", AsyncMock()),
        patch.object(_main, "init_redis", AsyncMock()),
        patch.object(_main, "close_db", AsyncMock()),
        patch.object(_main, "close_redis", AsyncMock()),
    ):
        app = _main.create_app()
        app.dependency_overrides[get_db] = override_get_db
        app.dependency_overrides[get_current_user] = override_get_current_user

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c


@pytest.fixture
async def anon_client(mock_conn):
    """
    Unauthenticated client — get_current_user NOT overridden.
    Used to verify 401 enforcement. DB mock still in place so no real pool needed.
    """
    import app.main as _main
    from app.api.deps import get_db

    async def override_get_db():
        yield mock_conn

    with (
        patch.object(_main, "init_db", AsyncMock()),
        patch.object(_main, "init_redis", AsyncMock()),
        patch.object(_main, "close_db", AsyncMock()),
        patch.object(_main, "close_redis", AsyncMock()),
    ):
        app = _main.create_app()
        app.dependency_overrides[get_db] = override_get_db

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c
