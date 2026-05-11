from app.pipeline.layer2_normalize.types import NormalizedItem
from app.pipeline.layer3_enrich.rules.base import BaseRule
from app.pipeline.layer3_enrich.types import (
    URGENCY_WATCH,
    Hypothesis,
    PatientContext,
)

# Rule 1: Medication Without Food
#
# Fire when:
#   patient is on diabetes medication
#   AND this observation shows a meal was skipped
#   AND dizziness or weakness was reported
#
# Urgency: WATCH — pattern may indicate medication-induced hypoglycemia.


_DIZZINESS_TERMS = {
    "dizzy", "dizziness", "ghabraaya", "ghabraana", "lightheaded",
    "faint", "vertigo", "fainting",
}
_WEAKNESS_TERMS = {
    "weak", "weakness", "kamzori", "tired", "fatigue", "shaky", "trembling",
}


class Rule1MedWithoutFood(BaseRule):
    def evaluate(
        self,
        item: NormalizedItem,
        context: PatientContext,
    ) -> list[Hypothesis]:
        if not item.ingest.is_observation_source:
            return []

        diabetes_meds = context.diabetes_medications
        if not diabetes_meds:
            return []

        data = item.ingest.extracted_data
        meals = data.get("meals_eaten") or {}

        meal_skipped = any(
            meals.get(meal) is False
            for meal in ("breakfast", "lunch", "dinner")
        )
        if not meal_skipped:
            return []

        symptoms = set(s.lower() for s in (data.get("symptoms_reported") or []))
        has_dizziness_or_weakness = bool(
            symptoms & _DIZZINESS_TERMS or symptoms & _WEAKNESS_TERMS
        )
        if not has_dizziness_or_weakness:
            return []

        skipped_meals = [m for m in ("breakfast", "lunch", "dinner") if meals.get(m) is False]
        med_names = ", ".join(m.brand_name or m.generic_name for m in diabetes_meds)
        symptom_found = ", ".join(symptoms & (_DIZZINESS_TERMS | _WEAKNESS_TERMS))

        return [Hypothesis(
            rule_id="rule_1_medication_without_food",
            patient_id=context.patient_id,
            trigger_event_type=item.trigger_event_type,
            trigger_event_id=item.ingest.source_document_id,
            hypothesis_text=(
                f"Possible medication-related symptom: {symptom_found} reported "
                f"on a day when {', '.join(skipped_meals)} was skipped. "
                f"Diabetes medications ({med_names}) must be taken with food — "
                f"skipping meals while on these medications can cause low blood sugar. "
                f"Worth asking whether the dose was taken before or after eating."
            ),
            confidence="medium",
            urgency=URGENCY_WATCH,
            supporting_evidence=[
                {"skipped_meals": skipped_meals, "symptoms": list(symptoms & (_DIZZINESS_TERMS | _WEAKNESS_TERMS))},
            ],
        )]
