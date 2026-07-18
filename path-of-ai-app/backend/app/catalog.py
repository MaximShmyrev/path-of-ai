"""Каталог контента: загрузка и строгая валидация seed (SPEC §4.3, §5.1, §7.9).

Источник истины контента — seed (файлы), а не БД. При загрузке выполняется
валидация-fail-fast: структура (pydantic) + семантические инварианты (уникальные id,
существование пререквизитов, ацикличность графа, ≥1 практический квест на тему,
неубывающие пороги регионов). Каталог строит O(1)-индексы для запросов.

Шов `ContentSource` (адаптеры `YamlContentSource` и `InMemorySource`) отделяет
источник байтов от разбора — ядро не знает про файловую систему.
"""

from collections import deque
from collections.abc import Mapping
from dataclasses import dataclass
from functools import cached_property
from pathlib import Path
from typing import Any, Protocol

import yaml
from pydantic import BaseModel, ValidationError

from app.domain import (
    HeroClass,
    Quest,
    QuestKind,
    QuizQuestion,
    Region,
    Topic,
)


class ContentValidationError(Exception):
    """Контент не прошёл валидацию (структурную или семантическую)."""


# --- Сырые модели для разбора и структурной валидации (pydantic) ---


class _RawQuiz(BaseModel):
    prompt: str
    options: list[str]
    answer: int
    explanation: str = ""


class _RawQuest(BaseModel):
    id: str
    title: str
    kind: QuestKind
    xp: int
    body: str = ""
    quiz: list[_RawQuiz] = []


class _RawTopic(BaseModel):
    id: str
    title: str
    prerequisites: list[str] = []
    events: bool = False
    quests: list[_RawQuest]


class _RawRegion(BaseModel):
    id: str
    title: str
    unlock_level: int
    topics: list[_RawTopic]


class _RawClass(BaseModel):
    id: str
    title: str
    modifiers: dict[str, float] = {}


class _RawProgression(BaseModel):
    base_xp: int
    max_level: int


class _RawSeed(BaseModel):
    progression: _RawProgression
    classes: list[_RawClass] = []
    events_bank: list[str] = []
    regions: list[_RawRegion]


# --- Источники контента (шов ContentSource) ---


class ContentSource(Protocol):
    def read(self) -> Mapping[str, Any]: ...


@dataclass(frozen=True)
class InMemorySource:
    """Источник из готового словаря (тесты)."""

    data: Mapping[str, Any]

    def read(self) -> Mapping[str, Any]:
        return self.data


@dataclass(frozen=True)
class YamlContentSource:
    """Источник из YAML-файла (боевой)."""

    path: Path

    def read(self) -> Mapping[str, Any]:
        with self.path.open(encoding="utf-8") as handle:
            data = yaml.safe_load(handle)
        if not isinstance(data, dict):
            raise ContentValidationError("Seed должен быть отображением (mapping)")
        return data


# --- Каталог ---


@dataclass(frozen=True)
class Catalog:
    """Загруженный контент с O(1)-доступом по id (SPEC §4.3, §9)."""

    base_xp: int
    max_level: int
    regions: tuple[Region, ...]
    topics: tuple[Topic, ...]
    quests: tuple[Quest, ...]
    classes: tuple[HeroClass, ...]
    events_bank: tuple[str, ...] = ()

    @cached_property
    def _region_by_id(self) -> dict[str, Region]:
        return {region.id: region for region in self.regions}

    @cached_property
    def _topic_by_id(self) -> dict[str, Topic]:
        return {topic.id: topic for topic in self.topics}

    @cached_property
    def _quest_by_id(self) -> dict[str, Quest]:
        return {quest.id: quest for quest in self.quests}

    @cached_property
    def _class_by_id(self) -> dict[str, HeroClass]:
        return {hero_class.id: hero_class for hero_class in self.classes}

    def region(self, region_id: str) -> Region:
        return self._region_by_id[region_id]

    def topic(self, topic_id: str) -> Topic:
        return self._topic_by_id[topic_id]

    def quest(self, quest_id: str) -> Quest:
        return self._quest_by_id[quest_id]

    def hero_class(self, class_id: str) -> HeroClass:
        return self._class_by_id[class_id]

    def prerequisites(self, topic_id: str) -> frozenset[str]:
        return self.topic(topic_id).prerequisites

    def quests_for_topic(self, topic_id: str) -> tuple[Quest, ...]:
        return tuple(quest for quest in self.quests if quest.topic_id == topic_id)


def load_catalog(source: ContentSource) -> Catalog:
    """Загрузить и провалидировать каталог из источника. Fail fast при ошибках."""
    try:
        seed = _RawSeed.model_validate(source.read())
    except ValidationError as exc:
        raise ContentValidationError(f"Некорректная структура seed: {exc}") from exc

    regions = tuple(
        Region(id=region.id, title=region.title, unlock_level=region.unlock_level)
        for region in seed.regions
    )
    topics = tuple(
        Topic(
            id=topic.id,
            region_id=region.id,
            title=topic.title,
            prerequisites=frozenset(topic.prerequisites),
            events=topic.events,
        )
        for region in seed.regions
        for topic in region.topics
    )
    quests = tuple(
        Quest(
            id=quest.id,
            title=quest.title,
            kind=quest.kind,
            xp=quest.xp,
            topic_id=topic.id,
            region_id=region.id,
            body=quest.body,
            quiz=tuple(
                QuizQuestion(
                    prompt=item.prompt,
                    options=tuple(item.options),
                    answer=item.answer,
                    explanation=item.explanation,
                )
                for item in quest.quiz
            ),
        )
        for region in seed.regions
        for topic in region.topics
        for quest in topic.quests
    )
    classes = tuple(
        HeroClass(id=item.id, title=item.title, modifiers=dict(item.modifiers))
        for item in seed.classes
    )

    catalog = Catalog(
        base_xp=seed.progression.base_xp,
        max_level=seed.progression.max_level,
        regions=regions,
        topics=topics,
        quests=quests,
        classes=classes,
        events_bank=tuple(seed.events_bank),
    )
    _validate_semantics(catalog)
    return catalog


