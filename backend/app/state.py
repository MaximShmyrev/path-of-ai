"""Шов StateStore — персистентность героя/прогресса (SPEC §4.3).

Адаптеры: InMemoryStore (тесты, текущий этап), SqlAlchemyStore (Postgres, E5).
Ядро/quests зависят на этот интерфейс, а не на конкретное хранилище.
"""

from typing import Protocol

from app.domain import HeroRecord


class StateStore(Protocol):
    def load_hero(self) -> HeroRecord | None: ...

    def save_hero(self, hero: HeroRecord) -> None: ...


class InMemoryStore:
    """Хранилище в памяти на одного локального игрока."""

    def __init__(self) -> None:
        self._hero: HeroRecord | None = None

    def load_hero(self) -> HeroRecord | None:
        return self._hero

    def save_hero(self, hero: HeroRecord) -> None:
        self._hero = hero
