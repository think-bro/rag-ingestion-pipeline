# RAG Ingestion Pipeline

An asynchronous document ingestion pipeline for RAG (Retrieval-Augmented Generation) workflows. This image is part of a multi-container stack.

## Quick Start

This application requires multiple services (Backend, Frontend, Redis, and Background Workers) to function correctly. 

**Do not run this image standalone.** Instead, run the full stack using our official Docker Compose file.

### Step 1: Download Configuration

Download the deployment configuration:

**Linux / macOS:**
```bash
curl -o compose.yaml https://raw.githubusercontent.com/think-bro/rag-ingestion-pipeline/master/compose.yaml
```

**Windows (PowerShell):**
```powershell
irm "https://raw.githubusercontent.com/think-bro/rag-ingestion-pipeline/master/compose.yaml" -OutFile "compose.yaml"
```

### Step 2: Start the Application

Start the entire application stack:

```bash
docker compose up -d
```

- The **Backend API** will be available at `http://localhost:8000`.
- The **Frontend UI** will be available at `http://localhost:3000`.

## Overview
- Processes raw documents (PDFs, etc.) and extracts structured content using Docling.
- High-performance asynchronous background processing using TaskIQ and Redis.
- Built-in isolated subprocesses for heavy ML workloads to prevent Out-Of-Memory errors.

## Documentation & Source Code
For full documentation, API endpoints, architecture diagrams, and contribution guidelines, please visit the main [GitHub Repository](https://github.com/think-bro/rag-ingestion-pipeline).
