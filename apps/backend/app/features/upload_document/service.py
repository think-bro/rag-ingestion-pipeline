import os
import uuid

import structlog
from anyio import Path, open_file, to_thread
import pypdfium2 as pdfium
from litestar.datastructures import UploadFile

from apps.backend.app.core.config import UPLOAD_DIR
from .schemas import UploadResponse

logger = structlog.get_logger()


class UploadDocumentService:
    async def upload_file(self, upload_file: UploadFile) -> UploadResponse:
        """Saves the uploaded file to disk and extracts metadata (e.g. page count)."""
        file_uuid = uuid.uuid4().hex
        _, ext = os.path.splitext(upload_file.filename)
        if not ext:
            ext = ".pdf"
        save_filename = f"{file_uuid}{ext}"
        save_path = UPLOAD_DIR / save_filename

        file_size = 0
        async with await open_file(save_path, "wb") as out_file:
            while content := await upload_file.read(1024 * 1024):
                file_size += len(content)
                await out_file.write(content)

        page_count = None
        if ext.lower() == ".pdf":
            try:

                def get_page_count(path: str) -> int:
                    with pdfium.PdfDocument(path) as pdf:
                        return len(pdf)

                page_count = await to_thread.run_sync(get_page_count, str(save_path))
            except Exception as e:
                logger.error(
                    "failed_to_get_page_count",
                    filename=upload_file.filename,
                    error=str(e),
                )

        return UploadResponse(
            file_id=save_filename,
            filename=upload_file.filename,
            size=file_size,
            page_count=page_count,
        )

    async def delete_upload(self, file_id: str) -> None:
        """Deletes an uploaded file from disk."""
        if ".." in file_id or "/" in file_id or "\\" in file_id:
            raise ValueError("Invalid file_id")

        file_path = UPLOAD_DIR / file_id
        path_obj = Path(file_path)
        try:
            await path_obj.unlink(missing_ok=True)
            logger.info("deleted_uploaded_file", file_id=file_id)
        except Exception as e:
            logger.error(
                "failed_to_delete_uploaded_file", file_id=file_id, error=str(e)
            )
