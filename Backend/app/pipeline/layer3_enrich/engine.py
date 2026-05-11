from app.core.logging import get_logger
from app.pipeline.layer2_normalize.types import NormalizedItem
from app.pipeline.layer3_enrich.rules import ALL_RULES
from app.pipeline.layer3_enrich.types import Hypothesis, PatientContext

logger = get_logger(__name__)


def run_enrichment(
    item: NormalizedItem,
    context: PatientContext,
) -> list[Hypothesis]:
    """
    Run all deterministic rules against the normalized item + patient context.
    Rules are independent — all run regardless of prior rule results.
    Returns merged list of all hypotheses produced.
    No AI. No external calls. Pure deterministic logic.
    """
    all_hypotheses: list[Hypothesis] = []

    for rule in ALL_RULES:
        try:
            results = rule.evaluate(item, context)
            if results:
                logger.info(
                    "enrichment.rule_fired",
                    rule=rule.__class__.__name__,
                    patient_id=str(context.patient_id),
                    hypothesis_count=len(results),
                )
            all_hypotheses.extend(results)
        except Exception as exc:
            # Rule failure must not stop other rules or the pipeline.
            logger.error(
                "enrichment.rule_error",
                rule=rule.__class__.__name__,
                patient_id=str(context.patient_id),
                error=str(exc),
            )

    logger.info(
        "enrichment.complete",
        patient_id=str(context.patient_id),
        total_hypotheses=len(all_hypotheses),
    )
    return all_hypotheses
