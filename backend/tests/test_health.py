"""E0: liveness-проба `/health` не зависит от БД (PLAN E0).

Тесты ходят в приложение через httpx + ASGITransport (подход SPEC §7).
"""

import httpx
from httpx import ASGITransport

from app.main import app


async def test_health_ok() -> None:
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
