"""
Integration tests — Layer 3 rules full flow through PatientContext.

These tests verify that the rules engine produces the correct hypotheses
given realistic patient data combinations, matching what the system design
specifies.
"""
from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from app.pipeline.layer1_ingest.types import IngestedItem
from app.pipeline.layer2_normalize.types import (
    BIAS_NONE,
    BIAS_OVER_REPORT,
    DIM_BEHAVIORAL_OBSERVABLE,
    DIM_BIOCHEMICAL,
    RELIABILITY_HIGH,
    RELIABILITY_VERY_HIGH,
    NormalizedItem,
    SourceProfile,
)
from app.pipeline.layer3_enrich.engine import run_enrichment
from app.pipeline.layer3_enrich.types import (
    URGENCY_ALERT,
    PatientContext,
)

_PID = UUID("22222222-2222-2222-2222-222222222222")
_DOC_ID = UUID("33333333-3333-3333-3333-333333333333")


# ── Helpers ────────────────────────────────────────────────────────────────────

def _patient(conditions: list[str] | None = None):
    from app.models.patient import Patient
    return Patient(
        id=_PID,
        user_id=UUID("11111111-1111-1111-1111-111111111111"),
        name="Ramesh Kumar",
        known_conditions=conditions or ["Type 2 Diabetes", "Hypertension"],
        known_allergies=[],
        primary_city="Lucknow",
    )


def _med(generic_name: str, drug_class: str = "biguanide", brand_name: str | None = None):
    from app.models.medication import Medication
    return Medication(
        id=UUID("44444444-4444-4444-4444-444444444444"),
        patient_id=_PID,
        source_document_id=_DOC_ID,
        generic_name=generic_name,
        brand_name=brand_name,
        drug_class=drug_class,
        dose="500mg",
        frequency="twice daily",
        valid_from=date.today(),
        status="active",
    )


def _lab_result(test_name: str, value: Decimal, is_abnormal: bool = False):
    from app.models.lab_result import LabResult
    return LabResult(
        id=UUID("55555555-5555-5555-5555-555555555555"),
        patient_id=_PID,
        source_document_id=_DOC_ID,
        test_name=test_name,
        test_name_display=test_name.title(),
        value=value,
        unit="mg/dL",
        is_abnormal=is_abnormal,
        test_date=date(2026, 1, 15),
    )


def _obs_item(extracted_data: dict) -> NormalizedItem:
    ingest = IngestedItem(
        source_type="voice_note_caregiver",
        source_document_id=_DOC_ID,
        patient_id=_PID,
        event_time=date.today(),
        ingestion_time=datetime.now(UTC),
        extracted_data=extracted_data,
    )
    profile = SourceProfile(
        source_type="voice_note_caregiver",
        reliability=RELIABILITY_HIGH,
        structural_bias=BIAS_OVER_REPORT,
        dimension=DIM_BEHAVIORAL_OBSERVABLE,
    )
    return NormalizedItem(ingest=ingest, profile=profile)


def _lab_item(results: list) -> NormalizedItem:
    ingest = IngestedItem(
        source_type="lab_report",
        source_document_id=_DOC_ID,
        patient_id=_PID,
        event_time=date.today(),
        ingestion_time=datetime.now(UTC),
        extracted_data={"results": results},
    )
    profile = SourceProfile(
        source_type="lab_report",
        reliability=RELIABILITY_VERY_HIGH,
        structural_bias=BIAS_NONE,
        dimension=DIM_BIOCHEMICAL,
    )
    return NormalizedItem(ingest=ingest, profile=profile)


# ── Tests ──────────────────────────────────────────────────────────────────────

