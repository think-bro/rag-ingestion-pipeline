# --- DOCKER (EXECUTION AND MANAGEMENT) ---

# Runs the ENTIRE stack (including frontend) in stable mode, no hot-reload
run:
	docker compose -f compose.yaml -f compose.run.yaml --profile frontend up --build

# Runs backend, worker, and redis in watch mode (hot-reload active)
dev:
	docker compose -f compose.yaml -f compose.run.yaml -f compose.dev.yaml up --build --watch

# Shut down the system and remove containers
down:
	docker compose -f compose.yaml -f compose.run.yaml -f compose.dev.yaml --profile frontend down

# Build the images without starting containers
build:
	docker compose -f compose.yaml -f compose.run.yaml -f compose.dev.yaml --profile frontend build

# --- LOCAL DEVELOPMENT (BACKUP AND CODE QUALITY) ---

# Fallback: Run backend locally without Docker
dev-backend:
	uv run --package backend litestar --app apps.backend.app.main:app run --debug --reload

# Fallback: Run worker locally without Docker
dev-worker:
	uv run --package backend taskiq worker apps.backend.app.core.broker:broker apps.backend.app.features.document_parsing.tasks --workers 1 --reload --reload-dir apps/backend

# Recommended: Run frontend locally with HMR (Hot Module Replacement)
dev-frontend:
	cd apps/frontend && pnpm dev

# Build frontend for production locally (useful for testing builds without Docker)
build-frontend:
	pnpm --dir apps/frontend run build

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
