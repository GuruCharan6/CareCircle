from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.api.deps import CurrentPatient, CurrentUser, DBConn
from app.services.doctor_briefing_service import DoctorBriefingService

router = APIRouter(prefix="/patients/{patient_id}", tags=["doctor-briefing"])


class PdfUrlResponse(BaseModel):
    signed_url: str
    expires_in_seconds: int = 3600  # override per endpoint


@router.get("/doctor-briefing/{event_id}")
async def get_doctor_briefing(
    patient_id: UUID,
    event_id: UUID,
    current_user: CurrentUser,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> dict[str, Any]:
    """Pre-appointment doctor briefing: meds from other doctors, lab trends,
    behavioral notes, questions to raise. Surfaces T-2 days before appointment.
    """
    svc = DoctorBriefingService(conn)
    return await svc.get_briefing(patient_id, event_id)


@router.get("/doctor-briefing/{event_id}/pdf", response_model=PdfUrlResponse)
async def get_briefing_pdf(
    patient_id: UUID,
    event_id: UUID,
    current_user: CurrentUser,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> PdfUrlResponse:
    """Generate pre-appointment briefing as PDF. Uploads to Supabase Storage.
    Returns 1-hour signed URL. Meera shares via WhatsApp or shows doctor directly.
    """
    svc = DoctorBriefingService(conn)
    url = await svc.generate_briefing_pdf_url(patient_id, event_id)
    return PdfUrlResponse(signed_url=url, expires_in_seconds=86400)


@router.get("/medication-list-pdf", response_model=PdfUrlResponse)
async def get_medication_list_pdf(
    patient_id: UUID,
    current_user: CurrentUser,
    current_patient: CurrentPatient,
    conn: DBConn,
) -> PdfUrlResponse:
    """Generate current active medication list as PDF. One tap from dashboard.
    Meera shows/sends this to any new doctor — solves cross-doctor info gap.
    Returns 1-hour signed URL. Stored in med-pdfs bucket.
    """
    svc = DoctorBriefingService(conn)
    url = await svc.generate_medication_list_pdf_url(patient_id)
    return PdfUrlResponse(signed_url=url)
