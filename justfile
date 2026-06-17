dev:
  uv run litestar --app app.main:app run --debug --reload

install:
  uv sync

run:
  uv run litestar --app app.main:app run

lint:
  uv run ruff check .

format:
  uv run ruff format .

typecheck:
  uv run ty check

check: lint format typecheck
