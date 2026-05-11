from app.pipeline.layer2_normalize.types import NormalizedItem
from app.pipeline.layer3_enrich.rules.base import BaseRule
from app.pipeline.layer3_enrich.types import (
    URGENCY_WATCH,
    Hypothesis,
    PatientContext,
)
from app.models.observation import Observation

# Rule 5: Caregiver-Patient Symptom Discrepancy
#
# Fire when: caregiver reports a symptom
# AND recent patient self-report (voice_note_meera or direct) did NOT mention it
# AND patient has systematic minimization pattern (built-in for elderly patients
#     speaking to their children — not a diagnosis, an ingrained pattern).
#
# The discrepancy itself is data. System holds both. Never picks winner.
# "Dad said fine" + "caregiver said dizzy" = two different things are both true.

_SAME_SYMPTOM_WINDOW_DAYS = 3  # look for discrepancy within 3-day window


class Rule5CaregiverDiscrepancy(BaseRule):
    def evaluate(
        self,
        item: NormalizedItem,
        context: PatientContext,
    ) -> list[Hypothesis]:
        # Only fires on caregiver voice notes.
        if item.ingest.source_type != "voice_note_caregiver":
            return []

        caregiver_symptoms = set(
            s.lower() for s in (item.ingest.extracted_data.get("symptoms_reported") or [])
        )
        if not caregiver_symptoms:
            return []

        # Find recent patient self-reports (Meera's logs) within window.
        from datetime import timedelta
        event_date = item.ingest.event_time
        window_start = event_date - timedelta(days=_SAME_SYMPTOM_WINDOW_DAYS)

        meera_symptoms: set[str] = set()
        for obs in context.recent_observations:
            if obs.source_type not in ("meera_call_log",):
                continue
            if obs.observation_date < window_start:
                continue
            meera_symptoms.update(s.lower() for s in (obs.symptoms_reported or []))
            # symptoms_denied counts too — if Meera logged that Dad denied dizziness
            for s in (obs.symptoms_denied or []):
                meera_symptoms.add(s.lower() + "_denied")

        # Symptoms caregiver reported that patient/Meera did NOT mention.
        unreported = caregiver_symptoms - {s.replace("_denied", "") for s in meera_symptoms}
        if not unreported:
            return []

        return [Hypothesis(
            rule_id="rule_5_caregiver_patient_discrepancy",
            patient_id=context.patient_id,
            trigger_event_type=item.trigger_event_type,
            trigger_event_id=item.ingest.source_document_id,
            hypothesis_text=(
                f"Possible discrepancy: caregiver reported {', '.join(unreported)} "
                f"but this was not mentioned in recent updates from Dad or from you. "
                f"This is not necessarily a contradiction — Dad may not have mentioned it, "
                f"or may be downplaying. "
                f"Ask him directly: 'Papa, have you felt {list(unreported)[0]}?'"
            ),
            confidence="medium",
            urgency=URGENCY_WATCH,
            supporting_evidence=[
                {"caregiver_reported": list(caregiver_symptoms),
                 "not_in_patient_report": list(unreported)},
            ],
        )]
