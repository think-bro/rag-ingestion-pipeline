# ──────────────────────────────────────────────
# Stage 1: Builder
# ──────────────────────────────────────────────
FROM python:3.14-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set env variables for uv
ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

WORKDIR /app

# Dependency caching: copy only lock files first
COPY pyproject.toml uv.lock ./

# Use cache mount to speed up rebuilds
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# Copy application code and install the project
COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# ──────────────────────────────────────────────
# Stage 2: Runtime
# ──────────────────────────────────────────────
FROM python:3.14-slim

# Install system dependencies required by OpenCV (cv2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libxcb1 \
    && rm -rf /var/lib/apt/lists/*

# Security: non-root user
RUN groupadd --system appgroup && \
    useradd --system --gid appgroup --create-home appuser

WORKDIR /app

# Copy only the venv from the builder stage and set ownership
COPY --from=builder --chown=appuser:appgroup /app/.venv /app/.venv

# Pre-create volume mount points to ensure appuser owns them when Docker mounts empty volumes
RUN mkdir -p /app/models/hf /app/.venv/lib/python3.14/site-packages/rapidocr/models && \
    chown -R appuser:appgroup /app/models /app/.venv/lib/python3.14/site-packages/rapidocr/models

# Copy application code and set ownership
COPY --chown=appuser:appgroup . .

# Add venv to PATH
ENV PATH="/app/.venv/bin:$PATH"

# Expose default Litestar port
EXPOSE 8000

# Healthcheck — using python as slim image lacks curl
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]

# Switch to non-root user
USER appuser

# Run the Litestar application
CMD ["litestar", "--app", "app.main:app", "run", "--host", "0.0.0.0", "--port", "8000"]
