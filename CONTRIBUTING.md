# Contributing

Thank you for your interest in contributing to the RAG Ingestion Pipeline! This document outlines our development workflow and standards.

## Development Setup

### Docker (Recommended)

The primary development environment runs inside Docker. This ensures consistent behavior across machines and handles heavy dependencies (Docling, PyTorch) without polluting your host system.

1. **Install Docker Desktop** and make sure it's running.
2. **Start the dev environment:**
   ```bash
   just dev           # or: docker compose up --build
   ```
   This builds the image (if needed), mounts your local code into the container with hot-reload enabled, and starts the Litestar server at `http://localhost:8000`.

3. **Install local tooling** (for IDE support and code quality checks):
   ```bash
   just install       # or: uv sync
   ```
   This creates a local `.venv` so your editor can resolve imports and run linters. You don't need this to run the app, Docker handles that, but your IDE will thank you.

### Local (Without Docker)

If you prefer to skip Docker entirely:

1. **Install tools:** Ensure you have Python 3.14+, `uv`, and optionally `just` installed.
2. **Install dependencies:** `just install` (or `uv sync`).
3. **Start the backend server:** `just dev-backend` (or `uv run --package backend litestar --app apps.backend.app.main:app run --debug --reload`).
4. **Start the frontend server:** `just dev-frontend` (or `uv run --package frontend streamlit run apps/frontend/main.py`).

Note that local development requires your system to have all native dependencies (e.g. OpenCV libraries) that Docker provides out of the box.

## Project Architecture

This project is a **monorepo** containing a Litestar `backend` and a Streamlit `frontend` under the `apps/` directory.

The backend strictly follows a **Feature-Based Architecture**.

- **`apps/backend/app/features/`**: All domain-specific logic goes here. Each feature (like `document_parsing`) must be a self-contained module with its own `controller.py`, `service.py`, and `schemas.py` (Pydantic models for request/response types).
- **`apps/backend/app/core/`**: Shared infrastructure like database setup, configuration, and logging configuration goes here.

**Do not** create layer-based directories at the top level (e.g., `apps/backend/app/controllers` or `apps/backend/app/services`).

## Code Style & Standards

- **Typing**: All code must be strictly typed. We use `ty` for type checking. Run `just typecheck` to verify.
- **Linting & Formatting**: We use `ruff`. Run `just format` to auto-format and `just lint` to check for issues.
- **Logging**: Always use `structlog`. **Never** use the standard library `logging` module. Instantiate loggers at the module level: `logger = structlog.get_logger()`.
- **Validation**: Before opening a Pull Request, always run:
  ```bash
  just check
  ```
  This runs the linting, formatting, and type-checking steps sequentially.

## Common Commands

| Task | `just` | Manual |
| :--- | :--- | :--- |
| Start dev environment | `just dev` | `docker compose up --build` |
| Stop dev environment | `just down` | `docker compose down` |
| Build image only | `just build` | `docker compose build` |
| Start backend locally | `just dev-backend` | `uv run --package backend litestar --app apps.backend.app.main:app run --debug --reload` |
| Start frontend locally | `just dev-frontend` | `uv run --package frontend streamlit run apps/frontend/main.py` |
| Install dependencies | `just install` | `uv sync` |
| Lint | `just lint` | `uv run ruff check .` |
| Format | `just format` | `uv run ruff format .` |
| Type check | `just typecheck` | `uv run ty check` |
| Run all checks | `just check` | run lint, format, typecheck sequentially |

## Git & Branching Workflow

To maintain code quality and a clean history, we use a branch-and-pull-request workflow. **Direct commits to the `master` branch are not allowed.**

1. **Branch Out:** Always create a new branch from `master` for your work. Use conventional naming based on the type of your work (e.g., `feat/pdf-parsing`, `fix/logger-init`).
2. **Commit Locally:** We follow **[Conventional Commits](https://www.conventionalcommits.org/)** for our commit messages (`<type>(<scope>): <description>`).
   - **Types:** `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `ci`
   - **Scopes:** Match the feature or area (e.g., `backend`, `frontend`, `root`, `document_parsing`)
   - *Example:* `feat(document_parsing): Add PDF parsing support`
3. **Validate:** Before pushing, ensure your code meets our standards by running `just check`.
4. **Pull Request:** Push your branch and open a Pull Request against `master`. 
   - We encourage opening "Draft" PRs early to get feedback during development.
   - All code must be reviewed and merged via PRs. Never push directly to `master`.

### Automated Versioning & Releases

We use **[Google Release Please](https://github.com/googleapis/release-please)** to fully automate semantic versioning for our monorepo. It analyzes your Conventional Commits merged to `master` and automatically opens a "Release PR" to bump versions (`pyproject.toml`), generate `CHANGELOG.md` files, and sync `uv.lock`. 

- **Do not manually edit version numbers** in your PRs. 
- The version increment is calculated automatically: `fix:` triggers a patch bump, `feat:` triggers a minor bump, and `BREAKING CHANGE:` triggers a major bump.
