"""FastAPI entrypoint. Inventory routes are added after the domain foundation."""
from fastapi import FastAPI

app = FastAPI(title="PyroLedger API", version="0.1.0")


@app.get("/healthz", tags=["system"])
def healthz() -> dict[str, str]:
    return {"status": "ok"}
