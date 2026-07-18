# AI Agents 2026 RPG Web

Интерактивная RPG-карта курса: текущий день, зоны обучения, классы, XP и daily quests.

## Запуск

```bash
cd /Users/doc/.openclaw/workspace/courses/ai-agents-2026/rpg-web
docker compose up -d --build
```

Открыть:

```text
http://localhost:8789
```

## Прогресс

Текущая версия хранит прогресс в `localStorage` браузера. Это хорошо для быстрого личного трекера.

Для синхронизации между устройствами нужен следующий слой: маленький backend с SQLite/Postgres и API `GET/PUT /progress`.

