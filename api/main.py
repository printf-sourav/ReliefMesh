import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from api.routes import router
from database.db import init_db
from utils.schemas import AppError


def error_response(status: int, code: str, message: str, details=None):
    return JSONResponse(status_code=status, content={"error": {
        "code": code, "message": message, "details": details or {},
    }})


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="ReliefMesh API", version="0.1.0", lifespan=lifespan)
    origins = os.getenv("RELIEFMESH_ALLOWED_ORIGINS",
                        "http://localhost:5173,http://127.0.0.1:5173,http://localhost,https://localhost,capacitor://localhost")
    app.add_middleware(CORSMiddleware, allow_origins=[origin.strip() for origin in origins.split(",") if origin.strip()],
                       allow_credentials=False, allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
                       allow_headers=["Content-Type"])

    @app.exception_handler(AppError)
    async def service_error(request: Request, exc: AppError):
        return error_response(exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(RequestValidationError)
    async def request_error(request: Request, exc: RequestValidationError):
        fields = [{"field": ".".join(map(str, error["loc"])), "type": error["type"]} for error in exc.errors()]
        return error_response(422, "VALIDATION_ERROR", "Request fields are invalid.", {"fields": fields})

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        return error_response(exc.status_code, "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR", str(exc.detail))

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception):
        logging.getLogger("reliefmesh").error("Unexpected failure in %s %s (%s)",
                                              request.method, request.url.path, type(exc).__name__)
        return error_response(500, "INTERNAL_ERROR", "The request could not be completed.")

    app.include_router(router, prefix="/api/v1")
    return app


app = create_app()
