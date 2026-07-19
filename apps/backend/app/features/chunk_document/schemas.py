import enum
from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, Field
from litestar.dto import DTOConfig
from litestar.contrib.pydantic import PydanticDTO

from .config import settings as chunk_settings


class TaskStatus(enum.StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    CANCELLING = "cancelling"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ChunkConfig(BaseModel):
    tokenizer_id: str = Field(default=chunk_settings.default_tokenizer_id)
    chunk_size: int = Field(default=chunk_settings.default_chunk_size, ge=64, le=8192)
    chunk_overlap: int = Field(
        default=chunk_settings.default_chunk_overlap, ge=0, le=2048
    )
    min_characters_per_chunk: int = Field(
        default=chunk_settings.default_min_chars_per_chunk, ge=1
    )
    headers_to_split_on: list[tuple[str, str]] = Field(
        default_factory=lambda: list(chunk_settings.default_headers_to_split_on)
    )
    strip_headers: bool = False
    custom_metadata: dict[str, str] = Field(default_factory=dict)


class ChunkItem(BaseModel):
    chunk_id: str
    text: Optional[str] = None
    contextualized_text: Optional[str] = None
    metadata: dict[str, Any]


class ChunkRequest(BaseModel):
    file_id: str
    filename: str
    preset_id: Optional[str] = None
    config: ChunkConfig = Field(default_factory=ChunkConfig)


class ChunkPresetSummary(BaseModel):
    id: str
    name: str
    description: str
    metadata_options: dict[str, list[str]] = Field(default_factory=dict)
    config_overrides: dict[str, Any] = Field(default_factory=dict)


class ChunkPresetListResponse(BaseModel):
    presets: list[ChunkPresetSummary]


class ChunkTaskResponse(BaseModel):
    task_id: str
    task_type: str = "chunking"
    status: TaskStatus
    filename: Optional[str] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    processing_time: Optional[float] = None
    file_size: Optional[int] = None
    total_chunks: Optional[int] = None
    config: Optional[ChunkConfig] = None
    items: Optional[list[ChunkItem]] = None


class ChunkTaskListDTO(PydanticDTO[ChunkTaskResponse]):
    config = DTOConfig(
        include={
            "task_id",
            "task_type",
            "status",
            "filename",
            "created_at",
            "processing_time",
            "file_size",
            "total_chunks",
            "config",
        }
    )
