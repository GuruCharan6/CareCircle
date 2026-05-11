from fastapi import APIRouter, Depends, Header, HTTPException, BackgroundTasks
from app.config import settings
from uuid import UUID
import asyncio
from datetime import datetime
from zoneinfo import ZoneInfo

# Tasks
from app.worker.tasks.extract_document import _async_extract
from app.worker.tasks.embed_document import _async_embed
from app.worker.tasks.run_pipeline import _async_run as _async_run_pipeline
from app.worker.tasks.check_drug_interactions import _async_check as _async_check_interactions
from app.worker.tasks.rebuild_patient_state import _async_rebuild

# Jobs
from app.worker.jobs.morning_digest import _async_run as _async_morning_digest
from app.worker.jobs.evening_digest import _async_run as _async_evening_digest
from app.worker.jobs.dispatch_digests import async_dispatch_morning_digests, async_dispatch_evening_digests
from app.worker.jobs.nightly_crisis_rebuild import _async_run as _async_nightly_crisis_rebuild
from app.worker.jobs.daily_gap_detection import _async_run as _async_daily_gap_detection
from app.worker.jobs.refill_escalation import _async_run as _async_refill_escalation
from app.worker.jobs.staleness_check import _async_run as _async_staleness_check
from app.worker.jobs.caregiver_monthly_check import _async_run as _async_caregiver_monthly_check
from app.worker.jobs.caregiver_visit_messages import _async_run as _async_caregiver_visit_messages
from app.worker.jobs.caregiver_silence_detector import _async_run as _async_caregiver_silence_detector
from app.worker.jobs.deviation_check import _async_run as _async_deviation_check
from app.worker.jobs.calendar_reminders import _async_run as _async_calendar_reminders

router = APIRouter(prefix="/internal", tags=["Internal"])

async def verify_internal_secret(x_internal_secret: str = Header(None)):
    if not x_internal_secret or x_internal_secret != settings.internal_secret:
        raise HTTPException(status_code=403, detail="Invalid internal secret")

@router.post("/events/document-uploaded", dependencies=[Depends(verify_internal_secret)])
async def on_document_uploaded(document_id: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_extract, document_id)
    return {"status": "queued"}

@router.post("/events/document-approved", dependencies=[Depends(verify_internal_secret)])
async def on_document_approved(document_id: str, patient_id: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_embed, document_id, patient_id)
    background_tasks.add_task(_async_run_pipeline, document_id, patient_id)
    return {"status": "queued"}

@router.post("/events/medication-added", dependencies=[Depends(verify_internal_secret)])
async def on_medication_added(patient_id: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_check_interactions, patient_id)
    background_tasks.add_task(_async_rebuild, patient_id)
    return {"status": "queued"}

@router.post("/events/pipeline-complete", dependencies=[Depends(verify_internal_secret)])
async def on_pipeline_complete(patient_id: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_rebuild, patient_id)
    return {"status": "queued"}

@router.post("/events/appointment-confirmed", dependencies=[Depends(verify_internal_secret)])
async def on_appointment_confirmed(patient_id: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_rebuild, patient_id)
    return {"status": "queued"}

@router.post("/jobs/morning-digest", dependencies=[Depends(verify_internal_secret)])
async def trigger_morning_digest(patient_id: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_morning_digest, UUID(patient_id))
    return {"status": "queued"}

@router.post("/jobs/evening-digest", dependencies=[Depends(verify_internal_secret)])
async def trigger_evening_digest(patient_id: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_evening_digest, UUID(patient_id))
    return {"status": "queued"}

@router.post("/events/whatsapp-media", dependencies=[Depends(verify_internal_secret)])
async def on_whatsapp_media(message_id: str, background_tasks: BackgroundTasks):
    from app.worker.tasks.process_whatsapp_media import _async_run
    background_tasks.add_task(_async_run, message_id)
    return {"status": "queued"}

# ── Cron Jobs (Triggered by Render) ───────────────────────────────────────────

