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


class EmbedConfig(BaseModel):
    # TODO: Add other embedding models and make them selectable via UI
    model_name: str = Field(default="intfloat/multilingual-e5-large")


class ChunkItem(BaseModel):
    chunk_id: str
    text: Optional[str] = None
    contextualized_text: Optional[str] = None
    metadata: dict[str, Any]


class EmbedRequest(BaseModel):
    file_id: str
    filename: str


class EmbedTaskResponse(BaseModel):
    task_id: str
    task_type: str = "embedding"
    status: TaskStatus
    filename: Optional[str] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    processing_time: Optional[float] = None
    file_size: Optional[int] = None
    total_vectors: Optional[int] = None
    config: Optional[EmbedConfig] = None
    items: Optional[list[ChunkItem]] = None


class EmbedTaskListDTO(PydanticDTO[EmbedTaskResponse]):
    config = DTOConfig(
        include={
            "task_id",
            "task_type",
            "status",
            "filename",
            "created_at",
            "processing_time",
            "file_size",
            "total_vectors",
            "config",
        }
    )
