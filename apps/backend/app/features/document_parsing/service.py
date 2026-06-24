import asyncio
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import structlog
from anyio import Path, open_file, to_thread
import pypdfium2 as pdfium
from litestar.datastructures import UploadFile


from apps.backend.app.core.config import (
    RESULTS_DIR,
    UPLOAD_DIR,
    PARTS_DIR,
    CANCEL_KEY_PREFIX,
    CANCEL_KEY_TTL,
    PAGES_PER_PART,
)
from .schemas import (
    TaskResultResponse,
    TaskStatus,
    UploadResponse,
    ParseRequest,
    PartStatus,
    PartResponse,
)
from .tasks import parse_part_task

logger = structlog.get_logger()

_pdf_split_lock = asyncio.Lock()


class ParserService:
    def __init__(self, redis: Any):
        self.redis = redis

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

    async def _split_pdf(self, file_path: Path, task_id: str) -> tuple[int, list[dict]]:
        """Splits a PDF into multiple parts physically and returns (total_pages, parts metadata)."""

        def split_sync(path: str, t_id: str) -> tuple[int, list[dict]]:
            parts = []
            pdf = pdfium.PdfDocument(path)
            total_pages = len(pdf)

            for start_idx in range(0, total_pages, PAGES_PER_PART):
                end_idx = min(start_idx + PAGES_PER_PART, total_pages)
                part_index = start_idx // PAGES_PER_PART

                new_pdf = pdfium.PdfDocument.new()
                # page indices are 0-based
                pages_to_import = list(range(start_idx, end_idx))
                new_pdf.import_pages(pdf, pages=pages_to_import)

                out_path = PARTS_DIR / f"{t_id}_part_{part_index:03d}.pdf"
                new_pdf.save(str(out_path))
                new_pdf.close()

                parts.append(
                    {
                        "part_index": part_index,
                        "page_start": start_idx + 1,
                        "page_end": end_idx,
                        "file_path": str(out_path),
                    }
                )
            pdf.close()
            return total_pages, parts

        async with _pdf_split_lock:
            try:
                return await to_thread.run_sync(split_sync, str(file_path), task_id)
            except Exception as e:
                logger.error("pdf_split_failed", task_id=task_id, error=str(e))
                raise ValueError(f"Failed to split PDF: {e}")

    async def save_and_submit_task(self, parse_request: ParseRequest) -> str:
        """Splits the file and submits parsing tasks for each part."""
        file_id = parse_request.file_id

        if ".." in file_id or "/" in file_id or "\\" in file_id:
            raise ValueError("Invalid file_id")

        file_path = UPLOAD_DIR / file_id
        path_obj = Path(file_path)

        if not await path_obj.exists():
            raise ValueError(f"File {file_id} not found in uploads directory.")

        task_id = uuid.uuid4().hex

        # Get metadata
        stat = await path_obj.stat()
        file_size = stat.st_size

        try:
            # TODO: Move synchronous PDF splitting to a TaskIQ background task to prevent API blocking
            page_count, parts_info = await self._split_pdf(path_obj, task_id)
            total_parts = len(parts_info)
        except Exception as e:
            # Write failed master state to Redis if splitting fails
            failed_data = {
                "task_id": task_id,
                "status": TaskStatus.FAILED.value,
                "error": str(e),
                "filename": parse_request.filename,
                "output_format": parse_request.output_format.value,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "file_size": file_size,
                "page_count": 0,
                "total_parts": 0,
                "completed_parts": 0,
            }
            await self.redis.hset(f"task:{task_id}", mapping=failed_data)
            await path_obj.unlink(missing_ok=True)
            return task_id

        # Write initial master state to Redis
        pending_data = {
            "task_id": task_id,
            "status": TaskStatus.PENDING.value,
            "filename": parse_request.filename,
            "output_format": parse_request.output_format.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "file_size": file_size,
            "page_count": page_count if page_count is not None else 0,
            "total_parts": total_parts,
            "completed_parts": 0,
        }
        await self.redis.hset(f"task:{task_id}", mapping=pending_data)

        # Dispatch tasks and write part hashes
        for p in parts_info:
            part_idx = p["part_index"]
            part_data = {
                "part_index": part_idx,
                "page_start": p["page_start"],
                "page_end": p["page_end"],
                "status": PartStatus.WAITING.value,
            }
            await self.redis.hset(f"task:{task_id}:part:{part_idx}", mapping=part_data)

            await parse_part_task.kiq(
                task_id=task_id,
                part_index=part_idx,
                part_file_path=p["file_path"],
                page_start=p["page_start"],
                page_end=p["page_end"],
                filename=parse_request.filename,
                output_format=parse_request.output_format.value,
            )

        logger.info(
            "submitted_parse_task_with_parts",
            task_id=task_id,
            filename=parse_request.filename,
            total_parts=total_parts,
        )

        # We can safely remove the original uploaded file to save space
        await path_obj.unlink(missing_ok=True)

        return task_id

    async def get_task_result(self, task_id: str) -> TaskResultResponse | None:
        """Fetches the master task result and its parts from Redis."""
        task_data = await self.redis.hgetall(f"task:{task_id}")

        if not task_data:
            return None

        # Convert numerics
        for key in ["processing_time"]:
            if key in task_data:
                task_data[key] = float(task_data[key])
        for key in ["page_count", "file_size", "total_parts", "completed_parts"]:
            if key in task_data:
                task_data[key] = int(task_data[key])

        # Fetch parts
        parts = []
        total_parts = task_data.get("total_parts", 0)

        if total_parts > 0:
            pipe = self.redis.pipeline()
            for i in range(total_parts):
                pipe.hgetall(f"task:{task_id}:part:{i}")

            part_results = await pipe.execute()
            for p in part_results:
                if not p:
                    continue
                p["part_index"] = int(p["part_index"])
                p["page_start"] = int(p["page_start"])
                p["page_end"] = int(p["page_end"])
                if "processing_time" in p:
                    p["processing_time"] = float(p["processing_time"])
                parts.append(PartResponse(**p))

        response = TaskResultResponse(**task_data)
        response.parts = parts
        return response

    async def get_all_tasks(self) -> list[TaskResultResponse]:
        """Lists all tasks from Redis."""
        keys = await self.redis.keys("task:*")
        # Filter out part keys and set keys
        master_keys = [k for k in keys if ":part:" not in k and "_set" not in k]

        if not master_keys:
            return []

        pipe = self.redis.pipeline()
        for key in master_keys:
            pipe.hgetall(key)

        results = await pipe.execute()

        tasks = []
        for data in results:
            if not data:
                continue
            if "processing_time" in data:
                data["processing_time"] = float(data["processing_time"])
            for key in ["page_count", "file_size", "total_parts", "completed_parts"]:
                if key in data:
                    data[key] = int(data[key])
            tasks.append(TaskResultResponse(**data))

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
        """Deletes a task result from Redis and disk (all parts)."""
        try:
            # Delete master hash and sets
            await self.redis.delete(f"task:{task_id}")
            await self.redis.delete(f"task:{task_id}:completed_set")
            await self.redis.delete(f"task:{task_id}:failed_set")
            await self.redis.delete(f"task:{task_id}:cancelled_set")

            # Delete part hashes and files
            keys = await self.redis.keys(f"task:{task_id}:part:*")
            if keys:
                await self.redis.delete(*keys)

            # Clean up disk files (.md, .pdf, and merged files)
            for file_path in RESULTS_DIR.glob(f"{task_id}_part_*.md"):
                await Path(file_path).unlink(missing_ok=True)
            await Path(RESULTS_DIR / f"{task_id}_merged.md").unlink(missing_ok=True)
            for file_path in PARTS_DIR.glob(f"{task_id}_part_*.pdf"):
                await Path(file_path).unlink(missing_ok=True)

            logger.info("deleted_task_result", task_id=task_id)
        except Exception as e:
            logger.error("failed_to_delete_task_result", task_id=task_id, error=str(e))

    async def cancel_task(self, task_id: str) -> bool:
        """Cancels an ongoing parsing task."""
        task_data = await self.redis.hgetall(f"task:{task_id}")
        if not task_data:
            return False

        current_status = task_data.get("status")
        if current_status not in [
            TaskStatus.PENDING.value,
            TaskStatus.PROCESSING.value,
            TaskStatus.CANCELLING.value,
        ]:
            return False

        # Set the cancellation flag in Redis
        cancel_key = f"{CANCEL_KEY_PREFIX}{task_id}"
        await self.redis.set(cancel_key, "1", ex=CANCEL_KEY_TTL)

        # Update task status to cancelling
        await self.redis.hset(f"task:{task_id}", "status", TaskStatus.CANCELLING.value)

        logger.info("initiated_task_cancellation", task_id=task_id)
        return True

    async def retry_part(self, task_id: str, part_index: int) -> bool:
        """Retries a failed part."""
        task_data = await self.redis.hgetall(f"task:{task_id}")
        part_data = await self.redis.hgetall(f"task:{task_id}:part:{part_index}")

        if not task_data or not part_data:
            return False

        if part_data.get("status") != PartStatus.FAILED.value:
            return False

        # Check if PDF part exists
        out_path = PARTS_DIR / f"{task_id}_part_{part_index:03d}.pdf"
        if not await Path(out_path).exists():
            return False

        # Reset part status and remove from failed_set
        await self.redis.hset(
            f"task:{task_id}:part:{part_index}", "status", PartStatus.WAITING.value
        )
        await self.redis.srem(f"task:{task_id}:failed_set", part_index)

        # If master is completed/failed, set back to processing
        if task_data.get("status") in [
            TaskStatus.COMPLETED.value,
            TaskStatus.FAILED.value,
        ]:
            await self.redis.hset(
                f"task:{task_id}", "status", TaskStatus.PROCESSING.value
            )

        # Re-queue
        await parse_part_task.kiq(
            task_id=task_id,
            part_index=part_index,
            part_file_path=str(out_path),
            page_start=int(part_data.get("page_start", 0)),
            page_end=int(part_data.get("page_end", 0)),
            filename=task_data.get("filename", ""),
            output_format=task_data.get("output_format", "markdown"),
        )
        return True

    async def download_part_content(self, task_id: str, part_index: int) -> Path | None:
        """Returns the path to a part's markdown file if it exists."""
        content_path = Path(RESULTS_DIR / f"{task_id}_part_{part_index:03d}.md")
        if await content_path.exists():
            return content_path
        return None

    async def download_full_content(self, task_id: str) -> Path | None:
        """Returns the path to the merged markdown file. Creates it if needed."""
        task_data = await self.redis.hgetall(f"task:{task_id}")
        if not task_data:
            return None

        merged_path = Path(RESULTS_DIR / f"{task_id}_merged.md")
        if await merged_path.exists():
            return merged_path

        total_parts = int(task_data.get("total_parts", 0))
        if total_parts == 0:
            return None

        # Merge all completed parts into a single file
        async with await open_file(merged_path, "w", encoding="utf-8") as out:
            for i in range(total_parts):
                part_path = Path(RESULTS_DIR / f"{task_id}_part_{i:03d}.md")
                if await part_path.exists():
                    async with await open_file(part_path, "r", encoding="utf-8") as f:
                        await out.write(await f.read())
                        await out.write("\n\n---\n\n")
        return merged_path
