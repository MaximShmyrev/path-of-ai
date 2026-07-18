"""E8: сквозной happy-path через API (SPEC §7, интеграция всех модулей).

Перезапуск-выживание (§7.6) покрыто на Postgres в test_persistence; здесь — полный
игровой путь через HTTP на InMemoryStore.
"""

import httpx
from httpx import ASGITransport

from app.api import create_app
from app.state import InMemoryStore


def _region(body: dict[str, object], region_id: str) -> dict[str, object]:
    regions = body["regions"]
    assert isinstance(regions, list)
    return next(r for r in regions if r["id"] == region_id)


async def test_full_journey() -> None:
    app = create_app(store=InMemoryStore())
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Создание героя.
        created = await client.post(
            "/api/hero", json={"name": "Артур", "class_id": "model-mage"}
        )
        assert created.status_code == 201
        assert created.json()["level"] == 1

        # 2. На старте регион llm заблокирован.
        before = (await client.get("/api/map")).json()
        assert _region(before, "llm")["status"] == "locked"

        # 3. Доступная тема открывается.
        topic = await client.get("/api/topics/supervised-basics")
        assert topic.status_code == 200

        # 4. Практический квест с верным ответом → level-up и разблокировка региона.
        completion = await client.post(
            "/api/quests/supervised-basics-practice/complete",
            json={"answers": [1]},
        )
        result = completion.json()
        assert completion.status_code == 200
        assert result["leveled_up"] is True
        assert result["new_level"] == 2
        assert "llm" in result["newly_unlocked_regions"]

        # 5. Карта обновилась: llm открыт.
        after = (await client.get("/api/map")).json()
        assert _region(after, "llm")["status"] == "open"

        # 6. Сюжетное событие в локации с events=true.
        event = await client.post("/api/locations/supervised-basics/event")
        assert event.status_code == 200
        body = event.json()
        assert body["source"] in {"glm", "bank"}
        assert body["text"]