@router.post("/cron/every-minute", dependencies=[Depends(verify_internal_secret)])
async def cron_every_minute(background_tasks: BackgroundTasks):
    """
    A single master endpoint meant to be called every 1 minute.
    It checks digests every minute, but restricts hourly tasks to the top of the hour.
    """
    local_now = datetime.now(ZoneInfo("Asia/Kolkata"))
    hour = local_now.hour
    minute = local_now.minute

    # 1. Digests: Check every single minute (dispatcher checks exact hour/minute match)
    background_tasks.add_task(async_dispatch_morning_digests)
    background_tasks.add_task(async_dispatch_evening_digests)

    # 2. Hourly Tasks: ONLY run when minute == 0 (top of the hour)
    if minute == 0:
        if hour == 2:
            background_tasks.add_task(_async_nightly_crisis_rebuild)
        elif hour == 6:
            background_tasks.add_task(_async_daily_gap_detection)
        elif hour == 8:
            background_tasks.add_task(_async_calendar_reminders)
            background_tasks.add_task(_async_caregiver_visit_messages)
        elif hour == 10:
            background_tasks.add_task(_async_refill_escalation)
            if local_now.day == 1:
                background_tasks.add_task(_async_caregiver_monthly_check)
        elif hour == 12:
            background_tasks.add_task(_async_deviation_check)
        elif hour == 19:
            background_tasks.add_task(_async_caregiver_silence_detector)
        elif hour == 20:
            background_tasks.add_task(_async_staleness_check)

    return {"status": "queued", "executed_for_hour": hour, "minute": minute}

@router.post("/cron/dispatch-morning-digests", dependencies=[Depends(verify_internal_secret)])
async def cron_dispatch_morning_digests(background_tasks: BackgroundTasks):
    background_tasks.add_task(async_dispatch_morning_digests)
    return {"status": "queued"}

@router.post("/cron/dispatch-evening-digests", dependencies=[Depends(verify_internal_secret)])
async def cron_dispatch_evening_digests(background_tasks: BackgroundTasks):
    background_tasks.add_task(async_dispatch_evening_digests)
    return {"status": "queued"}

@router.post("/cron/nightly-crisis-rebuild", dependencies=[Depends(verify_internal_secret)])
async def cron_nightly_crisis_rebuild(background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_nightly_crisis_rebuild)
    return {"status": "queued"}

@router.post("/cron/daily-gap-detection", dependencies=[Depends(verify_internal_secret)])
async def cron_daily_gap_detection(background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_daily_gap_detection)
    return {"status": "queued"}

@router.post("/cron/refill-escalation", dependencies=[Depends(verify_internal_secret)])
async def cron_refill_escalation(background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_refill_escalation)
    return {"status": "queued"}

@router.post("/cron/staleness-check", dependencies=[Depends(verify_internal_secret)])
async def cron_staleness_check(background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_staleness_check)
    return {"status": "queued"}

@router.post("/cron/caregiver-monthly-check", dependencies=[Depends(verify_internal_secret)])
async def cron_caregiver_monthly_check(background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_caregiver_monthly_check)
    return {"status": "queued"}

@router.post("/cron/caregiver-visit-messages", dependencies=[Depends(verify_internal_secret)])
async def cron_caregiver_visit_messages(background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_caregiver_visit_messages)
    return {"status": "queued"}

@router.post("/cron/caregiver-silence-detector", dependencies=[Depends(verify_internal_secret)])
async def cron_caregiver_silence_detector(background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_caregiver_silence_detector)
    return {"status": "queued"}

@router.post("/cron/deviation-check", dependencies=[Depends(verify_internal_secret)])
async def cron_deviation_check(background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_deviation_check)
    return {"status": "queued"}

@router.post("/cron/calendar-reminders", dependencies=[Depends(verify_internal_secret)])
async def cron_calendar_reminders(background_tasks: BackgroundTasks):
    background_tasks.add_task(_async_calendar_reminders)
    return {"status": "queued"}
