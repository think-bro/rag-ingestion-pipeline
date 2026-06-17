dev:
  uv run litestar --app app.main:app run --debug --reload

install:
  uv sync

run:
  uv run litestar --app app.main:app run
