from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

import asyncpg

from app.agents.crisis_mode_agent import CrisisModeAgent
from app.config import settings
from app.core.supabase import supabase_admin
from app.lib.pdf_generator import generate_crisis_pdf
from app.lib.signed_url import create_signed_view_url
from app.models.crisis_packet import CrisisPacket
from app.repositories.caregiver_repository import CaregiverRepository
from app.repositories.clinical_hypothesis_repository import ClinicalHypothesisRepository
from app.repositories.crisis_packet_repository import CrisisPacketRepository
from app.repositories.lab_result_repository import LabResultRepository
from app.repositories.medication_repository import MedicationRepository
from app.repositories.patient_repository import PatientRepository
from app.repositories.prescriber_repository import PrescriberRepository
from app.cache.crisis_packet_cache import get_crisis_packet, set_crisis_packet
from app.schemas.crisis import (
    CrisisEmergencyContact,
    CrisisLabResultItem,
    CrisisLastCardiacEvent,
    CrisisMedicationItem,
    CrisisNearestEmergency,
    CrisisPrescriberItem,
    CrisisPacketResponse,
)

class CrisisService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._conn = conn
        self._agent = CrisisModeAgent(conn)

    async def enter_crisis(
        self,
        patient_id: UUID,
        triggered_by: str = "button_tap",
    ) -> CrisisPacketResponse:
        try:
            packet = await self._agent.enter_crisis(
                patient_id=patient_id, triggered_by=triggered_by
            )
        except Exception: # If packet is missing or other error, try to rebuild once
            packet = await self.rebuild_packet(patient_id, trigger="manual")
            
        return _to_response(packet)

    async def rebuild_packet(self, patient_id: UUID, trigger: str = "scheduled_nightly") -> CrisisPacket:
        patient = await PatientRepository(self._conn).get_by_id(patient_id)
        if not patient:
            from app.core.exceptions import NotFoundError
            raise NotFoundError("Patient", str(patient_id))

        all_meds = await MedicationRepository(self._conn).get_by_patient_id(patient_id)
        caregivers = await CaregiverRepository(self._conn).get_by_patient_id(patient_id, active_only=True)
        active_alerts = await ClinicalHypothesisRepository(self._conn).get_by_urgency(patient_id, "alert")
        all_labs = await LabResultRepository(self._conn).get_by_patient_id(patient_id, limit=200) # Increased limit for everything
        all_prescribers = await PrescriberRepository(self._conn).get_by_patient(patient_id)

        medications_snapshot = [
            {
                "brand": m.brand_name,
                "generic": m.generic_name,
                "dose": m.dose,
                "frequency": m.frequency,
                "timing": m.timing,
                "is_active": m.status == "active",
            }
            for m in all_meds
        ]

        lab_results_snapshot = []
        for r in all_labs:
            ref_range = f"{r.reference_range_low}–{r.reference_range_high} {r.unit}" if r.reference_range_low is not None else None
            lab_results_snapshot.append({
                "test_name": r.test_name_display,
                "value": str(r.value) if r.value is not None else "Ordered",
                "unit": r.unit,
                "reference_range": ref_range,
                "is_abnormal": r.is_abnormal,
                "test_date": r.test_date.isoformat(),
            })

        prescribers_snapshot = [
            {
                "name": p.name,
                "specialty": p.specialty,
                "hospital": p.hospital,
                "phone": p.phone,
            }
            for p in all_prescribers
        ]

        emergency_contacts = []
        if patient.emergency_contact_primary:
            emergency_contacts.append(patient.emergency_contact_primary)
        if patient.emergency_contact_secondary:
            emergency_contacts.append(patient.emergency_contact_secondary)

        if patient.primary_physician:
            phys = dict(patient.primary_physician)
            phys.setdefault("relationship", "Primary Physician")
            emergency_contacts.append(phys)

        for c in caregivers:
            if c.invitation_status == "confirmed" and c.phone_number:
                emergency_contacts.append({
                    "name": c.name,
                    "phone": c.phone_number,
                    "relationship": "Caregiver",
                })

        nearest_emergency = None
        if patient.nearest_hospital:
            h = patient.nearest_hospital
            nearest_emergency = {
                "name": h.get("name", ""),
                "address": "",
                "phone": h.get("phone"),
                "distance_km": None,
            }

        patient_dob = patient.date_of_birth.isoformat() if getattr(patient, "date_of_birth", None) else None

        packet = await CrisisPacketRepository(self._conn).upsert(
            patient_id=patient_id,
            generated_at=datetime.now(timezone.utc),
            rebuild_triggered_by=trigger,
            medications=medications_snapshot,
            emergency_contacts=emergency_contacts,
            known_allergies=patient.known_allergies or [],
            blood_type=patient.blood_type,
            active_alerts=[h.hypothesis_text[:200] for h in active_alerts],
            known_conditions=patient.known_conditions or [],
            lab_results=lab_results_snapshot,
            nearest_emergency=nearest_emergency,
            prescribers=prescribers_snapshot,
            patient_name=patient.name,
            patient_dob=patient_dob,
        )

        # Warm Redis cache
        await set_crisis_packet(patient_id, packet.model_dump(mode="json"))
        return packet

    async def generate_crisis_pdf_url(self, patient_id: UUID) -> str:
        # Bypass agent (no notification, no cache-miss logging) — just get the packet
        cached = await get_crisis_packet(patient_id)
        if cached:
            packet = CrisisPacket(**cached)
        else:
            packet = await CrisisPacketRepository(self._conn).get_by_patient_id(patient_id)
            if packet is None:
                packet = await self.rebuild_packet(patient_id, trigger="pdf_export")

        response = _to_response(packet)
        patient = await PatientRepository(self._conn).get_by_id(patient_id)
        if not patient:
            from app.core.exceptions import NotFoundError
            raise NotFoundError("Patient", str(patient_id))

        pdf_bytes = generate_crisis_pdf(
            patient_name=patient.name,
            blood_type=response.blood_type,
            known_allergies=response.known_allergies,
            emergency_contacts=[c.model_dump() for c in response.emergency_contacts],
            medications=[m.model_dump() for m in response.medications],
            active_alerts=response.active_alerts,
            known_conditions=response.known_conditions,
            lab_results=[r.model_dump() for r in response.lab_results],
            last_cardiac_event=response.last_cardiac_event.model_dump() if response.last_cardiac_event else None,
            nearest_emergency=response.nearest_emergency.model_dump() if response.nearest_emergency else None,
            prescribers=[p.model_dump() for p in response.prescribers],
            freshness_note=response.freshness_note,
            generated_at=response.generated_at,
        )

        now_ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        path = f"{patient_id}/crisis_{now_ts}.pdf"
        bucket = settings.supabase_storage_bucket_crisis_pdfs
        supabase_admin.storage.from_(bucket).upload(
            path, pdf_bytes, {"content-type": "application/pdf", "upsert": "true"},
        )
        return create_signed_view_url(bucket, path)

    async def exit_crisis(
        self,
        patient_id: UUID,
        resolved_by: str = "user_dismissed",
    ) -> None:
        await self._agent.exit_crisis(
            patient_id=patient_id, resolved_by=resolved_by
        )

    @staticmethod
    def is_crisis_query(text: str) -> bool:
        return CrisisModeAgent.is_crisis_query(text)


