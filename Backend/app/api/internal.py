from fastapi import APIRouter, Depends, Header, HTTPException, BackgroundTasks
from app.config import settings
from uuid import UUID
import asyncio

# Tasks
from app.worker.tasks.extract_document import _async_extract
from app.worker.tasks.embed_document import _async_embed
from app.worker.tasks.run_pipeline import _async_run as _async_run_pipeline
from app.worker.tasks.check_drug_interactions import _async_check as _async_check_interactions
from app.worker.tasks.rebuild_patient_state import _async_rebuild

# Jobs
from app.worker.jobs.morning_digest import _async_run as _async_morning_digest
from app.worker.jobs.evening_digest import _async_run as _async_evening_digest

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
