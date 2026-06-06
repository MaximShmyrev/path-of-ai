"""E5: персистентность на PostgreSQL (SPEC §5.2, §7.6).

Интеграционные тесты на реальном Postgres через testcontainers. Покрывают
round-trip, выживание прогресса при перезапуске и инвариант от гонки complete.
"""

import threading
from collections.abc import Iterator

import pytest
from sqlalchemy import Engine, create_engine
from testcontainers.postgres import PostgresContainer

from app.db import Base, reset_schema
from app.domain import HeroRecord
from app.state import SqlAlchemyStore


@pytest.fixture(scope="session")
def pg_url() -> Iterator[str]:
    with PostgresContainer("postgres:16", driver="psycopg") as postgres:
        yield postgres.get_connection_url()


@pytest.fixture
def engine(pg_url: str) -> Iterator[Engine]:
    eng = create_engine(pg_url)
    reset_schema(eng)  # чистая схема на каждый тест
    yield eng
    eng.dispose()  # закрыть пул соединений (иначе ResourceWarning в __del__)


@pytest.fixture
def store(engine: Engine) -> SqlAlchemyStore:
    return SqlAlchemyStore(engine)


def _hero() -> HeroRecord:
    return HeroRecord(name="Артур", hero_class_id="model-mage")


class TestRoundTrip:
    def test_load_none_when_empty(self, store: SqlAlchemyStore) -> None:
        assert store.load_hero() is None

    def test_save_then_load(self, store: SqlAlchemyStore) -> None:
        store.save_hero(_hero())
        loaded = store.load_hero()
        assert loaded is not None
        assert loaded.name == "Артур"
        assert loaded.total_xp == 0
        assert loaded.completed_quests == frozenset()

    def test_complete_persists_xp_and_progress(self, store: SqlAlchemyStore) -> None:
        store.save_hero(_hero())
        outcome = store.complete("q-1", 150)
        assert outcome.already_completed is False
        loaded = store.load_hero()
        assert loaded is not None
        assert loaded.total_xp == 150
        assert "q-1" in loaded.completed_quests


class TestSchemaAutoCreate:
    def test_create_flag_builds_schema(self, pg_url: str) -> None:
        # create=True создаёт таблицы при старте (PLAN E5, без ручных шагов).
        eng = create_engine(pg_url)
        try:
            Base.metadata.drop_all(eng)
            store = SqlAlchemyStore(eng, create=True)
            assert store.load_hero() is None  # таблицы есть, героя нет
        finally:
            eng.dispose()


class TestRestartSurvival:
    def test_progress_survives_restart(self, engine: Engine, pg_url: str) -> None:
        # SPEC §7.6: прогресс хранится в БД, переживает «перезапуск» процесса.
        store1 = SqlAlchemyStore(engine)
        store1.save_hero(_hero())
        store1.complete("q-1", 150)

        # «Перезапуск»: новый engine + store на той же БД.
        engine2 = create_engine(pg_url)
        try:
            store2 = SqlAlchemyStore(engine2)
            loaded = store2.load_hero()
            assert loaded is not None
            assert loaded.total_xp == 150
            assert "q-1" in loaded.completed_quests
        finally:
            engine2.dispose()


class TestConcurrency:
    def test_concurrent_complete_awards_once(self, store: SqlAlchemyStore) -> None:
        # Аудит/E5: два одновременных complete одного квеста → XP начислен один раз.
        store.save_hero(_hero())
        barrier = threading.Barrier(2)
        outcomes = []

        def worker() -> None:
            barrier.wait()  # стартуем одновременно — максимизируем гонку
            outcomes.append(store.complete("q-race", 150))

        threads = [threading.Thread(target=worker) for _ in range(2)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        loaded = store.load_hero()
        assert loaded is not None
        assert loaded.total_xp == 150  # ровно одно начисление
        flags = sorted(o.already_completed for o in outcomes)
        assert flags == [False, True]  # один записал, второй увидел дубль