def _to_response(packet: CrisisPacket) -> CrisisPacketResponse:
    now = datetime.now(timezone.utc)
    generated = packet.generated_at
    if generated.tzinfo is None:
        generated = generated.replace(tzinfo=timezone.utc)
    age_hours = round((now - generated).total_seconds() / 3600, 1)
    freshness_note = f"Last updated {age_hours} hours ago"

    medications = [CrisisMedicationItem(**m) for m in packet.medications]
    emergency_contacts = [CrisisEmergencyContact(**c) for c in packet.emergency_contacts]
    lab_results = [CrisisLabResultItem(**r) for r in packet.lab_results]
    prescribers = [CrisisPrescriberItem(**p) for p in (packet.prescribers or [])]
    nearest = (
        CrisisNearestEmergency(**packet.nearest_emergency)
        if packet.nearest_emergency
        else None
    )
    last_cardiac = (
        CrisisLastCardiacEvent(**packet.last_cardiac_event)
        if packet.last_cardiac_event
        else None
    )

    return CrisisPacketResponse(
        id=packet.id,
        patient_id=packet.patient_id,
        generated_at=packet.generated_at,
        rebuild_triggered_by=packet.rebuild_triggered_by,
        medications=medications,
        last_cardiac_event=last_cardiac,
        emergency_contacts=emergency_contacts,
        nearest_emergency=nearest,
        known_allergies=packet.known_allergies,
        blood_type=packet.blood_type,
        active_alerts=packet.active_alerts,
        known_conditions=packet.known_conditions,
        lab_results=lab_results,
        prescribers=prescribers,
        is_current=packet.is_current,
        updated_at=packet.updated_at,
        freshness_note=freshness_note,
        patient_name=packet.patient_name,
        patient_dob=packet.patient_dob,
    )
