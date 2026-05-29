from contextlib import asynccontextmanager
from typing import AsyncGenerator

import sentry_sdk
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration

from app.config import settings
from app.core.database import close_db, init_db
from app.core.logging import logger, setup_logging
from app.core.redis import close_redis, init_redis
from app.middleware.auth import AuthExtractionMiddleware
from app.middleware.error_handler import ErrorHandlerMiddleware
from app.middleware.logging import LoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.request_id import RequestIDMiddleware
from app.monitoring.health import router as health_router
from app.monitoring.metrics import MetricsMiddleware, metrics_app


def _init_sentry() -> None:
    """Initialize Sentry if DSN configured. No-op in dev/test."""
    if not settings.sentry_dsn:
        return
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        send_default_pii=False,      # never send patient data to Sentry
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
            AsyncioIntegration(),
        ],
        # Ignore expected operational errors — only track real bugs
        ignore_errors=[],
    )
    logger.info("sentry.initialized", environment=settings.environment)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    setup_logging(debug=settings.debug)
    logger.info("startup", environment=settings.environment)

    await init_db()
    await init_redis()

    yield

    await close_db()
    await close_redis()
    logger.info("shutdown")


def create_app() -> FastAPI:
    _init_sentry()

    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        lifespan=lifespan,
    )

    # Middleware — order matters: outermost added last (LIFO execution)
    # Execution order on request: ErrorHandler → RequestID → Auth → RateLimit → Logging → Metrics → handler
    app.add_middleware(MetricsMiddleware)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(AuthExtractionMiddleware)
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(ErrorHandlerMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Root — quick sanity check for browser / curl
    @app.get("/", include_in_schema=False)
    async def root() -> dict:
        return {
            "service": "CareCircle API",
            "version": "1.0.0",
            "status": "ok",
            "docs": "/docs",
            "health": "/health",
            "ready": "/ready",
        }

    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon() -> Response:
        return Response(status_code=204)

    # Routers
    app.include_router(health_router)

    from app.api.router import include_routers
    include_routers(app)

    # Prometheus metrics — separate ASGI app at /metrics
    app.mount("/metrics", metrics_app)

    return app


app = create_app()
