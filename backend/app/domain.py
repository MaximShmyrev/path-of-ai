"""Доменные value-объекты «Путь ИИ» — чистые, неизменяемые (SPEC §3, §5).

Эти типы — общий язык ядра. `progression` оперирует ими; `catalog` (E2) будет
строить их из seed. Здесь нет I/O и зависимостей на фреймворк.
"""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from typing import Literal, Protocol


@dataclass(frozen=True)
class HeroClass:
    """Класс героя: даёт множители XP по регионам (SPEC §4.3, §5.1)."""

    id: str
    title: str
    modifiers: Mapping[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class HeroState:
    """Состояние героя для ядра прогресса.

    Уровень здесь не хранится — он производный от total_xp (см. LevelCurve).
    """

    total_xp: int
    hero_class: HeroClass
    completed_topics: frozenset[str] = frozenset()


@dataclass(frozen=True)
class XpResult:
    """Результат начисления XP: новое состояние + факт повышения уровня."""

    state: HeroState
    gained_xp: int
    leveled_up: bool
    old_level: int
    new_level: int


@dataclass(frozen=True)
class Region:
    """Регион карты мира — крупная область ИИ; открывается по уровню героя."""

    id: str
    title: str
    unlock_level: int


@dataclass(frozen=True)
class Topic:
    """Локация-тема внутри региона; открывается по завершении пререквизитов."""

    id: str
    region_id: str
    prerequisites: frozenset[str] = frozenset()
    events: bool = False  # поддерживает ли тема сюжетные события (LLM, E6)


QuestKind = Literal["theory", "practice", "boss"]


@dataclass(frozen=True)
class QuizQuestion:
    """Вопрос автопроверяемого квиза. `answer` — индекс эталона; на клиент не
    отдаётся (анти-чит, см. SPEC §8 и E4)."""

    prompt: str
    options: tuple[str, ...]
    answer: int


@dataclass(frozen=True)
class Quest:
    """Учебное задание внутри темы. Практический квест содержит квиз."""

    id: str
    title: str
    kind: QuestKind
    xp: int
    topic_id: str
    region_id: str
    quiz: tuple[QuizQuestion, ...] = ()


TopicStatus = Literal["locked", "available", "completed"]


@dataclass(frozen=True)
class UnlockState:
    """Проекция доступности: открытые регионы и статусы тем (SPEC §7.2, §7.5)."""

    open_regions: frozenset[str]
    topic_status: Mapping[str, TopicStatus]


class Catalog(Protocol):
    """Структурный интерфейс каталога, нужный ядру (полная реализация — E2)."""

    @property
    def regions(self) -> Sequence[Region]: ...

    @property
    def topics(self) -> Sequence[Topic]: ...
