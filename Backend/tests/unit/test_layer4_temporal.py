"""Unit tests for Layer 4 conflict detection — Type A (temporal)."""
from datetime import date, datetime, timezone
from uuid import UUID

from app.pipeline.layer1_ingest.types import IngestedItem
from app.pipeline.layer2_normalize.types import (
    BIAS_NONE,
    DIM_BIOCHEMICAL,
    RELIABILITY_VERY_HIGH,
    NormalizedItem,
    SourceProfile,
)
from app.pipeline.layer4_reconcile.type_a_temporal import detect_temporal_conflicts
from app.pipeline.layer4_reconcile.types import CONFLICT_TYPE_A

_PID = UUID("22222222-2222-2222-2222-222222222222")
_DOC_ID = UUID("33333333-3333-3333-3333-333333333333")


def _make_lab_item(results: list) -> NormalizedItem:
    ingest = IngestedItem(
        source_type="lab_report",
        source_document_id=_DOC_ID,
        patient_id=_PID,
        event_time=date.today(),
        ingestion_time=datetime.now(timezone.utc),
        extracted_data={"results": results},
    )
    profile = SourceProfile(
        source_type="lab_report",
        reliability=RELIABILITY_VERY_HIGH,
        structural_bias=BIAS_NONE,
        dimension=DIM_BIOCHEMICAL,
    )
    return NormalizedItem(ingest=ingest, profile=profile)


class TestDetectTemporalConflicts:
    def test_duplicate_test_in_same_report_creates_conflict(self):
        item = _make_lab_item([
            {"test_name": "creatinine", "value": 0.9},
            {"test_name": "creatinine", "value": 1.1},  # duplicate
        ])
        conflicts = detect_temporal_conflicts(item, [])
        assert len(conflicts) == 1
        assert conflicts[0].conflict_type == CONFLICT_TYPE_A
        assert "creatinine" in conflicts[0].conflict_description
        assert conflicts[0].is_resolvable is True

    def test_no_duplicate_returns_no_conflict(self):
        item = _make_lab_item([
            {"test_name": "creatinine", "value": 0.9},
            {"test_name": "hba1c", "value": 6.5},
        ])
        conflicts = detect_temporal_conflicts(item, [])
        assert conflicts == []

    def test_non_lab_source_returns_empty(self):
        ingest = IngestedItem(
            source_type="voice_note_caregiver",
            source_document_id=_DOC_ID,
            patient_id=_PID,
            event_time=date.today(),
            ingestion_time=datetime.now(timezone.utc),
            extracted_data={},
        )
        profile = SourceProfile(
            source_type="voice_note_caregiver",
            reliability=RELIABILITY_VERY_HIGH,
            structural_bias=BIAS_NONE,
            dimension=DIM_BIOCHEMICAL,
        )
        item = NormalizedItem(ingest=ingest, profile=profile)
        conflicts = detect_temporal_conflicts(item, [])
        assert conflicts == []

    def test_single_result_returns_no_conflict(self):
        item = _make_lab_item([{"test_name": "glucose", "value": 140}])
        conflicts = detect_temporal_conflicts(item, [])
        assert conflicts == []

    def test_three_duplicates_creates_one_conflict(self):
        # Same test appearing 3x — conflict for that test (counted once)
        item = _make_lab_item([
            {"test_name": "glucose", "value": 140},
            {"test_name": "glucose", "value": 145},
            {"test_name": "glucose", "value": 150},
        ])
        conflicts = detect_temporal_conflicts(item, [])
        # Only one unique dup test_name
        assert len(conflicts) == 1
        assert "glucose" in conflicts[0].conflict_description

    def test_conflict_has_suggested_action(self):
        item = _make_lab_item([
            {"test_name": "hba1c", "value": 6.5},
            {"test_name": "hba1c", "value": 7.1},
        ])
        conflicts = detect_temporal_conflicts(item, [])
        assert len(conflicts) == 1
        assert conflicts[0].meera_suggested_action is not None
