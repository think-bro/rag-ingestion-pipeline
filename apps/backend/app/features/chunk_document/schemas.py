import enum
from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, Field
from litestar.dto import DTOConfig
from litestar.contrib.pydantic import PydanticDTO


class TaskStatus(enum.StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    CANCELLING = "cancelling"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ChunkConfig(BaseModel):
    # TODO: Add other tokenizer options (e.g. gpt2, cl100k_base) and make them selectable via UI
    tokenizer_id: str = Field(default="intfloat/multilingual-e5-large")
    chunk_size: int = Field(default=512, ge=64, le=8192)
    chunk_overlap: int = Field(default=64, ge=0, le=2048)
    min_characters_per_chunk: int = Field(default=24, ge=1)
    headers_to_split_on: list[tuple[str, str]] = Field(
        default_factory=lambda: [
            ("#", "Header 1"),
            ("##", "Header 2"),
            ("###", "Header 3"),
            ("####", "Header 4"),
        ]
    )
    strip_headers: bool = False
    custom_metadata: dict[str, str] = Field(default_factory=dict)


class ChunkItem(BaseModel):
    chunk_id: str
    text: str
    contextualized_text: str
    metadata: dict[str, Any]


class ChunkRequest(BaseModel):
    file_id: str
    filename: str
    config: ChunkConfig = Field(default_factory=ChunkConfig)


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
    chunks: Optional[list[ChunkItem]] = None


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
