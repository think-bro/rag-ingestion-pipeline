# RAG Ingestion Pipeline

An asynchronous document ingestion pipeline for RAG (Retrieval-Augmented Generation) workflows.

## Overview
This project processes raw documents (like PDFs, etc.) and prepares them for vector search. It is structured as a monorepo containing a Litestar backend and a Next.js frontend, with TaskIQ handling async processing.

**Pipeline Stages:**
1. **Parsing:** Extracts structured content from raw documents using Docling. Outputs structured Markdown.
2. **Chunking:** Splits the parsed document into hierarchical and token-aware recursive chunks using LangChain and Chonkie. Outputs flattened JSON ready for vector ingestion.
3. **Embedding (Planned):** Generating vector embeddings for each chunk.
4. **Vector Storage (Planned):** Indexing the embeddings into a Vector Database.

## Tech Stack
- **Backend Framework:** [Litestar](https://github.com/litestar-org/litestar) (Python 3.14)
- **Frontend Framework:** [Next.js](https://github.com/vercel/next.js) 16 (App Router, static export)
- **UI Components:** [shadcn/ui](https://github.com/shadcn-ui/ui) with [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) v4
- **Task Queue:** [TaskIQ](https://github.com/taskiq-python/taskiq) with [Redis](https://github.com/redis/redis/)
- **Document Parsing:** [Docling](https://github.com/docling-project/docling)
- **Document Chunking:** [Chonkie](https://github.com/feyninc/chonkie) and [LangChain](https://github.com/langchain-ai/langchain)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand), [TanStack Query](https://github.com/TanStack/query)
- **Containerization:** [Docker](https://www.docker.com/)
- **Backend Package Management:** [uv](https://github.com/astral-sh/uv)
- **Frontend Package Management:** [pnpm](https://github.com/pnpm/pnpm)
- **Task Runner:** [just](https://github.com/casey/just)
- **Backend Quality:** [ruff](https://github.com/astral-sh/ruff) (lint/format), [ty](https://github.com/astral-sh/ty) (type check)
- **Frontend Quality:** [Ultracite](https://github.com/haydenbleasel/ultracite) / [Biome](https://github.com/biomejs/biome) (lint/format)
- **Logging:** [structlog](https://github.com/hynek/structlog)

## Quick Start (For Users)

If you only want to run the application, you do not need to clone the repository or install any development tools.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Installation & Running

### Step 1: Download Configuration

Download the deployment configuration file (`compose.yaml`). Choose the correct command for your operating system:

**Linux / macOS:**
```bash
curl -o compose.yaml https://raw.githubusercontent.com/think-bro/rag-ingestion-pipeline/master/compose.yaml
```

**Windows (PowerShell):**
```powershell
irm "https://raw.githubusercontent.com/think-bro/rag-ingestion-pipeline/master/compose.yaml" -OutFile "compose.yaml"
```

### Step 2: Start the Application

Start the application. This pulls the pre-built images from Docker Hub, including Docling's ML models.

```bash
docker compose up -d
```

The Backend API will be available at `http://localhost:8000`. <br>
The Frontend UI will be available at `http://localhost:3000`.

To shut down the system:
```bash
docker compose down
```

## Development Setup (For Contributors)

If you are modifying the code, you will need the development toolchain. The development architecture utilizes multiple Docker Compose files and `develop.watch` for high-performance, cross-platform hot-reloading.

### Development Prerequisites
- Docker Desktop and `just`
- Python 3.14+ and `uv`
- Node.js 20+ and `pnpm`

### Starting the Development Environment

The development environment runs the backend services in Docker (with watch mode enabled) while the frontend runs natively on your machine for Next.js HMR.

1. Start the backend services (in watch mode):
```bash
just dev
```

2. Start the frontend development server (in a separate terminal):
```bash
# Install dependencies first if you haven't
just install

just dev-frontend
```

3. **Alternative (Stable Mode):** To test the entire stack locally with production settings (compiled frontend, no hot-reload), use:
```bash
just run
```

### Code Quality

Linting, formatting, and type checking run locally regardless of how you run the app. Both backend (Python) and frontend (TypeScript) toolchains run together:

```bash
# Runs lint + format + typecheck for both backend and frontend
just check
```

Or individually:
```bash
just lint
just format
just typecheck
```

## Contributing

We welcome contributions! To maintain a clean codebase, we follow a strict Pull Request workflow, please always work on a separate branch and never commit directly to `master`.

We use **Conventional Commits** and **Google Release Please** for automated versioning and changelog generation. Please do not manually bump package versions.

See [CONTRIBUTING.md](CONTRIBUTING.md) for full details on our branching strategy, architecture rules, and development setup. For AI agents working on this repository, please see [AGENTS.md](AGENTS.md).
