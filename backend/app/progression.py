"""Ядро прогресса героя — чистые функции, без I/O (SPEC §4.3, §9).

Глубокий модуль: маленький интерфейс, вся арифметика опыта/уровней/разблокировок
внутри. Зависимостей на фреймворк/БД/HTTP нет (направление зависимостей — внутрь).
"""

from bisect import bisect_right
from dataclasses import dataclass, replace
from functools import cached_property

from app.domain import (
    Catalog,
    HeroClass,
    HeroState,
    TopicStatus,
    UnlockState,
    XpResult,
)


@dataclass(frozen=True)
class LevelCurve:
    """Квадратичная кривая уровней: порог уровня N = base_xp * (N-1)².

    Уровень 1 достигается при total_xp = 0. Уровень не хранится как состояние —
    он детерминированно вычисляется из total_xp (это исключает рассинхрон и
    упрощает анти-чит: уровень производный, клиент его не задаёт).
    """

    base_xp: int
    max_level: int

    def __post_init__(self) -> None:
        if self.base_xp <= 0:
            raise ValueError("base_xp должен быть положительным")
        if self.max_level < 1:
            raise ValueError("max_level должен быть >= 1")

    @cached_property
    def _thresholds(self) -> list[int]:
        """Кумулятивные пороги XP для уровней 1..max_level (1-индексация).

        thresholds[0] = 0 (уровень 1). Список неубывающий → бинарный поиск.
        """
        return [self.base_xp * (n - 1) ** 2 for n in range(1, self.max_level + 1)]

    def level_for_xp(self, total_xp: int) -> int:
        """Уровень по суммарному XP. Сложность O(log L) (бинарный поиск)."""
        if total_xp < 0:
            raise ValueError("total_xp должен быть неотрицательным")
        # Число порогов <= total_xp и есть уровень (thresholds[0]=0 → уровень 1).
        return bisect_right(self._thresholds, total_xp)

    def xp_to_next_level(self, total_xp: int) -> int:
        """Сколько XP до следующего уровня; 0 — если уже максимум. O(log L)."""
        level = self.level_for_xp(total_xp)
        if level >= self.max_level:
            return 0
        next_threshold = self._thresholds[level]
        return next_threshold - total_xp


def class_modifier(hero_class: HeroClass, region_id: str) -> float:
    """Множитель XP класса для региона; 1.0, если бонуса нет. O(1)."""
    return hero_class.modifiers.get(region_id, 1.0)


def award_xp(
    curve: LevelCurve, state: HeroState, base_amount: int, modifier: float
) -> XpResult:
    """Начислить XP и вернуть новое состояние (вход не мутируется).

    Начисляется round(base_amount * modifier). Уровень до/после вычисляется через
    curve, что даёт факт level-up. Сложность O(log L) (два level_for_xp).
    """
    if base_amount <= 0:
        raise ValueError("base_amount должен быть положительным")
    if modifier <= 0:
        raise ValueError("modifier должен быть положительным")

    gained_xp = round(base_amount * modifier)
    new_total = state.total_xp + gained_xp
    old_level = curve.level_for_xp(state.total_xp)
    new_level = curve.level_for_xp(new_total)
    return XpResult(
        state=replace(state, total_xp=new_total),
        gained_xp=gained_xp,
        leveled_up=new_level > old_level,
        old_level=old_level,
        new_level=new_level,
    )


def recompute_unlocks(
    curve: LevelCurve, hero: HeroState, catalog: Catalog
) -> UnlockState:
    """Какие регионы открыты и каков статус каждой темы.

    Регион открыт, если уровень героя >= его unlock_level. Тема: completed —
    если пройдена; available — если регион открыт и все пререквизиты пройдены;
    иначе locked. Сложность O(V + E) (по темам и их пререквизитам).
    """
    level = curve.level_for_xp(hero.total_xp)
    open_regions = frozenset(
        region.id for region in catalog.regions if level >= region.unlock_level
    )

    topic_status: dict[str, TopicStatus] = {}
    for topic in catalog.topics:
        if topic.id in hero.completed_topics:
            status: TopicStatus = "completed"
        elif topic.region_id not in open_regions:
            status = "locked"
        elif topic.prerequisites <= hero.completed_topics:
            status = "available"
        else:
            status = "locked"
        topic_status[topic.id] = status

    return UnlockState(open_regions=open_regions, topic_status=topic_status)
