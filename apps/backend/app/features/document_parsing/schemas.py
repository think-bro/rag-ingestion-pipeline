import enum
from typing import Optional

from pydantic import BaseModel


class TaskStatus(enum.StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


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
