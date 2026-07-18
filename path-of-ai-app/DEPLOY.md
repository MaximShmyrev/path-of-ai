# DEPLOY — «Путь ИИ» (runbook для агента)

> Исполнитель: агент **openclaw** на сервере **Mac mini (macOS)**.
> Цель: развернуть/обновить прод-стек (фронтенд + бэкенд + PostgreSQL) в Docker.
> Стиль: каждый шаг = команда + проверка результата + действие при сбое.
> Все команды идемпотентны (повторный запуск безопасен).

## Что разворачивается

Прод-стек из 3 контейнеров (`docker-compose.prod.yml`):

- **frontend** — nginx раздаёт собранную статику SPA и проксирует `/api` на бэкенд
  (один origin, без CORS). Публикуется на `${WEB_PORT}` (по умолчанию 8080).
- **backend** — FastAPI (Python), внутренний порт 8000 (наружу не публикуется).
- **db** — PostgreSQL 16, данные в именованном volume `postgres-data` (переживают
  пересоздание контейнеров).

Все сервисы с `restart: unless-stopped` — поднимаются сами после рестарта Docker.

Параметры (заполняются в `.env`, см. шаг 2):

| Переменная | Назначение | Обязательна |
|---|---|---|
| `WEB_PORT` | порт публикации (по умолчанию 8080) | нет |
| `POSTGRES_USER/PASSWORD/DB` | креды БД (в проде — сильный пароль) | да |
| `GLM_API_KEY`, `GLM_BASE_URL` | живая генерация событий (z.ai) | нет¹ |
| `REPLICATE_API_TOKEN` | генерация артов (нужен только для `python -m app.assets`) | нет² |

¹ Без `GLM_*` события берутся из детерминированного банка (`source:"bank"`).
² Арты уже сгенерированы и закоммичены; токен нужен только для перегенерации.

---

## Шаг 0. Предусловия (проверить, не продолжать при провале)

```bash
docker version            # Docker установлен
docker info               # демон запущен; если нет — запустить Docker Desktop / colima
git --version             # git установлен
```

- Если `docker info` падает: запустить Docker (`open -a Docker`), подождать готовности:
  ```bash
  until docker info >/dev/null 2>&1; do sleep 3; done
  ```
- Проверить свободен ли порт публикации (по умолчанию 8080):
  ```bash
  lsof -iTCP:8080 -sTCP:LISTEN || echo "порт 8080 свободен"
  ```
  Если занят — задать другой `WEB_PORT` в `.env` (шаг 2).

---

## Шаг 1. Получить код

```bash
DEPLOY_DIR="$HOME/path-of-ai"
if [ -d "$DEPLOY_DIR/.git" ]; then
  git -C "$DEPLOY_DIR" fetch --all && git -C "$DEPLOY_DIR" reset --hard origin/main
else
  git clone https://github.com/MaximShmyrev/path-of-ai.git "$DEPLOY_DIR"
fi
cd "$DEPLOY_DIR"
git log -1 --oneline    # проверка: видна ожидаемая ревизия
```

---

## Шаг 2. Секреты (`.env`) — НЕ коммитить

`.env` уже в `.gitignore`. Создать из шаблона и заполнить значениями из защищённого
хранилища секретов агента (не вписывать секреты в команды/логи открыто).

```bash
cd "$DEPLOY_DIR"
[ -f .env ] || cp .env.example .env
```

Затем установить значения (пример; `<...>` заменить на реальные из секрет-стора):

```bash
# Обязательно сменить пароль БД на сильный:
#   POSTGRES_PASSWORD=<сильный-пароль>
# Опционально (живой GLM):
#   GLM_API_KEY=<ключ z.ai>
#   GLM_BASE_URL=https://api.z.ai/api/anthropic
# Порт при необходимости:
#   WEB_PORT=8080
```

Проверка: `.env` не отслеживается git и содержит нужные ключи:

```bash
git check-ignore .env && echo ".env заигнорен — OK"
grep -q '^POSTGRES_PASSWORD=' .env && echo "пароль БД задан"
```

