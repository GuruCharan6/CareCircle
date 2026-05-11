from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentPatient, DBConn
from app.schemas.common import SuccessResponse
from app.services.history_service import HistoryService

router = APIRouter(prefix="/patients/{patient_id}/history", tags=["history"])


@router.get("", response_model=dict)
async def get_patient_history(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> dict[str, Any]:
    """
    Full patient history: all medications (active + past), all lab results,
    all documents, prescribers, observations. Use for chatbot history queries
    or displaying complete timeline.
    """
    svc = HistoryService(conn)
    return await svc.get_history(patient_id)


@router.get("/pdf", response_model=dict)
async def get_history_pdf(
    patient_id: UUID,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> dict[str, str]:
    """
    Generate patient medical history PDF.
    Returns signed URL (1 hour) — download before it expires.
    """
    svc = HistoryService(conn)
    url = await svc.generate_history_pdf_url(patient_id)
    return {"url": url, "expires_in_seconds": 3600}
