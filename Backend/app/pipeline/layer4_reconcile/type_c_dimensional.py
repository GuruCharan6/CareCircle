from app.pipeline.layer2_normalize.types import (
    DIM_BEHAVIORAL_OBSERVABLE,
    DIM_BIOCHEMICAL,
    DIM_CLINICAL_INSTRUCTION,
    NormalizedItem,
)
from app.pipeline.layer4_reconcile.types import CONFLICT_TYPE_C, ClassifiedConflict

# Type C — Dimensional Conflict (False Conflict)
#
# Two sources APPEAR to contradict but measure DIFFERENT things.
# Caregiver confirms medications taken. Lab shows glucose elevated.
# NOT a conflict — compliance and metabolic control are different dimensions.
# System explains the distinction rather than suppressing either reading.

_DIMENSIONAL_CONFLICTS = [
    {
        "condition": "medication_compliance_vs_lab",
        "dim_a": DIM_BEHAVIORAL_OBSERVABLE,
        "dim_b": DIM_BIOCHEMICAL,
        "description_template": (
            "Apparent conflict: medications reported as taken "
            "but lab values show {lab_concern}. "
            "This is not a contradiction — compliance (taking the medication) and "
            "metabolic control (how the body responds) are different dimensions. "
            "Medications taken consistently can still show poor lab values due to "
            "progression of disease, diet, dosing timing, or medication effectiveness. "
            "Both facts can be simultaneously true."
        ),
    },
    {
        "condition": "prescription_vs_observation",
        "dim_a": DIM_CLINICAL_INSTRUCTION,
        "dim_b": DIM_BEHAVIORAL_OBSERVABLE,
        "description_template": (
            "Apparent conflict: prescription says {instruction} "
            "but observation shows {behavior}. "
            "This is the difference between what was prescribed (clinical intent) "
            "and what is happening (behavioral reality). "
            "System tracks both — this gap is important information, not an error."
        ),
    },
]


def detect_dimensional_conflicts(
    item: NormalizedItem,
    recent_items: list[NormalizedItem],
) -> list[ClassifiedConflict]:
    """
    Detect false conflicts where two sources appear to conflict
    but actually measure different dimensions.
    Surface with explanation so Meera understands they can coexist.
    """
    conflicts: list[ClassifiedConflict] = []

    # Lab report + recent observation noting medication compliance.
    if item.ingest.is_lab_report:
        abnormal_results = [
            r for r in (item.ingest.extracted_data.get("results") or [])
            if r.get("is_abnormal") is True
        ]
        if not abnormal_results:
            return conflicts

        for prior_item in recent_items:
            if prior_item.source_type not in ("voice_note_caregiver", "voice_note_meera"):
                continue
            meds_taken = prior_item.ingest.extracted_data.get("medications_taken")
            if meds_taken is not True:
                continue

            lab_names = ", ".join(r.get("test_name_display", r.get("test_name", "")) for r in abnormal_results)

            conflicts.append(ClassifiedConflict(
                patient_id=item.patient_id,
                conflict_type=CONFLICT_TYPE_C,
                source_a_type=prior_item.source_type,
                source_a_id=prior_item.source_document_id,
                source_a_dimension=DIM_BEHAVIORAL_OBSERVABLE,
                source_b_type=item.source_type,
                source_b_id=item.source_document_id,
                source_b_dimension=DIM_BIOCHEMICAL,
                conflict_description=(
                    f"Medications reported as taken consistently, "
                    f"but {lab_names} shows abnormal values. "
                    f"This is NOT a contradiction — compliance (taking medication) and "
                    f"metabolic control (lab values) are different dimensions. "
                    f"Both facts are correct. Abnormal labs while taking medication may mean "
                    f"dose adjustment is needed — worth discussing at next appointment."
                ),
                is_resolvable=True,
                meera_suggested_action=(
                    f"Mention to doctor: medications taken consistently but {lab_names} "
                    f"still showing abnormal. May need dose review."
                ),
            ))
            break  # one conflict per lab report is enough

    return conflicts
