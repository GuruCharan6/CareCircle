from decimal import Decimal

from app.pipeline.layer2_normalize.types import NormalizedItem
from app.pipeline.layer3_enrich.rules.base import BaseRule
from app.pipeline.layer3_enrich.types import (
    URGENCY_ALERT,
    URGENCY_WATCH,
    Hypothesis,
    PatientContext,
)

# Rule 3: Lab Trend Deterioration
#
# Fire when: new lab report contains a result that has worsened significantly
# compared to the previous reading for the same test.
#
# Pattern > single value. One bad reading = noise. Directional worsening = signal.
#
# Thresholds (meaningful change, not just reference range crossing):
#   HbA1c:           >= 0.5 percentage point increase
#   Fasting glucose: >= 20 mg/dL increase AND is_abnormal = true
#   Creatinine:      >= 0.3 mg/dL increase (renal function alert)
#   All others:      reference range violation (is_abnormal = true) with prior normal

_MEANINGFUL_DELTA: dict[str, Decimal] = {
    "hba1c": Decimal("0.5"),
    "fasting_glucose": Decimal("20"),
    "glucose": Decimal("20"),
    "serum_creatinine": Decimal("0.3"),
    "creatinine": Decimal("0.3"),
}


def _exceeds_meaningful_threshold(test_name: str, delta: Decimal) -> bool:
    threshold = _MEANINGFUL_DELTA.get(test_name.lower())
    if threshold is None:
        return False
    return delta >= threshold


class Rule3LabTrend(BaseRule):
    def evaluate(
        self,
        item: NormalizedItem,
        context: PatientContext,
    ) -> list[Hypothesis]:
        if not item.ingest.is_lab_report:
            return []

        new_results = item.ingest.extracted_data.get("results") or []
        if not new_results:
            return []

        # Build lookup of prior lab results by test_name.
        prior_by_test: dict[str, list] = {}
        for lr in context.recent_lab_results:
            prior_by_test.setdefault(lr.test_name, []).append(lr)

        hypotheses = []
        for result in new_results:
            test_name = result.get("test_name", "")
            new_value = result.get("value")
            is_abnormal = result.get("is_abnormal")

            if new_value is None:
                continue

            new_val = Decimal(str(new_value))
            priors = prior_by_test.get(test_name, [])
            if not priors:
                continue

            # Use most recent prior reading.
            prior = sorted(priors, key=lambda r: r.test_date, reverse=True)[0]
            if prior.value is None:
                continue

            delta = new_val - prior.value
            if delta <= 0:
                continue  # improved or unchanged — no concern

            test_display = result.get("test_name_display", test_name)
            unit = result.get("unit", "")

            # Creatinine gets ALERT (renal function is time-sensitive).
            if "creatinine" in test_name.lower() and _exceeds_meaningful_threshold(test_name, delta):
                hypotheses.append(Hypothesis(
                    rule_id="rule_3_lab_trend",
                    patient_id=context.patient_id,
                    trigger_event_type=item.trigger_event_type,
                    trigger_event_id=item.ingest.source_document_id,
                    hypothesis_text=(
                        f"{test_display} has risen from {prior.value} to {new_val} {unit} "
                        f"(+{delta}). Creatinine increase of this size can indicate declining "
                        f"kidney function. Metformin dose may need review if creatinine stays elevated. "
                        f"Worth discussing with doctor before next appointment."
                    ),
                    confidence="high",
                    urgency=URGENCY_ALERT,
                    supporting_evidence=[
                        {"test": test_name, "prior": float(prior.value), "current": float(new_val),
                         "delta": float(delta), "prior_date": prior.test_date.isoformat()},
                    ],
                ))
            elif _exceeds_meaningful_threshold(test_name, delta) and is_abnormal:
                hypotheses.append(Hypothesis(
                    rule_id="rule_3_lab_trend",
                    patient_id=context.patient_id,
                    trigger_event_type=item.trigger_event_type,
                    trigger_event_id=item.ingest.source_document_id,
                    hypothesis_text=(
                        f"{test_display} trending up: {prior.value} → {new_val} {unit} "
                        f"(+{delta} since {prior.test_date}). "
                        f"This is a pattern, not just a single reading — worth tracking closely. "
                        f"Consider discussing at next appointment."
                    ),
                    confidence="medium",
                    urgency=URGENCY_WATCH,
                    supporting_evidence=[
                        {"test": test_name, "prior": float(prior.value), "current": float(new_val),
                         "delta": float(delta), "prior_date": prior.test_date.isoformat()},
                    ],
                ))

        return hypotheses
