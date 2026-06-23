import enum
from datetime import datetime
from typing import Optional

from pydantic import BaseModel
from litestar.dto import DTOConfig
from litestar.contrib.pydantic import PydanticDTO


class TaskStatus(enum.StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class OutputFormat(enum.StrEnum):
    MARKDOWN = "markdown"
    JSON = "json"


class InputFormat(enum.StrEnum):
    PDF = "pdf"
    DOCX = "docx"
    PPTX = "pptx"
    XLSX = "xlsx"
    HTML = "html"
    IMAGE = "image"
    ASCIIDOC = "asciidoc"
    MD = "md"


class TaskResponse(BaseModel):
    task_id: str
    status: TaskStatus
    message: str


class TaskResultResponse(BaseModel):
    task_id: str
    status: TaskStatus
    filename: Optional[str] = None
    output_format: Optional[OutputFormat] = None
    content: Optional[str] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    processing_time: Optional[float] = None


class TaskListDTO(PydanticDTO[TaskResultResponse]):
    config = DTOConfig(
        include={"task_id", "status", "filename", "created_at", "processing_time"}
    )


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    size: int
    page_count: Optional[int] = None


class ParseRequest(BaseModel):
    file_id: str
    filename: str
    output_format: OutputFormat = OutputFormat.MARKDOWN
