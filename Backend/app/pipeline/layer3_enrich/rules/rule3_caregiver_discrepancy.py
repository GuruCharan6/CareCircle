from datetime import timedelta

from app.pipeline.layer2_normalize.types import NormalizedItem
from app.pipeline.layer3_enrich.rules.base import BaseRule
from app.pipeline.layer3_enrich.types import (
    URGENCY_WATCH,
    Hypothesis,
    PatientContext,
)

# Rule 3: Caregiver-Patient Symptom Discrepancy
#
# Fire when: caregiver reports a symptom
# AND recent patient self-report (meera_call_log or direct) did NOT mention it.
#
# The discrepancy itself is data. System holds both. Never picks winner.
# "Patient said fine" + "caregiver said dizzy" = two different things, both true.

_SAME_SYMPTOM_WINDOW_DAYS = 3


class Rule3CaregiverDiscrepancy(BaseRule):
    def evaluate(
        self,
        item: NormalizedItem,
        context: PatientContext,
    ) -> list[Hypothesis]:
        if item.ingest.source_type != "voice_note_caregiver":
            return []

        extracted = item.ingest.extracted_data or {}
        caregiver_symptoms = set(
            s.lower() for s in (extracted.get("symptoms_reported") or [])
        )
        if not caregiver_symptoms:
            return []

        event_date = item.ingest.event_time
        if event_date is None:
            return []
        window_start = event_date - timedelta(days=_SAME_SYMPTOM_WINDOW_DAYS)

        meera_symptoms: set[str] = set()
        for obs in context.recent_observations:
            # obs.source_type is normalized on read: meera_call_log → voice_log
            if obs.source_type not in ("voice_log", "meera_call_log", "voice_note_meera"):
                continue
            if obs.observation_date < window_start:
                continue
            meera_symptoms.update(s.lower() for s in (obs.symptoms_reported or []))
            for s in (obs.symptoms_denied or []):
                meera_symptoms.add(s.lower() + "_denied")

        unreported = caregiver_symptoms - {s.replace("_denied", "") for s in meera_symptoms}
        if not unreported:
            return []

        patient_name = context.patient.name or "the patient"

        return [Hypothesis(
            rule_id="rule_3_caregiver_discrepancy",
            patient_id=context.patient_id,
            trigger_event_type=item.trigger_event_type,
            trigger_event_id=item.ingest.source_document_id,
            hypothesis_text=(
                f"Possible discrepancy: caregiver reported {', '.join(unreported)} "
                f"for {patient_name}, but this was not mentioned in recent updates. "
                f"This is not necessarily a contradiction — {patient_name} may not have mentioned it "
                f"or may be downplaying. "
                f"Ask directly: 'Have you felt {list(unreported)[0]} recently?'"
            ),
            confidence="medium",
            urgency=URGENCY_WATCH,
            supporting_evidence=[
                {"caregiver_reported": list(caregiver_symptoms),
                 "not_in_patient_report": list(unreported)},
            ],
        )]
