from dataclasses import dataclass, field
from uuid import UUID

from app.pipeline.layer3_enrich.types import Hypothesis
from app.pipeline.layer4_reconcile.types import ClassifiedConflict


@dataclass
class ReasoningInput:
    """Everything the LLM receives. LLM translates this — does NOT generate clinical logic."""
    patient_id: UUID
    patient_name: str
    known_conditions: list[str]
    hypotheses: list[Hypothesis]
    conflicts: list[ClassifiedConflict]
    source_type: str
    dimension: str


@dataclass
class ThreePartOutput:
    """
    Layer 5 output — three-part plain language digest.
    Structure is fixed every time, every output.
    LLM writes the text. Rules engine determined the content.
    """
    known_facts: list[str]      # high-confidence, well-sourced, attributed
    hypotheses_text: list[str]  # what evidence suggests, with mechanism
    unknowns: list[str]         # specific gaps + concrete action for each
    max_urgency: str            # 'alert' | 'watch' | 'inform'
    plain_summary: str          # full LLM output for digest rendering
    patient_id: UUID
