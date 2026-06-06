"""Генерация сюжетных событий за швом StoryGenerator (SPEC §4.3, §7.7).

Основной путь — GLM (Anthropic-совместимый эндпоинт). При отсутствии ключа, сбое,
таймауте или невалидном выходе (не русский / слишком длинный / пустой / управляющие
символы) — молчаливый фоллбэк на детерминированный банк из seed. `/event` благодаря
этому всегда отдаёт результат, а прохождение квестов не зависит от LLM.
"""

import logging
from dataclasses import dataclass
from typing import Protocol

from anthropic import Anthropic

from app.domain import EventContext, StoryEvent

logger = logging.getLogger(__name__)

MAX_EVENT_LENGTH = 1200


class EventAdapter(Protocol):
    def generate(self, ctx: EventContext) -> str: ...


MAX_LATIN_RATIO = 0.25  # доля латиницы среди букв; выше → текст «не русский»


def _has_cjk(text: str) -> bool:
    """Есть ли иероглифы CJK (модель иногда протекает китайским — это дефект)."""
    return any("一" <= char <= "鿿" for char in text)


def _russian_dominates(text: str) -> bool:
    """Кириллица доминирует: латиницы не больше MAX_LATIN_RATIO от всех букв.

    Пропускает редкие ИИ-термины латиницей, но отвергает «в основном английский».
    """
    cyrillic = sum("а" <= char.lower() <= "я" for char in text)
    latin = sum("a" <= char.lower() <= "z" for char in text)
    if cyrillic == 0:
        return False
    return latin / (cyrillic + latin) <= MAX_LATIN_RATIO


def _is_valid_event(text: str) -> bool:
    """Проверка выхода: непустой, в пределах длины, без управляющих байтов и CJK,
    с доминированием русского (иначе → фоллбэк на банк)."""
    stripped = text.strip()
    if not stripped or len(text) > MAX_EVENT_LENGTH:
        return False
    if any(ord(char) < 32 and char not in "\n\t" for char in text):
        return False
    if _has_cjk(text):
        return False
    return _russian_dominates(text)


@dataclass(frozen=True)
class SeedBankAdapter:
    """Детерминированный банк событий из seed. Выбор шаблона стабилен по контексту."""

    templates: tuple[str, ...]

    def generate(self, ctx: EventContext) -> str:
        if not self.templates:
            raise ValueError("Банк событий пуст")
        # Стабильный по контексту индекс (без random — воспроизводимо между процессами).
        index = sum(ctx.topic_title.encode("utf-8")) % len(self.templates)
        return self.templates[index].format(
            hero=ctx.hero_name,
            region=ctx.region_title,
            topic=ctx.topic_title,
            level=ctx.hero_level,
        )


@dataclass(frozen=True)
class GlmAdapter:
    """Адаптер GLM через Anthropic-совместимый SDK (живой путь, опционально)."""

    api_key: str
    base_url: str
    model: str = "glm-4.6"
    timeout: float = 8.0

    def generate(self, ctx: EventContext) -> str:  # pragma: no cover — live-only
        client = Anthropic(
            api_key=self.api_key, base_url=self.base_url, timeout=self.timeout
        )
        message = client.messages.create(
            model=self.model,
            max_tokens=400,
            messages=[{"role": "user", "content": _prompt(ctx)}],
        )
        return "".join(block.text for block in message.content if block.type == "text")


def _prompt(ctx: EventContext) -> str:  # pragma: no cover — live-only
    return (
        "Ты — рассказчик олдскульной RPG. Сгенерируй короткое атмосферное событие "
        "(2–4 предложения) в тёмном фэнтези-стиле.\n"
        "ЯЗЫК: пиши ИСКЛЮЧИТЕЛЬНО на русском языке. Англоязычные слова и фразы "
        "ЗАПРЕЩЕНЫ, кроме общепринятых терминов ИИ (например: трансформер, токен, "
        "эмбеддинг, промпт). Никакого смешения языков и латиницы в обычных словах.\n"
        f"Герой: {ctx.hero_name}, уровень {ctx.hero_level}. "
        f"Регион: «{ctx.region_title}». Локация: «{ctx.topic_title}».\n"
        "Формат: только текст события, без markdown и заголовков. "
        "Не повторяй эти условия в ответе."
    )


@dataclass(frozen=True)
class StoryGenerator:
    """Шов генерации: основной адаптер с фоллбэком на банк."""

    fallback: SeedBankAdapter
    primary: EventAdapter | None = None

    def generate_event(self, ctx: EventContext) -> StoryEvent:
        if self.primary is not None:
            try:
                text = self.primary.generate(ctx)
                if _is_valid_event(text):
                    return StoryEvent(text=text.strip(), source="glm")
                logger.warning("LLM вернул невалидный текст — фоллбэк на банк")
            except Exception as exc:  # noqa: BLE001 — любой сбой LLM → фоллбэк
                logger.warning("LLM недоступен (%s) — фоллбэк на банк", exc)
        return StoryEvent(text=self.fallback.generate(ctx), source="bank")
