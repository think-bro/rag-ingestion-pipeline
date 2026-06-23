# RAG Ingestion Pipeline

An asynchronous document ingestion pipeline for RAG (Retrieval-Augmented Generation) workflows.

## Overview
This project processes raw documents (like PDFs, etc.) and prepares them for vector search. It is structured as a monorepo containing a Litestar backend and a Next.js frontend, with TaskIQ handling async processing.

**Pipeline Stages:**
1. **Parsing (Current Stage):** Extracts structured content from documents using Docling. Outputs structured Markdown.
2. **Chunking (Planned):** Splitting the parsed document into semantic chunks.
3. **Embedding (Planned):** Generating vector embeddings for each chunk.
4. **Vector Storage (Planned):** Indexing the embeddings into a Vector Database.

## Architecture

```mermaid
sequenceDiagram
    participant F as Frontend (Next.js)
    participant B as Backend (Litestar)
    participant R as Redis (Broker/Queue)
    participant W as TaskIQ Worker
    participant D as Disk (/storage)

    Note over F,B: Phase 1: Pre-upload (Instant)
    F->>B: POST /api/documents/uploads (multipart file upload)
    B->>D: Save file to disk (/storage/uploads/{uuid}.ext)
    B->>B: Extract page count via pypdfium2
    B->>F: 201 Created {file_id: "uuid.ext", page_count: 14}
    
    opt If user cancels the process (Trash Icon or Modal Close)
        F->>B: DELETE /api/documents/uploads/{file_id}
        B->>D: Delete file from disk
    end

    Note over F,B: Phase 2: Start Ingestion
    F->>B: POST /api/documents/parse {file_id: "uuid.ext", output_format: "markdown"}
    B->>R: Write initial task state (pending) to Redis Hash
    B->>R: Enqueue task (task_id, file_path, options)
    B->>F: 202 Accepted {task_id: "abc-123"}

    loop Every 2 seconds (adaptive polling)
        F->>B: GET /api/documents/tasks/abc-123
        B->>R: Read task metadata/status from Redis Hash
        B->>D: Read content from disk ONLY IF completed
        B->>F: {status: "processing"} or {status: "completed", content: "..."}
    end
    
    opt User Cancels Task
        F->>B: POST /api/documents/tasks/abc-123/cancel
        B->>R: Write cancellation flag (cancel_task:abc-123)
        B->>F: 202 Accepted {status: "cancelling"}
    end

    Note over W,D: Background Processing (1 Task per Worker)
    W->>R: Dequeue task
    W->>W: Spawn isolated subprocess (parse_worker.py)
    loop Polling Loop (1s)
        W->>R: Check cancellation flag
        opt If Cancelled
            W->>W: Send SIGTERM to subprocess
            W->>R: Update task state to cancelled
        end
    end
    W->>D: Read JSON IPC result from subprocess
    W->>D: Delete original uploaded file (file_id)
    W->>D: Write final parsed content to disk (.md)
    W->>R: Update task state to completed or failed
    
    Note over W,D: Cron Job (Hourly)
    W->>D: Clean up orphaned files older than 24h
```

## Tech Stack
- **Backend Framework:** [Litestar](https://github.com/litestar-org/litestar) (Python 3.14)
- **Frontend Framework:** [Next.js](https://github.com/vercel/next.js) 16 (App Router, static export)
- **UI Components:** [shadcn/ui](https://github.com/shadcn-ui/ui) with [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) v4
- **Task Queue:** [TaskIQ](https://github.com/taskiq-python/taskiq) with [Redis](https://github.com/redis/redis/)
- **Document Parsing:** [Docling](https://github.com/docling-project/docling)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand), [TanStack Query](https://github.com/TanStack/query)
- **Containerization:** [Docker](https://www.docker.com/)
- **Backend Package Management:** [uv](https://github.com/astral-sh/uv)
- **Frontend Package Management:** [pnpm](https://github.com/pnpm/pnpm)
- **Task Runner:** [just](https://github.com/casey/just)
- **Backend Quality:** [ruff](https://github.com/astral-sh/ruff) (lint/format), [ty](https://github.com/astral-sh/ty) (type check)
- **Frontend Quality:** [Ultracite](https://github.com/haydenbleasel/ultracite) / [Biome](https://github.com/biomejs/biome) (lint/format)
- **Logging:** [structlog](https://github.com/hynek/structlog)

## Getting Started (For Users)

If you only want to use the application locally, you do not need any development tools installed.

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- [just](https://github.com/casey/just) command runner installed

### Installation & Running

1. Clone the repository and navigate into the project directory:
```bash
git clone https://github.com/think-bro/rag-ingestion-pipeline.git
cd rag-ingestion-pipeline
```

2. Start the application. This handles all dependencies, including Docling's ML models, and ensures maximum performance by utilizing multiple background workers.
```bash
# Starts the entire stack (Frontend, Backend, Worker, Redis) in stable mode
just run
```

The Backend API will be available at `http://localhost:8000`. <br>
The Frontend UI will be available at `http://localhost:3000`.

To shut down the system:
```bash
just down
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
