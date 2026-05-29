from datetime import timedelta

from app.models.observation import Observation
from app.pipeline.layer2_normalize.types import (
    DIM_BEHAVIORAL_OBSERVABLE,
    DIM_SUBJECTIVE_EXPERIENCE,
    NormalizedItem,
)
from app.pipeline.layer4_reconcile.types import CONFLICT_TYPE_B, ClassifiedConflict

# Type B — Observational Conflict
#
# Two sources describe the SAME event from DIFFERENT vantage points.
# Caregiver says dizzy. Dad says fine.
# NOT a contradiction — different dimensions of same event.
# Both can be simultaneously true.
# Weight by reliability + structural bias (accounts for patient minimization pattern).
#
# System holds both. Surfaces to Meera with explanation of why both can coexist.

_OBSERVATIONAL_WINDOW_DAYS = 3


def detect_observational_conflicts(
    item: NormalizedItem,
    recent_observations: list[Observation],
) -> list[ClassifiedConflict]:
    """
    Find cases where caregiver reported a symptom that patient denied or didn't mention
    within the observational window — Type B, not contradiction.
    """
    if item.source_type not in ("voice_note_caregiver", "voice_note_meera"):
        return []

    caregiver_symptoms: set[str] = set()
    patient_denied: set[str] = set()
    patient_report_ids: dict[str, Observation] = {}

    event_date = item.ingest.event_time
    if event_date is None:
        return []
    window_start = event_date - timedelta(days=_OBSERVATIONAL_WINDOW_DAYS)

    # Current item is caregiver note — look for patient-side denial in recent observations.
    if item.source_type == "voice_note_caregiver":
        caregiver_symptoms = set(
            s.lower() for s in (item.ingest.extracted_data.get("symptoms_reported") or [])
        )
        for obs in recent_observations:
            # obs.source_type is normalized on read: meera_call_log → voice_log
            if obs.source_type not in ("voice_log", "meera_call_log", "voice_note_meera"):
                continue
            if obs.observation_date < window_start:
                continue
            for s in (obs.symptoms_denied or []):
                patient_denied.add(s.lower())
                patient_report_ids[s.lower()] = obs

    if not caregiver_symptoms or not patient_denied:
        return []

    disputed = caregiver_symptoms & patient_denied
    if not disputed:
        return []

    conflicts: list[ClassifiedConflict] = []
    for symptom in disputed:
        patient_obs = patient_report_ids.get(symptom)
        conflicts.append(ClassifiedConflict(
            patient_id=item.patient_id,
            conflict_type=CONFLICT_TYPE_B,
            source_a_type="voice_note_caregiver",
            source_a_id=item.ingest.source_document_id,
            source_a_dimension=DIM_BEHAVIORAL_OBSERVABLE,
            source_b_type="voice_note_meera",
            source_b_id=patient_obs.id if patient_obs else item.ingest.source_document_id,
            source_b_dimension=DIM_SUBJECTIVE_EXPERIENCE,
            conflict_description=(
                f"Caregiver reported {symptom} (behavioral, observed). "
                f"Dad said he did not have {symptom} (subjective, self-reported). "
                f"Both can be true at the same time — caregiver observed something externally "
                f"that Dad may not have noticed internally, or Dad is downplaying. "
                f"System weights the caregiver's observation more heavily for physical symptoms."
            ),
            is_resolvable=False,
            meera_suggested_action=(
                f"Next time you speak to Dad, ask directly: "
                f"'Papa, have you felt {symptom} at all?' — specific questions get less filtered answers."
            ),
        ))

    return conflicts
