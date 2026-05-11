from dataclasses import dataclass
from uuid import UUID

# Conflict types as defined in system design.
# Never resolve. Never pick winner. Never average.
CONFLICT_TYPE_A = "type_a_temporal"       # same dimension, different times
CONFLICT_TYPE_B = "type_b_observational"  # same event, different vantage points
CONFLICT_TYPE_C = "type_c_dimensional"    # apparent conflict, different things measured
CONFLICT_TYPE_D = "type_d_factual"        # direct contradiction on single verifiable fact


@dataclass
class ClassifiedConflict:
    """
    A conflict between two data sources for the same patient.
    classifier.py produces these. orchestrator writes them to conflict_records.
    """
    patient_id: UUID
    conflict_type: str          # CONFLICT_TYPE_A/B/C/D
    source_a_type: str          # 'voice_note_caregiver', 'lab_report', etc.
    source_a_id: UUID           # source_document_id
    source_a_dimension: str     # from SourceProfile.dimension
    source_b_type: str
    source_b_id: UUID
    source_b_dimension: str
    conflict_description: str   # plain English — Meera readable
    is_resolvable: bool         # Type D = False (never resolve silently)
    meera_suggested_action: str | None = None  # concrete ask, not generic advice
