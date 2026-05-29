"""Unit tests for app/cache/keys.py — key format + normalization."""
from uuid import UUID

from app.cache.keys import (
    CRISIS_PACKET_TTL,
    DRUG_INTERACTION_TTL,
    MEDICATION_LIST_TTL,
    PATIENT_STATE_TTL,
    crisis_packet_key,
    drug_interaction_key,
    medication_list_key,
    patient_state_key,
)

_PID = UUID("22222222-2222-2222-2222-222222222222")


class TestPatientStateKey:
    def test_format(self):
        key = patient_state_key(_PID)
        assert key == f"cc:patient_state:{_PID}"

    def test_different_patients_give_different_keys(self):
        pid2 = UUID("33333333-3333-3333-3333-333333333333")
        assert patient_state_key(_PID) != patient_state_key(pid2)

    def test_ttl_is_300(self):
        assert PATIENT_STATE_TTL == 300


class TestCrisisPacketKey:
    def test_format(self):
        key = crisis_packet_key(_PID)
        assert key == f"cc:crisis_packet:{_PID}"

    def test_ttl_is_one_hour(self):
        assert CRISIS_PACKET_TTL == 3600


class TestDrugInteractionKey:
    def test_format(self):
        key = drug_interaction_key("Metformin", "Aspirin")
        assert key.startswith("cc:drug_ix:")

    def test_order_independent(self):
        key1 = drug_interaction_key("Metformin", "Aspirin")
        key2 = drug_interaction_key("Aspirin", "Metformin")
        assert key1 == key2

    def test_case_insensitive(self):
        key1 = drug_interaction_key("METFORMIN", "aspirin")
        key2 = drug_interaction_key("metformin", "ASPIRIN")
        assert key1 == key2

    def test_strips_whitespace(self):
        key1 = drug_interaction_key("  Metformin  ", " Aspirin ")
        key2 = drug_interaction_key("metformin", "aspirin")
        assert key1 == key2

    def test_ttl_is_30_days(self):
        assert DRUG_INTERACTION_TTL == 30 * 24 * 3600


class TestMedicationListKey:
    def test_format(self):
        key = medication_list_key(_PID)
        assert key == f"cc:med_list:{_PID}"

    def test_ttl_is_10_minutes(self):
        assert MEDICATION_LIST_TTL == 600
