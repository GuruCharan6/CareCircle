"""Unit tests for app/pipeline/layer2_normalize/dimension_tagger.py."""
from datetime import date, datetime, timezone
from uuid import UUID

from app.pipeline.layer1_ingest.types import IngestedItem
from app.pipeline.layer2_normalize.dimension_tagger import refine_dimension
from app.pipeline.layer2_normalize.types import (
    DIM_BEHAVIORAL_OBSERVABLE,
    DIM_BIOCHEMICAL,
    DIM_CLINICAL_INSTRUCTION,
    DIM_SUBJECTIVE_EXPERIENCE,
    SourceProfile,
)

_PID = UUID("22222222-2222-2222-2222-222222222222")
_DOC_ID = UUID("33333333-3333-3333-3333-333333333333")


def _make_item(source_type: str) -> IngestedItem:
    return IngestedItem(
        source_type=source_type,
        source_document_id=_DOC_ID,
        patient_id=_PID,
        event_time=date.today(),
        ingestion_time=datetime.now(timezone.utc),
        extracted_data={},
    )


def _make_profile(source_type: str, dimension: str = DIM_BEHAVIORAL_OBSERVABLE) -> SourceProfile:
    return SourceProfile(
        source_type=source_type,
        reliability="high",
        structural_bias="none",
        dimension=dimension,
    )


class TestRefineDimension:
    def test_lab_report_is_biochemical(self):
        item = _make_item("lab_report")
        profile = _make_profile("lab_report")
        assert refine_dimension(item, profile) == DIM_BIOCHEMICAL

    def test_prescription_is_clinical_instruction(self):
        item = _make_item("prescription")
        profile = _make_profile("prescription")
        assert refine_dimension(item, profile) == DIM_CLINICAL_INSTRUCTION

    def test_doctor_note_is_clinical_instruction(self):
        item = _make_item("doctor_note")
        profile = _make_profile("doctor_note")
        assert refine_dimension(item, profile) == DIM_CLINICAL_INSTRUCTION

    def test_handwritten_note_is_clinical_instruction(self):
        item = _make_item("handwritten_note")
        profile = _make_profile("handwritten_note")
        assert refine_dimension(item, profile) == DIM_CLINICAL_INSTRUCTION

    def test_caregiver_voice_is_behavioral_observable(self):
        item = _make_item("voice_note_caregiver")
        profile = _make_profile("voice_note_caregiver")
        assert refine_dimension(item, profile) == DIM_BEHAVIORAL_OBSERVABLE

    def test_meera_voice_is_subjective_experience(self):
        item = _make_item("voice_note_meera")
        profile = _make_profile("voice_note_meera")
        assert refine_dimension(item, profile) == DIM_SUBJECTIVE_EXPERIENCE

    def test_unknown_source_falls_back_to_profile_dimension(self):
        item = _make_item("unknown_source")
        profile = _make_profile("unknown_source", dimension=DIM_BEHAVIORAL_OBSERVABLE)
        assert refine_dimension(item, profile) == DIM_BEHAVIORAL_OBSERVABLE
