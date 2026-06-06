# Путь ИИ

РПГ для геймификации изучения ИИ в стиле олдскульных RPG. Прогресс и программа
обучения подаются как игровой мир: герой, карта регионов (области ИИ), локации-темы,
квесты с практикой, опыт и уровни.

Документы проекта: [`SPEC.md`](SPEC.md) — спецификация, [`PLAN.md`](PLAN.md) — план
разработки (TDD, по этапам). Воркфлоу разработки (SDD-kit) — в
[`.ai/prompts/README.md`](.ai/prompts/README.md).

## Стек

- **Фронтенд:** React 18 + TypeScript + Vite
- **Бэкенд:** Python 3.12 + FastAPI
- **БД:** PostgreSQL 16
- **Запуск:** Docker Compose

## Быстрый старт

```bash
cp .env.example .env      # ключи опциональны — без них работают фоллбэки
docker compose up --build
```

- Фронтенд: http://localhost:5173
- Бэкенд (health): http://localhost:8000/health

Без ключей приложение полностью функционально: события берутся из детерминированного
банка, арты — из SVG-плейсхолдеров. Живая генерация включается ключами в `.env`
(см. комментарии в `.env.example`).

## Разработка

### Бэкенд (`backend/`)

```bash
cd backend
uv sync                       # установка зависимостей
uv run pytest                 # тесты
uv run ruff check . && uv run ruff format --check .
uv run mypy                   # строгая типизация
```

### Фронтенд (`frontend/`)

```bash
cd frontend
npm install
npm run test                  # vitest
npm run typecheck             # tsc --strict
npm run lint                  # eslint
npm run format:check          # prettier
```

### Графика (арты)

UI-хром и карта — векторные (SVG/CSS), в коде. Рисованные арты (портреты классов,
фоны регионов) генерируются офлайн через Flux (Replicate) и кладутся в
`frontend/public/assets/` + манифест `frontend/src/theme/assetManifest.json`:

```bash
cd backend
REPLICATE_API_TOKEN=... uv run python -m app.assets   # реальные арты (Flux)
uv run python -m app.assets                            # без ключа — SVG-плейсхолдеры
```

Без сгенерированных артов фронтенд показывает векторные плейсхолдеры (сцены не ломаются).
