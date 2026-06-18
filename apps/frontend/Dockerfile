# ──────────────────────────────────────────────
# Stage 1: Builder
# ──────────────────────────────────────────────
FROM python:3.14-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

WORKDIR /workspace

# Dependency caching
COPY pyproject.toml uv.lock ./
COPY apps/backend/pyproject.toml apps/backend/
COPY apps/frontend/pyproject.toml apps/frontend/

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev --package frontend

# Copy full application code and install project
COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --package frontend

# ──────────────────────────────────────────────
# Stage 2: Runtime
# ──────────────────────────────────────────────
FROM python:3.14-slim

RUN groupadd --system appgroup && \
    useradd --system --gid appgroup --create-home appuser

WORKDIR /workspace

COPY --from=builder --chown=appuser:appgroup /workspace/.venv /workspace/.venv
COPY --chown=appuser:appgroup . .

ENV PATH="/workspace/.venv/bin:$PATH"

EXPOSE 8501

USER appuser

CMD ["streamlit", "run", "apps/frontend/main.py", "--server.port=8501", "--server.address=0.0.0.0"]
