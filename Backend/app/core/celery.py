from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "carecircle",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.worker.tasks.extract_document",
        "app.worker.tasks.embed_document",
        "app.worker.tasks.run_pipeline",
        "app.worker.tasks.check_drug_interactions",
        "app.worker.tasks.rebuild_patient_state",
        "app.worker.tasks.process_whatsapp_media",
        "app.worker.jobs.dispatch_digests",
        "app.worker.jobs.morning_digest",
        "app.worker.jobs.evening_digest",
        "app.worker.jobs.nightly_crisis_rebuild",
        "app.worker.jobs.daily_gap_detection",
        "app.worker.jobs.refill_escalation",
        "app.worker.jobs.staleness_check",
        "app.worker.jobs.caregiver_monthly_check",
        "app.worker.jobs.caregiver_visit_messages",
        "app.worker.jobs.caregiver_silence_detector",
        "app.worker.jobs.deviation_check",
        "app.worker.jobs.calendar_reminders",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# Celery Beat schedule — all times in IST (timezone="Asia/Kolkata")
celery_app.conf.beat_schedule = {
    "dispatch-morning-digests": {
        "task": "dispatch_morning_digests",
        "schedule": crontab(hour=5, minute=0),        # 5:00 AM IST — schedules per-user morning sends via ETA
    },
    "dispatch-evening-digests": {
        "task": "dispatch_evening_digests",
        "schedule": crontab(hour=12, minute=0),       # 12:00 PM IST — schedules per-user evening sends via ETA
    },
    "nightly-crisis-rebuild": {
        "task": "nightly_crisis_rebuild",
        "schedule": crontab(hour=2, minute=0),        # 2:00 AM IST daily
    },
    "daily-gap-detection": {
        "task": "daily_gap_detection",
        "schedule": crontab(hour=6, minute=0),        # 6:00 AM IST daily
    },
    "refill-escalation": {
        "task": "refill_escalation",
        "schedule": crontab(hour=10, minute=0),       # 10:00 AM IST daily
    },
    "staleness-check": {
        "task": "staleness_check",
        "schedule": crontab(hour=20, minute=0),       # 8:00 PM IST daily
    },
    "caregiver-monthly-check": {
        "task": "caregiver_monthly_check",
        "schedule": crontab(hour=10, minute=0, day_of_month=1),  # 1st of month 10:00 AM IST
    },
    "caregiver-visit-messages": {
        "task": "caregiver_visit_messages",
        "schedule": crontab(hour=8, minute=0),        # 8:00 AM IST daily
    },
    "caregiver-silence-detector": {
        "task": "caregiver_silence_detector",
        "schedule": crontab(hour=19, minute=0),       # 7:00 PM IST daily
    },
    "deviation-check": {
        "task": "deviation_check",
        "schedule": crontab(hour=12, minute=0),       # 12:00 PM IST daily
    },
    "calendar-reminders": {
        "task": "calendar_reminders",
        "schedule": crontab(hour=8, minute=15),       # 8:15 AM IST daily (offset slightly from digest)
    },
}
