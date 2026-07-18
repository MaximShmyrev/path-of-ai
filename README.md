# AI Agents 2026 RPG Web

Интерактивная RPG-карта курса: текущий день, зоны обучения, классы, XP и daily quests.

## Запуск

```bash
cd /opt/path-of-ai
docker compose up -d --build
```

Открыть:

```text
http://localhost:8789
```

## Прогресс

Текущая версия хранит прогресс в `localStorage` браузера. Это хорошо для быстрого личного трекера.

Для синхронизации между устройствами нужен следующий слой: маленький backend с SQLite/Postgres и API `GET/PUT /progress`.

## Автодеплой из GitHub

Workflow [`.github/workflows/deploy-rpg.yml`](.github/workflows/deploy-rpg.yml) запускается при каждом `push` в `main`. Он подключается к серверу по SSH, получает точный commit, пересобирает контейнер и проверяет, что приложение отвечает на `http://127.0.0.1:8789/`.

### 1. Подготовить отдельный ключ деплоя на сервере

Не используй личный SSH-ключ. На сервере, где расположен `/opt/path-of-ai`, выполни:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_github_actions_path_of_ai -C "github-actions-path-of-ai" -N ""
install -d -m 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/id_ed25519_github_actions_path_of_ai.pub >> ~/.ssh/authorized_keys
```

Приватный ключ из `~/.ssh/id_ed25519_github_actions_path_of_ai` будет добавлен в GitHub Secret. Никогда не коммить его и не публикуй в issue, PR или логах.

### 2. Создать production environment и Secrets

В GitHub: **Settings → Environments → New environment**. Создай environment `production`; при необходимости включи **Required reviewers**.

В `production` добавь следующие Secrets:

| Secret | Значение |
| --- | --- |
| `DEPLOY_HOST` | Публично доступный hostname или IP сервера |
| `DEPLOY_PORT` | `22`, если используется стандартный SSH-порт |
| `DEPLOY_USER` | Пользователь на сервере, например `doc` |
| `DEPLOY_PATH` | `/opt/path-of-ai` |
| `DEPLOY_SSH_KEY` | Содержимое приватного ключа `id_ed25519_github_actions_path_of_ai` |
| `DEPLOY_KNOWN_HOSTS` | Проверенная строка(и) `known_hosts` для сервера |

Чтобы получить `DEPLOY_KNOWN_HOSTS`, выполни на доверенной машине:

```bash
ssh-keyscan -H YOUR_DEPLOY_HOST
```

Перед добавлением сверь fingerprint с сервером, например:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

### 3. Проверить запуск

После добавления Secrets открой **Actions → Deploy AI Agents RPG**, выбери последний запуск и нажми **Re-run jobs**. Последующие коммиты в `main` будут деплоиться автоматически.

> GitHub-hosted runners должны иметь сетевой доступ к `DEPLOY_HOST`. Если сервер доступен только через Tailscale или локальную сеть, этот SSH-вариант не подключится. В таком случае лучше поставить self-hosted GitHub runner на сервер или адаптировать workflow для Tailscale — не открывай SSH в интернет только ради деплоя.
