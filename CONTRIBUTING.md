# Contributing

Thank you for your interest in contributing to the RAG Ingestion Pipeline! This document outlines our development workflow and standards.

## Development Setup

The primary development environment runs inside Docker using Docker Compose Watch for high-performance, cross-platform hot-reloading. This ensures consistent behavior across machines and handles heavy dependencies without polluting your host system.

1. **Install Prerequisites:** Ensure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) running and the [just](https://github.com/casey/just) command runner installed.
2. **Start the backend services:**
   ```bash
   just dev
   ```
   This command starts the Litestar backend, the TaskIQ worker, and Redis in watch mode. Any changes you make to the Python code will be instantly synced to the container without the I/O penalty of traditional bind mounts.

3. **Start the frontend locally** (in a separate terminal):
   ```bash
   just install       # Install Node/Python dependencies for IDE support
   just dev-frontend  # Start Next.js development server
   ```
   The Next.js dev server starts at `http://localhost:3000` and proxies API requests to the backend automatically. Running this locally provides the best Hot Module Replacement (HMR) experience.

### Local Tooling

While Docker handles the runtime environment, you should run `just install` on your host machine to create a local `.venv` for Python and install `node_modules` for TypeScript. This ensures your IDE (like VS Code or Cursor) can resolve imports, run linters, and provide accurate IntelliSense.

### Manual Fallbacks

If you need to debug specific components without Docker, the `justfile` provides fallback commands like `just dev-backend` and `just dev-worker`. However, the Docker Watch environment (`just dev`) is the strictly recommended path for all contributors.

## Project Architecture

This project is a **monorepo** containing a Litestar `backend` and a Next.js `frontend` under the `apps/` directory.

- The **backend** is managed by `uv` (Python) and strictly follows a **Feature-Based Architecture**.
- The **frontend** is managed by `pnpm` (Node.js) and uses the Next.js App Router with static export for production builds.

### Backend Architecture

- **`apps/backend/app/features/`**: All domain-specific logic goes here. Each feature (like `document_parsing`) must be a self-contained module with its own `controller.py`, `service.py`, `schemas.py` (Pydantic models), and `tasks.py` (TaskIQ workers) or isolated subprocess scripts (like `parse_worker.py`).
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

We strictly use `just` to orchestrate our workflows. You can view all available commands by running `just --list` in your terminal.

| Command | Description |
| :--- | :--- |
| `just run` | Starts the entire stack (including frontend) in stable mode for end-users. |
| `just dev` | Starts the backend, worker, and Redis in watch mode (hot-reload active) for development. |
| `just dev-frontend` | Starts the Next.js development server locally with HMR. |
| `just down` | Shuts down the system and removes all containers. |
| `just build` | Rebuilds the Docker images without starting the containers. |
| `just install` | Installs local dependencies for both backend (`uv`) and frontend (`pnpm`). |
| `just check` | Runs linting, formatting, and type-checking sequentially for the entire codebase. |
| `just lint` | Runs `ruff check` and Biome/Ultracite linting. |
| `just format` | Auto-formats code using `ruff format` and Biome/Ultracite. |
| `just typecheck` | Runs static type checking (`ty` for Python, `tsc` for TypeScript). |

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
