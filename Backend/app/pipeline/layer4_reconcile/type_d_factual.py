from datetime import timedelta

from app.models.observation import Observation
from app.pipeline.layer2_normalize.types import NormalizedItem
from app.pipeline.layer4_reconcile.types import CONFLICT_TYPE_D, ClassifiedConflict

# Type D — Factual Conflict
#
# Two sources directly contradict on a SINGLE VERIFIABLE FACT.
# Caregiver: no breakfast. Dad: had tea and biscuits.
# Both cannot be true. System NEVER resolves this silently.
# Flag explicitly. Surface to Meera with specific suggested action.
# is_resolvable = False — Meera must determine truth.

_FACTUAL_WINDOW_DAYS = 1  # same-day factual conflicts only


def detect_factual_conflicts(
    item: NormalizedItem,
    recent_observations: list[Observation],
) -> list[ClassifiedConflict]:
    """
    Detect direct contradictions on single verifiable facts
    (did he eat breakfast? did he take his medication?).
    Only looks at same-day observations to avoid time-gap false positives.
    """
    if item.source_type not in ("voice_note_caregiver", "voice_note_meera"):
        return []

    conflicts: list[ClassifiedConflict] = []
    event_date = item.ingest.event_time
    window_start = event_date - timedelta(days=_FACTUAL_WINDOW_DAYS)

    item_meals = item.ingest.extracted_data.get("meals_eaten") or {}
    item_meds_taken = item.ingest.extracted_data.get("medications_taken")

    for obs in recent_observations:
        if obs.observation_date < window_start:
            continue
        if obs.source_document_id == item.source_document_id:
            continue

        # Only compare caregiver vs Meera (or vice versa) — not same source type.
        if obs.source_type == item.source_type:
            continue

        obs_meals = obs.meals_eaten or {}

        # Factual conflict on breakfast.
        for meal in ("breakfast", "lunch", "dinner"):
            item_val = item_meals.get(meal)
            obs_val = obs_meals.get(meal)

            if item_val is not None and obs_val is not None and item_val != obs_val:
                source_a_said = "had" if item_meals[meal] else "skipped"
                source_b_said = "had" if obs_meals[meal] else "skipped"
                conflicts.append(ClassifiedConflict(
                    patient_id=item.patient_id,
                    conflict_type=CONFLICT_TYPE_D,
                    source_a_type=item.source_type,
                    source_a_id=item.source_document_id,
                    source_a_dimension=item.profile.dimension,
                    source_b_type=obs.source_type,
                    source_b_id=obs.source_document_id,
                    source_b_dimension="behavioral_observable",
                    conflict_description=(
                        f"Direct factual conflict on {meal}: "
                        f"{item.source_type.replace('_', ' ')} says {meal} was {source_a_said}, "
                        f"{obs.source_type.replace('_', ' ')} says {meal} was {source_b_said}. "
                        f"Both cannot be true. System does not resolve this — "
                        f"Meera must determine which is accurate."
                    ),
                    is_resolvable=False,
                    meera_suggested_action=(
                        f"Worth asking him directly next time you speak: "
                        f"'Papa, did you have {meal} on {event_date.strftime('%B %d')}?'"
                    ),
                ))

        # Factual conflict on medication taken.
        if (
            item_meds_taken is not None
            and obs.medications_taken is not None
            and item_meds_taken != obs.medications_taken
        ):
            conflicts.append(ClassifiedConflict(
                patient_id=item.patient_id,
                conflict_type=CONFLICT_TYPE_D,
                source_a_type=item.source_type,
                source_a_id=item.source_document_id,
                source_a_dimension=item.profile.dimension,
                source_b_type=obs.source_type,
                source_b_id=obs.source_document_id,
                source_b_dimension="behavioral_observable",
                conflict_description=(
                    f"Direct factual conflict on medication: "
                    f"{item.source_type.replace('_', ' ')} says medications "
                    f"{'were' if item_meds_taken else 'were NOT'} taken. "
                    f"{obs.source_type.replace('_', ' ')} says medications "
                    f"{'were' if obs.medications_taken else 'were NOT'} taken. "
                    f"System does not resolve this — Meera must determine the truth."
                ),
                is_resolvable=False,
                meera_suggested_action=(
                    f"Ask caregiver and Dad separately about medications on {event_date.strftime('%B %d')}."
                ),
            ))

    return conflicts
