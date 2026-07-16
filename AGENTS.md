# AGENTS.md

Asynchronous document ingestion pipeline for RAG workflows. Accepts files (PDF, etc.), parses them via Docling, and converts to structured Markdown. It also supports recursive chunking via Chonkie and LangChain, and vector embedding via FastEmbed. Future pipeline stages (vector storage) are not yet implemented.

## Tech Stack

- Python 3.14, Docling, Chonkie, LangChain, FastEmbed, PyArrow, Pydantic, structlog
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
│   │   │   ├── config.py            # Storage paths (UPLOAD_DIR, RESULTS_DIR)
│   │   │   └── presets.py           # Chunk configuration presets
│   │   └── features/
│   │       ├── upload_document/     # File uploads
│   │       ├── get_presets/         # Chunking presets
│   │       ├── chunk_document/      # Hierarchical and recursive chunking
│   │       │   ├── controller.py    # HTTP endpoints
│   │       │   ├── service.py       # Task submission
│   │       │   ├── schemas.py       # Pydantic chunk models
│   │       │   ├── tasks.py         # TaskIQ background tasks
│   │       │   └── chunk_worker.py  # Subprocess for tokenizer & chunker
│   │       ├── embed_document/      # Vector embedding using FastEmbed
│   │       │   ├── controller.py    # HTTP endpoints
│   │       │   ├── service.py       # Task submission
│   │       │   ├── schemas.py       # Pydantic embed models
│   │       │   ├── tasks.py         # TaskIQ background tasks
│   │       │   └── embed_worker.py  # Subprocess for FastEmbed & PyArrow
│   │       └── parse_document/
│   │           ├── controller.py    # HTTP endpoints (parse, tasks, delete)
│   │           ├── service.py       # Business logic, file I/O, task submission
│   │           ├── schemas.py       # Pydantic models, DTOs, enums
│   │           ├── parse_worker.py  # Subprocess for Docling
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
    │   ├── custom-metadata-inputs.tsx # Dynamic metadata fields
    │   ├── item-card.tsx            # Part/Chunk display card
    │   ├── new-ingestion-form.tsx   # File upload and config form
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

## Essential Commands

**Constraint:** Do not use raw `docker compose` or direct `uv`/`pnpm` run commands for orchestration. Rely entirely on the `just` task runner.

### Execution

- Run Full Stack (Stable): `just run` (Frontend, Backend, Worker, Redis). No watch mode.
- Run Dev Services (Watch Mode): `just dev` (Backend, Worker, Redis). Instant sync via Docker Compose Watch.
- Run Frontend Locally (HMR): `just dev-frontend` (Proxies to Backend).
- Stop System: `just down`
- Rebuild Images: `just build`

### Development & Tooling

- Install Dependencies: `just install`
- Run All Checks: `just check` (Runs lint, format, and typecheck sequentially).
- Format Code: `just format`
- Lint Code: `just lint`
- Type Check: `just typecheck`

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
- **Do not use redundant `typing.cast`**. Trust the inferred types of Litestar's `app.state` objects (which are `Any`). Excessive defensive casting of `Any` to `Any` causes `redundant-cast` warnings in `ruff` and is strictly prohibited.
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

### API Versioning

The backend API uses URL path versioning (e.g., `/api/v1/`).
- Only major versions are represented in the URL.
- The `v1` prefix applies to all resources under `/api/`.
- The `/health` endpoint is not versioned.

### Async Task Pattern

For long-running operations (e.g., document parsing), the backend uses an **async task + polling** pattern via **TaskIQ** and **Redis**:

