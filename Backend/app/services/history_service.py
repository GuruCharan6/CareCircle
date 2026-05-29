from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import asyncpg

from app.config import settings
from app.core.logging import get_logger
from app.lib.pdf_generator import generate_patient_history_pdf
from app.lib.signed_url import create_signed_view_url, storage_upload

logger = get_logger(__name__)




class HistoryService:
    def __init__(self, conn: asyncpg.Connection) -> None:
        self._conn = conn

    async def get_history(self, patient_id: UUID) -> dict[str, Any]:
        """
        Full patient history from first document upload.
        Returns structured dict — all statuses, all types.
        """
        # Patient info
        patient_row = await self._conn.fetchrow(
            "SELECT * FROM public.patients WHERE id = $1", patient_id
        )
        patient_name = patient_row["name"] if patient_row else "Unknown"

        # All medications (active + superseded + discontinued) — ordered by creation
        med_rows = await self._conn.fetch(
            """
            SELECT m.*,
                COALESCE(
                    (SELECT d.body_systems FROM public.drug_generic_lookup d
                     WHERE LOWER(d.generic_name) = LOWER(m.generic_name) LIMIT 1),
                    '{}'::text[]
                ) AS body_systems
            FROM public.medications m
            WHERE m.patient_id = $1
            ORDER BY m.valid_from ASC, m.created_at ASC
            """,
            patient_id,
        )

        # All lab results — ordered by test_date
        lab_rows = await self._conn.fetch(
            """
            SELECT * FROM public.lab_results
            WHERE patient_id = $1
            ORDER BY test_date ASC
            """,
            patient_id,
        )

        # All source documents (only approved ones show in history/timeline)
        doc_rows = await self._conn.fetch(
            """
            SELECT id, document_type, file_mime_type, extraction_status,
                   extracted_text, extracted_data, ingestion_source,
                   file_url, caregiver_id, user_approved_at, created_at
            FROM public.source_documents
            WHERE patient_id = $1 AND extraction_status = 'approved'
            ORDER BY created_at ASC
            """,
            patient_id,
        )

        # All observations (join with source_documents for audio URL)
        obs_rows = await self._conn.fetch(
            """
            SELECT o.*, d.file_url as source_document_url
            FROM public.observations o
            LEFT JOIN public.source_documents d ON o.source_document_id = d.id
            WHERE o.patient_id = $1
            ORDER BY o.observation_date ASC
            """,
            patient_id,
        )

        # All prescribers (active + inactive)
        prescriber_rows = await self._conn.fetch(
            """
            SELECT * FROM public.prescribers
            WHERE patient_id = $1
            ORDER BY created_at ASC
            """,
            patient_id,
        )

        # Clinical hypotheses
        hypothesis_rows = await self._conn.fetch(
            """
            SELECT * FROM public.clinical_hypotheses
            WHERE patient_id = $1
            ORDER BY created_at ASC
            """,
            patient_id,
        )

        # Process documents to add labels, summaries, and signed audio URLs
        processed_docs = []
        for r in doc_rows:
            try:
                d = dict(r)
                # Map source
                source = d.get("ingestion_source") or "web_upload"
                doc_type = d.get("document_type") or "document"

                if doc_type == "voice_note":
                    if source == "crisis_follow_up":
                        d["source_label"] = "Emergency Voice Note"
                    elif d.get("caregiver_id"):
                        d["source_label"] = "Caregiver Update"
                    else:
                        d["source_label"] = "User Update"

                    # Generate signed URL for audio playback
                    raw_path = d.get("file_url")
                    if raw_path:
                        try:
                            d["audio_url"] = create_signed_view_url(
                                settings.supabase_storage_bucket_documents, raw_path
                            )
                        except Exception as e:
                            logger.warning("history_service.audio_sign_failed", error=str(e))
                            d["audio_url"] = None
                    else:
                        d["audio_url"] = None
                else:
                    d["source_label"] = "WhatsApp Upload" if "whatsapp" in str(source).lower() else "App Upload"
                    d["audio_url"] = None

                # Robustly handle extracted_data
                ext = d.get("extracted_data")
                if isinstance(ext, str):
                    try:
                        ext = json.loads(ext)
                    except:
                        ext = {}
                if not isinstance(ext, dict):
                    ext = {}

                # Extract summary
                summary = ext.get("summary") or ext.get("notes")

                if not summary:
                    if doc_type == "prescription":
                        meds = ext.get("medications") or []
                        summary = f"Prescription containing {len(meds)} medications." if meds else "Medical prescription record."
                    elif doc_type == "lab_report":
                        results = ext.get("results") or []
                        summary = f"Lab report with {len(results)} test results." if results else "Laboratory test results."
                    elif doc_type == "voice_note":
                        summary = d.get("extracted_text") or "Voice recording update."
                        if len(summary) > 150:
                            summary = summary[:147] + "..."
                    else:
                        summary = f"Medical {str(doc_type).replace('_', ' ')} record."

                # Truncate very long summaries for the timeline view
                if summary and len(summary) > 200:
                    summary = summary[:197] + "..."

                d["summary"] = summary
                # Pass raw_transcript for audio expand
                d["raw_transcript"] = d.get("extracted_text") or None
                processed_docs.append(d)
            except Exception as e:
                logger.error("history_service.process_doc_failed", error=str(e), doc_id=d.get("id"))
                # Fallback for corrupted records
                d["source_label"] = "App Upload"
                d["summary"] = "Medical record entry."
                d["audio_url"] = None
                d["raw_transcript"] = None
                processed_docs.append(d)

        # Process observations to add labels and summaries
        processed_obs = []
        for r in obs_rows:
            try:
                o = dict(r)
                # Map source
                source_type = o.get("source_type")
                if source_type == "emergency_note":
                    o["source_label"] = "Emergency Voice Note"
                else:
                    o["source_label"] = "Caregiver Update" if o.get("caregiver_id") else "User Update"

                # Sign audio URL if present
                raw_path = o.get("source_document_url")
                if raw_path:
                    try:
                        o["source_document_url"] = create_signed_view_url(
                            settings.supabase_storage_bucket_documents, raw_path
                        )
                    except Exception as e:
                        logger.warning("history_service.obs_audio_sign_failed", error=str(e))
                        o["source_document_url"] = None

                # Extract summary (stored in concerns_flagged[0] by processing task)
                concerns = o.get("concerns_flagged") or []
                if isinstance(concerns, str):
                    try:
                        concerns = json.loads(concerns)
                    except:
                        concerns = [concerns]

                o["summary"] = concerns[0] if (isinstance(concerns, list) and concerns) else "Daily health update"
                o["observed_at"] = o["observation_date"] # Map for PDF generator
                processed_obs.append(o)
            except Exception as e:
                logger.error("history_service.process_obs_failed", error=str(e), obs_id=o.get("id"))
                o["source_label"] = "User Update"
                o["summary"] = "Daily health update"
                processed_obs.append(o)

        # Crisis access events (emergency mode open/close audit)
        crisis_rows = await self._conn.fetch(
            """
            SELECT id, type, title, body, created_at
            FROM public.notifications
            WHERE patient_id = $1
              AND type IN ('crisis_access', 'crisis_follow_up_response')
              AND channel = 'system_event'
            ORDER BY created_at DESC
            """,
            patient_id,
        )
        crisis_events = [
            {
                "id": str(r["id"]),
                "type": r["type"],
                "title": r["title"],
                "body": r["body"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in crisis_rows
        ]

        # Aggregate Full Timeline (descending)
        timeline = []

        # 1. Deduplicate observations (handle UNION ALL from repo)
        unique_obs_map = {}
        for o in processed_obs:
            source_id = str(o.get("source_document_id") or o["id"])
            # If current item is a "real" observation (id != source_doc_id), it's better than raw document
            is_real_obs = o.get("source_document_id") and str(o["id"]) != str(o["source_document_id"])
            if source_id not in unique_obs_map or is_real_obs:
                unique_obs_map[source_id] = o

        for o in unique_obs_map.values():
            source = o.get("source_label") or "User Update"
            is_emergency = o.get("source_type") == "emergency_note" or source == "Emergency Voice Note"
            title = "Voice Note from User"
            if is_emergency:
                title = "Emergency Follow Up(Voice Note)"
            elif source == "Caregiver Update":
                title = "Voice Note from Caregiver"

            timeline.append({
                "type": "observation",
                "date": o.get("observation_date") or o.get("created_at"),
                "title": title,
                "summary": o.get("summary"),
                "source_document_id": str(o.get("source_document_id")) if o.get("source_document_id") else None
            })

        # 2. Add documents (skip those already in observations)
        for d in processed_docs:
            doc_id = str(d["id"])
            if doc_id in unique_obs_map:
                continue
            is_voice = d.get("document_type") == "voice_note"
            source = d.get("source_label") or "App Upload"
            title = str(d.get("document_type", "document")).replace("_", " ").upper()
            if is_voice:
                if source in ("Emergency Voice Note", "app_upload", "crisis_follow_up"):
                    title = "Emergency Follow Up(Voice Note)"
                elif source == "Caregiver Update":
                    title = "Voice Note from Caregiver"
                else:
                    title = "Voice Note from User"

            timeline.append({
                "type": "document",
                "date": d.get("created_at"),
                "title": title,
                "summary": d.get("summary")
            })

        # 3. Add crisis events
        for c in crisis_events:
            title = c.get("title")
            if c.get("type") == "crisis_follow_up_response":
                title = "Emergency Follow Up(Text)"
                if any(t.get("summary") == c.get("body") for t in timeline):
                    continue

            timeline.append({
                "type": "crisis",
                "date": c.get("created_at"),
                "title": title,
                "summary": c.get("body")
            })

        # Sort chronological (oldest first)
        timeline.sort(key=lambda x: str(x["date"]), reverse=False)

        return {
            "patient_id": str(patient_id),
            "patient_name": patient_name,
            "generated_at": datetime.now(UTC).isoformat(),
            "documents": processed_docs,
            "observations": processed_obs,
            "timeline": timeline,
            "prescribers": [dict(r) for r in prescriber_rows],
            "clinical_hypotheses": [dict(r) for r in hypothesis_rows],
            "crisis_events": crisis_events,
            "medications_timeline": [dict(r) for r in med_rows],
            "lab_results_timeline": [
                {
                    **dict(r),
                    "recorded_at": r["test_date"], # Map test_date to recorded_at for PDF generator
                }
                for r in lab_rows
            ],
            "summary": {
                "total_medications": len(med_rows),
                "active_medications": sum(1 for r in med_rows if r["status"] == "active"),
                "discontinued_medications": sum(1 for r in med_rows if r["status"] == "discontinued"),
                "total_lab_results": len(lab_rows),
                "total_documents": len(doc_rows),
                "total_observations": len(obs_rows),
                "active_prescribers": sum(1 for r in prescriber_rows if r["status"] == "active"),
            },
        }

    async def generate_history_pdf_url(self, patient_id: UUID) -> str:
        """Build history PDF, upload to Supabase Storage, return 1-hour signed URL."""
        history = await self.get_history(patient_id)

        pdf_bytes = generate_patient_history_pdf(
            patient_name=history["patient_name"],
            timeline=history["timeline"],
            generated_at=datetime.now(UTC),
        )

        path = f"{patient_id}/history_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.pdf"
        bucket = settings.supabase_storage_bucket_documents
        storage_upload(bucket, path, pdf_bytes)

        signed = create_signed_view_url(bucket, path, download=True)
        return signed
