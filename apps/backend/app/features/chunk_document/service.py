import uuid
from datetime import datetime, timezone
from typing import Any
import json
import structlog
from anyio import Path

from apps.backend.app.core.config import (
    UPLOAD_DIR,
    CHUNKS_DIR,
    CANCEL_KEY_PREFIX,
    CANCEL_KEY_TTL,
)
from .schemas import ChunkRequest, TaskStatus, ChunkTaskResponse, ChunkItem
from .tasks import chunk_task

logger = structlog.get_logger()


class ChunkDocumentService:
    def __init__(self, redis: Any):
        self.redis = redis

    async def submit_chunk_task(self, request: ChunkRequest) -> str:
        """Saves task info to Redis and submits background chunking task."""
        file_id = request.file_id

        if ".." in file_id or "/" in file_id or "\\" in file_id:
            raise ValueError("Invalid file_id")

        file_path = UPLOAD_DIR / file_id
        path_obj = Path(file_path)

        if not await path_obj.exists():
            raise ValueError(f"File {file_id} not found in uploads directory.")

        task_id = uuid.uuid4().hex

        stat = await path_obj.stat()
        file_size = stat.st_size

        config_dict = request.config.model_dump()

        pending_data = {
            "task_id": task_id,
            "task_type": "chunking",
            "status": TaskStatus.PENDING.value,
            "filename": request.filename,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "file_size": file_size,
            "config": json.dumps(config_dict),
            "total_chunks": 0,
        }
        await self.redis.hset(f"chunk_task:{task_id}", mapping=pending_data)

        await chunk_task.kiq(
            task_id=task_id,
            file_path=str(path_obj),
            filename=request.filename,
            config_json=json.dumps(config_dict),
        )

        logger.info(
            "submitted_chunk_task",
            task_id=task_id,
            filename=request.filename,
        )

        return task_id

    async def get_task_result(self, task_id: str) -> ChunkTaskResponse | None:
        """Retrieves a single task result from Redis, including parsed chunks if completed."""
        task_data = await self.redis.hgetall(f"chunk_task:{task_id}")

        if not task_data:
            return None

        if "processing_time" in task_data:
            task_data["processing_time"] = float(task_data["processing_time"])
        if "file_size" in task_data:
            task_data["file_size"] = int(task_data["file_size"])
        if "total_chunks" in task_data:
            task_data["total_chunks"] = int(task_data["total_chunks"])
        if "config" in task_data:
            task_data["config"] = json.loads(task_data["config"])

        response = ChunkTaskResponse(**task_data)

        if response.status == TaskStatus.COMPLETED:
            preview_path = CHUNKS_DIR / f"{task_id}_preview.json"
            if await Path(preview_path).exists():
                with open(preview_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if "items" in data:
                        response.items = [ChunkItem(**c) for c in data["items"]]

        return response

    async def get_all_tasks(self) -> list[ChunkTaskResponse]:
        """Retrieves all chunk tasks from Redis without full payload data."""
        keys = await self.redis.keys("chunk_task:*")

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
            if "total_chunks" in data:
                data["total_chunks"] = int(data["total_chunks"])
            if "config" in data:
                data["config"] = json.loads(data["config"])

            tasks.append(ChunkTaskResponse(**data))

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
        """Deletes a task and its resulting chunk file from storage."""
        try:
            await self.redis.delete(f"chunk_task:{task_id}")
            await Path(CHUNKS_DIR / f"{task_id}_chunks.json").unlink(missing_ok=True)
            await Path(CHUNKS_DIR / f"{task_id}_preview.json").unlink(missing_ok=True)
            logger.info("deleted_chunk_task_result", task_id=task_id)
        except Exception as e:
            logger.error(
                "failed_to_delete_chunk_task_result", task_id=task_id, error=str(e)
            )

    async def cancel_task(self, task_id: str) -> bool:
        """Marks a task for cancellation in Redis, triggering termination in the background worker."""
        task_data = await self.redis.hgetall(f"chunk_task:{task_id}")
        if not task_data:
            return False

        current_status = task_data.get("status")
        if current_status not in [
            TaskStatus.PENDING.value,
            TaskStatus.PROCESSING.value,
            TaskStatus.CANCELLING.value,
        ]:
            return False

        cancel_key = f"{CANCEL_KEY_PREFIX}{task_id}"
        await self.redis.set(cancel_key, "1", ex=CANCEL_KEY_TTL)

        await self.redis.hset(
            f"chunk_task:{task_id}", "status", TaskStatus.CANCELLING.value
        )

        logger.info("initiated_chunk_task_cancellation", task_id=task_id)
        return True

    async def download_chunks(self, task_id: str) -> Path | None:
        """Returns the path to the completed chunks JSON file."""
        content_path = Path(CHUNKS_DIR / f"{task_id}_chunks.json")
        if await content_path.exists():
            return content_path
        return None