1. **Upload Phase**: `POST /api/v1/documents/uploads` endpoint accepts a multipart file (up to 512MB), saves it to `/storage/uploads/`, extracts metadata (e.g., page count), and returns `file_id`.
2. **Task Initialization**: Users select either parsing (`POST /api/v1/parse-tasks`), chunking (`POST /api/v1/chunk-tasks`), or embedding (`POST /api/v1/embed-tasks`). The endpoint splits the PDF into smaller parts in `/storage/parts/` (for parsing) or loads the uploaded Markdown file (for chunking/embedding). It writes a master `PENDING` state to Redis, enqueues parallel TaskIQ background tasks, and returns a `task_id`.
3. **Parallel Processing**: The actual processing is executed by background `worker` processes. Each worker handles a specific part. To prevent Out-Of-Memory (OOM) errors and allow parallelization, workers process smaller PDF parts.
4. **Subprocess Isolation**: To support graceful cancellation and prevent memory leaks, CPU-intensive and ML-heavy work is isolated into a separate OS subprocess (`parse_worker.py` for Docling, `chunk_worker.py` for Chonkie/LangChain, `embed_worker.py` for FastEmbed). The TaskIQ worker runs an asynchronous polling loop to monitor the subprocess and a cancellation flag in Redis.
5. **Cancellation**: If a user cancels the master task (`POST /api/v1/parse-tasks/{task_id}/cancel`, `/api/v1/chunk-tasks/{task_id}/cancel`, or `/api/v1/embed-tasks/{task_id}/cancel`), a flag is written to Redis. Workers detect this, send a `SIGTERM` to their subprocesses to kill them gracefully, and update the part state to the `cancelled_set`.
6. **IPC Communication**: The subprocess communicates back to the parent worker using a temporary JSON file (IPC) to avoid `stdout` pipe deadlocks with massive Markdown outputs.
7. **State Management**: The worker adds the part index to specific Redis Sets (`completed_set`, `failed_set`, or `cancelled_set`) and writes the result to disk as `.md` or `.json` files (`/storage/results/{task_id}_part_{index}.ext`). The master task status only evaluates to `FAILED` or `COMPLETED` when all parts are finished.
8. **Retry Mechanism**: If a part fails, users can retry it via `POST /api/v1/parse-tasks/{task_id}/parts/{part_index}/retry` (or `/chunk-tasks/`, `/embed-tasks/`). This removes the part from `failed_set`, updates its status to `PROCESSING`, and re-enqueues the `part_task`.
9. **Data Retrieval**: `GET /api/v1/parse-tasks/{task_id}` reads the master state and all part states from Redis sets. `GET /api/v1/parse-tasks/{task_id}/download` triggers the backend to dynamically merge all completed part files into a single `_merged.md` or `_merged.json` file and serves it to the user. (Similar structure applies to chunk-tasks and embed-tasks, where embeddings are served as `.parquet`).
10. **Frontend Polling**: The frontend uses **adaptive polling** (2s when active/cancelling, 10s when idle) via TanStack Query's `refetchInterval` to keep the UI in sync with the multi-part progress.
11. **Reliability**: The `RedisStreamBroker` guarantees at-least-once delivery, so part tasks aren't lost if a worker crashes.
12. **Cleanup**: A background cron task (`cleanup_orphaned_uploads_task`) runs hourly to delete uploaded files that were abandoned before parsing (older than 24 hours).

**Important Files:**
- `apps/backend/app/core/broker.py`: Centralized definition for the TaskIQ broker and result backend.
- `apps/backend/app/core/config.py`: Storage path configuration (`UPLOAD_DIR`, `RESULTS_DIR`).
- `apps/backend/app/features/parse_document/tasks.py`: Contains parsing TaskIQ tasks (`@broker.task()`).
- `apps/backend/app/features/chunk_document/tasks.py`: Contains chunking TaskIQ tasks (`@broker.task()`).
- `apps/backend/app/features/embed_document/tasks.py`: Contains embedding TaskIQ tasks (`@broker.task()`).

### Singleton Services

Heavy resources like `DocumentConverter` (which loads ML models) are initialized once in `app_lifespan` and stored on `app.state`. Services that depend on these resources are also created once and injected via Litestar's DI system (`Provide`).

## Docker Architecture

- The base `compose.yaml` defines the stable production-like environment. It contains no `build` directives, only image names for deployment.
- The `compose.run.yaml` acts as an override file that adds `build: context:` directives. It is used exclusively for building and running the code locally from source.
- The `compose.dev.yaml` acts as an override file for development. It uses `develop.watch` (Docker Compose Watch) to sync files from the host to the container instantly without bind mounts to preserve cross-platform I/O performance. It also overrides `command` directives to enable hot-reload.
- The frontend container is behind a `frontend` Docker Compose profile. Use `just run` to include it, or run the frontend locally with `just dev-frontend` for faster iteration during active development.
- In production, the frontend is built as a static export and served by Nginx. Nginx also reverse-proxies `/api/` requests to the backend container.
- ML model weights are persisted in named Docker volumes (`hf-models-cache`, `rapidocr-models-cache`) to avoid re-downloading on container restarts.
- Task results and uploads are persisted in a `shared-storage` Docker volume mounted at `/workspace/storage`, shared between the backend and worker containers.
- The backend Dockerfile uses a multi-stage build: a `builder` stage installs dependencies via `uv`, the runtime stage copies only the venv.
- The frontend Dockerfile uses a three-stage build: dependencies → Next.js build → Nginx static serving.
- Do not modify `Dockerfile`s or `compose.yaml` without understanding the volume, network, and permission setup.

## Git Conventions & Release Automation

- Commit messages follow **[Conventional Commits](https://www.conventionalcommits.org/)**: `<type>(<scope>): <description>`
- Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `ci`
- Scope matches the feature or area: `backend`, `frontend`, `root`, `parse_document`, `core`
- Example: `feat(parse_document): Add PDF parsing support`

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
