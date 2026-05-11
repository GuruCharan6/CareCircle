from datetime import timedelta

from app.pipeline.layer2_normalize.types import NormalizedItem
from app.pipeline.layer3_enrich.rules.base import BaseRule
from app.pipeline.layer3_enrich.types import (
    URGENCY_WATCH,
    Hypothesis,
    PatientContext,
)

# Rule 6: Meal Skipping Pattern
#
# Fire when: breakfast has been skipped >= 3 times in rolling 7-day window.
# Single skip = noise. Pattern = signal affecting medication effectiveness.
#
# Applies only when: patient is on medications that require food timing.

_SKIP_THRESHOLD = 3
_WINDOW_DAYS = 7


class Rule6MealSkipping(BaseRule):
    def evaluate(
        self,
        item: NormalizedItem,
        context: PatientContext,
    ) -> list[Hypothesis]:
        if not item.ingest.is_observation_source:
            return []

        if not context.diabetes_medications:
            return []

        event_date = item.ingest.event_time
        window_start = event_date - timedelta(days=_WINDOW_DAYS)

        # Count breakfast skips in recent observations within the window.
        breakfast_skips = 0
        skip_dates = []

        for obs in context.recent_observations:
            if obs.observation_date < window_start:
                continue
            meals = obs.meals_eaten or {}
            if meals.get("breakfast") is False:
                breakfast_skips += 1
                skip_dates.append(obs.observation_date.isoformat())

        # Count current item too.
        current_meals = item.ingest.extracted_data.get("meals_eaten") or {}
        if current_meals.get("breakfast") is False:
            breakfast_skips += 1
            skip_dates.append(event_date.isoformat())

        if breakfast_skips < _SKIP_THRESHOLD:
            return []

        med_names = ", ".join(
            m.brand_name or m.generic_name for m in context.diabetes_medications
        )

        return [Hypothesis(
            rule_id="rule_6_meal_skipping_pattern",
            patient_id=context.patient_id,
            trigger_event_type=item.trigger_event_type,
            trigger_event_id=item.ingest.source_document_id,
            hypothesis_text=(
                f"Breakfast skipped {breakfast_skips} times in the last 7 days "
                f"({', '.join(skip_dates[:3])}{'...' if len(skip_dates) > 3 else ''}). "
                f"This is a pattern, not a one-off. "
                f"{med_names} effectiveness depends on consistent meal timing. "
                f"Skipping breakfast while on diabetes medication increases risk of blood sugar dips. "
                f"Worth raising with caregiver and asking Dad why breakfast is being skipped."
            ),
            confidence="high",
            urgency=URGENCY_WATCH,
            supporting_evidence=[
                {"breakfast_skips_in_7_days": breakfast_skips, "skip_dates": skip_dates},
            ],
        )]
