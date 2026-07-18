FROM python:3.12-slim

# uv для управления зависимостями
COPY --from=ghcr.io/astral-sh/uv:0.9.18 /uv /uvx /bin/

WORKDIR /app

# Сначала только манифесты — кэш слоёв при неизменных зависимостях
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

EXPOSE 8000

CMD ["uv", "run", "--no-dev", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
