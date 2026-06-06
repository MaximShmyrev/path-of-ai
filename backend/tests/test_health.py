"""E0: liveness-проба `/health` не зависит от БД (PLAN E0).

Тесты ходят в приложение через httpx + ASGITransport (подход SPEC §7).
Используем create_app() с InMemoryStore — без зависимости от Postgres.
"""

import httpx
from httpx import ASGITransport

from app.api import create_app
from app.domain import HeroRecord
from app.state import CompletionOutcome


class _FailingStore:
    """Хранилище, имитирующее недоступную БД (для проверки readiness 503)."""

    def load_hero(self) -> HeroRecord | None:
        raise RuntimeError("БД недоступна")

    def save_hero(self, hero: HeroRecord) -> None:  # pragma: no cover
        raise RuntimeError("БД недоступна")

    def complete(
        self, quest_id: str, gained_xp: int
    ) -> CompletionOutcome:  # pragma: no cover
        raise RuntimeError("БД недоступна")


async def test_health_ok() -> None:
    app = create_app()
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_health_ready_ok_with_inmemory() -> None:
    app = create_app()
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health/ready")
    assert response.status_code == 200
    assert response.json() == {"status": "ready"}


async def test_health_ready_503_when_store_unavailable() -> None:
    app = create_app(store=_FailingStore())
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health/ready")
    assert response.status_code == 503
