# RAG Ingestion Pipeline

A document ingestion pipeline for RAG (Retrieval-Augmented Generation) workflows. 

## Overview
This project processes raw documents (like PDFs, DOCX, etc.) and prepares them for vector search. It is structured as a `uv` workspace monorepo containing a Litestar backend and a Streamlit frontend.

**Pipeline Stages:**
1. **Parsing (Current Stage):** Extracts structured content from documents using Docling. Supports Markdown and JSON output formats.
2. **Chunking (Planned):** Splitting the parsed document into semantic chunks.
3. **Embedding (Planned):** Generating vector embeddings for each chunk.
4. **Vector Storage (Planned):** Indexing the embeddings into a Vector Database.

## Tech Stack
- **Backend Framework:** [Litestar](https://github.com/litestar-org/litestar)
- **Frontend Framework:** [Streamlit](https://github.com/streamlit/streamlit)
- **Task Queue:** [TaskIQ](https://github.com/taskiq-python/taskiq) with [Redis](https://github.com/redis/redis/)
- **Document Parsing:** [Docling](https://github.com/docling-project/docling)
- **Logging:** [structlog](https://github.com/hynek/structlog)
- **Containerization:** [Docker](https://www.docker.com/)
- **Package & Monorepo Management:** [uv workspaces](https://github.com/astral-sh/uv)
- **Task Runner:** [just](https://github.com/casey/just)
- **Quality & Typing:** [ruff](https://github.com/astral-sh/ruff) and [ty](https://github.com/astral-sh/ty)

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

For local development (without Docker):
- Python 3.14+
- `uv` installed

### Running the Application

The recommended way to run the project is through Docker. This handles all dependencies, including Docling's ML models, inside the container.

**With `just` (recommended):**
```bash
just dev
```

**Without `just`:**
```bash
docker compose up --build
```

The Backend API will be available at `http://localhost:8000`. <br>The Frontend UI will be available at `http://localhost:8501`.

To shut down:
```bash
just down          # or: docker compose down
```

### Local Development

If you prefer to run without Docker (e.g. for faster iteration on code-only changes):

```bash
# install dependencies
uv sync

# start backend server
uv run --package backend litestar --app apps.backend.app.main:app run --debug --reload

# start worker process
uv run --package backend taskiq worker apps.backend.app.core.broker:broker apps.backend.app.features.document_parsing.tasks --reload

# start frontend server
uv run --package frontend streamlit run apps/frontend/main.py
```

Or with `just`:
```bash
just install       # uv sync
just dev-backend   # start backend server without Docker
just dev-worker    # start background worker without Docker
just dev-frontend  # start frontend server without Docker
```

### Code Quality

Linting, formatting, and type checking run locally regardless of how you run the app:

```bash
just check         # runs lint + format + typecheck sequentially across the workspace
```

Or individually:
```bash
just lint          # or: uv run ruff check .
just format        # or: uv run ruff format .
just typecheck     # or: uv run ty check
```

## Contributing
We welcome contributions! To maintain a clean codebase, we follow a strict Pull Request workflow, please always work on a separate branch and never commit directly to `master`.

We use **Conventional Commits** and **Google Release Please** for automated versioning and changelog generation. Please do not manually bump package versions.

See [CONTRIBUTING.md](CONTRIBUTING.md) for full details on our branching strategy, architecture rules, and development setup. For AI agents working on this repository, please see [AGENTS.md](AGENTS.md).
