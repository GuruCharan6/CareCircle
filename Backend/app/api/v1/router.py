from fastapi import APIRouter

from app.api.v1.routes import (
    auth,
    calendar,
    caregivers,
    chatbot,
    crisis,
    digest,
    doctor_briefing,
    documents,
    drug_interactions,
    history,
    lab_results,
    medications,
    notifications,
    observations,
    onboarding,
    patient_state,
    patients,
    prescribers,
    refills,
    search,
    shortlink,
    whatsapp,
)

router = APIRouter(prefix="/api/v1")

# Phase 6 — Core API
router.include_router(auth.router)
router.include_router(patients.router)
router.include_router(onboarding.router)
router.include_router(documents.router)

# Phase 10 — Remaining routes
router.include_router(medications.router)
router.include_router(lab_results.router)
router.include_router(observations.router)
router.include_router(caregivers.router)
router.include_router(calendar.router)
router.include_router(refills.router)
router.include_router(drug_interactions.router)
router.include_router(notifications.router)
router.include_router(patient_state.router)
router.include_router(crisis.router)
router.include_router(digest.router)
router.include_router(whatsapp.router)

# Phase 11 — Advanced features
router.include_router(chatbot.router)
router.include_router(search.router)
router.include_router(doctor_briefing.router)

# Phase 15 — New features
router.include_router(prescribers.router)
router.include_router(history.router)
router.include_router(shortlink.router)
