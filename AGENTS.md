# AGENTS.md

Asynchronous document ingestion pipeline for RAG workflows. Accepts files (PDF, etc.), parses them via Docling, and converts to structured Markdown or JSON. Future pipeline stages, chunking, embedding, vector storage, are not yet implemented.

## Tech Stack

- Python 3.14, Docling, Pydantic, structlog
- Backend: Litestar
- Frontend: Next.js 16 (App Router, static export), React 19, shadcn/ui, Tailwind CSS v4
- State Management: Zustand (client state), TanStack Query (server state)
- Task Queue: TaskIQ with Redis
- Containerization: Docker, Docker Compose
- Backend package manager: `uv` (never use `pip` or `poetry`)
- Frontend package manager: `pnpm` (never use `npm` or `yarn`)
- Backend linting & formatting: `ruff`
- Frontend linting & formatting: `ultracite` / Biome
- Type checking: `ty` (Python), `tsc` (TypeScript)
- Task runner: `just`

## Project Structure

```
apps/
├── backend/                         # Litestar application
│   ├── app/
│   │   ├── main.py                  # App factory, lifespan, DI, CORS
│   │   ├── core/
│   │   │   ├── broker.py            # TaskIQ broker + Redis result backend
│   │   │   └── config.py            # Storage paths (UPLOAD_DIR, RESULTS_DIR)
│   │   └── features/
│   │       └── document_parsing/
│   │           ├── controller.py    # HTTP endpoints (parse, tasks, delete)
│   │           ├── service.py       # Business logic, file I/O, task submission
│   │           ├── schemas.py       # Pydantic models, DTOs, enums
│   │           └── tasks.py         # TaskIQ background task definition
│   ├── pyproject.toml
│   └── Dockerfile
└── frontend/                        # Next.js application
    ├── app/                         # App Router pages and layouts
    │   ├── layout.tsx               # Root layout (fonts, providers, sidebar)
    │   ├── page.tsx                 # Main page (empty state or task detail)
    │   └── globals.css              # Tailwind CSS v4 + shadcn theme tokens
    ├── components/
    │   ├── app-layout.tsx           # SidebarProvider + breadcrumb header
    │   ├── app-sidebar.tsx          # Sidebar with task list
    │   ├── new-ingestion-form.tsx   # File upload form (react-dropzone)
    │   ├── new-ingestion-modal.tsx  # Responsive dialog/drawer
    │   ├── task-detail-view.tsx     # Parsed content display
    │   ├── task-item.tsx            # Sidebar task entry with context menu
    │   ├── state-card.tsx           # Empty/error state card
    │   └── ui/                      # shadcn/ui primitives
    ├── hooks/
    │   ├── use-tasks.ts             # TanStack Query hooks (adaptive polling)
    │   └── use-mobile.ts            # Responsive breakpoint hook
    ├── store/
    │   └── task-store.ts            # Zustand store (activeTaskId, modal state)
    ├── lib/
    │   ├── api.ts                   # Backend API client (fetch wrapper)
    │   ├── providers.tsx            # QueryClientProvider setup
    │   └── utils.ts                 # cn() utility
    ├── biome.jsonc                  # Ultracite/Biome config
    ├── components.json              # shadcn/ui registry config
    ├── next.config.ts               # Static export + dev API proxy
    ├── nginx.conf                   # Production: static serving + API reverse proxy
    ├── Dockerfile                   # Multi-stage: Node → build → Nginx
    └── package.json

pyproject.toml                       # uv workspace root config
uv.lock                              # Unified Python workspace lockfile
compose.yaml                         # Dev environment (backend + worker + redis + optional frontend)
justfile                             # Task runner commands
```

## Commands

### Docker (primary)

- Dev server (backend + worker + redis): `just dev` or `docker compose up --build`
- Dev server (full stack incl. frontend): `just dev-all` or `docker compose --profile frontend up --build`
- Stop: `just down` or `docker compose down`
- Build only: `just build` or `docker compose build`

### Local (Without Docker)

- Install all dependencies: `just install` or `uv sync && pnpm --dir apps/frontend install`
- Dev server (backend): `just dev-backend` or `uv run --package backend litestar --app apps.backend.app.main:app run --debug --reload`
- Dev server (worker): `just dev-worker` or `uv run --package backend taskiq worker apps.backend.app.core.broker:broker apps.backend.app.features.document_parsing.tasks --reload`
- Dev server (frontend): `just dev-frontend` or `cd apps/frontend && pnpm dev`
- Build frontend for production: `just build-frontend` or `pnpm --dir apps/frontend run build`

### Code quality (always local)

- Lint: `just lint` or `uv run ruff check . && pnpm --dir apps/frontend run check`
- Format: `just format` or `uv run ruff format . && pnpm --dir apps/frontend run fix`
- Type check: `just typecheck` or `uv run ty check && pnpm --dir apps/frontend run typecheck`
- Run all checks: `just check`

Always run `just check` before finalizing any work.

## Code Style

### Backend (Python)

