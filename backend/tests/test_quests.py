"""E3: оркестрация прохождения квеста (SPEC §4.3, §7.3, §7.4, §7.5).

Используется реальный seed (`default_catalog`) для приближенности к рантайму.
StateStore = InMemoryStore (Postgres — в E5).
"""

import pytest

from app.catalog import default_catalog
from app.domain import HeroRecord
from app.quests import (
    InvalidSubmission,
    LocationLocked,
    QuestNotFound,
    QuestService,
    QuizSubmission,
)
from app.state import InMemoryStore


def _hero(
    total_xp: int = 0,
    completed: frozenset[str] = frozenset(),
    class_id: str = "model-mage",
) -> HeroRecord:
    return HeroRecord(
        name="Герой",
        hero_class_id=class_id,
        total_xp=total_xp,
        completed_quests=completed,
    )


def _service(hero: HeroRecord | None) -> tuple[QuestService, InMemoryStore]:
    store = InMemoryStore()
    if hero is not None:
        store.save_hero(hero)
    return QuestService(catalog=default_catalog(), store=store), store


class TestCompletePractice:
    def test_awards_xp_and_marks_completed(self) -> None:
        service, store = _service(_hero())
        result = service.complete_quest(
            "supervised-basics-practice", QuizSubmission(answers=(1,))
        )
        assert result.gained_xp == 150  # модификатор model-mage для ml = 1.0
        assert result.already_completed is False
        stored = store.load_hero()
        assert stored is not None
        assert stored.total_xp == 150
        assert "supervised-basics-practice" in stored.completed_quests

    def test_theory_quest_completes_without_quiz(self) -> None:
        service, store = _service(_hero())
        result = service.complete_quest("supervised-basics-theory", None)
        assert result.gained_xp == 50
        stored = store.load_hero()
        assert stored is not None
        assert "supervised-basics-theory" in stored.completed_quests


class TestIdempotency:
    def test_repeat_completed_quest_does_not_reaward(self) -> None:
        # SPEC §7.3 (граничный): повторная сдача завершённого квеста.
        service, store = _service(
            _hero(total_xp=150, completed=frozenset({"supervised-basics-practice"}))
        )
        result = service.complete_quest(
            "supervised-basics-practice", QuizSubmission(answers=(1,))
        )
        assert result.already_completed is True
        assert result.gained_xp == 0
        assert result.leveled_up is False
        assert result.newly_unlocked_regions == frozenset()
        stored = store.load_hero()
        assert stored is not None
        assert stored.total_xp == 150


class TestInvalidSubmission:
    def test_wrong_quiz_answer_rejected_and_no_xp(self) -> None:
        # SPEC §7.3 (негативный): неверная сдача → 0 XP, статус не меняется.
        service, store = _service(_hero())
        with pytest.raises(InvalidSubmission):
            service.complete_quest(
                "supervised-basics-practice", QuizSubmission(answers=(0,))
            )
        stored = store.load_hero()
        assert stored is not None
        assert stored.total_xp == 0
        assert stored.completed_quests == frozenset()

    def test_missing_submission_for_quiz_rejected(self) -> None:
        service, _ = _service(_hero())
        with pytest.raises(InvalidSubmission):
            service.complete_quest("supervised-basics-practice", None)


class TestLocked:
    def test_locked_by_region_level(self) -> None:
        # SPEC §7.5: тема региона llm (unlock_level 2) недоступна на уровне 1.
        service, _ = _service(_hero())
        with pytest.raises(LocationLocked):
            service.complete_quest(
                "transformers-practice", QuizSubmission(answers=(0,))
            )

    def test_locked_by_incomplete_prerequisite(self) -> None:
        # SPEC §7.5: регион открыт, но пререквизит-тема не завершена.
        service, _ = _service(_hero())
        with pytest.raises(LocationLocked):
            service.complete_quest(
                "model-evaluation-practice", QuizSubmission(answers=(1,))
            )


class TestLevelUpUnlock:
    def test_completion_levels_up_and_opens_region(self) -> None:
        # SPEC §7.4: 150 XP → уровень 2 → открывается регион llm.
        service, _ = _service(_hero())
        result = service.complete_quest(
            "supervised-basics-practice", QuizSubmission(answers=(1,))
        )
        assert result.leveled_up is True
        assert result.new_level == 2
        assert "llm" in result.newly_unlocked_regions


class TestPrerequisiteFlow:
    def test_completing_topic_unlocks_dependent_topic(self) -> None:
        # Завершаем ВСЕ квесты supervised-basics → тема завершена →
        # пререквизит model-evaluation выполнен → её квест доступен (не locked).
        service, _ = _service(_hero())
        service.complete_quest("supervised-basics-theory", None)
        service.complete_quest(
            "supervised-basics-practice", QuizSubmission(answers=(1,))
        )
        result = service.complete_quest(
            "model-evaluation-practice", QuizSubmission(answers=(1,))
        )
        assert result.already_completed is False
        assert result.gained_xp == 150


class TestErrors:
    def test_unknown_quest_raises(self) -> None:
        service, _ = _service(_hero())
        with pytest.raises(QuestNotFound):
            service.complete_quest("ghost", None)

    def test_no_hero_raises(self) -> None:
        from app.quests import HeroNotFound

        service, _ = _service(None)
        with pytest.raises(HeroNotFound):
            service.complete_quest("supervised-basics-theory", None)
