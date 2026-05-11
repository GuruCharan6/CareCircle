from app.pipeline.layer2_normalize.types import NormalizedItem
from app.pipeline.layer3_enrich.rules.base import BaseRule
from app.pipeline.layer3_enrich.types import (
    URGENCY_WATCH,
    Hypothesis,
    PatientContext,
)

# Rule 4: New Medication After Cardiac Episode
#
# Fire when: new prescription adds a cardiac medication
# AND patient has documented cardiac history.
#
# Urgency: WATCH — new cardiac medication on a patient with cardiac history
# warrants interaction check against full medication list.

_CARDIAC_DRUG_CLASSES = {
    "ace inhibitor", "arb", "beta blocker", "calcium channel blocker",
    "antiplatelet", "anticoagulant", "statin", "nitrate", "cardiac glycoside",
    "diuretic", "antiarrhythmic",
}
_CARDIAC_GENERICS = {
    "amlodipine", "atenolol", "metoprolol", "bisoprolol", "carvedilol",
    "ramipril", "enalapril", "lisinopril", "losartan", "telmisartan", "valsartan",
    "aspirin", "clopidogrel", "warfarin", "apixaban", "rivaroxaban",
    "atorvastatin", "rosuvastatin", "simvastatin",
    "furosemide", "spironolactone", "hydrochlorothiazide",
    "nitroglycerin", "isosorbide", "digoxin", "amiodarone",
}


def _is_cardiac_medication(brand_name: str | None, generic_name: str | None, drug_class: str | None) -> bool:
    if drug_class and drug_class.lower() in _CARDIAC_DRUG_CLASSES:
        return True
    if generic_name and generic_name.lower() in _CARDIAC_GENERICS:
        return True
    return False


class Rule4NewCardiacMed(BaseRule):
    def evaluate(
        self,
        item: NormalizedItem,
        context: PatientContext,
    ) -> list[Hypothesis]:
        if not item.ingest.is_prescription:
            return []

        if not context.has_cardiac_history:
            return []

        new_medications = item.ingest.extracted_data.get("medications") or []
        cardiac_meds_added = [
            m for m in new_medications
            if _is_cardiac_medication(
                m.get("brand_name"),
                m.get("generic_name") or m.get("brand_name"),
                m.get("drug_class"),
            )
        ]

        if not cardiac_meds_added:
            return []

        med_names = ", ".join(
            m.get("brand_name") or m.get("generic_name", "unknown")
            for m in cardiac_meds_added
        )
        existing_count = len(context.active_medications)

        return [Hypothesis(
            rule_id="rule_4_new_cardiac_med",
            patient_id=context.patient_id,
            trigger_event_type=item.trigger_event_type,
            trigger_event_id=item.ingest.source_document_id,
            hypothesis_text=(
                f"New cardiac medication added: {med_names}. "
                f"Patient has documented cardiac history and is currently on "
                f"{existing_count} active medication(s). "
                f"Running interaction check against full medication list. "
                f"You'll be notified if any concern is found."
            ),
            confidence="high",
            urgency=URGENCY_WATCH,
            supporting_evidence=[
                {"new_cardiac_meds": cardiac_meds_added,
                 "existing_med_count": existing_count},
            ],
        )]
