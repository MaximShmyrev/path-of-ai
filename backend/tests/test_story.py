"""E6: генератор сюжетных событий (SPEC §4.3, §7.7).

StoryGenerator пробует основной адаптер (GLM), валидирует выход и при сбое/мусоре
молча уходит в детерминированный банк. Источник помечается (glm|bank).
"""

import os

import pytest

from app.domain import EventContext
from app.story import GlmAdapter, SeedBankAdapter, StoryGenerator

CTX = EventContext(
    hero_name="Артур",
    hero_level=2,
    region_title="Цитадель LLM",
    topic_title="Трансформеры",
)
BANK = SeedBankAdapter(
    templates=(
        "{hero} входит в локацию «{topic}».",
        "Врата региона «{region}» открываются перед {hero}.",
    )
)


class _FakeGlm:
    def __init__(self, text: str | None = None, error: Exception | None = None):
        self._text = text
        self._error = error

    def generate(self, ctx: EventContext) -> str:
        if self._error is not None:
            raise self._error
        assert self._text is not None
        return self._text


class TestSeedBank:
    def test_deterministic_and_russian(self) -> None:
        first = BANK.generate(CTX)
        second = BANK.generate(CTX)
        assert first == second  # детерминированно по контексту
        assert "Артур" in first


class TestStoryGenerator:
    def test_bank_when_no_primary(self) -> None:
        event = StoryGenerator(fallback=BANK).generate_event(CTX)
        assert event.source == "bank"
        assert "Артур" in event.text

    def test_glm_when_primary_valid(self) -> None:
        gen = StoryGenerator(
            fallback=BANK, primary=_FakeGlm(text="Артур вступает в битву теней.")
        )
        event = gen.generate_event(CTX)
        assert event.source == "glm"
        assert "Артур" in event.text

    def test_fallback_on_primary_error(self) -> None:
        gen = StoryGenerator(
            fallback=BANK, primary=_FakeGlm(error=RuntimeError("timeout"))
        )
        assert gen.generate_event(CTX).source == "bank"

    def test_fallback_on_non_russian_output(self) -> None:
        gen = StoryGenerator(
            fallback=BANK, primary=_FakeGlm(text="Arthur enters the battle.")
        )
        assert gen.generate_event(CTX).source == "bank"

    def test_fallback_on_too_long_output(self) -> None:
        gen = StoryGenerator(fallback=BANK, primary=_FakeGlm(text="а" * 5000))
        assert gen.generate_event(CTX).source == "bank"

    def test_fallback_on_empty_output(self) -> None:
        gen = StoryGenerator(fallback=BANK, primary=_FakeGlm(text="   "))
        assert gen.generate_event(CTX).source == "bank"


@pytest.mark.live_llm
def test_glm_live_generates_russian() -> None:
    """Живой вызов GLM (запускается только с ключом, вне обычного прогона)."""
    api_key = os.environ.get("GLM_API_KEY")
    base_url = os.environ.get("GLM_BASE_URL")
    if not (api_key and base_url):
        pytest.skip("GLM_API_KEY/GLM_BASE_URL не заданы")
    text = GlmAdapter(api_key=api_key, base_url=base_url).generate(CTX)
    assert text.strip()
