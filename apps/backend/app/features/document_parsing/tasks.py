import asyncio
import json
import os
import time
from datetime import datetime, timezone

from anyio import open_file, Path
import structlog
from litestar.datastructures import State
from taskiq import Context, TaskiqDepends

from apps.backend.app.core.broker import broker
from apps.backend.app.core.config import RESULTS_DIR, UPLOAD_DIR
from .schemas import OutputFormat

logger = structlog.get_logger()


@broker.task()
async def parse_document_task(
    file_path: str,
    filename: str,
    output_format: str,
    context: Context = TaskiqDepends(),
    state: State = TaskiqDepends(),
) -> dict:
    """
    TaskIQ task: Parses the document from disk and writes the final JSON to disk.
    """
    converter = state.converter
    task_id = context.message.task_id

    logger.info("started_parse_task", task_id=task_id, filename=filename)

    # Write 'processing' state to disk immediately
    processing_data = {
        "task_id": task_id,
        "status": "processing",
        "filename": filename,
        "output_format": output_format,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result_path = RESULTS_DIR / f"{task_id}.json"
    async with await open_file(result_path, "w") as f:
        await f.write(json.dumps(processing_data, indent=2))

    start_time = time.perf_counter()

    try:
        result = await asyncio.to_thread(converter.convert, file_path)
        doc = result.document

        parsed_content = ""
        fmt = OutputFormat(output_format)
        if fmt == OutputFormat.MARKDOWN:
            parsed_content = doc.export_to_markdown()
        elif fmt == OutputFormat.JSON:
            parsed_content = json.dumps(doc.export_to_dict(), indent=2)
        else:
            parsed_content = doc.export_to_markdown()

        processing_time = time.perf_counter() - start_time

        logger.info(
            "completed_parse_task",
            task_id=task_id,
            filename=filename,
            processing_time=processing_time,
        )

        output_data = {
            "task_id": task_id,
            "status": "completed",
            "filename": filename,
            "output_format": output_format,
            "content": parsed_content,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "processing_time": processing_time,
        }

    except Exception as e:
        processing_time = time.perf_counter() - start_time
        logger.exception(
            "failed_parse_task",
            task_id=task_id,
            filename=filename,
            error=str(e),
            processing_time=processing_time,
        )
        output_data = {
            "task_id": task_id,
            "status": "failed",
            "filename": filename,
            "output_format": output_format,
            "error": str(e),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "processing_time": processing_time,
        }
    finally:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

    # Write to disk asynchronously
    result_path = RESULTS_DIR / f"{task_id}.json"
    async with await open_file(result_path, "w") as f:
        await f.write(json.dumps(output_data, indent=2))

    # Return minimal data to Redis (Best Practice for large payloads)
    return {
        "task_id": task_id,
        "status": output_data["status"],
        "result_uri": str(result_path),
    }


@broker.task(schedule=[{"cron": "0 * * * *"}])
async def cleanup_orphaned_uploads_task() -> dict:
    """
    TaskIQ cron task: Cleans up files in the uploads directory that are older than 24 hours
    and haven't been picked up by a parsing task.
    """
    logger.info("started_cleanup_orphaned_uploads_task")
    deleted_count = 0
    now = time.time()
    twenty_four_hours_ago = now - (24 * 60 * 60)

    path_obj = Path(UPLOAD_DIR)
    if await path_obj.exists():
        async for file in path_obj.iterdir():
            if await file.is_file():
                try:
                    stat = await file.stat()
                    if stat.st_mtime < twenty_four_hours_ago:
                        await file.unlink(missing_ok=True)
                        deleted_count += 1
                        logger.info("deleted_orphaned_upload", file=str(file))
                except Exception as e:
                    logger.error(
                        "failed_to_delete_orphaned_upload", file=str(file), error=str(e)
                    )

    logger.info("completed_cleanup_orphaned_uploads_task", deleted_count=deleted_count)
    return {"status": "completed", "deleted_count": deleted_count}