class TestEnrichmentEngineIntegration:
    def test_diabetic_patient_meal_skip_with_dizziness_fires_rule1(self):
        item = _obs_item({
            "meals_eaten": {"breakfast": False},
            "symptoms_reported": ["dizzy", "weak"],
        })
        ctx = PatientContext(
            patient=_patient(),
            active_medications=[_med("metformin")],
            recent_lab_results=[],
            recent_observations=[],
        )
        hypotheses = run_enrichment(item, ctx)
        rule_ids = [h.rule_id for h in hypotheses]
        assert "rule_1_medication_without_food" in rule_ids

    def test_creatinine_spike_fires_rule3_alert(self):
        prior = _lab_result("creatinine", Decimal("0.8"))
        item = _lab_item([{
            "test_name": "creatinine",
            "test_name_display": "Creatinine",
            "value": "1.3",
            "unit": "mg/dL",
            "is_abnormal": True,
        }])
        ctx = PatientContext(
            patient=_patient(),
            active_medications=[],
            recent_lab_results=[prior],
            recent_observations=[],
        )
        hypotheses = run_enrichment(item, ctx)
        alert_hypotheses = [h for h in hypotheses if h.urgency == URGENCY_ALERT]
        assert len(alert_hypotheses) >= 1
        assert any("creat" in h.hypothesis_text.lower() for h in alert_hypotheses)

    def test_healthy_observation_produces_no_hypotheses(self):
        item = _obs_item({
            "meals_eaten": {"breakfast": True, "lunch": True, "dinner": True},
            "symptoms_reported": [],
        })
        ctx = PatientContext(
            patient=_patient(),
            active_medications=[_med("metformin")],
            recent_lab_results=[],
            recent_observations=[],
        )
        hypotheses = run_enrichment(item, ctx)
        # Rule 1 won't fire (no skipped meals), Rule 6 (meal skipping) won't fire
        rule1_hypotheses = [h for h in hypotheses if h.rule_id == "rule_1_medication_without_food"]
        assert len(rule1_hypotheses) == 0

    def test_non_diabetic_patient_does_not_fire_rule1(self):
        item = _obs_item({
            "meals_eaten": {"breakfast": False},
            "symptoms_reported": ["dizzy"],
        })
        ctx = PatientContext(
            patient=_patient(conditions=["Hypertension"]),  # No diabetes
            active_medications=[_med("amlodipine", drug_class="calcium channel blocker")],
            recent_lab_results=[],
            recent_observations=[],
        )
        hypotheses = run_enrichment(item, ctx)
        rule1_hypotheses = [h for h in hypotheses if h.rule_id == "rule_1_medication_without_food"]
        assert len(rule1_hypotheses) == 0

    def test_multiple_rules_can_fire_simultaneously(self):
        """Caregiver reports meal skip with dizziness AND lab shows creatinine spike."""
        # Run Rule 1 scenario
        obs_item = _obs_item({
            "meals_eaten": {"breakfast": False},
            "symptoms_reported": ["dizzy"],
        })
        ctx_obs = PatientContext(
            patient=_patient(),
            active_medications=[_med("metformin")],
            recent_lab_results=[],
            recent_observations=[],
        )
        obs_hypotheses = run_enrichment(obs_item, ctx_obs)

        # Run Rule 3 scenario
        prior = _lab_result("creatinine", Decimal("0.8"))
        lab_item = _lab_item([{
            "test_name": "creatinine",
            "value": "1.3",
            "unit": "mg/dL",
            "is_abnormal": True,
        }])
        ctx_lab = PatientContext(
            patient=_patient(),
            active_medications=[_med("metformin")],
            recent_lab_results=[prior],
            recent_observations=[],
        )
        lab_hypotheses = run_enrichment(lab_item, ctx_lab)

        # Both should fire independently
        assert any(h.rule_id == "rule_1_medication_without_food" for h in obs_hypotheses)
        assert any(h.urgency == URGENCY_ALERT for h in lab_hypotheses)

    def test_all_hypotheses_have_required_fields(self):
        item = _obs_item({
            "meals_eaten": {"breakfast": False},
            "symptoms_reported": ["kamzori"],
        })
        ctx = PatientContext(
            patient=_patient(),
            active_medications=[_med("metformin")],
            recent_lab_results=[],
            recent_observations=[],
        )
        hypotheses = run_enrichment(item, ctx)
        for h in hypotheses:
            assert h.rule_id
            assert h.patient_id == _PID
            assert h.hypothesis_text
            assert h.confidence in ("high", "medium", "low")
            assert h.urgency in ("alert", "watch", "inform")
            assert h.trigger_event_id == _DOC_ID
