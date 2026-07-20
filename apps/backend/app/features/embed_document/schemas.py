import enum
from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, Field
from litestar.dto import DTOConfig
from litestar.contrib.pydantic import PydanticDTO

from .config import settings as embed_settings


class TaskStatus(enum.StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    CANCELLING = "cancelling"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class SupportedDenseModels(enum.StrEnum):
    MULTILINGUAL_E5_LARGE = embed_settings.default_dense_model_name


class SupportedSparseModels(enum.StrEnum):
    QDRANT_BM25 = embed_settings.default_sparse_model_name


class SupportedSparseLanguages(enum.StrEnum):
    ARABIC = "arabic"
    DANISH = "danish"
    DUTCH = "dutch"
    ENGLISH = "english"
    FINNISH = "finnish"
    FRENCH = "french"
    GERMAN = "german"
    GREEK = "greek"
    HUNGARIAN = "hungarian"
    ITALIAN = "italian"
    NORWEGIAN = "norwegian"
    PORTUGUESE = "portuguese"
    ROMANIAN = "romanian"
    RUSSIAN = "russian"
    SPANISH = "spanish"
    SWEDISH = "swedish"
    TAMIL = "tamil"
    TURKISH = "turkish"


class EmbedConfig(BaseModel):
    dense_model: SupportedDenseModels = Field(
        default=SupportedDenseModels.MULTILINGUAL_E5_LARGE
    )
    sparse_model: SupportedSparseModels = Field(
        default=SupportedSparseModels.QDRANT_BM25
    )
    sparse_language: SupportedSparseLanguages = Field(
        default=SupportedSparseLanguages.TURKISH
    )


class EmbedItem(BaseModel):
    chunk_id: str
    metadata: dict[str, Any]


class EmbedRequest(BaseModel):
    file_id: str
    filename: str
    config: EmbedConfig = Field(default_factory=EmbedConfig)


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
    completed_vectors: Optional[int] = None
    config: Optional[EmbedConfig] = None
    items: Optional[list[EmbedItem]] = None


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
            "completed_vectors",
            "config",
        }
    )
