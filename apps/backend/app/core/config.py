from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
import os


# Paths
WORKSPACE_DIR = os.getenv("WORKSPACE_DIR")
BASE_DIR = Path(WORKSPACE_DIR) if WORKSPACE_DIR else Path.cwd()
STORAGE_DIR = BASE_DIR / "storage"


class CoreSettings(BaseSettings):
    redis_url: str = "redis://redis:6379/0"
    upload_dir: Path = STORAGE_DIR / "uploads"
    parts_dir: Path = STORAGE_DIR / "parts"
    parses_dir: Path = STORAGE_DIR / "parses"
    chunks_dir: Path = STORAGE_DIR / "chunks"
    vectors_dir: Path = STORAGE_DIR / "vectors"
    indexes_dir: Path = STORAGE_DIR / "indexes"

    cancel_key_prefix: str = "cancel_task:"
    cancel_key_ttl: int = 3600  # 1 hour
    subprocess_poll_interval: float = 1.0  # seconds
    subprocess_terminate_timeout: float = 3.0  # seconds

    max_upload_size_bytes: int = 512 * 1024 * 1024  # 512 MB
    hf_models_cache_dir: str = "/workspace/models/hf/hub"

    model_config = SettingsConfigDict(
        env_prefix="CORE_", case_sensitive=False, extra="ignore"
    )


settings = CoreSettings()

# Ensure directories exist
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.parts_dir.mkdir(parents=True, exist_ok=True)
settings.parses_dir.mkdir(parents=True, exist_ok=True)
settings.chunks_dir.mkdir(parents=True, exist_ok=True)
settings.vectors_dir.mkdir(parents=True, exist_ok=True)
settings.indexes_dir.mkdir(parents=True, exist_ok=True)
