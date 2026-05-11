import asyncio
from datetime import date
from uuid import UUID

from app.cache.patient_state_cache import invalidate_patient_state
from app.core.celery import celery_app
from app.core.logging import get_logger
from app.repositories.lab_result_repository import LabResultRepository
from app.repositories.medication_repository import MedicationRepository
from app.repositories.observation_repository import ObservationRepository
from app.repositories.patient_state_repository import PatientStateRepository
from app.worker._db import worker_conn

logger = get_logger(__name__)

# Staleness thresholds in days
_AGING_DAYS = 3
_STALE_DAYS = 7
_CRITICAL_DAYS = 14

# Confidence thresholds in days (how recently data was received)
_CONF_HIGH_DAYS = 14
_CONF_MEDIUM_DAYS = 30


@celery_app.task(
    bind=True,
    name="rebuild_patient_state",
    max_retries=3,
    default_retry_delay=30,
)
def rebuild_patient_state(self, patient_id: str) -> None:
    try:
        asyncio.run(_async_rebuild(patient_id))
    except Exception as exc:
        logger.error("rebuild_patient_state.failed", patient_id=patient_id, error=str(exc))
        raise self.retry(exc=exc)


async def _async_rebuild(patient_id: str) -> None:
    pid = UUID(patient_id)

    async with worker_conn() as conn:
        med_repo = MedicationRepository(conn)
        lab_repo = LabResultRepository(conn)
        obs_repo = ObservationRepository(conn)
        state_repo = PatientStateRepository(conn)

        # Active medication count
        active_meds = await med_repo.get_active_by_patient(pid)
        active_med_count = len(active_meds)

        # Hypothesis urgency counts
        hyp_alerts = int(await conn.fetchval(
            "SELECT COUNT(*) FROM public.clinical_hypotheses WHERE patient_id = $1 AND status = 'active' AND urgency = 'alert'", pid
        ))
        interaction_alerts = int(await conn.fetchval(
            "SELECT COUNT(*) FROM public.drug_interaction_results WHERE patient_id = $1 AND final_urgency = 'alert'", pid
        ))
        # Refills due in 3 days or less are alerts
        refill_alerts = int(await conn.fetchval(
            "SELECT COUNT(*) FROM public.medication_refills WHERE patient_id = $1 AND refill_due_date <= CURRENT_DATE + 3", pid
        ))
        alert_count = hyp_alerts + interaction_alerts + refill_alerts

        hyp_watches = int(await conn.fetchval(
            "SELECT COUNT(*) FROM public.clinical_hypotheses WHERE patient_id = $1 AND status = 'active' AND urgency = 'watch'", pid
        ))
        interaction_watches = int(await conn.fetchval(
            "SELECT COUNT(*) FROM public.drug_interaction_results WHERE patient_id = $1 AND final_urgency = 'watch'", pid
        ))
        # Refills due in 4-10 days are watches
        refill_watches = int(await conn.fetchval(
            "SELECT COUNT(*) FROM public.medication_refills WHERE patient_id = $1 AND refill_due_date > CURRENT_DATE + 3 AND refill_due_date <= CURRENT_DATE + 10", pid
        ))
        watch_count = hyp_watches + interaction_watches + refill_watches

        conflict_count = int(await conn.fetchval(
            "SELECT COUNT(*) FROM public.conflict_records WHERE patient_id = $1 AND status = 'active'", pid
        ))

        # Last update dates per dimension
        labs = await lab_repo.get_by_patient_id(pid, limit=1)
        last_lab_date = labs[0].test_date if labs else None

        caregiver_obs = await obs_repo.get_latest(pid, "caregiver_note")
        last_caregiver_date = caregiver_obs.observation_date if caregiver_obs else None

        meera_obs = await obs_repo.get_latest(pid, "voice_log")
        last_meera_date = meera_obs.observation_date if meera_obs else None

        last_prescription_date = await conn.fetchval(
            """SELECT MAX(event_date) FROM public.source_documents
               WHERE patient_id = $1
                 AND document_type = 'prescription'
                 AND extraction_status = 'approved'""",
            pid,
        )

        # Staleness — based on most recent data of any kind
        all_dates = [d for d in [last_lab_date, last_caregiver_date, last_meera_date] if d]
        most_recent = max(all_dates) if all_dates else None
        staleness = _staleness(most_recent)

        # Dimension confidences — how recently each data stream was updated
        biochemical_confidence = _confidence(last_lab_date)
        behavioral_confidence = _confidence(last_caregiver_date)
        subjective_confidence = _confidence(last_meera_date)
        clinical_confidence = _confidence(last_prescription_date)

        # Overall status
        if alert_count > 0:
            overall_status = "alert"
        elif watch_count > 0:
            overall_status = "watch"
        elif active_med_count > 0 or most_recent is not None:
            overall_status = "ok"
        else:
            overall_status = "unknown"

        state = await state_repo.upsert(
            patient_id=pid,
            overall_status=overall_status,
            biochemical_confidence=biochemical_confidence,
            behavioral_confidence=behavioral_confidence,
            subjective_confidence=subjective_confidence,
            clinical_confidence=clinical_confidence,
            last_lab_date=last_lab_date,
            last_caregiver_note_date=last_caregiver_date,
            last_meera_log_date=last_meera_date,
            last_prescription_date=last_prescription_date,
            active_medication_count=active_med_count,
            active_alerts_count=alert_count,
            active_watch_count=watch_count,
            active_conflicts_count=conflict_count,
            staleness_status=staleness,
        )

        # Invalidate Redis cache so next API read fetches fresh state from DB
        await invalidate_patient_state(pid)

        logger.info(
            "rebuild_patient_state.done",
            patient_id=patient_id,
            overall_status=state.overall_status,
            alerts=alert_count,
            watches=watch_count,
            staleness=staleness,
        )


def _staleness(most_recent: date | None) -> str:
    if most_recent is None:
        return "unknown"
    age = (date.today() - most_recent).days
    if age <= _AGING_DAYS:
        return "fresh"
    if age <= _STALE_DAYS:
        return "aging"
    if age <= _CRITICAL_DAYS:
        return "stale"
    return "critical"


def _confidence(last_date: date | None) -> str:
    if last_date is None:
        return "unknown"
    age = (date.today() - last_date).days
    if age <= _CONF_HIGH_DAYS:
        return "high"
    if age <= _CONF_MEDIUM_DAYS:
        return "medium"
    return "low"
