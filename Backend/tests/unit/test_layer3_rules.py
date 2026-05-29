"""Unit tests for Layer 3 enrichment rules (Rules 1 & 3)."""
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

import pytest

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
from app.pipeline.layer3_enrich.types import (
    URGENCY_ALERT,
    URGENCY_WATCH,
    PatientContext,
)

_PID = UUID("22222222-2222-2222-2222-222222222222")
_DOC_ID = UUID("33333333-3333-3333-3333-333333333333")


def _make_patient(conditions: list[str] | None = None):
    from app.models.patient import Patient
    return Patient(
        id=_PID,
        user_id=UUID("11111111-1111-1111-1111-111111111111"),
        name="Ramesh",
        known_conditions=conditions or ["Type 2 Diabetes"],
        known_allergies=[],
    )


def _make_medication(generic_name: str, drug_class: str = "biguanide"):
    from app.models.medication import Medication
    return Medication(
        id=UUID("44444444-4444-4444-4444-444444444444"),
        patient_id=_PID,
        source_document_id=_DOC_ID,
        generic_name=generic_name,
        drug_class=drug_class,
        dose="500mg",
        frequency="twice daily",
        valid_from=date.today(),
        status="active",
    )


def _make_observation_item(extracted_data: dict, source_type: str = "voice_note_caregiver") -> NormalizedItem:
    ingest = IngestedItem(
        source_type=source_type,
        source_document_id=_DOC_ID,
        patient_id=_PID,
        event_time=date.today(),
        ingestion_time=datetime.now(timezone.utc),
        extracted_data=extracted_data,
    )
    profile = SourceProfile(
        source_type=source_type,
        reliability=RELIABILITY_HIGH,
        structural_bias=BIAS_OVER_REPORT,
        dimension=DIM_BEHAVIORAL_OBSERVABLE,
    )
    return NormalizedItem(ingest=ingest, profile=profile)


def _make_lab_item(extracted_data: dict) -> NormalizedItem:
    ingest = IngestedItem(
        source_type="lab_report",
        source_document_id=_DOC_ID,
        patient_id=_PID,
        event_time=date.today(),
        ingestion_time=datetime.now(timezone.utc),
        extracted_data=extracted_data,
    )
    profile = SourceProfile(
        source_type="lab_report",
        reliability=RELIABILITY_VERY_HIGH,
        structural_bias=BIAS_NONE,
        dimension=DIM_BIOCHEMICAL,
    )
    return NormalizedItem(ingest=ingest, profile=profile)


def _make_context(
    active_medications=None,
    recent_lab_results=None,
    recent_observations=None,
    conditions=None,
):
    return PatientContext(
        patient=_make_patient(conditions),
        active_medications=active_medications or [],
        recent_lab_results=recent_lab_results or [],
        recent_observations=recent_observations or [],
    )


# ──────────────────────────────────────────────────────────────���──────────────
# Rule 1: Medication Without Food
# ─────────────────────────────────────────────────────────────────────────────

class TestRule1MedWithoutFood:
    def _rule(self):
        from app.pipeline.layer3_enrich.rules.rule1_med_without_food import Rule1MedWithoutFood
        return Rule1MedWithoutFood()

    def test_fires_when_meal_skipped_and_symptom_present(self):
        rule = self._rule()
        item = _make_observation_item({
            "meals_eaten": {"breakfast": False, "lunch": True, "dinner": True},
            "symptoms_reported": ["dizzy", "tired"],
        })
        ctx = _make_context(active_medications=[_make_medication("metformin")])
        hypotheses = rule.evaluate(item, ctx)
        assert len(hypotheses) == 1
        assert hypotheses[0].urgency == URGENCY_WATCH
        assert hypotheses[0].rule_id == "rule_1_medication_without_food"

    def test_fires_with_hindi_symptom(self):
        rule = self._rule()
        item = _make_observation_item({
            "meals_eaten": {"breakfast": False},
            "symptoms_reported": ["ghabraaya"],
        })
        ctx = _make_context(active_medications=[_make_medication("metformin")])
        hypotheses = rule.evaluate(item, ctx)
        assert len(hypotheses) == 1

    def test_does_not_fire_when_all_meals_eaten(self):
        rule = self._rule()
        item = _make_observation_item({
            "meals_eaten": {"breakfast": True, "lunch": True, "dinner": True},
            "symptoms_reported": ["dizzy"],
        })
        ctx = _make_context(active_medications=[_make_medication("metformin")])
        hypotheses = rule.evaluate(item, ctx)
        assert hypotheses == []

    def test_does_not_fire_without_relevant_symptoms(self):
        rule = self._rule()
        item = _make_observation_item({
            "meals_eaten": {"breakfast": False},
            "symptoms_reported": ["headache"],
        })
        ctx = _make_context(active_medications=[_make_medication("metformin")])
        hypotheses = rule.evaluate(item, ctx)
        assert hypotheses == []

    def test_does_not_fire_without_diabetes_medications(self):
        rule = self._rule()
        item = _make_observation_item({
            "meals_eaten": {"breakfast": False},
            "symptoms_reported": ["dizzy"],
        })
        ctx = _make_context(active_medications=[
            _make_medication("atorvastatin", drug_class="statin")
        ])
        hypotheses = rule.evaluate(item, ctx)
        assert hypotheses == []

    def test_does_not_fire_for_lab_report_source(self):
        rule = self._rule()
        item = _make_lab_item({"results": []})
        ctx = _make_context(active_medications=[_make_medication("metformin")])
        hypotheses = rule.evaluate(item, ctx)
        assert hypotheses == []

    def test_supporting_evidence_contains_skipped_meals(self):
        rule = self._rule()
        item = _make_observation_item({
            "meals_eaten": {"breakfast": False, "lunch": False, "dinner": True},
            "symptoms_reported": ["weak"],
        })
        ctx = _make_context(active_medications=[_make_medication("metformin")])
        hypotheses = rule.evaluate(item, ctx)
        assert len(hypotheses) == 1
        evidence = hypotheses[0].supporting_evidence[0]
        assert "breakfast" in evidence["skipped_meals"]
        assert "lunch" in evidence["skipped_meals"]
        assert "dinner" not in evidence["skipped_meals"]


