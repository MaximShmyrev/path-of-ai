"""Точка входа FastAPI-приложения «Путь ИИ»."""

from fastapi import FastAPI

app = FastAPI(title="Путь ИИ — backend")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness-проба. Намеренно не зависит от БД (см. PLAN, этап E0)."""
    return {"status": "ok"}
