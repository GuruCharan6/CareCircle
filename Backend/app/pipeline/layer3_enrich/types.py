from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from app.models.lab_result import LabResult
from app.models.medication import Medication
from app.models.observation import Observation
from app.models.patient import Patient

# Urgency levels — rare by design. alert = push now.
URGENCY_ALERT = "alert"    # drug interaction, critical lab, rapid deterioration
URGENCY_WATCH = "watch"    # morning/evening digest flag
URGENCY_INFORM = "inform"  # background context, no interrupt


@dataclass
class PatientContext:
    """
    Snapshot of patient state for rules engine.
    Fetched by orchestrator before Layer 3 runs.
    """
    patient: Patient
    active_medications: list[Medication]
    recent_lab_results: list[LabResult]      # last 90 days
    recent_observations: list[Observation]  # last 14 days
    known_interactions: list[dict] = field(default_factory=list)  # from drug_interaction_results

    @property
    def patient_id(self) -> UUID:
        return self.patient.id

    @property
    def has_diabetes(self) -> bool:
        conditions = [c.lower() for c in (self.patient.known_conditions or [])]
        return any("diabet" in c or "sugar" in c for c in conditions)

    @property
    def has_cardiac_history(self) -> bool:
        conditions = [c.lower() for c in (self.patient.known_conditions or [])]
        return any(
            kw in c
            for c in conditions
            for kw in ("cardiac", "heart", "cardio", "angina", "hypertension", "bp")
        )

    @property
    def diabetes_medications(self) -> list[Medication]:
        _diabetes_classes = {
            "biguanide", "sulfonylurea", "dpp-4", "sglt2", "glp-1", "insulin",
            "alpha-glucosidase inhibitor", "thiazolidinedione",
        }
        _diabetes_generics = {
            "metformin", "glimepiride", "glipizide", "gliclazide", "sitagliptin",
            "vildagliptin", "empagliflozin", "dapagliflozin", "insulin",
        }
        return [
            m for m in self.active_medications
            if (m.drug_class or "").lower() in _diabetes_classes
            or m.generic_name.lower() in _diabetes_generics
        ]

    @property
    def cardiac_medications(self) -> list[Medication]:
        _cardiac_classes = {
            "ace inhibitor", "arb", "beta blocker", "calcium channel blocker",
            "antiplatelet", "anticoagulant", "statin", "nitrate", "digoxin",
            "diuretic",
        }
        _cardiac_generics = {
            "amlodipine", "atenolol", "metoprolol", "ramipril", "enalapril",
            "losartan", "telmisartan", "aspirin", "clopidogrel", "warfarin",
            "atorvastatin", "rosuvastatin", "furosemide", "spironolactone",
        }
        return [
            m for m in self.active_medications
            if (m.drug_class or "").lower() in _cardiac_classes
            or m.generic_name.lower() in _cardiac_generics
        ]


@dataclass
class Hypothesis:
    """
    Output of one rule — a clinical concern with urgency.
    Rules produce hypotheses, not conclusions.
    """
    rule_id: str
    patient_id: UUID
    trigger_event_type: str      # 'source_document'
    trigger_event_id: UUID       # source_document_id
    hypothesis_text: str         # plain English, Meera-readable
    confidence: str              # 'high' | 'medium' | 'low'
    urgency: str                 # URGENCY_ALERT | WATCH | INFORM
    supporting_evidence: list[Any] = field(default_factory=list)