# ─────────────────────────────────────────────────────────────────────────────
# Rule 3: Lab Trend
# ─────────────────────────────────────────────────────────────────────────────

class TestRule3LabTrend:
    def _rule(self):
        from app.pipeline.layer3_enrich.rules.rule3_lab_trend import Rule3LabTrend
        return Rule3LabTrend()

    def _make_lab_result(self, test_name: str, value: Decimal, test_date=None):
        from app.models.lab_result import LabResult
        return LabResult(
            id=UUID("55555555-5555-5555-5555-555555555555"),
            patient_id=_PID,
            source_document_id=_DOC_ID,
            test_name=test_name,
            test_name_display=test_name.replace("_", " ").title(),
            value=value,
            unit="mg/dL",
            test_date=test_date or date(2026, 1, 1),
        )

    def test_creatinine_rise_fires_alert(self):
        rule = self._rule()
        prior = self._make_lab_result("creatinine", Decimal("0.8"), date(2026, 1, 1))
        item = _make_lab_item({
            "results": [{
                "test_name": "creatinine",
                "test_name_display": "Creatinine",
                "value": "1.2",
                "unit": "mg/dL",
                "is_abnormal": True,
            }]
        })
        ctx = _make_context(recent_lab_results=[prior])
        hypotheses = rule.evaluate(item, ctx)
        assert len(hypotheses) == 1
        assert hypotheses[0].urgency == URGENCY_ALERT
        assert "creat" in hypotheses[0].hypothesis_text.lower()

    def test_hba1c_rise_fires_watch(self):
        rule = self._rule()
        prior = self._make_lab_result("hba1c", Decimal("6.5"), date(2026, 1, 1))
        item = _make_lab_item({
            "results": [{
                "test_name": "hba1c",
                "test_name_display": "HbA1c",
                "value": "7.2",
                "unit": "%",
                "is_abnormal": True,
            }]
        })
        ctx = _make_context(recent_lab_results=[prior])
        hypotheses = rule.evaluate(item, ctx)
        assert len(hypotheses) == 1
        assert hypotheses[0].urgency == URGENCY_WATCH

    def test_improvement_does_not_fire(self):
        rule = self._rule()
        prior = self._make_lab_result("creatinine", Decimal("1.2"), date(2026, 1, 1))
        item = _make_lab_item({
            "results": [{
                "test_name": "creatinine",
                "value": "0.9",
                "unit": "mg/dL",
                "is_abnormal": False,
            }]
        })
        ctx = _make_context(recent_lab_results=[prior])
        hypotheses = rule.evaluate(item, ctx)
        assert hypotheses == []

    def test_no_prior_reading_does_not_fire(self):
        rule = self._rule()
        item = _make_lab_item({
            "results": [{
                "test_name": "creatinine",
                "value": "1.5",
                "unit": "mg/dL",
                "is_abnormal": True,
            }]
        })
        ctx = _make_context(recent_lab_results=[])
        hypotheses = rule.evaluate(item, ctx)
        assert hypotheses == []

    def test_non_lab_source_returns_empty(self):
        rule = self._rule()
        item = _make_observation_item({"symptoms_reported": ["tired"]})
        ctx = _make_context()
        hypotheses = rule.evaluate(item, ctx)
        assert hypotheses == []

    def test_below_meaningful_threshold_does_not_fire(self):
        rule = self._rule()
        # HbA1c went from 6.5 to 6.8 — delta 0.3 < threshold 0.5
        prior = self._make_lab_result("hba1c", Decimal("6.5"), date(2026, 1, 1))
        item = _make_lab_item({
            "results": [{
                "test_name": "hba1c",
                "value": "6.8",
                "unit": "%",
                "is_abnormal": True,
            }]
        })
        ctx = _make_context(recent_lab_results=[prior])
        hypotheses = rule.evaluate(item, ctx)
        assert hypotheses == []
