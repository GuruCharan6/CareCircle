from abc import ABC, abstractmethod

from app.pipeline.layer2_normalize.types import NormalizedItem
from app.pipeline.layer3_enrich.types import Hypothesis, PatientContext


class BaseRule(ABC):
    """
    Deterministic clinical rule. No AI. No external calls.
    Runs synchronously against NormalizedItem + PatientContext.
    Returns list of Hypothesis (empty = rule did not fire).
    """

    @abstractmethod
    def evaluate(
        self,
        item: NormalizedItem,
        context: PatientContext,
    ) -> list[Hypothesis]:
        """
        Evaluate rule against current normalized item and patient context.
        Must be deterministic — same inputs always produce same outputs.
        """
