import os
from pathlib import Path

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")

WORKSPACE_DIR = os.getenv("WORKSPACE_DIR")
BASE_DIR = Path(WORKSPACE_DIR) if WORKSPACE_DIR else Path.cwd()
STORAGE_DIR = BASE_DIR / "storage"
UPLOAD_DIR = STORAGE_DIR / "uploads"
RESULTS_DIR = STORAGE_DIR / "results"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)
