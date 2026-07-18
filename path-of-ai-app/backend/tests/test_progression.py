"""E1: ядро прогресса (чистые функции). SPEC §4.3, §7.4, §9.

Кривая уровней квадратичная: порог достижения уровня N = base_xp * (N-1)².
Так уровень 1 достигается при 0 XP (герой создаётся уровня 1 с total_xp=0).
"""

from dataclasses import FrozenInstanceError, dataclass

import pytest

from app.domain import HeroClass, HeroState, Region, Topic
from app.progression import (
    LevelCurve,
    award_xp,
    class_modifier,
    recompute_unlocks,
)

CURVE = LevelCurve(base_xp=100, max_level=5)
# Пороги при base_xp=100: L1=0, L2=100, L3=400, L4=900, L5=1600.


class TestLevelForXp:
    def test_level_1_at_zero_xp(self) -> None:
        assert CURVE.level_for_xp(0) == 1

    def test_exact_threshold_gives_that_level(self) -> None:
        # SPEC §7.4 (граничный): total_xp == порогу уровня N → ровно N.
        assert CURVE.level_for_xp(100) == 2
        assert CURVE.level_for_xp(400) == 3

    def test_one_below_threshold_is_previous_level(self) -> None:
        assert CURVE.level_for_xp(99) == 1
        assert CURVE.level_for_xp(399) == 2

    def test_capped_at_max_level(self) -> None:
        assert CURVE.level_for_xp(10_000) == 5

    def test_negative_xp_raises(self) -> None:
        with pytest.raises(ValueError):
            CURVE.level_for_xp(-1)


class TestXpToNextLevel:
    def test_from_zero(self) -> None:
        assert CURVE.xp_to_next_level(0) == 100

    def test_partway(self) -> None:
        assert CURVE.xp_to_next_level(50) == 50

    def test_zero_at_max_level(self) -> None:
        assert CURVE.xp_to_next_level(1600) == 0


class TestLevelCurveValidation:
    def test_non_positive_base_xp_raises(self) -> None:
        with pytest.raises(ValueError):
            LevelCurve(base_xp=0, max_level=5)

    def test_max_level_below_one_raises(self) -> None:
        with pytest.raises(ValueError):
            LevelCurve(base_xp=100, max_level=0)

    def test_minimal_valid_values_accepted(self) -> None:
        # Граница: base_xp=1 и max_level=1 валидны (не путать с <=).
        curve = LevelCurve(base_xp=1, max_level=1)
        assert curve.level_for_xp(0) == 1

    def test_curve_is_immutable(self) -> None:
        # Ядро — чистое: LevelCurve неизменяем (frozen).
        # Имя поля в переменной: иначе ruff B010 перепишет в прямое присваивание,
        # которое отвергнет mypy (frozen-атрибут read-only).
        field_name = "base_xp"
        with pytest.raises(FrozenInstanceError):
            setattr(CURVE, field_name, 200)


MAGE = HeroClass(id="model-mage", title="Маг моделей", modifiers={"llm": 1.1})


class TestClassModifier:
    def test_modifier_for_matching_region(self) -> None:
        assert class_modifier(MAGE, "llm") == 1.1

    def test_default_for_other_region(self) -> None:
        assert class_modifier(MAGE, "ml-foundations") == 1.0

    def test_default_for_unknown_region(self) -> None:
        assert class_modifier(MAGE, "nonexistent") == 1.0


HERO = HeroState(total_xp=0, hero_class=MAGE)


class TestAwardXp:
    def test_adds_base_xp_without_modifier(self) -> None:
        result = award_xp(CURVE, HERO, 50, 1.0)
        assert result.gained_xp == 50
        assert result.state.total_xp == 50
        assert result.leveled_up is False  # 50 < 100 → всё ещё уровень 1

    def test_applies_modifier_rounded(self) -> None:
        result = award_xp(CURVE, HERO, 150, 1.1)
        assert result.gained_xp == 165  # round(150 * 1.1)
        assert result.state.total_xp == 165

    def test_detects_level_up(self) -> None:
        result = award_xp(CURVE, HERO, 100, 1.0)  # 0 → 100 → уровень 2
        assert result.leveled_up is True
        assert result.old_level == 1
        assert result.new_level == 2

    def test_does_not_mutate_input_state(self) -> None:
        award_xp(CURVE, HERO, 100, 1.0)
        assert HERO.total_xp == 0  # вход не изменён (чистая функция)

    def test_preserves_class_and_completed_topics(self) -> None:
        hero = HeroState(
            total_xp=0, hero_class=MAGE, completed_topics=frozenset({"t1"})
        )
        result = award_xp(CURVE, hero, 10, 1.0)
        assert result.state.hero_class == MAGE
        assert result.state.completed_topics == frozenset({"t1"})

    def test_non_positive_base_amount_raises(self) -> None:
        with pytest.raises(ValueError):
            award_xp(CURVE, HERO, 0, 1.0)

    def test_non_positive_modifier_raises(self) -> None:
        with pytest.raises(ValueError):
            award_xp(CURVE, HERO, 10, 0.0)

    def test_minimal_base_amount_accepted(self) -> None:
        # Граница: base_amount=1 валиден (не путать с <=1).
        result = award_xp(CURVE, HERO, 1, 1.0)
        assert result.gained_xp == 1


@dataclass(frozen=True)
class _Catalog:
    """Минимальный каталог для тестов ядра (полный — в E2)."""

    regions: tuple[Region, ...]
    topics: tuple[Topic, ...]


CAT = _Catalog(
    regions=(
        Region(id="ml", title="ML", unlock_level=1),
        Region(id="llm", title="LLM", unlock_level=2),
    ),
    topics=(
        Topic(id="t_basics", region_id="ml", prerequisites=frozenset()),
        Topic(id="t_advanced", region_id="ml", prerequisites=frozenset({"t_basics"})),
        Topic(id="t_llm", region_id="llm", prerequisites=frozenset()),
    ),
)


class TestRecomputeUnlocks:
    def test_start_region_open_others_locked(self) -> None:
        unlocks = recompute_unlocks(CURVE, HERO, CAT)
        assert "ml" in unlocks.open_regions
        assert "llm" not in unlocks.open_regions

    def test_topic_available_when_no_prereqs(self) -> None:
        unlocks = recompute_unlocks(CURVE, HERO, CAT)
        assert unlocks.topic_status["t_basics"] == "available"

    def test_topic_locked_when_prereq_incomplete(self) -> None:
        unlocks = recompute_unlocks(CURVE, HERO, CAT)
        assert unlocks.topic_status["t_advanced"] == "locked"

    def test_prereq_completed_unlocks_dependent_topic(self) -> None:
        hero = HeroState(
            total_xp=0, hero_class=MAGE, completed_topics=frozenset({"t_basics"})
        )
        unlocks = recompute_unlocks(CURVE, hero, CAT)
        assert unlocks.topic_status["t_basics"] == "completed"
        assert unlocks.topic_status["t_advanced"] == "available"

    def test_topic_in_locked_region_is_locked(self) -> None:
        unlocks = recompute_unlocks(CURVE, HERO, CAT)
        assert unlocks.topic_status["t_llm"] == "locked"

    def test_level_up_opens_region_and_topic(self) -> None:
        # SPEC §7.4: уровень 2 (xp=100) открывает регион llm.
        hero = HeroState(total_xp=100, hero_class=MAGE)
        unlocks = recompute_unlocks(CURVE, hero, CAT)
        assert "llm" in unlocks.open_regions
        assert unlocks.topic_status["t_llm"] == "available"
