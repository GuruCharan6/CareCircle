from fastapi import FastAPI

from app.api.internal import router as internal_router
from app.api.v1.router import router as v1_router


def include_routers(app: FastAPI) -> None:
    app.include_router(v1_router)
    app.include_router(internal_router)
