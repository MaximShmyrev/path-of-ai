"""E4: HTTP API (FastAPI). Тесты через httpx + ASGITransport (SPEC §6, §7)."""

from collections.abc import AsyncIterator
from typing import Any

import httpx
import pytest_asyncio
from httpx import ASGITransport

from app.api import create_app
from app.state import InMemoryStore


@pytest_asyncio.fixture
async def client_store() -> AsyncIterator[tuple[httpx.AsyncClient, InMemoryStore]]:
    store = InMemoryStore()
    app = create_app(store=store)
    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, store


async def _create_hero(
    client: httpx.AsyncClient, name: str = "Артур", class_id: str = "model-mage"
) -> httpx.Response:
    return await client.post("/api/hero", json={"name": name, "class_id": class_id})


class TestCreateHero:
    async def test_creates_level_1_hero(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        resp = await _create_hero(client)
        assert resp.status_code == 201
        body = resp.json()
        assert body["level"] == 1
        assert body["total_xp"] == 0

    async def test_duplicate_returns_409(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        await _create_hero(client)
        resp = await _create_hero(client, name="Второй")
        assert resp.status_code == 409

    async def test_blank_name_returns_422(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        resp = await _create_hero(client, name="   ")
        assert resp.status_code == 422

    async def test_too_long_name_returns_422(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        resp = await _create_hero(client, name="и" * 41)
        assert resp.status_code == 422

    async def test_unknown_class_returns_422(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        resp = await _create_hero(client, class_id="ghost")
        assert resp.status_code == 422

    async def test_anticheat_ignores_client_xp_and_level(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        # SPEC §7.8: total_xp/level от клиента игнорируются.
        client, store = client_store
        resp = await client.post(
            "/api/hero",
            json={
                "name": "Читер",
                "class_id": "model-mage",
                "total_xp": 99999,
                "level": 50,
            },
        )
        assert resp.status_code == 201
        assert resp.json()["total_xp"] == 0
        stored = store.load_hero()
        assert stored is not None
        assert stored.total_xp == 0


class TestGetHero:
    async def test_404_when_no_hero(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        resp = await client.get("/api/hero")
        assert resp.status_code == 404

    async def test_returns_created_hero(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        await _create_hero(client, name="Мерлин")
        resp = await client.get("/api/hero")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Мерлин"


def _region(body: dict[str, Any], region_id: str) -> dict[str, Any]:
    region: dict[str, Any] = next(r for r in body["regions"] if r["id"] == region_id)
    return region


def _topic(body: dict[str, Any], topic_id: str) -> dict[str, Any]:
    for region in body["regions"]:
        for topic in region["topics"]:
            if topic["id"] == topic_id:
                result: dict[str, Any] = topic
                return result
    raise AssertionError(f"тема {topic_id} не найдена в карте")


class TestMap:
    async def test_404_without_hero(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        resp = await client.get("/api/map")
        assert resp.status_code == 404

    async def test_start_region_open_others_locked(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        await _create_hero(client)
        body = (await client.get("/api/map")).json()
        assert body["level"] == 1
        assert _region(body, "ml-foundations")["status"] == "open"
        assert _region(body, "llm")["status"] == "locked"

    async def test_topic_statuses(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        await _create_hero(client)
        body = (await client.get("/api/map")).json()
        assert _topic(body, "supervised-basics")["status"] == "available"
        assert _topic(body, "model-evaluation")["status"] == "locked"
        assert _topic(body, "transformers")["status"] == "locked"


class TestTopic:
    async def test_unknown_topic_404(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        await _create_hero(client)
        resp = await client.get("/api/topics/ghost")
        assert resp.status_code == 404

    async def test_available_topic_200_with_quests(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        await _create_hero(client)
        resp = await client.get("/api/topics/supervised-basics")
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "available"
        kinds = {q["kind"] for q in body["quests"]}
        assert "practice" in kinds

    async def test_locked_topic_423(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        # SPEC §7.5 (api): заблокированная тема → 423.
        client, _ = client_store
        await _create_hero(client)
        resp = await client.get("/api/topics/transformers")
        assert resp.status_code == 423

    async def test_quiz_answer_not_leaked(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        # SPEC §7.8: эталонный индекс ответа не отдаётся клиенту.
        client, _ = client_store
        await _create_hero(client)
        body = (await client.get("/api/topics/supervised-basics")).json()
        for quest in body["quests"]:
            for question in quest.get("quiz", []):
                assert "answer" not in question
                assert "prompt" in question and "options" in question


async def _complete(
    client: httpx.AsyncClient, quest_id: str, answers: list[int] | None = None
) -> httpx.Response:
    payload: dict[str, object] = {} if answers is None else {"answers": answers}
    return await client.post(f"/api/quests/{quest_id}/complete", json=payload)


class TestComplete:
    async def test_practice_awards_xp(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        await _create_hero(client)
        resp = await _complete(client, "supervised-basics-practice", [1])
        assert resp.status_code == 200
        body = resp.json()
        assert body["gained_xp"] == 150
        assert body["already_completed"] is False
        assert body["hero"]["total_xp"] == 150

    async def test_theory_without_answers(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        await _create_hero(client)
        resp = await _complete(client, "supervised-basics-theory")
        assert resp.status_code == 200
        assert resp.json()["gained_xp"] == 50

    async def test_idempotent_repeat(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        await _create_hero(client)
        await _complete(client, "supervised-basics-practice", [1])
        resp = await _complete(client, "supervised-basics-practice", [1])
        assert resp.status_code == 200
        body = resp.json()
        assert body["already_completed"] is True
        assert body["gained_xp"] == 0

    async def test_invalid_answer_422(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        await _create_hero(client)
        resp = await _complete(client, "supervised-basics-practice", [0])
        assert resp.status_code == 422

    async def test_locked_quest_423(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        await _create_hero(client)
        resp = await _complete(client, "transformers-practice", [0])
        assert resp.status_code == 423

    async def test_unknown_quest_404(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        await _create_hero(client)
        resp = await _complete(client, "ghost")
        assert resp.status_code == 404

    async def test_no_hero_404(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        resp = await _complete(client, "supervised-basics-theory")
        assert resp.status_code == 404

    async def test_level_up_unlock_in_response(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        # SPEC §7.4 (api): завершение даёт level-up и список разблокировок.
        client, _ = client_store
        await _create_hero(client)
        body = (await _complete(client, "supervised-basics-practice", [1])).json()
        assert body["leveled_up"] is True
        assert body["new_level"] == 2
        assert "llm" in body["newly_unlocked_regions"]


class TestEvent:
    async def test_event_returns_bank_source(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        # SPEC §7.7: без ключа GLM событие приходит из банка, всегда 200.
        client, _ = client_store
        await _create_hero(client)
        resp = await client.post("/api/locations/supervised-basics/event")
        assert resp.status_code == 200
        body = resp.json()
        assert body["source"] == "bank"
        assert body["text"]

    async def test_event_is_persisted(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, store = client_store
        await _create_hero(client)
        await client.post("/api/locations/supervised-basics/event")
        assert len(store.events) == 1
        assert store.events[0][0] == "supervised-basics"

    async def test_event_404_unknown_location(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        await _create_hero(client)
        resp = await client.post("/api/locations/ghost/event")
        assert resp.status_code == 404

    async def test_event_404_when_events_disabled(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        await _create_hero(client)
        resp = await client.post("/api/locations/feature-engineering/event")
        assert resp.status_code == 404

    async def test_event_404_without_hero(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        client, _ = client_store
        resp = await client.post("/api/locations/supervised-basics/event")
        assert resp.status_code == 404

    async def test_event_423_when_locked(
        self, client_store: tuple[httpx.AsyncClient, InMemoryStore]
    ) -> None:
        # fine-tuning: events=true, но регион llm заблокирован на старте.
        client, _ = client_store
        await _create_hero(client)
        resp = await client.post("/api/locations/fine-tuning/event")
        assert resp.status_code == 423
