.PHONY: install dev worker beat test test-unit test-api test-integration \
        lint format typecheck docker-build docker-up docker-down migrate

install:
	pip install -r requirements.txt

dev:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

worker:
	celery -A app.core.celery.celery_app worker --loglevel=info -Q default

beat:
	celery -A app.core.celery.celery_app beat --loglevel=info

flower:
	celery -A app.core.celery.celery_app flower --port=5555

test:
	pytest tests/ -v --tb=short

test-unit:
	pytest tests/unit/ -v

test-api:
	pytest tests/api/ -v

test-integration:
	pytest tests/integration/ -v

test-cov:
	pytest tests/ --cov=app --cov-report=term-missing --cov-report=html

lint:
	ruff check app/ tests/

format:
	ruff format app/ tests/

typecheck:
	mypy app/ --ignore-missing-imports

docker-build:
	docker build -t carecircle-api:local .

docker-up:
	docker compose -f docker/docker-compose.yml up -d

docker-down:
	docker compose -f docker/docker-compose.yml down

docker-logs:
	docker compose -f docker/docker-compose.yml logs -f api

migrate:
	supabase db push

seed:
	python scripts/seed_drug_lookup.py
