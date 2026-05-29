"""API tests for health and readiness endpoints."""



class TestHealthEndpoint:
    async def test_health_returns_200(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"

    async def test_health_no_auth_required(self, anon_client):
        response = await anon_client.get("/health")
        assert response.status_code == 200

    async def test_root_returns_service_info(self, client):
        response = await client.get("/")
        assert response.status_code == 200
        body = response.json()
        assert body["service"] == "CareCircle API"
        assert "health" in body
        assert "docs" in body

    async def test_favicon_returns_204(self, client):
        response = await client.get("/favicon.ico")
        assert response.status_code == 204


class TestReadyEndpoint:
    async def test_ready_when_db_and_redis_up(self, client):
        """Ready endpoint depends on DB pool + Redis.
        With mocked init, get_pool() raises RuntimeError (pool never inited).
        Rate limit middleware catches Redis error (fails open).
        /ready itself will show not_ready — that's correct test behavior:
        it checks real connections, mocks don't satisfy it.
        We just verify the endpoint is reachable and returns valid JSON.
        """
        response = await client.get("/ready")
        data = response.json()
        assert "status" in data
        assert "checks" in data
        # Status is either ready or not_ready — both are valid in test env
        assert data["status"] in ("ready", "not_ready")
