from typing import Optional
from pydantic import BaseModel


class UploadResponse(BaseModel):
    file_id: str
    filename: str
    size: int
    page_count: Optional[int] = None
