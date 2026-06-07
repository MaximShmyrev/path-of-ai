# Гейты качества «Путь ИИ» (Definition of Done). См. SPEC §8, @Styleguide §2.
.PHONY: check backend frontend backend-test backend-static backend-mutation \
        frontend-test frontend-static docker-up

check: backend frontend  ## Полный прогон гейтов back+front

backend: backend-static backend-test  ## Бэкенд: статика + тесты + покрытие

backend-static:
	cd backend && uv run ruff check . && uv run ruff format --check . && uv run mypy

backend-test:
	cd backend && uv run coverage run -m pytest && uv run coverage report

backend-mutation:  ## Мутационное тестирование ядра (progression+quests)
	cd backend && uv run mutmut run \
		--paths-to-mutate="app/progression.py,app/quests.py" \
		--runner="python -m pytest -x -q tests/test_progression.py tests/test_quests.py"

frontend: frontend-static frontend-test  ## Фронтенд: статика + тесты + покрытие

frontend-static:
	cd frontend && npm run typecheck && npm run lint && npm run format:check

frontend-test:
	cd frontend && npm run test -- --coverage

docker-up:  ## Поднять весь стек (frontend + backend + db)
	docker compose up --build
