"""HTTP API (FastAPI) — тонкий adapter на HTTP-шве (SPEC §4.3, §6).

Адаптер не содержит бизнес-правил: разбирает запрос, зовёт ядро/quests, мапит
доменные ошибки в HTTP-коды. Каталог загружается один раз при сборке приложения
(create_app), состояние — через StateStore. Анти-чит: total_xp/level от клиента не
принимаются (их нет в DTO), эталоны квизов не попадают в ответы.
"""

import os
from typing import Literal

from fastapi import APIRouter, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from app.catalog import Catalog, default_catalog
from app.domain import EventContext, EventSource, HeroRecord, QuestKind, TopicStatus
from app.progression import LevelCurve
from app.quests import (
    HeroNotFound,
    InvalidSubmission,
    LocationLocked,
    QuestNotFound,
    QuestService,
    QuizSubmission,
)
from app.state import InMemoryStore, StateStore
from app.story import GlmAdapter, SeedBankAdapter, StoryGenerator

router = APIRouter(prefix="/api")


# --- DTO ---


class HeroCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    class_id: str
    avatar_ref: str | None = None

    @field_validator("name")
    @classmethod
    def _name_not_blank(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Имя не должно быть пустым")
        return stripped


class HeroResponse(BaseModel):
    name: str
    class_id: str
    avatar_ref: str | None
    level: int
    total_xp: int
    xp_to_next_level: int


class TopicMapItem(BaseModel):
    id: str
    title: str
    status: TopicStatus


class RegionMapItem(BaseModel):
    id: str
    title: str
    unlock_level: int
    status: Literal["open", "locked"]
    topics: list[TopicMapItem]


class MapResponse(BaseModel):
    level: int
    regions: list[RegionMapItem]


class QuizQuestionResponse(BaseModel):
    """Вопрос квиза БЕЗ эталонного ответа (анти-чит, SPEC §7.8)."""

    prompt: str
    options: list[str]


class QuestResponse(BaseModel):
    id: str
    title: str
    kind: QuestKind
    xp: int
    quiz: list[QuizQuestionResponse]


class TopicResponse(BaseModel):
    id: str
    title: str
    status: TopicStatus
    quests: list[QuestResponse]


class CompleteRequest(BaseModel):
    answers: list[int] | None = None


class CompleteResponse(BaseModel):
    gained_xp: int
    leveled_up: bool
    new_level: int
    newly_unlocked_regions: list[str]
    already_completed: bool
    hero: HeroResponse


class EventResponse(BaseModel):
    text: str
    source: EventSource


# --- Вспомогательные ---


def _catalog(request: Request) -> Catalog:
    catalog: Catalog = request.app.state.catalog
    return catalog


def _store(request: Request) -> StateStore:
    store: StateStore = request.app.state.store
    return store


def _service(request: Request) -> QuestService:
    return QuestService(catalog=_catalog(request), store=_store(request))


def _hero_response(hero: HeroRecord, catalog: Catalog) -> HeroResponse:
    curve = LevelCurve(base_xp=catalog.base_xp, max_level=catalog.max_level)
    return HeroResponse(
        name=hero.name,
        class_id=hero.hero_class_id,
        avatar_ref=hero.avatar_ref,
        level=curve.level_for_xp(hero.total_xp),
        total_xp=hero.total_xp,
        xp_to_next_level=curve.xp_to_next_level(hero.total_xp),
    )


# --- Эндпоинты героя ---


@router.post("/hero", status_code=201, response_model=HeroResponse)
def create_hero(body: HeroCreateRequest, request: Request) -> HeroResponse:
    catalog = _catalog(request)
    store = _store(request)
    if store.load_hero() is not None:
        raise HTTPException(status_code=409, detail="Герой уже существует")
    try:
        catalog.hero_class(body.class_id)
    except KeyError as exc:
        raise HTTPException(
            status_code=422, detail=f"Неизвестный класс: {body.class_id}"
        ) from exc
    hero = HeroRecord(
        name=body.name, hero_class_id=body.class_id, avatar_ref=body.avatar_ref
    )
    store.save_hero(hero)
    return _hero_response(hero, catalog)


@router.get("/hero", response_model=HeroResponse)
def get_hero(request: Request) -> HeroResponse:
    hero = _store(request).load_hero()
    if hero is None:
        raise HTTPException(status_code=404, detail="Герой не найден")
    return _hero_response(hero, _catalog(request))


@router.get("/map", response_model=MapResponse)
def get_map(request: Request) -> MapResponse:
    catalog = _catalog(request)
    service = _service(request)
    hero = service.load_hero()  # HeroNotFound → 404 (обработчик)
    unlocks = service.unlocks_for(hero)
    regions = [
        RegionMapItem(
            id=region.id,
            title=region.title,
            unlock_level=region.unlock_level,
            status="open" if region.id in unlocks.open_regions else "locked",
            topics=[
                TopicMapItem(
                    id=topic.id,
                    title=topic.title,
                    status=unlocks.topic_status[topic.id],
                )
                for topic in catalog.topics
                if topic.region_id == region.id
            ],
        )
        for region in catalog.regions
    ]
    return MapResponse(level=service.level_of(hero), regions=regions)


@router.get("/topics/{topic_id}", response_model=TopicResponse)
def get_topic(topic_id: str, request: Request) -> TopicResponse:
    catalog = _catalog(request)
    service = _service(request)
    hero = service.load_hero()  # HeroNotFound → 404
    try:
        topic = catalog.topic(topic_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Тема не найдена") from exc
    status = service.unlocks_for(hero).topic_status[topic_id]
    if status == "locked":
        raise HTTPException(
            status_code=423, detail="Локация заблокирована: нужен уровень/пререквизиты"
        )
    quests = [
        QuestResponse(
            id=quest.id,
            title=quest.title,
            kind=quest.kind,
            xp=quest.xp,
            quiz=[
                QuizQuestionResponse(prompt=item.prompt, options=list(item.options))
                for item in quest.quiz
            ],
        )
        for quest in catalog.quests_for_topic(topic_id)
    ]
    return TopicResponse(id=topic.id, title=topic.title, status=status, quests=quests)


@router.post("/quests/{quest_id}/complete", response_model=CompleteResponse)
def complete_quest(
    quest_id: str, body: CompleteRequest, request: Request
) -> CompleteResponse:
    catalog = _catalog(request)
    service = _service(request)
    submission = (
        QuizSubmission(answers=tuple(body.answers))
        if body.answers is not None
        else None
    )
    # Доменные ошибки (QuestNotFound/LocationLocked/InvalidSubmission/HeroNotFound)
    # мапятся в HTTP-коды зарегистрированными обработчиками.
    result = service.complete_quest(quest_id, submission)
    return CompleteResponse(
        gained_xp=result.gained_xp,
        leveled_up=result.leveled_up,
        new_level=result.new_level,
        newly_unlocked_regions=sorted(result.newly_unlocked_regions),
        already_completed=result.already_completed,
        hero=_hero_response(result.hero, catalog),
    )


@router.post("/locations/{location_id}/event", response_model=EventResponse)
def location_event(location_id: str, request: Request) -> EventResponse:
    catalog = _catalog(request)
    service = _service(request)
    store = _store(request)
    story: StoryGenerator = request.app.state.story

    hero = service.load_hero()  # HeroNotFound → 404
    try:
        topic = catalog.topic(location_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Локация не найдена") from exc
    if not topic.events:
        raise HTTPException(
            status_code=404, detail="События недоступны для этой локации"
        )
    if service.unlocks_for(hero).topic_status[location_id] == "locked":
        raise HTTPException(status_code=423, detail="Локация заблокирована")

    region = catalog.region(topic.region_id)
    event = story.generate_event(
        EventContext(
            hero_name=hero.name,
            hero_level=service.level_of(hero),
            region_title=region.title,
            topic_title=topic.title,
        )
    )
    store.save_event(location_id, event)
    return EventResponse(text=event.text, source=event.source)


# --- Сборка приложения ---


def _build_story(catalog: Catalog) -> StoryGenerator:
    """Сборка генератора событий: банк из seed + опциональный GLM по ключу из env."""
    bank = SeedBankAdapter(templates=catalog.events_bank)
    api_key = os.environ.get("GLM_API_KEY")
    base_url = os.environ.get("GLM_BASE_URL")
    primary = (
        GlmAdapter(api_key=api_key, base_url=base_url) if api_key and base_url else None
    )
    return StoryGenerator(fallback=bank, primary=primary)


def create_app(
    catalog: Catalog | None = None,
    store: StateStore | None = None,
    story: StoryGenerator | None = None,
) -> FastAPI:
    app = FastAPI(title="Путь ИИ — backend")
    # Каталог грузится один раз при старте (O(1)-индексы кэшируются, SPEC §9).
    resolved_catalog = catalog if catalog is not None else default_catalog()
    app.state.catalog = resolved_catalog
    app.state.store = store if store is not None else InMemoryStore()
    app.state.story = story if story is not None else _build_story(resolved_catalog)

    origins = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173").split(",")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        """Liveness-проба, не зависит от БД (PLAN E0)."""
        return {"status": "ok"}

    @app.get("/health/ready")
    def ready(request: Request) -> dict[str, str]:
        """Readiness: проверяет доступность хранилища (БД)."""
        try:
            _store(request).load_hero()
        except Exception as exc:  # noqa: BLE001 — наружу отдаём 503
            raise HTTPException(status_code=503, detail="Хранилище недоступно") from exc
        return {"status": "ready"}

    _register_error_handlers(app)
    app.include_router(router)
    return app


# Доменные ошибки → HTTP-коды (adapter не содержит бизнес-правил).
_ERROR_STATUS: dict[type[Exception], int] = {
    HeroNotFound: 404,
    QuestNotFound: 404,
    LocationLocked: 423,
    InvalidSubmission: 422,
}


def _register_error_handlers(app: FastAPI) -> None:
    for error_type, status_code in _ERROR_STATUS.items():

        async def handler(
            _request: Request, exc: Exception, _status: int = status_code
        ) -> JSONResponse:
            return JSONResponse(status_code=_status, content={"detail": str(exc)})

        app.add_exception_handler(error_type, handler)
