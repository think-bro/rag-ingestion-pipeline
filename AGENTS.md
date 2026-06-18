# AGENTS.md

Document ingestion pipeline for RAG workflows. Accepts files (PDF, DOCX, etc.), parses them via Docling, and converts to structured markdown. Future pipeline stages, chunking, embedding, vector storage, are not yet implemented.

## Tech Stack

- Python 3.14, Litestar, Docling, structlog
- Containerization: Docker, Docker Compose
- Package manager: `uv` (never use `pip` or `poetry`)
- Linting & formatting: `ruff`
- Type checking: `ty`
- Task runner: `just`

## Project Structure

```
app/
├── main.py                          # Litestar application factory
├── core/                            # Cross-cutting: config, logging, DB setup
└── features/                        # Feature-based modules
    └── document_parsing/            # Existing feature
        ├── controller.py            # Route handlers (Litestar Controller)
        └── service.py               # Business logic (Docling integration)

Dockerfile                           # Multi-stage build (builder + runtime)
compose.yaml                         # Dev environment with hot-reload and model caching
justfile                             # Task runner commands
```

## Commands

### Docker (primary)

- Dev server: `just dev` or `docker compose up --build`
- Stop: `just down` or `docker compose down`
- Build only: `just build` or `docker compose build`

### Local (Without Docker)

- Install dependencies: `just install` or `uv sync`
- Dev server: `just dev-local` or `uv run litestar --app app.main:app run --debug --reload`

### Code quality (always local)

- Lint: `just lint` or `uv run ruff check .`
- Format: `just format` or `uv run ruff format .`
- Type check: `just typecheck` or `uv run ty check`
- Run all checks: `just check`

Always run `just check` before finalizing any work.

## Code Style

- Use `structlog` for all logging. Never use stdlib `logging`.
- All functions must have full type annotations — signatures, return types, variables where non-obvious.
- Use `structlog.get_logger()` at module level, not inside functions.
- Prefer `async` handlers in controllers.
- Use relative imports within a feature module (e.g., `from .service import ParserService`).
- Use absolute imports for cross-feature or core references (e.g., `from app.core.config import settings`).
- All comments, docstrings, and commit messages must be in English.

## Architecture

This project uses **feature-based architecture**. Each feature is a self-contained vertical slice.

### Adding a new feature

1. Create `app/features/<feature_name>/` with `__init__.py`, `controller.py`, `service.py`.
2. The controller handles HTTP concerns. The service handles business logic. Keep them separated.
3. Register the controller in `app/main.py` under `route_handlers`.

### Rules

- All domain logic belongs in `app/features/<feature_name>/`.
- Shared infrastructure (config, DB connections, middleware) belongs in `app/core/`.
- Never place business logic in controllers — delegate to the service layer.
- Never create top-level directories like `controllers/`, `models/`, or `services/`. That is layer-based architecture.

## Docker

- The app runs inside Docker for development. `compose.yaml` mounts the local code for hot-reload.
- ML model weights are persisted in named Docker volumes (`hf-models-cache`, `rapidocr-models-cache`) to avoid re-downloading on container restarts.
- The Dockerfile uses a multi-stage build: a `builder` stage installs dependencies via `uv`, the runtime stage copies only the venv.
- Do not modify `Dockerfile` or `compose.yaml` without understanding the volume and permission setup.

## Git Conventions

- Commit messages follow **[Conventional Commits](https://www.conventionalcommits.org/)**: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `ci`
- Scope matches the feature or area: `app`, `root`, `document_parsing`, `core`
- Example: `feat(document_parsing): Add PDF parsing support`

## Guardrails

- Never modify `uv.lock` manually. Run `uv sync` or `uv add <package>` instead.
- Never commit `.venv/`, `__pycache__/`, or build artifacts.
- Never add dependencies without adding them to `pyproject.toml` via `uv add`.
- Do not create test files yet — testing infrastructure has not been set up.
