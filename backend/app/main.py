"""Точка входа FastAPI «Путь ИИ» — продакшен-проводка (PostgreSQL)."""

import os

from sqlalchemy import create_engine

from app.api import create_app
from app.state import SqlAlchemyStore


def _build_store() -> SqlAlchemyStore:
    database_url = os.environ["DATABASE_URL"]
    engine = create_engine(database_url, pool_pre_ping=True)
    # Схема создаётся при старте — отдельных ручных шагов нет (PLAN E5).
    return SqlAlchemyStore(engine, create=True)


app = create_app(store=_build_store())
