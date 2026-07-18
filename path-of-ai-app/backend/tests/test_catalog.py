"""E2: каталог контента — загрузка и строгая валидация seed (SPEC §4.3, §7.9, §8)."""

from pathlib import Path
from typing import Any

import pytest

from app.catalog import (
    SEED_PATH,
    ContentValidationError,
    InMemorySource,
    YamlContentSource,
    default_catalog,
    load_catalog,
)


def _seed() -> dict[str, Any]:
    """Валидный минимальный seed для тестов."""
    return {
        "progression": {"base_xp": 100, "max_level": 5},
        "classes": [
            {"id": "model-mage", "title": "Маг моделей", "modifiers": {"llm": 1.1}},
        ],
        "regions": [
            {
                "id": "ml",
                "title": "Основы ML",
                "unlock_level": 1,
                "topics": [
                    {
                        "id": "t-basics",
                        "title": "Базис",
                        "prerequisites": [],
                        "quests": [
                            {
                                "id": "q-theory",
                                "title": "Свиток теории",
                                "kind": "theory",
                                "xp": 50,
                                "body": "Урок: основы.",
                            },
                            {
                                "id": "q-practice",
                                "title": "Испытание",
                                "kind": "practice",
                                "xp": 150,
                                "quiz": [
                                    {
                                        "prompt": "2+2?",
                                        "options": ["3", "4"],
                                        "answer": 1,
                                        "explanation": "Потому что 2+2=4.",
                                    }
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    }


class TestLoadValidSeed:
    def test_indexes_regions_topics_quests_by_id(self) -> None:
        catalog = load_catalog(InMemorySource(_seed()))
        assert catalog.region("ml").title == "Основы ML"
        assert catalog.topic("t-basics").region_id == "ml"
        assert catalog.quest("q-practice").kind == "practice"

    def test_parses_progression_config(self) -> None:
        catalog = load_catalog(InMemorySource(_seed()))
        assert catalog.base_xp == 100
        assert catalog.max_level == 5

    def test_unknown_id_raises_key_error(self) -> None:
        catalog = load_catalog(InMemorySource(_seed()))
        with pytest.raises(KeyError):
            catalog.quest("does-not-exist")


def _practice(quest_id: str) -> dict[str, Any]:
    """Минимальный валидный практический квест с квизом."""
    return {
        "id": quest_id,
        "title": "Практика",
        "kind": "practice",
        "xp": 100,
        "quiz": [
            {
                "prompt": "?",
                "options": ["a", "b"],
                "answer": 0,
                "explanation": "Разбор.",
            }
        ],
    }


class TestSemanticValidation:
    def test_topic_without_practice_rejected(self) -> None:
        # SPEC §7.9 / §8: у каждой темы должен быть ≥1 практический квест.
        seed = _seed()
        seed["regions"][0]["topics"][0]["quests"] = [
            {"id": "only-theory", "title": "T", "kind": "theory", "xp": 50},
        ]
        with pytest.raises(ContentValidationError):
            load_catalog(InMemorySource(seed))

    def test_theory_without_body_rejected(self) -> None:
        # SPEC §7.9/§8 (рев.2): у theory-квеста обязателен непустой урок (body).
        seed = _seed()
        seed["regions"][0]["topics"][0]["quests"][0]["body"] = "   "
        with pytest.raises(ContentValidationError):
            load_catalog(InMemorySource(seed))

    def test_quiz_question_without_explanation_rejected(self) -> None:
        # SPEC §7.9/§8 (рев.2): у каждого вопроса квиза обязателен разбор (explanation).
        seed = _seed()
        seed["regions"][0]["topics"][0]["quests"][1]["quiz"][0]["explanation"] = ""
        with pytest.raises(ContentValidationError):
            load_catalog(InMemorySource(seed))

    def test_cyclic_prerequisites_rejected(self) -> None:
        # SPEC §7.9: граф пререквизитов обязан быть DAG.
        seed = _seed()
        seed["regions"][0]["topics"] = [
            {
                "id": "a",
                "title": "A",
                "prerequisites": ["b"],
                "quests": [_practice("qa")],
            },
            {
                "id": "b",
                "title": "B",
                "prerequisites": ["a"],
                "quests": [_practice("qb")],
            },
        ]
        with pytest.raises(ContentValidationError):
            load_catalog(InMemorySource(seed))

    def test_dangling_prerequisite_rejected(self) -> None:
        seed = _seed()
        seed["regions"][0]["topics"][0]["prerequisites"] = ["ghost"]
        with pytest.raises(ContentValidationError):
            load_catalog(InMemorySource(seed))

    def test_duplicate_topic_id_rejected(self) -> None:
        seed = _seed()
        seed["regions"][0]["topics"].append(
            {"id": "t-basics", "title": "Дубль", "quests": [_practice("dup-q")]},
        )
        with pytest.raises(ContentValidationError):
            load_catalog(InMemorySource(seed))

    def test_duplicate_quest_id_rejected(self) -> None:
        seed = _seed()
        seed["regions"][0]["topics"].append(
            {"id": "t-two", "title": "Тема 2", "quests": [_practice("q-practice")]},
        )
        with pytest.raises(ContentValidationError):
            load_catalog(InMemorySource(seed))

    def test_decreasing_region_unlock_level_rejected(self) -> None:
        seed = _seed()
        seed["regions"].append(
            {
                "id": "r2",
                "title": "Регион 2",
                "unlock_level": 0,  # меньше предыдущего (1) → ошибка
                "topics": [
                    {"id": "t2", "title": "Тема", "quests": [_practice("q2")]},
                ],
            },
        )
        with pytest.raises(ContentValidationError):
            load_catalog(InMemorySource(seed))

    def test_quiz_answer_out_of_range_rejected(self) -> None:
        seed = _seed()
        seed["regions"][0]["topics"][0]["quests"][1]["quiz"][0]["answer"] = 9
        with pytest.raises(ContentValidationError):
            load_catalog(InMemorySource(seed))

    def test_practice_without_quiz_rejected(self) -> None:
        seed = _seed()
        seed["regions"][0]["topics"][0]["quests"][1]["quiz"] = []
        with pytest.raises(ContentValidationError):
            load_catalog(InMemorySource(seed))


class TestParsing:
    def test_events_flag_defaults_false(self) -> None:
        catalog = load_catalog(InMemorySource(_seed()))
        assert catalog.topic("t-basics").events is False

    def test_events_flag_parsed_when_true(self) -> None:
        seed = _seed()
        seed["regions"][0]["topics"][0]["events"] = True
        catalog = load_catalog(InMemorySource(seed))
        assert catalog.topic("t-basics").events is True

    def test_class_modifiers_parsed(self) -> None:
        catalog = load_catalog(InMemorySource(_seed()))
        assert catalog.hero_class("model-mage").modifiers["llm"] == 1.1

    def test_quests_for_topic(self) -> None:
        catalog = load_catalog(InMemorySource(_seed()))
        quest_ids = {q.id for q in catalog.quests_for_topic("t-basics")}
        assert quest_ids == {"q-theory", "q-practice"}


class TestShippedSeed:
    """Реальный seed проекта должен проходить все инварианты (SPEC §8)."""

    def test_loads_without_errors(self) -> None:
        catalog = load_catalog(YamlContentSource(SEED_PATH))
        assert len(catalog.regions) >= 3  # ML, LLM, RAG, Агенты
        assert len(catalog.topics) >= 12

    def test_default_catalog_matches_seed(self) -> None:
        assert default_catalog().base_xp > 0

    def test_every_topic_has_practice_quest(self) -> None:
        # §8: каждая учебная тема содержит ≥1 практический квест.
        catalog = default_catalog()
        for topic in catalog.topics:
            kinds = {q.kind for q in catalog.quests_for_topic(topic.id)}
            assert "practice" in kinds, f"тема {topic.id} без практики"


class TestYamlContentSource:
    def test_loads_dict_yaml(self, tmp_path: Path) -> None:
        path = tmp_path / "seed.yaml"
        path.write_text("progression:\n  base_xp: 1\n", encoding="utf-8")
        assert YamlContentSource(path).read()["progression"]["base_xp"] == 1

    def test_non_mapping_yaml_rejected(self, tmp_path: Path) -> None:
        path = tmp_path / "bad.yaml"
        path.write_text("- a\n- b\n", encoding="utf-8")
        with pytest.raises(ContentValidationError):
            YamlContentSource(path).read()
