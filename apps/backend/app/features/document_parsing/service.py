import json
import os
import uuid
from datetime import datetime, timezone

import anyio
import structlog
from docling.document_converter import DocumentConverter
from litestar.datastructures import UploadFile

from apps.backend.app.core.broker import broker
from apps.backend.app.core.config import RESULTS_DIR, UPLOAD_DIR
from .schemas import OutputFormat, TaskResultResponse, TaskStatus
from .tasks import parse_document_task

logger = structlog.get_logger()


class ParserService:
    def __init__(self, converter: DocumentConverter):
        self.converter = converter

    async def save_and_submit_task(
        self, upload_file: UploadFile, output_format: OutputFormat
    ) -> str:
        """Saves the uploaded file to disk and submits the task."""
        file_uuid = uuid.uuid4().hex
        _, ext = os.path.splitext(upload_file.filename)
        if not ext:
            ext = ".pdf"
        save_filename = f"{file_uuid}{ext}"
        save_path = UPLOAD_DIR / save_filename

        async with await anyio.open_file(save_path, "wb") as out_file:
            while content := await upload_file.read(1024 * 1024):
                await out_file.write(content)

        result = await parse_document_task.kiq(
            filename=upload_file.filename,
            file_path=str(save_path),
            output_format=output_format.value,
        )
        task_id = result.task_id

        # Write initial 'pending' state to disk so it appears in the task list
        pending_data = {
            "task_id": task_id,
            "status": TaskStatus.PENDING.value,
            "filename": upload_file.filename,
            "output_format": output_format.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        result_path = RESULTS_DIR / f"{task_id}.json"
        async with await anyio.open_file(result_path, "w") as f:
            await f.write(json.dumps(pending_data, indent=2))

        logger.info(
            "submitted_parse_task", task_id=task_id, filename=upload_file.filename
        )
        return task_id

    async def get_task_result(self, task_id: str) -> TaskResultResponse | None:
        """Queries the task status from Redis, then fetches large payloads from disk."""
        # 1. Ask Redis for the task status
        is_ready = await broker.result_backend.is_result_ready(task_id)
        if not is_ready:
            return TaskResultResponse(
                task_id=task_id,
                status=TaskStatus.PROCESSING,
            )

        # 2. Get the result metadata from Redis
        result = await broker.result_backend.get_result(task_id)
        if result.is_err:
            return TaskResultResponse(
                task_id=task_id,
                status=TaskStatus.FAILED,
                error=str(result.error),
            )

        data = result.return_value
        if not isinstance(data, dict):
            return TaskResultResponse(
                task_id=task_id,
                status=TaskStatus.FAILED,
                error="Invalid result format in Redis.",
            )

        # 3. Use the disk reference (result_uri) to load the heavy payload
        result_uri = data.get("result_uri")
        if isinstance(result_uri, str):
            path_obj = anyio.Path(result_uri)
            if await path_obj.exists():
                try:
                    async with await anyio.open_file(result_uri, "r") as f:
                        content = await f.read()
                        disk_data = json.loads(content)
                        return TaskResultResponse(**disk_data)
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
            error="Result file not found on disk despite task being marked ready in Redis.",
        )

    async def get_all_tasks(self) -> list[TaskResultResponse]:
        """Lists all tasks from the disk results directory."""
        tasks = []
        path_obj = anyio.Path(RESULTS_DIR)
        if await path_obj.exists():
            async for file in path_obj.iterdir():
                if file.suffix == ".json":
                    try:
                        async with await anyio.open_file(file, "r") as f:
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
