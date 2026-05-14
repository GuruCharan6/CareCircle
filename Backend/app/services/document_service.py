import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

import asyncpg

from app.config import settings
from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.core.logging import logger
from app.lib.signed_url import create_signed_upload_url, create_signed_view_url, delete_file
from app.models.source_document import SourceDocument
from app.repositories.document_repository import DocumentRepository
from app.schemas.document import DocumentApproveRequest, SignedUploadURLRequest, SignedUploadURLResponse
from app.schemas.medication import MedicationCreate
from app.schemas.lab_result import LabResultCreate
from app.services.medication_service import MedicationService
from app.services.lab_result_service import LabResultService
from datetime import date
from app.services.prescriber_service import PrescriberService
from app.schemas.prescriber import PrescriberCreate


class DocumentService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._repo = DocumentRepository(conn)

    async def _assert_doc_access(self, doc: SourceDocument, user_id: UUID) -> None:
        """Raise ForbiddenError unless user uploaded the doc OR owns the patient.
        Fixes: caregiver-uploaded docs were inaccessible to the patient's owner.
        """
        if doc.uploaded_by == user_id:
            return
        from app.repositories.patient_repository import PatientRepository
        patient = await PatientRepository(self._repo.conn).get_by_id(doc.patient_id)
        if patient and patient.user_id == user_id:
            return
        raise ForbiddenError("Access denied to this document")

    def _storage_path(self, patient_id: UUID, doc_id: UUID, mime_type: str) -> str:
        """Build storage path: {patient_id}/{doc_id}.{ext}"""
        ext_map = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "application/pdf": "pdf",
            "audio/mpeg": "mp3",
            "audio/ogg": "ogg",
            "audio/mp4": "m4a",
            "audio/webm": "webm",
            "audio/wav": "wav",
        }
        base_mime = mime_type.split(";")[0].strip().lower()
        ext = ext_map.get(base_mime, "bin")
        return f"{patient_id}/{doc_id}.{ext}"

    async def generate_upload_url(
        self,
        patient_id: UUID,
        user_id: UUID,
        request: SignedUploadURLRequest,
        content_hash: str | None = None,
    ) -> SignedUploadURLResponse:
        """Generate signed upload URL + pre-create source_documents row.
        Checks for duplicates if content_hash is provided.
        """
        if content_hash:
            existing = await self._repo.get_by_hash(patient_id, content_hash)
            if existing:
                raise ValidationError("This document has already been uploaded for this patient.")

        doc_id = uuid4()
        bucket = settings.supabase_storage_bucket_documents
        path = self._storage_path(patient_id, doc_id, request.file_mime_type)

        signed_url = create_signed_upload_url(bucket, path)

        # file_url stored as path — regenerated as signed view URL on each access
        doc = await self._repo.create(
            id=doc_id,
            patient_id=patient_id,
            document_type=request.document_type,
            ingestion_source=request.ingestion_source,
            file_url=path,
            file_mime_type=request.file_mime_type,
            uploaded_by=user_id,
            file_size_bytes=request.file_size_bytes,
            content_hash=content_hash,
        )

        from datetime import timedelta
        expires_at = datetime.now(tz=timezone.utc) + timedelta(seconds=900)

        logger.info("document.upload_url_generated", doc_id=str(doc.id), patient_id=str(patient_id))
        return SignedUploadURLResponse(
            upload_url=signed_url,
            document_id=doc.id,
            expires_at=expires_at,
        )

    async def trigger_extraction(self, doc_id: UUID, user_id: UUID) -> None:
        """Trigger AI extraction for a newly uploaded document.
        Synchronous execution ensures the user sees results immediately.
        """
        doc = await self._repo.get_by_id(doc_id)
        if not doc:
            raise NotFoundError("Document", str(doc_id))
        await self._assert_doc_access(doc, user_id)

        # Call extraction synchronously
        from app.worker.tasks.extract_document import _async_extract
        try:
            await _async_extract(str(doc_id))
            logger.info("document.extraction_completed_sync", doc_id=str(doc_id))
        except Exception as e:
            logger.error("document.extraction_failed_sync", doc_id=str(doc_id), error=str(e))
            # Status will remain 'pending' or 'failed' based on _async_extract internal logic

    async def approve(
        self,
        doc_id: UUID,
        user_id: UUID,
        request: DocumentApproveRequest,
    ) -> SourceDocument:
        """User confirms extracted data — store approved doc.
        Every ingestion requires user approval before downstream processing.
        SystemDesign: 'User never loses extracted data to a silent bad parse.'
        After approval → on_document_approved event fires (Phase 8 Celery).
        """
        doc = await self._repo.get_by_id(doc_id)
        if not doc:
            raise NotFoundError("Document", str(doc_id))
        await self._assert_doc_access(doc, user_id)

        # Merge user edits into extracted_data
        await self._repo.update_extraction(
            doc_id,
            extraction_status="approved",
            extracted_data=request.extracted_data,
            extracted_text=request.extracted_text,
        )

        approved = await self._repo.approve(doc_id)
        if not approved:
            raise NotFoundError("Document", str(doc_id))

        # Phase 1 Persistence: Move data from SourceDocument to domain tables (Medications, LabResults)
        # This happens synchronously during approval so the user sees results immediately.
        await self._persist_extracted_data(approved)

        # For voice notes, create an observation row synchronously so it's immediately
        # visible in the observations list without waiting for Celery run_pipeline.
        if approved.document_type == "voice_note":
            await self._create_voice_observation(approved)

        logger.info("document.approved", doc_id=str(doc_id))
        from app.worker.events import on_document_approved
        on_document_approved(str(doc_id), str(doc.patient_id))
        return approved

    async def _create_voice_observation(self, doc: "SourceDocument") -> None:
        from app.repositories.observation_repository import ObservationRepository
        from datetime import date as date_cls
        try:
            obs_repo = ObservationRepository(self._repo.conn)
            ext = doc.extracted_data or {}
            mood = ext.get("mood")
            energy = ext.get("energy_level")
            # Store DB-valid values only ('caregiver_voice' | 'meera_call_log')
            source_type = "caregiver_voice" if doc.caregiver_id else "meera_call_log"

            await obs_repo.create(
                patient_id=doc.patient_id,
                source_type=source_type,
                source_document_id=doc.id,
                observation_date=doc.event_date or date_cls.today(),
                raw_transcript=doc.extracted_text or "",
                caregiver_id=doc.caregiver_id,
                symptoms_reported=ext.get("symptoms_reported") or [],
                symptoms_denied=ext.get("symptoms_denied") or [],
                symptoms_absent=ext.get("symptoms_absent") or [],
                meals_eaten=ext.get("meals_eaten"),
                meal_notes=ext.get("meal_notes"),
                medications_taken=ext.get("medications_taken"),
                medication_timing_notes=ext.get("medication_timing_notes"),
                mobility_notes=ext.get("mobility_notes"),
                mood=str(mood) if mood else None,
                energy_level=str(energy) if energy else None,
                meera_mood_read=ext.get("meera_mood_read"),
                concerns_flagged=ext.get("concerns_flagged") or [],
            )
            logger.info("document.voice_observation_created", doc_id=str(doc.id))
        except Exception as e:
            logger.error("document.voice_observation_failed", doc_id=str(doc.id), error=str(e))

    async def update_data(
        self,
        doc_id: UUID,
        user_id: UUID,
        request: DocumentApproveRequest,
    ) -> SourceDocument:
        """Manually update document data and re-persist to domain tables."""
        doc = await self._repo.get_by_id(doc_id)
        if not doc:
            raise NotFoundError("Document", str(doc_id))
        await self._assert_doc_access(doc, user_id)

        # 1. Update document record (and transition status to approved if it was in review)
        new_status = "approved" if doc.extraction_status in ("pending", "extracting", "review_required") else doc.extraction_status
        
        updated = await self._repo.update_extraction(
            doc_id,
            extraction_status=new_status,
            extracted_text=request.extracted_text,
            extracted_data=request.extracted_data,
            document_type=doc.document_type,
        )
        if not updated:
            raise NotFoundError("Document", str(doc_id))

        # 2. Re-persist to medications/labs
        await self._persist_extracted_data(updated)
        
        return updated

    async def _persist_extracted_data(self, doc: SourceDocument) -> None:
        """Move structured extraction results into domain tables."""
        if not doc.extracted_data:
            return

        # Common extraction helpers
        def get_f(keys, d=doc.extracted_data): 
            return next((d.get(k) for k in keys if d.get(k)), None)

        # 1. Handle Prescribers (Doctors) if present
        prescriber_name = get_f(["prescriber_name", "doctor_name"])
        if prescriber_name:
            try:
                pres_svc = PrescriberService(self._repo.conn)
                existing_docs = await pres_svc.list(doc.patient_id)
                if not any(d.name.lower() == prescriber_name.lower() for d in existing_docs):
                    await pres_svc.create(doc.patient_id, PrescriberCreate(
                        name=prescriber_name,
                        specialty=get_f(["prescriber_specialty", "specialist_type"]),
                        hospital=get_f(["prescriber_hospital", "hospital_name"]),
                        notes=f"Added from document: {doc.document_type}"
                    ))
                    logger.info("document.persist_doctor_added", patient_id=str(doc.patient_id), name=prescriber_name)
            except Exception as e:
                logger.error("document.persist_doctor_failed", doc_id=str(doc.id), error=str(e))

        # 2. Handle Medications
        if doc.document_type == "prescription" or doc.extracted_data.get("medications"):
            med_svc = MedicationService(self._repo.conn)
            
            # Check if we already have medications for this document to avoid duplicates
            existing = await med_svc.list_by_document(doc.id)
            if existing:
                logger.info("document.med_persist_skipped", doc_id=str(doc.id), reason="already persisted")
            else:
                meds = doc.extracted_data.get("medications") or []
                seen_names = set()
                
                for m in meds:
                    try:
                        raw_brand = m.get("brand_name")
                        raw_generic = m.get("generic_name") or raw_brand
                        if not raw_generic: continue
                            
                        clean_generic = self._clean_med_name(raw_generic)
                        clean_brand = self._clean_med_name(raw_brand) if raw_brand else None
                        
                        if clean_generic.lower() in seen_names: continue
                        seen_names.add(clean_generic.lower())

                        await med_svc.create(doc.patient_id, MedicationCreate(
                            source_document_id=doc.id,
                            brand_name=clean_brand,
                            generic_name=clean_generic,
                            drug_class=m.get("drug_class"),
                            dose=m.get("dose") or "Not specified",
                            frequency=m.get("frequency"),
                            timing=m.get("timing"),
                            prescriber_name=prescriber_name,
                            prescriber_specialty=get_f(["prescriber_specialty", "specialist_type"]),
                            prescriber_hospital=get_f(["prescriber_hospital", "hospital_name"]),
                            prescribed_date=doc.event_date,
                            valid_from=doc.event_date or date.today(),
                        ))
                    except Exception as e:
                        logger.error("document.persist_med_failed", doc_id=str(doc.id), error=str(e))

        # 3. Handle Lab Results (from lab report OR ordered tests in prescription)
        results = doc.extracted_data.get("results") or []
        if results:
            lab_svc = LabResultService(self._repo.conn)
            # Check if we already have results for this document
            existing_labs = await lab_svc.list_by_document(doc.id)
            if not existing_labs:
                for r in results:
                    try:
                        await lab_svc.create(doc.patient_id, LabResultCreate(
                            source_document_id=doc.id,
                            test_name=r.get("test_name"),
                            test_name_display=r.get("test_name_display"),
                            value=r.get("value"), # Might be null for ordered tests
                            unit=r.get("unit"),
                            test_date=doc.event_date or date.today(),
                            reference_range_low=r.get("reference_range_low"),
                            reference_range_high=r.get("reference_range_high"),
                            is_abnormal=r.get("is_abnormal"),
                            specialist_type=r.get("specialist_type"),
                            lab_name=doc.extracted_data.get("lab_name"),
                        ))
                    except Exception as e:
                        logger.error("document.persist_lab_failed", doc_id=str(doc.id), error=str(e))

        # 4. Handle Appointments / Follow-ups
        # Look for explicit follow-up date or relative weeks
        follow_up_date_str = get_f(["follow_up_date"])
        follow_up_weeks = get_f(["follow_up_weeks"])
        
        if follow_up_date_str or follow_up_weeks:
            try:
                from app.services.calendar_service import CalendarService
                from app.schemas.calendar import CalendarEventCreate
                from datetime import timedelta
                
                cal_svc = CalendarService(self._repo.conn)
                
                event_date = None
                if follow_up_date_str:
                    try:
                        event_date = date.fromisoformat(follow_up_date_str)
                    except ValueError:
                        pass
                
                if not event_date and follow_up_weeks:
                    # Default to weeks from document event_date or today
                    base_date = doc.event_date or date.today()
                    event_date = base_date + timedelta(weeks=int(follow_up_weeks))
                
                if event_date:
                    # Check if already exists for this document to avoid duplicates
                    existing_events = await cal_svc.list(doc.patient_id, within_days=365)
                    
                    # Robust duplicate check: look for doc.id in the notes
                    doc_id_str = str(doc.id)
                    is_duplicate = any(doc_id_str in (e.notes or "") for e in existing_events)
                    
                    if not is_duplicate:
                        # Use patient_id as fallback if uploaded_by is missing (e.g. system ingestion)
                        acting_user_id = doc.uploaded_by or doc.patient_id
                        
                        await cal_svc.create(doc.patient_id, acting_user_id, CalendarEventCreate(
                            event_type="appointment",
                            title=f"Follow-up with {prescriber_name or 'Doctor'}",
                            specialist_type=get_f(["prescriber_specialty", "specialist_type", "specialist"]),
                            event_date=event_date,
                            location=get_f(["prescriber_hospital", "hospital_name", "location"]),
                            source="prescription_ingestion" if doc.document_type == "prescription" else "doctor_note_extraction",
                            notes=f"Automatically extracted from {doc.document_type} (ID: {doc.id})"
                        ))
                        logger.info("document.persist_appointment_added", doc_id=doc_id_str, event_date=str(event_date))
            except Exception as e:
                logger.error("document.persist_appointment_failed", doc_id=str(doc.id), error=str(e))

    def _clean_med_name(self, name: str) -> str:
        """Remove common medical tags like Tab, Cap, Inj to avoid duplicates."""
        if not name:
            return ""
        
        # Tags to remove (case insensitive)
        tags = [
            "tab.", "tab", "tablet", 
            "cap.", "cap", "capsule", 
            "syp.", "syp", "syrup", 
            "inj.", "inj", "injection",
            "susp.", "susp", "suspension"
        ]
        
        cleaned = name.strip()
        parts = cleaned.split()
        
        filtered_parts = []
        for p in parts:
            if p.lower() not in tags:
                filtered_parts.append(p)
        
        result = " ".join(filtered_parts).strip()
        # Remove any leading/trailing special chars like hyphens often left after tag removal
        result = result.strip("- ").strip()
        
        return result or name # Fallback to original if we somehow wiped it

    async def reject(self, doc_id: UUID, user_id: UUID, reason: str) -> SourceDocument:
        """User rejects extracted data. File stays in storage (audit trail).
        Rejected docs never processed downstream."""
        doc = await self._repo.get_by_id(doc_id)
        if not doc:
            raise NotFoundError("Document", str(doc_id))
        await self._assert_doc_access(doc, user_id)

        rejected = await self._repo.reject(doc_id, reason)
        if not rejected:
            raise NotFoundError("Document", str(doc_id))

        logger.info("document.rejected", doc_id=str(doc_id), reason=reason)
        return rejected

    async def get_with_signed_url(self, doc_id: UUID, user_id: UUID) -> SourceDocument:
        """Fetch doc + regenerate signed view URL. Never return stored path directly."""
        doc = await self._repo.get_by_id(doc_id)
        if not doc:
            raise NotFoundError("Document", str(doc_id))
        await self._assert_doc_access(doc, user_id)

        bucket = settings.supabase_storage_bucket_documents
        signed_url = create_signed_view_url(bucket, doc.file_url)

        # Return doc with fresh signed URL (doc is immutable Pydantic model — build new)
        return doc.model_copy(update={"file_url": signed_url})

    async def list_by_patient(
        self,
        patient_id: UUID,
        document_type: str | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[SourceDocument]:
        return await self._repo.get_by_patient_id(
            patient_id,
            document_type=document_type,
            status=status,
            limit=limit,
            offset=offset,
        )

    async def delete(self, doc_id: UUID, user_id: UUID) -> None:
        """Delete document from DB and storage. 
        Note: We NULL out references in medications/labs to preserve history as requested.
        """
        doc = await self._repo.get_by_id(doc_id)
        if not doc:
            raise NotFoundError("Document", str(doc_id))
        await self._assert_doc_access(doc, user_id)

        # All DB deletes in one transaction — if source_documents delete fails,
        # medications/labs/observations roll back (no partial data loss).
        async with self._repo.conn.transaction():
            await self._repo.conn.execute(
                "DELETE FROM public.medications WHERE source_document_id = $1",
                doc_id
            )
            await self._repo.conn.execute(
                "DELETE FROM public.lab_results WHERE source_document_id = $1",
                doc_id
            )
            await self._repo.conn.execute(
                "DELETE FROM public.observations WHERE source_document_id = $1",
                doc_id
            )
            await self._repo.conn.execute(
                "DELETE FROM public.whatsapp_messages WHERE linked_source_document_id = $1",
                doc_id
            )
            await self._repo.conn.execute(
                "DELETE FROM public.document_chunks WHERE source_document_id = $1",
                doc_id
            )
            success = await self._repo.delete(doc_id)
            if not success:
                raise NotFoundError("Document", str(doc_id))

        # Storage delete is outside the transaction — can't roll back cloud storage.
        # Orphaned file is far better than rolled-back clinical data loss.
        try:
            bucket = settings.supabase_storage_bucket_documents
            delete_file(bucket, doc.file_url)
        except Exception as e:
            logger.error("document.storage_delete_failed", doc_id=str(doc_id), error=str(e))

        logger.info("document.deleted", doc_id=str(doc_id), patient_id=str(doc.patient_id))
