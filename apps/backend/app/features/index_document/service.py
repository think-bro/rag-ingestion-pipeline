import uuid
import json
from datetime import datetime, timezone
from typing import Any
import structlog
from anyio import Path

from apps.backend.app.core.config import settings as core_settings
from .schemas import (
    IndexRequest,
    TaskStatus,
    IndexTaskResponse,
    IndexItem,
)
from .tasks import index_task

logger = structlog.get_logger()


class IndexDocumentService:
    def __init__(self, redis: Any):
        self.redis = redis

    async def submit_index_task(self, request: IndexRequest) -> str:
        """Saves task info to Redis and submits background indexing task."""
        file_id = request.file_id

        if ".." in file_id or "/" in file_id or "\\" in file_id:
            raise ValueError("Invalid file_id")

        file_path = core_settings.upload_dir / file_id
        path_obj = Path(file_path)

        if not await path_obj.exists():
            raise ValueError(f"File {file_id} not found in uploads directory.")

        task_id = uuid.uuid4().hex

        stat = await path_obj.stat()
        file_size = stat.st_size

        config = request.config

        pending_data = {
            "task_id": task_id,
            "task_type": "indexing",
            "status": TaskStatus.PENDING.value,
            "filename": request.filename,
            "config": config.model_dump_json(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "file_size": file_size,
            "total_vectors": 0,
            "completed_vectors": 0,
        }
        await self.redis.hset(f"index_task:{task_id}", mapping=pending_data)

        await index_task.kiq(
            task_id=task_id,
            file_path=str(path_obj),
            filename=request.filename,
            config_json=config.model_dump_json(),
        )

        logger.info(
            "submitted_index_task",
            task_id=task_id,
            filename=request.filename,
        )
        return task_id

    async def get_task_result(self, task_id: str) -> IndexTaskResponse | None:
        """Retrieves a single task result from Redis, including preview JSON if completed."""
        task_data = await self.redis.hgetall(f"index_task:{task_id}")
        if not task_data:
            return None

        if "processing_time" in task_data:
            task_data["processing_time"] = float(task_data["processing_time"])
        if "file_size" in task_data:
            task_data["file_size"] = int(task_data["file_size"])
        if "total_vectors" in task_data:
            task_data["total_vectors"] = int(task_data["total_vectors"])
        if "completed_vectors" in task_data:
            task_data["completed_vectors"] = int(task_data["completed_vectors"])
        if "config" in task_data:
            task_data["config"] = json.loads(task_data["config"])

        response = IndexTaskResponse(**task_data)

        if response.status == TaskStatus.COMPLETED:
            preview_path = core_settings.indexes_dir / f"{task_id}_preview.json"
            if await Path(preview_path).exists():
                with open(preview_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if "items" in data:
                        response.items = [IndexItem(**c) for c in data["items"]]

        return response

    async def get_all_tasks(self) -> list[IndexTaskResponse]:
        """Retrieves all index tasks from Redis without full payload data."""
        keys = await self.redis.keys("index_task:*")

        if not keys:
            return []

        pipe = self.redis.pipeline()
        for key in keys:
            pipe.hgetall(key)

        results = await pipe.execute()

        tasks = []
        for data in results:
            if not data:
                continue
            if "processing_time" in data:
                data["processing_time"] = float(data["processing_time"])
            if "file_size" in data:
                data["file_size"] = int(data["file_size"])
            if "total_vectors" in data:
                data["total_vectors"] = int(data["total_vectors"])
            if "completed_vectors" in data:
                data["completed_vectors"] = int(data["completed_vectors"])
            if "config" in data:
                data["config"] = json.loads(data["config"])

            tasks.append(IndexTaskResponse(**data))

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
        """Deletes a task and its temp files from storage."""
        try:
            await self.redis.delete(f"index_task:{task_id}")
            await Path(core_settings.indexes_dir / f"{task_id}_preview.json").unlink(
                missing_ok=True
            )
            await Path(core_settings.indexes_dir / f"{task_id}_error.json").unlink(
                missing_ok=True
            )
            await Path(core_settings.indexes_dir / f"{task_id}_progress.json").unlink(
                missing_ok=True
            )
            logger.info("deleted_index_task_result", task_id=task_id)
        except Exception as e:
            logger.error(
                "failed_to_delete_index_task_result", task_id=task_id, error=str(e)
            )

    async def cancel_task(self, task_id: str) -> bool:
        """Marks a task for cancellation in Redis, triggering termination in the background worker."""
        task_data = await self.redis.hgetall(f"index_task:{task_id}")
        if not task_data:
            return False

        current_status = task_data.get("status")
        if current_status not in [
            TaskStatus.PENDING.value,
            TaskStatus.PROCESSING.value,
            TaskStatus.CANCELLING.value,
        ]:
            return False

        cancel_key = f"{core_settings.cancel_key_prefix}{task_id}"
        await self.redis.set(cancel_key, "1", ex=core_settings.cancel_key_ttl)

        await self.redis.hset(
            f"index_task:{task_id}", "status", TaskStatus.CANCELLING.value
        )

        logger.info("initiated_index_task_cancellation", task_id=task_id)
        return True
