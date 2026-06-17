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
- **Package Management:** [uv](https://github.com/astral-sh/uv)
- **Task Runner:** [just](https://github.com/casey/just)
- **Quality & Typing:** [ruff](https://github.com/astral-sh/ruff) and [ty](https://github.com/astral-sh/ty)

## Getting Started

### Prerequisites
- Python 3.14+
- `uv` installed
- `just` installed

### Installation
Clone the repository and install the dependencies:
```bash
just install
```

### Running Locally
To start the development server with auto-reload:
```bash
just dev
```
The API will be available at `http://127.0.0.1:8000`. You can test the parsing endpoint at `POST /documents/parse` by uploading a file via multipart form-data.

## Contributing
We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on our development workflow, architecture rules, and the process for submitting pull requests. For AI agents working on this repository, please see [AGENTS.md](AGENTS.md).
