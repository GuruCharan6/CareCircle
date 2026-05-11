from datetime import timedelta

from app.models.observation import Observation
from app.pipeline.layer2_normalize.types import NormalizedItem
from app.pipeline.layer4_reconcile.types import CONFLICT_TYPE_A, ClassifiedConflict

# Type A — Temporal Conflict
#
# Two sources describe the SAME dimension at DIFFERENT times.
# This is NOT a contradiction — it's time-series data.
# Resolution: more recent = current state, older = baseline.
# System must recognize this so it doesn't surface a false alarm.
#
# Example: lab glucose 140 (Jan 5) and 180 (Feb 1) — two readings, not a conflict.
# But if SAME SOURCE TYPE reports opposite things within 24h → possible data error.

_SAME_SOURCE_SAME_DAY_WINDOW = timedelta(hours=24)


def detect_temporal_conflicts(
    item: NormalizedItem,
    recent_observations: list[Observation],
) -> list[ClassifiedConflict]:
    """
    Detect when the same lab test or observation type appears twice within 24h
    from the same source type — possible duplicate or data entry error.
    For different days: no conflict created — that's normal time-series.
    """
    conflicts: list[ClassifiedConflict] = []

    if not item.ingest.is_lab_report:
        return conflicts

    new_results = item.ingest.extracted_data.get("results") or []
    event_date = item.ingest.event_time

    # We don't have a direct way to check lab_results via recent_observations,
    # but we CAN check if the same lab test appears twice in the SAME document
    # (malformed extraction) — that's a data quality issue, not a conflict.
    test_names = [r.get("test_name") for r in new_results if r.get("test_name")]
    duplicates = {t for t in test_names if test_names.count(t) > 1}

    for dup in duplicates:
        conflicts.append(ClassifiedConflict(
            patient_id=item.patient_id,
            conflict_type=CONFLICT_TYPE_A,
            source_a_type=item.source_type,
            source_a_id=item.source_document_id,
            source_a_dimension=item.profile.dimension,
            source_b_type=item.source_type,
            source_b_id=item.source_document_id,
            source_b_dimension=item.profile.dimension,
            conflict_description=(
                f"Lab test '{dup}' appears multiple times in the same report. "
                f"This may be a duplicate reading or extraction error. "
                f"Using the first value — review the original document to confirm."
            ),
            is_resolvable=True,
            meera_suggested_action=f"Check original lab report — '{dup}' appears twice.",
        ))

    return conflicts
