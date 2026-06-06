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


def _is_valid_event(text: str) -> bool:
    """Проверка выхода: непустой, в пределах длины, русский, без управляющих байтов."""
    stripped = text.strip()
    if not stripped or len(text) > MAX_EVENT_LENGTH:
        return False
    if any(ord(char) < 32 and char not in "\n\t" for char in text):
        return False
    return any("а" <= char.lower() <= "я" for char in text)


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
        "(2–4 предложения) НА РУССКОМ ЯЗЫКЕ в тёмном фэнтези-стиле. "
        f"Герой: {ctx.hero_name}, уровень {ctx.hero_level}. "
        f"Регион: «{ctx.region_title}». Локация: «{ctx.topic_title}». "
        "Без markdown, только текст события."
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
