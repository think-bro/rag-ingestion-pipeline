# AGENTS.md

Document ingestion pipeline for RAG workflows. Accepts files (PDF, DOCX, etc.), parses them via Docling, and converts to structured Markdown or JSON. Future pipeline stages, chunking, embedding, vector storage, are not yet implemented.

## Tech Stack

- Python 3.14, Docling, Pydantic, structlog
- Backend: Litestar
- Frontend: Streamlit
- Task Queue: TaskIQ with Redis
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
- Dev server (worker): `just dev-worker` or `uv run --package backend taskiq worker apps.backend.app.core.broker:broker apps.backend.app.features.document_parsing.tasks --reload`
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

## Frontend (Ultracite) Code Standards

his project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

### Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

### Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

#### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

#### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

#### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

#### React & JSX

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

#### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

#### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

#### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

#### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

#### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

### Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

### When Biome Can't Help

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

For long-running operations (e.g., document parsing), the backend uses an **async task + polling** pattern via **TaskIQ** and **Redis**:

1. `POST` endpoint accepts the request, kicks off a TaskIQ background task (`parse_document_task.kiq()`), and returns HTTP 202 with a `task_id`.
2. The actual processing is executed by a separate `worker` process via TaskIQ. This prevents blocking the main web server process.
3. CPU-intensive work (e.g., `DocumentConverter.convert()`) is offloaded to a thread pool via `asyncio.to_thread()` within the worker task to avoid blocking the worker's event loop.
4. A `GET /tasks/{task_id}` endpoint allows polling for task status and results by querying the Redis backend using TaskIQ's API.
5. Task state and results are stored in Redis (`RedisAsyncResultBackend`), ensuring results persist across application restarts. Results are set to expire after a certain time (e.g. 1 hour).
6. The `RedisStreamBroker` guarantees at-least-once delivery, so tasks aren't lost if a worker crashes.

**Important Files:**
- `apps/backend/app/core/broker.py`: Centralized definition for the TaskIQ broker and result backend.
- `apps/backend/app/features/document_parsing/tasks.py`: Contains the actual TaskIQ tasks (`@broker.task()`).

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