---

## Шаг 3. Сборка и запуск

```bash
cd "$DEPLOY_DIR"
docker compose -f docker-compose.prod.yml up -d --build
```

Ожидание готовности (db + backend healthy):

```bash
for i in $(seq 1 40); do
  be=$(docker inspect --format '{{.State.Health.Status}}' \
       "$(docker compose -f docker-compose.prod.yml ps -q backend)" 2>/dev/null)
  [ "$be" = "healthy" ] && break
  sleep 3
done
echo "backend health: $be"      # ожидается: healthy
```

Если не `healthy` за ~2 мин — см. «Диагностика».

---

## Шаг 4. Проверка деплоя (smoke, не разрушающая данные)

```bash
PORT="${WEB_PORT:-8080}"
curl -fsS "http://localhost:$PORT/" | grep -o '<title>.*</title>'        # SPA отдаётся
curl -fsS -o /dev/null -w 'health: %{http_code}\n' "http://localhost:$PORT/health"     # 200
curl -s -o /dev/null -w 'map api: %{http_code}\n' "http://localhost:$PORT/api/map"     # 200 или 404 (если героя ещё нет) — оба значат, что API жив
curl -fsS -o /dev/null -w 'asset: %{http_code}\n' "http://localhost:$PORT/assets/classes/model-mage.webp"  # 200
```

Критерий успеха: SPA-страница с `<title>Путь ИИ</title>`, `health` = 200, `asset` = 200,
`map api` ∈ {200, 404}. Любой 5xx или отказ соединения — деплой не удался.

Доступ: `http://<адрес-mac-mini>:<WEB_PORT>` (в локальной сети — по IP/имени хоста Mac mini).

---

## Шаг 5. Обновление (повторный деплой новой версии)

```bash
cd "$DEPLOY_DIR"
git fetch --all && git reset --hard origin/main
docker compose -f docker-compose.prod.yml up -d --build
# затем повторить ожидание health (Шаг 3) и smoke (Шаг 4)
```

Данные БД сохраняются (volume `postgres-data`). Откат — на предыдущую ревизию:

```bash
git -C "$DEPLOY_DIR" reset --hard <предыдущий-commit-sha>
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Резервная копия данных (рекомендуется перед обновлением)

```bash
cd "$DEPLOY_DIR"
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "${POSTGRES_USER:-pathofai}" "${POSTGRES_DB:-pathofai}" \
  > "backup-$(date +%Y%m%d-%H%M%S).sql"
```

(Дату агент подставляет сам; восстановление — `psql < backup.sql` в контейнер db.)

---

## Диагностика

```bash
cd "$DEPLOY_DIR"
docker compose -f docker-compose.prod.yml ps          # статусы контейнеров
docker compose -f docker-compose.prod.yml logs backend --tail=80
docker compose -f docker-compose.prod.yml logs frontend --tail=40
docker compose -f docker-compose.prod.yml logs db --tail=40
```

Частые причины:

- **Порт занят** (`bind ... address already in use`): задать другой `WEB_PORT` в `.env`,
  повторить Шаг 3.
- **backend не healthy**: смотреть его логи; обычно БД не поднялась или неверный
  `DATABASE_URL`/пароль в `.env`.
- **Docker-демон не запущен**: `open -a Docker`, дождаться, повторить.
- **502 на `/api`**: бэкенд ещё не healthy — подождать; проверить логи backend.

## Остановка / удаление

```bash
docker compose -f docker-compose.prod.yml down            # остановить (данные сохранены)
docker compose -f docker-compose.prod.yml down -v         # + УДАЛИТЬ данные БД (осторожно!)
```

---

## Заметки по безопасности

- `.env` с секретами не коммитится (в `.gitignore`); агент не выводит секреты в логи.
- Бэкенд и БД наружу не публикуются — доступ только через nginx (`/api`).
- В проде сменить `POSTGRES_PASSWORD` на сильный.
- Для доступа извне локальной сети — поставить reverse-proxy с TLS (вне рамок MVP).
