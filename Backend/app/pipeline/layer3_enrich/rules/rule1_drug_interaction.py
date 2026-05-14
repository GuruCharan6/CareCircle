from app.pipeline.layer2_normalize.types import NormalizedItem
from app.pipeline.layer3_enrich.rules.base import BaseRule
from app.pipeline.layer3_enrich.types import (
    URGENCY_ALERT,
    URGENCY_WATCH,
    Hypothesis,
    PatientContext,
)

# Rule 1: Drug Interaction (flag from known interaction data)
#
# Fire when: new prescription detected AND active medications include drugs
# with pre-stored interaction results (high or moderate severity).
#
# NOTE: The actual Gemini interaction check (DrugInteractionManager)
# runs in parallel after this pipeline. Rule 1 flags interactions already
# discovered for this patient — it does NOT call Gemini.
#
# If no stored interactions yet (first prescription upload), Rule 1 does not fire.
# The DrugInteractionManager will check and store results, future pipeline runs pick them up.


class Rule1DrugInteraction(BaseRule):
    def evaluate(
        self,
        item: NormalizedItem,
        context: PatientContext,
    ) -> list[Hypothesis]:
        if not item.ingest.is_prescription:
            return []

        if not context.active_medications or len(context.active_medications) < 2:
            return []

        known_interactions = context.known_interactions
        if not known_interactions:
            return []

        hypotheses = []
        for interaction in known_interactions:
            severity = interaction.get("severity")
            interaction_type = interaction.get("interaction")
            drug_a = interaction.get("drug_a", "")
            drug_b = interaction.get("drug_b", "")
            mechanism = interaction.get("mechanism", "")

            if interaction_type not in ("confirmed", "possible"):
                continue

            urgency = URGENCY_ALERT if (
                interaction_type == "confirmed" and severity == "high"
            ) else URGENCY_WATCH

            hypotheses.append(Hypothesis(
                rule_id="rule_1_drug_interaction",
                patient_id=context.patient_id,
                trigger_event_type=item.trigger_event_type,
                trigger_event_id=item.ingest.source_document_id,
                hypothesis_text=(
                    f"{'Confirmed' if interaction_type == 'confirmed' else 'Possible'} "
                    f"interaction between {drug_a} and {drug_b}. "
                    f"{mechanism + ' ' if mechanism else ''}"
                    f"Severity: {severity or 'unknown'}. "
                    f"Flagged by AI — confirm with prescribing doctor before next dose."
                ),
                confidence="high" if interaction_type == "confirmed" else "medium",
                urgency=urgency,
                supporting_evidence=[interaction],
            ))

        return hypotheses
