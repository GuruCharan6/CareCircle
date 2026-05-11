from dataclasses import dataclass

from app.pipeline.layer1_ingest.types import IngestedItem

# Reliability priors — fixed, not dynamic.
# Dynamic scoring would make conflicting-but-correct caregiver reports appear less reliable.
RELIABILITY_VERY_HIGH = "very_high"
RELIABILITY_HIGH = "high"
RELIABILITY_MODERATE = "moderate"
RELIABILITY_LOW = "low"

# Structural biases built into source types.
BIAS_NONE = "none"
BIAS_OVER_REPORT = "over_report"       # caregiver: slight tendency to over-report symptoms
BIAS_MINIMIZATION = "minimization"    # patient self-report: ingrained downplaying
BIAS_ANXIETY_FILTERED = "anxiety_filtered"  # Meera: filtered through worry + relationship dynamics

# Dimensions — most important element of normalization.
# Caregiver "dizzy" ≠ Dad "fine". Same event, different dimensions. Not contradiction.
DIM_BIOCHEMICAL = "biochemical"              # lab results, objective body chemistry
DIM_BEHAVIORAL_OBSERVABLE = "behavioral_observable"  # physically seen/done (meals, meds taken)
DIM_SUBJECTIVE_EXPERIENCE = "subjective_experience"  # how patient felt internally
DIM_CLINICAL_INSTRUCTION = "clinical_instruction"    # what doctor prescribed (intent, not reality)


@dataclass
class SourceProfile:
    source_type: str
    reliability: str
    structural_bias: str
    dimension: str


@dataclass
class NormalizedItem:
    """Layer 2 output — IngestedItem + source profile attached."""
    ingest: IngestedItem
    profile: SourceProfile

    @property
    def source_document_id(self):
        return self.ingest.source_document_id

    @property
    def patient_id(self):
        return self.ingest.patient_id

    @property
    def source_type(self):
        return self.ingest.source_type

    @property
    def event_time(self):
        return self.ingest.event_time

    @property
    def trigger_event_type(self) -> str:
        """Maps source_type to clinical_hypotheses.trigger_event_type DB enum."""
        _map = {
            "prescription": "medication",
            "lab_report": "lab_result",
            "doctor_note": "observation",
            "handwritten_note": "observation",
            "voice_note_caregiver": "observation",
            "voice_note_meera": "observation",
        }
        return _map.get(self.ingest.source_type, "observation")
