# RAG Ingestion Pipeline

A document ingestion pipeline for RAG (Retrieval-Augmented Generation) workflows. 

## Overview
This project processes raw documents (like PDFs, DOCX, etc.) and prepares them for vector search. 

**Pipeline Stages:**
1. **Parsing (Current Stage):** Extracts structured markdown from documents using Docling.
2. **Chunking (Planned):** Splitting the parsed document into semantic chunks.
3. **Embedding (Planned):** Generating vector embeddings for each chunk.
4. **Vector Storage (Planned):** Indexing the embeddings into a Vector Database.

## Tech Stack
- **Backend Framework:** [Litestar](https://github.com/litestar-org/litestar)
- **Document Parsing:** [Docling](https://github.com/docling-project/docling)
- **Logging:** [structlog](https://github.com/hynek/structlog)
- **Containerization:** [Docker](https://www.docker.com/)
- **Package Management:** [uv](https://github.com/astral-sh/uv)
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

The API will be available at `http://localhost:8000`. You can test the parsing endpoint at `POST /documents/parse` by uploading a file via multipart form-data.

To shut down:
```bash
just down          # or: docker compose down
```

### Local Development

If you prefer to run without Docker (e.g. for faster iteration on code-only changes):

```bash
uv sync                                                          # install dependencies
uv run litestar --app app.main:app run --debug --reload          # start dev server
```

Or with `just`:
```bash
just install       # uv sync
just dev-local     # start dev server without Docker
```

### Code Quality

Linting, formatting, and type checking run locally regardless of how you run the app:

```bash
just check         # runs lint + format + typecheck sequentially
```

Or individually:
```bash
just lint          # or: uv run ruff check .
just format        # or: uv run ruff format .
just typecheck     # or: uv run ty check
```

## Contributing
We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our development workflow, architecture rules, and the process for submitting pull requests. For AI agents working on this repository, please see [AGENTS.md](AGENTS.md).
