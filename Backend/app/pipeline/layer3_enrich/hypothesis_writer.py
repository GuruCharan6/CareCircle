import asyncpg

from app.pipeline.layer3_enrich.types import Hypothesis
from app.repositories.clinical_hypothesis_repository import ClinicalHypothesisRepository


async def write_hypotheses(
    hypotheses: list[Hypothesis],
    conn: asyncpg.Connection,
) -> int:
    """Persist all hypotheses to clinical_hypotheses table. Returns count written."""
    if not hypotheses:
        return 0

    repo = ClinicalHypothesisRepository(conn)
    count = 0
    for h in hypotheses:
        await repo.create(
            patient_id=h.patient_id,
            rule_id=h.rule_id,
            trigger_event_type=h.trigger_event_type,
            trigger_event_id=h.trigger_event_id,
            hypothesis_text=h.hypothesis_text,
            confidence=h.confidence,
            urgency=h.urgency,
            supporting_evidence=h.supporting_evidence,
        )
        count += 1
    return count
