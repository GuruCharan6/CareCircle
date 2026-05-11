from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Query

from app.api.deps import CurrentPatient, CurrentUser, DBConn
from app.schemas.common import SuccessResponse
from app.schemas.digest import DigestPreferencesUpdate, DigestResponse
from app.services.digest_service import DigestService

router = APIRouter(prefix="/patients/{patient_id}/digest", tags=["digest"])


@router.get("", response_model=DigestResponse)
async def get_digest(
    patient_id: UUID,
    current_user: CurrentUser,
    current_patient: CurrentPatient,
    conn: DBConn,
    period: str = Query("morning", pattern="^(morning|evening)$"),
) -> DigestResponse:
    svc = DigestService(conn)
    return await svc.build(patient_id, current_user.id, period=period)


@router.patch("/preferences", response_model=SuccessResponse)
async def update_digest_preferences(
    patient_id: UUID,
    body: DigestPreferencesUpdate,
    current_user: CurrentUser,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> SuccessResponse:
    svc = DigestService(conn)
    await svc.update_preferences(current_user.id, body)
    return SuccessResponse(message="Digest preferences updated")
