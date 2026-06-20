# --- DOCKER (EXECUTION AND MANAGEMENT) ---

# Spin up the development environment and rebuild the image if necessary
dev:
	docker compose up --build

# Shut down the system and remove containers
down:
	docker compose down

# Build the image without starting containers
build:
	docker compose build

# --- LOCAL DEVELOPMENT (BACKUP AND CODE QUALITY) ---

# Fallback: Run backend locally without Docker
dev-backend:
	uv run --package backend litestar --app apps.backend.app.main:app run --debug --reload

# Fallback: Run worker locally without Docker
dev-worker:
	uv run --package backend taskiq worker apps.backend.app.core.broker:broker apps.backend.app.features.document_parsing.tasks --reload

# Fallback: Run frontend locally without Docker
dev-frontend:
	cd apps/frontend && pnpm dev

# Update local venv so IDEs (VS Code, etc.) can resolve dependencies
install:
	uv sync

# Run fast local linting (Ruff executes in milliseconds, no Docker needed)
lint:
	uv run ruff check .

format:
	uv run ruff format .

typecheck:
	uv run ty check

check: lint format typecheck
