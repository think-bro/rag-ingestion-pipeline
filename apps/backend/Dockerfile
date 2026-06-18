# ──────────────────────────────────────────────
# Stage 1: Builder
# ──────────────────────────────────────────────
FROM python:3.14-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

WORKDIR /workspace

# Dependency caching
COPY pyproject.toml uv.lock ./
COPY apps/backend/pyproject.toml apps/backend/
COPY apps/frontend/pyproject.toml apps/frontend/

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev --package backend

# Copy full application code and install project
COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --package backend

# ──────────────────────────────────────────────
# Stage 2: Runtime
# ──────────────────────────────────────────────
FROM python:3.14-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libxcb1 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system appgroup && \
    useradd --system --gid appgroup --create-home appuser

WORKDIR /workspace

# Copy only the venv from the builder stage
COPY --from=builder --chown=appuser:appgroup /workspace/.venv /workspace/.venv

RUN mkdir -p /workspace/models/hf /workspace/.venv/lib/python3.14/site-packages/rapidocr/models && \
    chown -R appuser:appgroup /workspace/models /workspace/.venv/lib/python3.14/site-packages/rapidocr/models

# Copy code
COPY --chown=appuser:appgroup . .

ENV PATH="/workspace/.venv/bin:$PATH"

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]

USER appuser

CMD ["litestar", "--app", "apps.backend.app.main:app", "run", "--host", "0.0.0.0", "--port", "8000"]
