"""FastAPI entrypoint for server-authoritative PyroLedger inventory operations."""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.inventory import router as inventory_router
from app.core.config import settings
from app.domain.errors import DomainError

app = FastAPI(title="PyroLedger API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Organization-ID", "X-Request-ID"],
)


@app.exception_handler(DomainError)
def handle_domain_error(_: Request, error: DomainError) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={"detail": {"code": error.code, "message": error.message}},
    )


app.include_router(inventory_router)


@app.get("/healthz", tags=["system"])
def healthz() -> dict[str, str]:
    return {"status": "ok"}
