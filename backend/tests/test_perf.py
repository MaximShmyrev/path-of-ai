"""E8: нагрузочная проверка p95 < 200 мс для не-LLM эндпоинтов (SPEC §8).

In-process через ASGI (без сети) — стабильно в CI и ловит регрессии алгоритмов
(recompute_unlocks O(V+E) на штатном seed).
"""

import asyncio
import time

import httpx
from httpx import ASGITransport

from app.api import create_app
from app.state import InMemoryStore

P95_BUDGET_SECONDS = 0.2
TOTAL = 200
CONCURRENCY = 50


async def _load(client: httpx.AsyncClient, path: str) -> list[float]:
    semaphore = asyncio.Semaphore(CONCURRENCY)
    latencies: list[float] = []

    async def one() -> None:
        async with semaphore:
            start = time.perf_counter()
            response = await client.get(path)
            latencies.append(time.perf_counter() - start)
            assert response.status_code == 200

    await asyncio.gather(*(one() for _ in range(TOTAL)))
    return sorted(latencies)


def _p95(latencies: list[float]) -> float:
    return latencies[int(0.95 * len(latencies))]


async def test_map_and_hero_p95_under_budget() -> None:
    app = create_app(store=InMemoryStore())
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/api/hero", json={"name": "Артур", "class_id": "model-mage"})
        for path in ("/api/map", "/api/hero"):
            latencies = await _load(client, path)
            assert _p95(latencies) < P95_BUDGET_SECONDS, (
                f"{path}: p95={_p95(latencies):.4f}s"
            )
