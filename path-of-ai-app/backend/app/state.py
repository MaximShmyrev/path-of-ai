"""Шов StateStore — персистентность героя/прогресса (SPEC §4.3, §5.2).

Адаптеры: InMemoryStore (тесты/локально без БД), SqlAlchemyStore (Postgres).
Ядро/quests зависят на этот интерфейс, а не на конкретное хранилище.

`complete` — атомарная запись прохождения: единственный безопасный от гонки путь
начисления XP. Уникальность (hero_id, quest_id) + относительный инкремент XP в одной
транзакции гарантируют «начислено ровно один раз» даже при параллельных запросах.
"""

from dataclasses import dataclass, replace
from typing import Protocol

from sqlalchemy import Engine, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.db import HeroRow, QuestProgressRow, StoryEventRow, create_schema
from app.domain import HeroRecord, StoryEvent


@dataclass(frozen=True)
class CompletionOutcome:
    """Результат атомарной записи прохождения квеста."""

    already_completed: bool
    hero: HeroRecord


class StateStore(Protocol):
    def load_hero(self) -> HeroRecord | None: ...

    def save_hero(self, hero: HeroRecord) -> None: ...

    def complete(self, quest_id: str, gained_xp: int) -> CompletionOutcome: ...

    def save_event(self, location_id: str, event: StoryEvent) -> None: ...


class InMemoryStore:
    """Хранилище в памяти на одного локального игрока."""

    def __init__(self) -> None:
        self._hero: HeroRecord | None = None
        self.events: list[tuple[str, StoryEvent]] = []

    def load_hero(self) -> HeroRecord | None:
        return self._hero

    def save_hero(self, hero: HeroRecord) -> None:
        self._hero = hero

    def save_event(self, location_id: str, event: StoryEvent) -> None:
        self.events.append((location_id, event))

    def complete(self, quest_id: str, gained_xp: int) -> CompletionOutcome:
        if self._hero is None:
            raise LookupError("Герой не создан")
        if quest_id in self._hero.completed_quests:
            return CompletionOutcome(already_completed=True, hero=self._hero)
        self._hero = replace(
            self._hero,
            total_xp=self._hero.total_xp + gained_xp,
            completed_quests=self._hero.completed_quests | {quest_id},
        )
        return CompletionOutcome(already_completed=False, hero=self._hero)


class SqlAlchemyStore:
    """Хранилище на PostgreSQL (один локальный игрок)."""

    def __init__(self, engine: Engine, *, create: bool = False) -> None:
        if create:
            create_schema(engine)
        self._session = sessionmaker(engine)

    def load_hero(self) -> HeroRecord | None:
        with self._session() as session:
            row = session.execute(select(HeroRow)).scalars().first()
            if row is None:
                return None
            return self._to_record(session, row)

    def _require_hero(self) -> HeroRecord:
        hero = self.load_hero()
        if hero is None:
            raise LookupError("Герой не создан")
        return hero

    @staticmethod
    def _to_record(session: Session, row: HeroRow) -> HeroRecord:
        quest_ids = session.execute(
            select(QuestProgressRow.quest_id).where(QuestProgressRow.hero_id == row.id)
        ).scalars()
        return HeroRecord(
            name=row.name,
            hero_class_id=row.hero_class_id,
            avatar_ref=row.avatar_ref,
            total_xp=row.total_xp,
            completed_quests=frozenset(quest_ids),
        )

    def save_hero(self, hero: HeroRecord) -> None:
        with self._session() as session:
            session.add(
                HeroRow(
                    name=hero.name,
                    hero_class_id=hero.hero_class_id,
                    avatar_ref=hero.avatar_ref,
                    total_xp=hero.total_xp,
                )
            )
            session.commit()

    def complete(self, quest_id: str, gained_xp: int) -> CompletionOutcome:
        with self._session() as session:
            row = session.execute(select(HeroRow)).scalars().first()
            if row is None:
                raise LookupError("Герой не создан")
            hero_id = row.id
            session.add(
                QuestProgressRow(
                    hero_id=hero_id, quest_id=quest_id, awarded_xp=gained_xp
                )
            )
            try:
                session.flush()  # триггерит проверку UNIQUE
            except IntegrityError:
                session.rollback()  # квест уже зачтён (повтор/проигрыш гонки)
                return CompletionOutcome(
                    already_completed=True, hero=self._require_hero()
                )
            # Относительный инкремент в SQL — без потери обновления при гонке.
            session.execute(
                update(HeroRow)
                .where(HeroRow.id == hero_id)
                .values(total_xp=HeroRow.total_xp + gained_xp)
            )
            session.commit()
        return CompletionOutcome(already_completed=False, hero=self._require_hero())

    def save_event(self, location_id: str, event: StoryEvent) -> None:
        with self._session() as session:
            row = session.execute(select(HeroRow)).scalars().first()
            if row is None:
                raise LookupError("Герой не создан")
            session.add(
                StoryEventRow(
                    hero_id=row.id,
                    location_id=location_id,
                    text=event.text,
                    source=event.source,
                )
            )
            session.commit()
