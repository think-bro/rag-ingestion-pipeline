# Contributing

Thank you for your interest in contributing to the RAG Ingestion Pipeline! This document outlines our development workflow and standards.

## Development Setup

1. **Install tools:** Ensure you have `uv` and `just` installed.
2. **Install dependencies:** Run `just install` (which uses `uv sync` under the hood).
3. **Start the server:** Run `just dev` for local development.

## Project Architecture

We strictly follow a **Feature-Based Architecture**.

- **`app/features/`**: All domain-specific logic goes here. Each feature (like `document_parsing`) must be a self-contained module with its own `controller.py`, `service.py`, models, and schemas.
- **`app/core/`**: Shared infrastructure like database setup, configuration, and logging configuration goes here.

**Do not** create layer-based directories at the top level (e.g., `app/controllers` or `app/services`).

## Code Style & Standards

- **Typing**: All code must be strictly typed. We use `ty` for type checking. Run `just typecheck` to verify.
- **Linting & Formatting**: We use `ruff`. Run `just format` to auto-format and `just lint` to check for issues.
- **Logging**: Always use `structlog`. **Never** use the standard library `logging` module. Instantiate loggers at the module level: `logger = structlog.get_logger()`.
- **Validation**: Before opening a Pull Request, always run:
  ```bash
  just check
  ```
  This runs the linting, formatting, and type-checking steps sequentially.

## Git Workflow & Commits

We follow **[Conventional Commits](https://www.conventionalcommits.org/)** for our commit messages:
`<type>(<scope>): <description>`

**Types:** `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `ci`
**Scopes:** Match the feature or area (e.g., `app`, `core`, `document_parsing`)

*Example:* `feat(document_parsing): Add PDF parsing support`

## Pull Requests

1. Create a branch from `master` (e.g., `feat/pdf-parsing` or `fix/logger-init`).
2. Make your changes adhering to the rules above.
3. Ensure `just check` passes.
4. Submit a PR describing your changes.