- Use `structlog` for all logging in backend. Never use stdlib `logging`.
- All functions must have full type annotations — signatures, return types, variables where non-obvious.
- Use `structlog.get_logger()` at module level, not inside functions.
- Prefer `async` handlers in controllers.
- Use relative imports within a feature module (e.g., `from .service import ParserService`).
- Use absolute imports for cross-feature or core references (e.g., `from apps.backend.app.core.config import UPLOAD_DIR`).
- **Imports must always be at the top level of the file.** Never use inline (local) imports inside functions or classes unless absolutely necessary to break a circular dependency. This ensures dependencies are visible, avoids runtime `ImportError`s, and aligns with Python best practices.
- **Prefer explicit imports** for submodules and functions (e.g., `from anyio import to_thread`) rather than top-level module access (`import anyio`). This ensures correct resolution by strict type checkers like Pyright (`ty`).
- All comments, docstrings, and commit messages must be in English.

### Frontend (TypeScript)

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

#### Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

#### Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

##### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

##### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

##### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

##### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

##### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

##### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

##### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

##### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

##### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

---

##### Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

##### When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `pnpm dlx ultracite fix` before committing to ensure compliance.


## Architecture

This project uses a **monorepo architecture** with a split toolchain: `uv` for the Python backend and `pnpm` for the TypeScript frontend.

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

For long-running operations (e.g., document parsing), the backend uses an **async task + polling** pattern via **TaskIQ** and **Redis**:

1. **Upload Phase**: `POST /uploads` endpoint accepts a multipart file, saves it to `/storage/uploads/`, calculates metadata (e.g., page count), and returns `file_id`.
2. **Parse Phase**: `POST /parse` endpoint receives the `file_id` and options, kicks off a TaskIQ background task (`parse_document_task.kiq()`), writes an initial "pending" state to disk, and returns HTTP 202 with a `task_id`.
3. The actual processing is executed by a separate `worker` process via TaskIQ. This prevents blocking the main web server process.
4. CPU-intensive work (e.g., `DocumentConverter.convert()`) is offloaded to a thread pool via `anyio.to_thread.run_sync()` within the worker task to avoid blocking the worker's event loop.
5. The worker writes task state transitions to disk as JSON files (`/storage/results/{task_id}.json`). This is the source of truth for task results.
6. A `GET /tasks/{task_id}` endpoint reads the task result directly from disk. A `GET /tasks` endpoint lists all tasks. A `DELETE /tasks/{task_id}` endpoint removes a task result.
7. The frontend uses **adaptive polling** (2s when tasks are active, 10s when idle) via TanStack Query's `refetchInterval`.
8. Only minimal metadata is returned to Redis (`RedisAsyncResultBackend`) to keep the Redis memory footprint low. Full parsed content stays on disk.
9. The `RedisStreamBroker` guarantees at-least-once delivery, so tasks aren't lost if a worker crashes.
10. A background cron task (`cleanup_orphaned_uploads_task`) runs hourly to delete uploaded files that were abandoned before parsing (older than 24 hours).

**Important Files:**
- `apps/backend/app/core/broker.py`: Centralized definition for the TaskIQ broker and result backend.
- `apps/backend/app/core/config.py`: Storage path configuration (`UPLOAD_DIR`, `RESULTS_DIR`).
- `apps/backend/app/features/document_parsing/tasks.py`: Contains the actual TaskIQ tasks (`@broker.task()`).

### Singleton Services

Heavy resources like `DocumentConverter` (which loads ML models) are initialized once in `app_lifespan` and stored on `app.state`. Services that depend on these resources are also created once and injected via Litestar's DI system (`Provide`).

## Docker

- The backend and worker run inside Docker for development. `compose.yaml` mounts the local code for hot-reload.
- The frontend container is behind a `frontend` Docker Compose profile. Use `just dev-all` to include it, or run the frontend locally with `just dev-frontend` for faster iteration.
- In production, the frontend is built as a static export and served by Nginx. Nginx also reverse-proxies `/api/` requests to the backend container.
- ML model weights are persisted in named Docker volumes (`hf-models-cache`, `rapidocr-models-cache`) to avoid re-downloading on container restarts.
- Task results and uploads are persisted in a `shared-storage` Docker volume mounted at `/workspace/storage`, shared between the backend and worker containers.
- The backend Dockerfile uses a multi-stage build: a `builder` stage installs dependencies via `uv`, the runtime stage copies only the venv.
- The frontend Dockerfile uses a three-stage build: dependencies → Next.js build → Nginx static serving.
- Do not modify `Dockerfile`s or `compose.yaml` without understanding the volume and permission setup.

## Git Conventions & Release Automation

- Commit messages follow **[Conventional Commits](https://www.conventionalcommits.org/)**: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `ci`
- Scope matches the feature or area: `backend`, `frontend`, `root`, `document_parsing`, `core`
- Example: `feat(document_parsing): Add PDF parsing support`

This repository uses **Google Release Please** for automated semantic versioning based on commits.
- **Do NOT** manually bump versions in `pyproject.toml`, `package.json`, or `uv.lock`.
- Merging to `master` will trigger the `release-please` bot to automatically open a Release PR updating the versions and changelogs.
- A secondary workflow will automatically sync `uv.lock` within that Release PR.

## Guardrails

- Never modify `uv.lock` or `pnpm-lock.yaml` manually. Run `uv sync` / `pnpm install` instead.
- Never commit `.venv/`, `node_modules/`, `__pycache__/`, `.next/`, or build artifacts.
- Never add Python dependencies without using `uv add --package <package_name> <dependency>`.
- Never add frontend dependencies without using `pnpm --dir apps/frontend add <dependency>`.
- Do not create test files yet — testing infrastructure has not been set up.
