"""Схема БД (PostgreSQL) и ORM-модели (SQLAlchemy 2.0, синхронный) — SPEC §5.2.

Контент (регионы/темы) в БД не хранится — источник истины seed-файл. Здесь только
изменяемое состояние: герой и прогресс по квестам. Уникальность (hero_id, quest_id)
обеспечивает идемпотентность/безопасность от гонки на уровне БД (PLAN E5).
"""

from datetime import datetime

from sqlalchemy import (
    DateTime,
    Engine,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
)


class Base(DeclarativeBase):
    pass


class HeroRow(Base):
    __tablename__ = "heroes"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(40))
    hero_class_id: Mapped[str] = mapped_column(String(64))
    avatar_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class QuestProgressRow(Base):
    __tablename__ = "quest_progress"
    __table_args__ = (UniqueConstraint("hero_id", "quest_id", name="uq_hero_quest"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    hero_id: Mapped[int] = mapped_column(ForeignKey("heroes.id"))
    quest_id: Mapped[str] = mapped_column(String(128))
    awarded_xp: Mapped[int] = mapped_column(Integer)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class StoryEventRow(Base):
    __tablename__ = "story_event"

    id: Mapped[int] = mapped_column(primary_key=True)
    hero_id: Mapped[int] = mapped_column(ForeignKey("heroes.id"))
    location_id: Mapped[str] = mapped_column(String(128))
    text: Mapped[str] = mapped_column(String(2000))
    source: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


def create_schema(engine: Engine) -> None:
    """Создать таблицы, если их ещё нет (применяется при старте, PLAN E5)."""
    Base.metadata.create_all(engine)


def reset_schema(engine: Engine) -> None:
    """Пересоздать схему с нуля (для изоляции тестов)."""
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
