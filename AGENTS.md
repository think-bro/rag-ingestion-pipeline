# AGENTS.md

Document ingestion pipeline for RAG workflows. Accepts files (PDF, DOCX, etc.), parses them via Docling, and converts to structured Markdown or JSON. Future pipeline stages, chunking, embedding, vector storage, are not yet implemented.

## Tech Stack

- Python 3.14, Docling, Pydantic, structlog
- Backend: Litestar
- Frontend: Streamlit
- Containerization: Docker, Docker Compose
- Monorepo package manager: `uv` workspaces (never use `pip` or `poetry`)
- Linting & formatting: `ruff`
- Type checking: `ty`
- Task runner: `just`

## Project Structure

```
apps/
├── backend/                         # Litestar application
│   ├── app/                         # Backend code
│   │   ├── main.py
│   │   ├── core/
│   │   └── features/
│   ├── pyproject.toml
│   └── Dockerfile
└── frontend/                        # Streamlit application
    ├── main.py
    ├── pyproject.toml
    └── Dockerfile

pyproject.toml                       # Workspace root config
uv.lock                              # Unified workspace lockfile
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
- Dev server (backend): `just dev-backend` or `uv run --package backend litestar --app apps.backend.app.main:app run --debug --reload`
- Dev server (frontend): `just dev-frontend` or `uv run --package frontend streamlit run apps/frontend/main.py`

### Code quality (always local)

- Lint: `just lint` or `uv run ruff check .`
- Format: `just format` or `uv run ruff format .`
- Type check: `just typecheck` or `uv run ty check`
- Run all checks: `just check`

Always run `just check` before finalizing any work.

## Code Style

- Use `structlog` for all logging in backend. Never use stdlib `logging`.
- All functions must have full type annotations — signatures, return types, variables where non-obvious.
- Use `structlog.get_logger()` at module level, not inside functions.
- Prefer `async` handlers in controllers.
- Use relative imports within a feature module (e.g., `from .service import ParserService`).
- Use absolute imports for cross-feature or core references (e.g., `from apps.backend.app.core.config import settings`).
- All comments, docstrings, and commit messages must be in English.

## Architecture

This project uses a **monorepo architecture** managed by `uv` workspaces.
The backend uses **feature-based architecture**. Each feature is a self-contained vertical slice.

### Adding a new feature (Backend)

1. Create `apps/backend/app/features/<feature_name>/` with `__init__.py`, `controller.py`, `service.py`, `schemas.py`.
2. The controller handles HTTP concerns. The service handles business logic. Schemas define request/response models using Pydantic. Keep them separated.
3. Register the controller in `apps/backend/app/main.py` under `route_handlers`.

### Rules

- All domain logic belongs in `apps/backend/app/features/<feature_name>/`.
- Shared infrastructure (config, DB connections, middleware) belongs in `apps/backend/app/core/`.
- Never place business logic in controllers — delegate to the service layer.
- Never create top-level directories like `controllers/`, `models/`, or `services/`. That is layer-based architecture.
- Use Pydantic `BaseModel` for all request/response schemas. Define them in `schemas.py` within each feature module.

### Async Task Pattern

For long-running operations (e.g., document parsing), the backend uses an **async task + polling** pattern:

1. `POST` endpoint accepts the request, creates a task entry, and returns HTTP 202 with a `task_id`.
2. The actual processing is scheduled via Litestar's `BackgroundTask`, which runs after the response is sent.
3. CPU-intensive work (e.g., `DocumentConverter.convert()`) is offloaded to a thread pool via `asyncio.to_thread()` to avoid blocking the event loop.
4. A `GET /tasks/{task_id}` endpoint allows polling for task status and results.
5. Task state is stored in-memory (future: Redis or similar persistent store).

### Singleton Services

Heavy resources like `DocumentConverter` (which loads ML models) are initialized once in `app_lifespan` and stored on `app.state`. Services that depend on these resources are also created once and injected via Litestar's DI system (`Provide`).

## Docker

- The apps run inside Docker for development. `compose.yaml` mounts the local code for hot-reload.
- ML model weights are persisted in named Docker volumes (`hf-models-cache`, `rapidocr-models-cache`) to avoid re-downloading on container restarts.
- The Dockerfile uses a multi-stage build: a `builder` stage installs dependencies via `uv`, the runtime stage copies only the venv.
- Do not modify `Dockerfile`s or `compose.yaml` without understanding the volume and permission setup.

## Git Conventions & Release Automation

- Commit messages follow **[Conventional Commits](https://www.conventionalcommits.org/)**: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `ci`
- Scope matches the feature or area: `backend`, `frontend`, `root`, `document_parsing`, `core`
- Example: `feat(document_parsing): Add PDF parsing support`

This repository uses **Google Release Please** for automated semantic versioning based on commits.
- **Do NOT** manually bump versions in `pyproject.toml` files or `uv.lock`.
- Merging to `master` will trigger the `release-please` bot to automatically open a Release PR updating the versions and changelogs.
- A secondary workflow will automatically sync `uv.lock` within that Release PR.

## Guardrails

- Never modify `uv.lock` manually. Run `uv sync` or `uv add <package>` instead.
- Never commit `.venv/`, `__pycache__/`, or build artifacts.
- Never add dependencies without adding them to the respective `pyproject.toml` via `uv add --package <package_name> <dependency>`.
- Do not create test files yet — testing infrastructure has not been set up.
