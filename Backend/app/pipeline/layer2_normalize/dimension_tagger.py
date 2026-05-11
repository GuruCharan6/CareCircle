from app.pipeline.layer1_ingest.types import IngestedItem
from app.pipeline.layer2_normalize.types import (
    DIM_BEHAVIORAL_OBSERVABLE,
    DIM_BIOCHEMICAL,
    DIM_CLINICAL_INSTRUCTION,
    DIM_SUBJECTIVE_EXPERIENCE,
    SourceProfile,
)


def refine_dimension(item: IngestedItem, profile: SourceProfile) -> str:
    """
    Some sources carry mixed-dimension content.
    This refines the default profile dimension based on item content.

    Examples:
    - doctor_note with medication_changes → clinical_instruction
    - doctor_note with follow_up_date only (no med changes) → clinical_instruction (same)
    - voice_note_caregiver reporting symptoms physically observed → behavioral_observable
    - voice_note_caregiver relaying what patient said they felt → subjective_experience
      (we can't tell from NLP, so we use profile default: behavioral_observable)

    For single-dimension source types (lab_report, prescription), dimension is fixed.
    """
    source_type = item.source_type
    data = item.extracted_data

    # Lab reports and prescriptions have exactly one dimension — no refinement needed.
    if source_type == "lab_report":
        return DIM_BIOCHEMICAL

    if source_type == "prescription":
        return DIM_CLINICAL_INSTRUCTION

    # Doctor/handwritten notes: if only follow-up info with no clinical instruction → still clinical.
    if source_type in ("doctor_note", "handwritten_note"):
        return DIM_CLINICAL_INSTRUCTION

    # Voice notes: caregiver is reporting observable behavior.
    # Dad's own words relayed by caregiver = behavioral_observable (caregiver witnessed).
    # Meera relaying Dad's words = subjective_experience (filtered through Dad's minimization).
    if source_type == "voice_note_caregiver":
        return DIM_BEHAVIORAL_OBSERVABLE

    if source_type == "voice_note_meera":
        # "symptoms_absent" that Meera noticed = behavioral_observable (absence of mention).
        # Everything else = subjective_experience (Dad's report).
        # We use subjective_experience as default; reconciler handles the absent-symptom case.
        return DIM_SUBJECTIVE_EXPERIENCE

    return profile.dimension
