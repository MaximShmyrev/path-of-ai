"""Оркестрация прохождения квеста (SPEC §4.3, §7.3, §7.4, §7.5).

Единственный модуль, меняющий XP/статусы — и только через ядро `progression`.
Поток complete_quest: найти квест → проверить доступность темы → идемпотентность →
валидация сдачи → начисление XP → сохранение → новые разблокировки.
"""

from dataclasses import dataclass, replace

from app.catalog import Catalog
from app.domain import HeroRecord, HeroState, Quest, UnlockState
from app.progression import LevelCurve, award_xp, class_modifier, recompute_unlocks
from app.state import StateStore


class QuestError(Exception):
    """Базовая ошибка прохождения квеста."""


class HeroNotFound(QuestError):
    """Герой ещё не создан."""


class QuestNotFound(QuestError):
    """Квеста с таким id нет в каталоге."""


class LocationLocked(QuestError):
    """Тема недоступна (уровень/пререквизиты)."""


class InvalidSubmission(QuestError):
    """Сдача квеста не прошла проверку."""


@dataclass(frozen=True)
class QuizSubmission:
    """Ответы на квиз — индексы выбранных вариантов по вопросам."""

    answers: tuple[int, ...]


@dataclass(frozen=True)
class CompletionResult:
    """Итог прохождения: новое состояние + что изменилось."""

    hero: HeroRecord
    gained_xp: int
    leveled_up: bool
    new_level: int
    newly_unlocked_regions: frozenset[str]
    already_completed: bool


def _completed_topics(
    catalog: Catalog, completed_quests: frozenset[str]
) -> frozenset[str]:
    """Тема считается завершённой, когда завершены все её квесты."""
    result: set[str] = set()
    for topic in catalog.topics:
        quest_ids = {quest.id for quest in catalog.quests_for_topic(topic.id)}
        if quest_ids and quest_ids <= completed_quests:
            result.add(topic.id)
    return frozenset(result)


@dataclass(frozen=True)
class QuestService:
    """Сервис прохождения. Зависит на каталог (контент) и StateStore (состояние)."""

    catalog: Catalog
    store: StateStore

    @property
    def _curve(self) -> LevelCurve:
        return LevelCurve(
            base_xp=self.catalog.base_xp, max_level=self.catalog.max_level
        )

    def _hero_state(self, hero: HeroRecord) -> HeroState:
        return HeroState(
            total_xp=hero.total_xp,
            hero_class=self.catalog.hero_class(hero.hero_class_id),
            completed_topics=_completed_topics(self.catalog, hero.completed_quests),
        )

    def load_hero(self) -> HeroRecord:
        """Текущий герой или HeroNotFound."""
        hero = self.store.load_hero()
        if hero is None:
            raise HeroNotFound("Герой ещё не создан")
        return hero

    def level_of(self, hero: HeroRecord) -> int:
        return self._curve.level_for_xp(hero.total_xp)

    def unlocks_for(self, hero: HeroRecord) -> UnlockState:
        return recompute_unlocks(self._curve, self._hero_state(hero), self.catalog)

    def complete_quest(
        self, quest_id: str, submission: QuizSubmission | None
    ) -> CompletionResult:
        hero = self.load_hero()

        try:
            quest = self.catalog.quest(quest_id)
        except KeyError as exc:
            raise QuestNotFound(quest_id) from exc

        curve = self._curve
        state = self._hero_state(hero)
        unlocks_before = recompute_unlocks(curve, state, self.catalog)
        if unlocks_before.topic_status[quest.topic_id] == "locked":
            raise LocationLocked(quest.topic_id)

        if quest_id in hero.completed_quests:
            return CompletionResult(
                hero=hero,
                gained_xp=0,
                leveled_up=False,
                new_level=curve.level_for_xp(hero.total_xp),
                newly_unlocked_regions=frozenset(),
                already_completed=True,
            )

        _validate_submission(quest, submission)

        modifier = class_modifier(state.hero_class, quest.region_id)
        awarded = award_xp(curve, state, quest.xp, modifier)
        new_hero = replace(
            hero,
            total_xp=awarded.state.total_xp,
            completed_quests=hero.completed_quests | {quest_id},
        )
        self.store.save_hero(new_hero)

        unlocks_after = recompute_unlocks(
            curve, self._hero_state(new_hero), self.catalog
        )
        newly_unlocked = unlocks_after.open_regions - unlocks_before.open_regions
        return CompletionResult(
            hero=new_hero,
            gained_xp=awarded.gained_xp,
            leveled_up=awarded.leveled_up,
            new_level=awarded.new_level,
            newly_unlocked_regions=newly_unlocked,
            already_completed=False,
        )


def _validate_submission(quest: Quest, submission: QuizSubmission | None) -> None:
    """Проверка сдачи. Квиз сверяется с эталоном (хранится на сервере)."""
    if not quest.quiz:
        return  # теоретический квест — сдавать нечего
    if submission is None:
        raise InvalidSubmission("Требуются ответы на квиз")
    expected = tuple(question.answer for question in quest.quiz)
    if submission.answers != expected:
        raise InvalidSubmission("Неверные ответы на квиз")
