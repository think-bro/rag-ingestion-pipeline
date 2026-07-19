import enum
from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, Field
from litestar.dto import DTOConfig
from litestar.contrib.pydantic import PydanticDTO

from .config import settings as index_settings


class TaskStatus(enum.StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    CANCELLING = "cancelling"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class SupportedVectorDBs(enum.StrEnum):
    QDRANT = index_settings.default_db_name


class IndexConfig(BaseModel):
    db_name: SupportedVectorDBs = Field(default=SupportedVectorDBs.QDRANT)
    url: str = Field(default=index_settings.default_url)
    collection_name: str
    embedding_dim: int = Field(default=index_settings.default_embedding_dim)


class IndexItem(BaseModel):
    chunk_id: str
    metadata: dict[str, Any]


class IndexRequest(BaseModel):
    file_id: str
    filename: str
    config: IndexConfig = Field(default_factory=IndexConfig)


class IndexTaskResponse(BaseModel):
    task_id: str
    task_type: str = "indexing"
    status: TaskStatus
    filename: Optional[str] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    processing_time: Optional[float] = None
    file_size: Optional[int] = None
    total_vectors: Optional[int] = None
    completed_vectors: Optional[int] = None
    config: Optional[IndexConfig] = None
    items: Optional[list[IndexItem]] = None


class IndexTaskListDTO(PydanticDTO[IndexTaskResponse]):
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
            "completed_vectors",
            "config",
        }
    )
