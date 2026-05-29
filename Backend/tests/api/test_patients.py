"""API tests for /api/v1/patients — CRUD."""
import pytest

from tests.conftest import (
    TEST_PATIENT_ID,
    TEST_USER_ID,
    make_jwt,
    make_patient_record,
)


class TestListPatients:
    async def test_returns_empty_list_when_no_patients(self, client):
        response = await client.get("/api/v1/patients")
        assert response.status_code == 200
        assert response.json() == []

    async def test_returns_patients_when_records_exist(self, client, mock_conn):
        mock_conn.fetch.return_value = [make_patient_record()]
        response = await client.get("/api/v1/patients")
        assert response.status_code == 200
        patients = response.json()
        assert len(patients) == 1
        assert patients[0]["name"] == "Ramesh Kumar"
        assert patients[0]["user_id"] == str(TEST_USER_ID)

    async def test_requires_auth(self, anon_client):
        response = await anon_client.get("/api/v1/patients")
        assert response.status_code == 401


class TestCreatePatient:
    async def test_creates_patient_returns_201(self, client, mock_conn):
        mock_conn.fetchrow.return_value = make_patient_record(name="New Patient")
        payload = {
            "name": "New Patient",
            "gender": "male",
            "known_conditions": ["hypertension"],
        }
        response = await client.post("/api/v1/patients", json=payload)
        assert response.status_code == 201
        body = response.json()
        assert body["name"] == "New Patient"
        assert body["user_id"] == str(TEST_USER_ID)

    async def test_requires_auth(self, anon_client):
        response = await anon_client.post("/api/v1/patients", json={"name": "Test"})
        assert response.status_code == 401

    async def test_validation_error_on_missing_name(self, client):
        response = await client.post("/api/v1/patients", json={})
        assert response.status_code == 422


class TestGetPatient:
    async def test_returns_patient_by_id(self, client, mock_conn):
        mock_conn.fetchrow.return_value = make_patient_record()
        response = await client.get(f"/api/v1/patients/{TEST_PATIENT_ID}")
        assert response.status_code == 200
        assert response.json()["id"] == str(TEST_PATIENT_ID)

    async def test_returns_404_when_not_found(self, client, mock_conn):
        mock_conn.fetchrow.return_value = None
        response = await client.get(f"/api/v1/patients/{TEST_PATIENT_ID}")
        assert response.status_code == 404

    async def test_returns_403_when_different_owner(self, client, mock_conn):
        from uuid import uuid4
        other_user_id = uuid4()
        record = make_patient_record(user_id=other_user_id)
        mock_conn.fetchrow.return_value = record
        response = await client.get(f"/api/v1/patients/{TEST_PATIENT_ID}")
        assert response.status_code == 403

    async def test_requires_auth(self, anon_client):
        response = await anon_client.get(f"/api/v1/patients/{TEST_PATIENT_ID}")
        assert response.status_code == 401


class TestUpdatePatient:
    async def test_updates_patient(self, client, mock_conn):
        mock_conn.fetchrow.side_effect = [
            make_patient_record(),  # get (ownership check)
            make_patient_record(name="Updated Name"),  # update RETURNING
        ]
        response = await client.put(
            f"/api/v1/patients/{TEST_PATIENT_ID}",
            json={"name": "Updated Name"},
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"

    async def test_requires_auth(self, anon_client):
        response = await anon_client.put(
            f"/api/v1/patients/{TEST_PATIENT_ID}",
            json={"name": "X"},
        )
        assert response.status_code == 401


class TestDeletePatient:
    async def test_deletes_patient(self, client, mock_conn):
        mock_conn.fetchrow.return_value = make_patient_record()  # ownership check
        mock_conn.execute.return_value = "DELETE 1"
        response = await client.delete(f"/api/v1/patients/{TEST_PATIENT_ID}")
        assert response.status_code == 200
        assert "deleted" in response.json()["message"].lower()

    async def test_requires_auth(self, anon_client):
        response = await anon_client.delete(f"/api/v1/patients/{TEST_PATIENT_ID}")
        assert response.status_code == 401