SEED_PATH = Path(__file__).parent / "content" / "seed.yaml"


def default_catalog() -> Catalog:
    """Каталог из штатного seed проекта."""
    return load_catalog(YamlContentSource(SEED_PATH))


def _validate_semantics(catalog: Catalog) -> None:
    """Семантические инварианты сверх структуры (fail fast, SPEC §7.9, §8)."""
    _check_unique_ids(catalog)
    _check_prerequisites_exist(catalog)
    _check_acyclic(catalog)
    _check_each_topic_has_practice(catalog)
    _check_practice_quests_have_quiz(catalog)
    _check_theory_quests_have_body(catalog)
    _check_quiz_questions_have_explanation(catalog)
    _check_region_levels_non_decreasing(catalog)
    _check_quiz_answers_in_range(catalog)


def _check_unique_ids(catalog: Catalog) -> None:
    for label, ids in (
        ("регионов", [r.id for r in catalog.regions]),
        ("тем", [t.id for t in catalog.topics]),
        ("квестов", [q.id for q in catalog.quests]),
    ):
        duplicates = sorted({item for item in ids if ids.count(item) > 1})
        if duplicates:
            raise ContentValidationError(f"Дублирующиеся id {label}: {duplicates}")


def _check_prerequisites_exist(catalog: Catalog) -> None:
    topic_ids = {topic.id for topic in catalog.topics}
    for topic in catalog.topics:
        missing = topic.prerequisites - topic_ids
        if missing:
            raise ContentValidationError(
                f"Тема {topic.id!r} ссылается на несуществующие пререквизиты: "
                f"{sorted(missing)}"
            )


def _check_acyclic(catalog: Catalog) -> None:
    """Топологическая сортировка (Kahn), O(V + E). Цикл → ошибка."""
    indegree = {topic.id: len(topic.prerequisites) for topic in catalog.topics}
    dependents: dict[str, list[str]] = {topic.id: [] for topic in catalog.topics}
    for topic in catalog.topics:
        for prerequisite in topic.prerequisites:
            dependents[prerequisite].append(topic.id)

    queue = deque(tid for tid, deg in indegree.items() if deg == 0)
    visited = 0
    while queue:
        current = queue.popleft()
        visited += 1
        for dependent in dependents[current]:
            indegree[dependent] -= 1
            if indegree[dependent] == 0:
                queue.append(dependent)

    if visited != len(catalog.topics):
        raise ContentValidationError("Граф пререквизитов содержит цикл (требуется DAG)")


def _check_each_topic_has_practice(catalog: Catalog) -> None:
    for topic in catalog.topics:
        quests = catalog.quests_for_topic(topic.id)
        if not any(quest.kind == "practice" for quest in quests):
            raise ContentValidationError(
                f"Тема {topic.id!r} не содержит практического квеста"
            )


def _check_practice_quests_have_quiz(catalog: Catalog) -> None:
    for quest in catalog.quests:
        if quest.kind == "practice" and not quest.quiz:
            raise ContentValidationError(
                f"Практический квест {quest.id!r} должен содержать квиз"
            )


def _check_theory_quests_have_body(catalog: Catalog) -> None:
    """SPEC §7.9/§8 (рев.2): тема обязана учить — у theory-квеста непустой урок."""
    for quest in catalog.quests:
        if quest.kind == "theory" and not quest.body.strip():
            raise ContentValidationError(
                f"Теоретический квест {quest.id!r} должен содержать урок (body)"
            )


def _check_quiz_questions_have_explanation(catalog: Catalog) -> None:
    """SPEC §7.9/§8 (рев.2): каждый вопрос квиза обязан давать разбор."""
    for quest in catalog.quests:
        for index, question in enumerate(quest.quiz):
            if not question.explanation.strip():
                raise ContentValidationError(
                    f"Квест {quest.id!r}, вопрос {index}: нет разбора (explanation)"
                )


def _check_region_levels_non_decreasing(catalog: Catalog) -> None:
    levels = [region.unlock_level for region in catalog.regions]
    pairs = zip(levels, levels[1:], strict=False)
    if any(later < earlier for earlier, later in pairs):
        raise ContentValidationError(
            "Пороги unlock_level регионов должны быть неубывающими"
        )


def _check_quiz_answers_in_range(catalog: Catalog) -> None:
    for quest in catalog.quests:
        for index, question in enumerate(quest.quiz):
            if not 0 <= question.answer < len(question.options):
                raise ContentValidationError(
                    f"Квест {quest.id!r}, вопрос {index}: answer вне диапазона options"
                )
