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
   This builds the image (if needed), mounts your local code into the container with hot-reload enabled, and starts the Litestar backend at `http://localhost:8000`, the TaskIQ worker, and Redis.

   > **Note:** The `just dev` command starts only the backend, worker, and Redis. The frontend is meant to run locally for the best development experience (Hot Module Replacement). Start it separately with `just dev-frontend`.

3. **Start the frontend locally** (in a separate terminal):
   ```bash
   just dev-frontend  # or: cd apps/frontend && pnpm dev
   ```
   The Next.js dev server starts at `http://localhost:3000` and proxies API requests to the backend automatically.

4. **Install local tooling** (for IDE support and code quality checks):
   ```bash
   just install       # or: uv sync && pnpm --dir apps/frontend install
   ```
   This creates a local `.venv` for Python and installs `node_modules` for TypeScript so your editor can resolve imports and run linters. You don't need this to run the app, Docker handles the backend, and `pnpm dev` handles the frontend, but your IDE will thank you.

### Local (Without Docker)

If you prefer to skip Docker entirely:

1. **Install tools:** Ensure you have Python 3.14+, `uv`, Node.js 20+, `pnpm`, and optionally `just` installed.
2. **Install dependencies:** `just install` (or `uv sync && pnpm --dir apps/frontend install`).
3. **Start Redis:** You'll need a local Redis instance running on `localhost:6379`.
4. **Start the backend server:** `just dev-backend` (or `uv run --package backend litestar --app apps.backend.app.main:app run --debug --reload`).
5. **Start the worker process:** `just dev-worker` (or `uv run --package backend taskiq worker apps.backend.app.core.broker:broker apps.backend.app.features.document_parsing.tasks --reload`).
6. **Start the frontend server:** `just dev-frontend` (or `cd apps/frontend && pnpm dev`).

Note that local development requires your system to have all native dependencies (e.g. OpenCV libraries) that Docker provides out of the box.

## Project Architecture

This project is a **monorepo** containing a Litestar `backend` and a Next.js `frontend` under the `apps/` directory.

- The **backend** is managed by `uv` (Python) and strictly follows a **Feature-Based Architecture**.
- The **frontend** is managed by `pnpm` (Node.js) and uses the Next.js App Router with static export for production builds.

### Backend Architecture

- **`apps/backend/app/features/`**: All domain-specific logic goes here. Each feature (like `document_parsing`) must be a self-contained module with its own `controller.py`, `service.py`, and `schemas.py` (Pydantic models for request/response types).
- **`apps/backend/app/core/`**: Shared infrastructure like broker setup, configuration, and logging configuration goes here.

**Do not** create layer-based directories at the top level (e.g., `apps/backend/app/controllers` or `apps/backend/app/services`).

### Frontend Architecture

- **`apps/frontend/app/`**: Next.js App Router pages and layouts.
- **`apps/frontend/components/`**: UI components, including shadcn/ui primitives (`ui/`) and app-specific components.
- **`apps/frontend/hooks/`**: Custom React hooks (e.g., `use-tasks.ts` for data fetching with TanStack Query).
- **`apps/frontend/store/`**: Client state management with Zustand.
- **`apps/frontend/lib/`**: Shared utilities and API client (`api.ts`).

## Code Style & Standards

### Backend (Python)

- **Typing**: All code must be strictly typed. We use `ty` for type checking. Run `just typecheck` to verify.
- **Linting & Formatting**: We use `ruff`. Run `just format` to auto-format and `just lint` to check for issues.
- **Logging**: Always use `structlog`. **Never** use the standard library `logging` module. Instantiate loggers at the module level: `logger = structlog.get_logger()`.

### Frontend (TypeScript)

- **Linting & Formatting**: We use [Ultracite](https://github.com/haydenbleasel/ultracite) (powered by Biome). Run `pnpm --dir apps/frontend run fix` to auto-fix and `pnpm --dir apps/frontend run check` to lint.
- **Type Checking**: `pnpm --dir apps/frontend run typecheck` runs `tsc --noEmit`.

### Validation

Before opening a Pull Request, always run:
```bash
just check
```
This runs the linting, formatting, and type-checking steps sequentially for both backend and frontend.

## Common Commands

| Task | `just` | Manual |
| :--- | :--- | :--- |
| Start dev environment (backend only) | `just dev` | `docker compose up --build` |
| Start entire stack (incl. frontend) | `just dev-all` | `docker compose --profile frontend up --build` |
| Stop dev environment | `just down` | `docker compose down` |
| Build image only | `just build` | `docker compose build` |
| Start backend locally | `just dev-backend` | `uv run --package backend litestar --app apps.backend.app.main:app run --debug --reload` |
| Start worker locally | `just dev-worker` | `uv run --package backend taskiq worker apps.backend.app.core.broker:broker apps.backend.app.features.document_parsing.tasks --reload` |
| Start frontend locally | `just dev-frontend` | `cd apps/frontend && pnpm dev` |
| Build frontend for production | `just build-frontend` | `pnpm --dir apps/frontend run build` |
| Install all dependencies | `just install` | `uv sync && pnpm --dir apps/frontend install` |
| Lint | `just lint` | `uv run ruff check . && pnpm --dir apps/frontend run check` |
| Format | `just format` | `uv run ruff format . && pnpm --dir apps/frontend run fix` |
| Type check | `just typecheck` | `uv run ty check && pnpm --dir apps/frontend run typecheck` |
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

We use **[Google Release Please](https://github.com/googleapis/release-please)** to fully automate semantic versioning for our monorepo. It analyzes your Conventional Commits merged to `master` and automatically opens a "Release PR" to bump versions (`pyproject.toml`, `package.json`), generate `CHANGELOG.md` files, and sync `uv.lock`. 

- **Do not manually edit version numbers** in your PRs. 
- The version increment is calculated automatically: `fix:` triggers a patch bump, `feat:` triggers a minor bump, and `BREAKING CHANGE:` triggers a major bump.
