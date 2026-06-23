import json
import os
import uuid
from datetime import datetime, timezone

import structlog
from anyio import Path, open_file, to_thread
import pypdfium2 as pdfium
from docling.document_converter import DocumentConverter
from litestar.datastructures import UploadFile

from apps.backend.app.core.config import RESULTS_DIR, UPLOAD_DIR
from .schemas import TaskResultResponse, TaskStatus, UploadResponse, ParseRequest
from .tasks import parse_document_task

logger = structlog.get_logger()


class ParserService:
    def __init__(self, converter: DocumentConverter):
        self.converter = converter

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

    async def save_and_submit_task(self, parse_request: ParseRequest) -> str:
        """Submits the task using an already uploaded file."""
        file_id = parse_request.file_id

        if ".." in file_id or "/" in file_id or "\\" in file_id:
            raise ValueError("Invalid file_id")

        file_path = UPLOAD_DIR / file_id
        path_obj = Path(file_path)

        if not await path_obj.exists():
            raise ValueError(f"File {file_id} not found in uploads directory.")

        result = await parse_document_task.kiq(
            filename=parse_request.filename,
            file_path=str(file_path),
            output_format=parse_request.output_format.value,
        )
        task_id = result.task_id

        # Write initial 'pending' state to disk so it appears in the task list
        pending_data = {
            "task_id": task_id,
            "status": TaskStatus.PENDING.value,
            "filename": parse_request.filename,
            "output_format": parse_request.output_format.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        result_path = RESULTS_DIR / f"{task_id}.json"
        async with await open_file(result_path, "w") as f:
            await f.write(json.dumps(pending_data, indent=2))

        logger.info(
            "submitted_parse_task", task_id=task_id, filename=parse_request.filename
        )
        return task_id

    async def get_task_result(self, task_id: str) -> TaskResultResponse | None:
        """Fetches the task result directly from the disk source of truth."""
        result_path = RESULTS_DIR / f"{task_id}.json"

        path_obj = Path(result_path)
        if await path_obj.exists():
            try:
                async with await open_file(result_path, "r") as f:
                    content = await f.read()
                    data = json.loads(content)
                    return TaskResultResponse(**data)
            except Exception as e:
                logger.error(
                    "failed_to_parse_result_json", task_id=task_id, error=str(e)
                )
                return TaskResultResponse(
                    task_id=task_id,
                    status=TaskStatus.FAILED,
                    error=f"Corrupted disk result: {e}",
                )

        return TaskResultResponse(
            task_id=task_id,
            status=TaskStatus.FAILED,
            error="Result file not found on disk.",
        )

    async def get_all_tasks(self) -> list[TaskResultResponse]:
        """Lists all tasks from the disk results directory."""
        tasks = []
        path_obj = Path(RESULTS_DIR)
        if await path_obj.exists():
            async for file in path_obj.iterdir():
                if file.suffix == ".json":
                    try:
                        async with await open_file(file, "r") as f:
                            content = await f.read()
                            data = json.loads(content)
                            tasks.append(TaskResultResponse(**data))
                    except Exception as e:
                        logger.error(
                            "failed_to_read_task_json", file=str(file), error=str(e)
                        )

        # Sort tasks by created_at descending (newest first)
        tasks.sort(
            key=lambda t: (
                t.created_at
                if t.created_at
                else datetime.min.replace(tzinfo=timezone.utc)
            ),
            reverse=True,
        )
        return tasks

    async def delete_task(self, task_id: str) -> None:
        """Deletes a task result from disk."""
        result_path = RESULTS_DIR / f"{task_id}.json"

        path_obj = Path(result_path)
        try:
            await path_obj.unlink(missing_ok=True)
            logger.info("deleted_task_result", task_id=task_id)
        except Exception as e:
            logger.error("failed_to_delete_task_result", task_id=task_id, error=str(e))
