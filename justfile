# --- DOCKER (EXECUTION AND MANAGEMENT) ---

# Spin up the backend, worker, and redis (skips frontend for local dev)
dev:
	docker compose up --build

# Spin up the ENTIRE stack including the dockerized frontend
dev-all:
	docker compose --profile frontend up --build

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

# Recommended: Run frontend locally with HMR (Hot Module Replacement)
dev-frontend:
	cd apps/frontend && pnpm dev

# Build frontend for production locally (useful for testing builds without Docker)
build-frontend:
	pnpm --dir apps/frontend run build

# Start frontend production server locally
start-frontend:
	pnpm --dir apps/frontend run start

# Update local dependencies for both backend and frontend
install:
	uv sync
	pnpm --dir apps/frontend install

# Run fast local linting (Ruff for Python, Ultracite/Biome for frontend)
lint:
	uv run ruff check .
	pnpm --dir apps/frontend run check

# Format codebase (Ruff for Python, Ultracite/Biome for frontend)
format:
	uv run ruff format .
	pnpm --dir apps/frontend run fix

# Type check codebase (ty for Python, tsc for frontend)
typecheck:
	uv run ty check
	pnpm --dir apps/frontend run typecheck

# Run all checks
check: lint format typecheck
