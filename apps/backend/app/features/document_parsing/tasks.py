import asyncio

import os
import time
from datetime import datetime, timezone

from anyio import open_file, Path
import structlog
from litestar.datastructures import State
from taskiq import Context, TaskiqDepends

import json
from apps.backend.app.core.broker import broker
from apps.backend.app.core.config import (
    RESULTS_DIR,
    UPLOAD_DIR,
    CANCEL_KEY_PREFIX,
    SUBPROCESS_POLL_INTERVAL,
    SUBPROCESS_TERMINATE_TIMEOUT,
)
from apps.backend.app.features.document_parsing.schemas import TaskStatus


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
    TaskIQ task: Parses the document using a subprocess with cancellation polling.
    """
    redis = state.redis
    task_id = context.message.task_id

    logger.info("started_parse_task", task_id=task_id, filename=filename)

    # 1. Pre-emptive cancel check
    cancel_key = f"{CANCEL_KEY_PREFIX}{task_id}"
    if await redis.exists(cancel_key):
        logger.info("task_cancelled_before_start", task_id=task_id)
        await redis.hset(f"task:{task_id}", "status", TaskStatus.CANCELLED.value)
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        return {"task_id": task_id, "status": TaskStatus.CANCELLED.value}

    # Write 'processing' state to Redis
    processing_data = {
        "task_id": task_id,
        "status": TaskStatus.PROCESSING.value,
        "filename": filename,
        "output_format": output_format,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await redis.hset(f"task:{task_id}", mapping=processing_data)

    start_time = time.perf_counter()
    output_metadata = {}
    parsed_content = ""
    output_json_path = str(RESULTS_DIR / f"{task_id}_temp.json")

    try:
        # Start subprocess
        process = await asyncio.create_subprocess_exec(
            "python",
            "-m",
            "apps.backend.app.features.document_parsing.parse_worker",
            file_path,
            output_format,
            output_json_path,
        )

        # Polling loop
        while True:
            # Wait for process to complete OR poll interval to expire
            try:
                await asyncio.wait_for(process.wait(), timeout=SUBPROCESS_POLL_INTERVAL)
                break  # Process finished
            except asyncio.TimeoutError:
                pass  # Poll interval expired, check cancel flag

            # Check cancel flag
            if await redis.exists(cancel_key):
                logger.info("task_cancellation_requested", task_id=task_id)

                # Graceful termination
                process.terminate()
                try:
                    await asyncio.wait_for(
                        process.wait(), timeout=SUBPROCESS_TERMINATE_TIMEOUT
                    )
                except asyncio.TimeoutError:
                    # Force kill if hung
                    process.kill()
                    await process.wait()

                await redis.delete(cancel_key)

                output_metadata = {
                    "task_id": task_id,
                    "status": TaskStatus.CANCELLED.value,
                    "filename": filename,
                    "output_format": output_format,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "processing_time": time.perf_counter() - start_time,
                }
                logger.info("task_cancelled_successfully", task_id=task_id)
                break

        # Process finished normally
        if not output_metadata:
            if process.returncode == 0:
                # Success
                try:
                    with open(output_json_path, "r", encoding="utf-8") as f:
                        result_json = json.load(f)

                    if "error" in result_json:
                        raise Exception(result_json["error"])
                    parsed_content = result_json["content"]

                    processing_time = time.perf_counter() - start_time
                    logger.info(
                        "completed_parse_task",
                        task_id=task_id,
                        filename=filename,
                        processing_time=processing_time,
                    )

                    output_metadata = {
                        "task_id": task_id,
                        "status": TaskStatus.COMPLETED.value,
                        "filename": filename,
                        "output_format": output_format,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "processing_time": processing_time,
                    }
                except Exception as e:
                    raise Exception(f"Failed to read result: {str(e)}")
            else:
                # Failed execution (not cancelled, since we broke the loop)
                try:
                    with open(output_json_path, "r", encoding="utf-8") as f:
                        result_json = json.load(f)
                        error_msg = result_json.get("error", "Unknown error")
                except Exception:
                    error_msg = "Unknown error"
                raise Exception(f"Worker exited with {process.returncode}: {error_msg}")

    except Exception as e:
        processing_time = time.perf_counter() - start_time
        logger.exception(
            "failed_parse_task",
            task_id=task_id,
            filename=filename,
            error=str(e),
            processing_time=processing_time,
        )
        output_metadata = {
            "task_id": task_id,
            "status": TaskStatus.FAILED.value,
            "filename": filename,
            "output_format": output_format,
            "error": str(e),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "processing_time": processing_time,
        }
    finally:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        if os.path.exists(output_json_path):
            os.remove(output_json_path)

    # Write content to disk asynchronously ONLY IF completed
    result_path = RESULTS_DIR / f"{task_id}.md"
    if output_metadata.get("status") == TaskStatus.COMPLETED.value:
        async with await open_file(result_path, "w", encoding="utf-8") as f:
            await f.write(parsed_content)

    # Write metadata to Redis
    await redis.hset(f"task:{task_id}", mapping=output_metadata)

    # Return minimal data to Redis Result Backend
    return {
        "task_id": task_id,
        "status": output_metadata.get("status"),
        "result_uri": str(result_path)
        if output_metadata.get("status") == TaskStatus.COMPLETED.value
        else None,
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
