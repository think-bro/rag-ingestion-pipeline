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
from apps.backend.app.features.document_parsing.schemas import TaskStatus, PartStatus


logger = structlog.get_logger()


@broker.task()
async def parse_part_task(
    task_id: str,
    part_index: int,
    part_file_path: str,
    page_start: int,
    page_end: int,
    filename: str,
    output_format: str,
    context: Context = TaskiqDepends(),
    state: State = TaskiqDepends(),
) -> dict:
    """
    TaskIQ task: Parses a single part of a document using a subprocess with cancellation polling.
    """
    redis = state.redis
    kiq_task_id = context.message.task_id

    logger.info(
        "started_parse_part_task",
        task_id=task_id,
        part_index=part_index,
        filename=filename,
    )

    # 1. Pre-emptive cancel check
    cancel_key = f"{CANCEL_KEY_PREFIX}{task_id}"
    if await redis.exists(cancel_key):
        logger.info(
            "part_task_cancelled_before_start", task_id=task_id, part_index=part_index
        )
        await redis.hset(
            f"task:{task_id}:part:{part_index}", "status", PartStatus.CANCELLED.value
        )

        current_master_status = await redis.hget(f"task:{task_id}", "status")
        if current_master_status == TaskStatus.CANCELLING.value:
            await redis.hset(f"task:{task_id}", "status", TaskStatus.CANCELLED.value)

        if part_file_path and os.path.exists(part_file_path):
            os.remove(part_file_path)
        return {
            "task_id": task_id,
            "part_index": part_index,
            "status": PartStatus.CANCELLED.value,
        }

    # Write 'processing' state to Redis for the part
    await redis.hset(
        f"task:{task_id}:part:{part_index}", "status", PartStatus.PROCESSING.value
    )

    current_master_status = await redis.hget(f"task:{task_id}", "status")
    if current_master_status == TaskStatus.PENDING.value:
        await redis.hset(f"task:{task_id}", "status", TaskStatus.PROCESSING.value)

    start_time = time.perf_counter()
    parsed_content = ""
    output_json_path = str(RESULTS_DIR / f"{task_id}_part_{part_index:03d}_temp.json")
    result_path = RESULTS_DIR / f"{task_id}_part_{part_index:03d}.md"

    part_status = PartStatus.FAILED.value
    error_msg = None

    try:
        # Start subprocess
        process = await asyncio.create_subprocess_exec(
            "python",
            "-m",
            "apps.backend.app.features.document_parsing.parse_worker",
            part_file_path,
            output_format,
            output_json_path,
        )

        # Polling loop
        while True:
            try:
                await asyncio.wait_for(process.wait(), timeout=SUBPROCESS_POLL_INTERVAL)
                break  # Process finished
            except asyncio.TimeoutError:
                pass  # Poll interval expired, check cancel flag

            # Check cancel flag
            if await redis.exists(cancel_key):
                logger.info(
                    "task_cancellation_requested",
                    task_id=task_id,
                    part_index=part_index,
                )
                process.terminate()
                try:
                    await asyncio.wait_for(
                        process.wait(), timeout=SUBPROCESS_TERMINATE_TIMEOUT
                    )
                except asyncio.TimeoutError:
                    process.kill()
                    await process.wait()

                part_status = PartStatus.CANCELLED.value
                logger.info(
                    "part_task_cancelled_successfully",
                    task_id=task_id,
                    part_index=part_index,
                )
                break

        # Process finished normally
        if part_status != PartStatus.CANCELLED.value:
            if process.returncode == 0:
                try:
                    with open(output_json_path, "r", encoding="utf-8") as f:
                        result_json = json.load(f)

                    if "error" in result_json:
                        raise Exception(result_json["error"])

                    parsed_content = result_json["content"]
                    part_status = PartStatus.COMPLETED.value

                except Exception as e:
                    error_msg = f"Failed to read result: {str(e)}"
            else:
                try:
                    with open(output_json_path, "r", encoding="utf-8") as f:
                        result_json = json.load(f)
                        error_msg = result_json.get("error", "Unknown error")
                except Exception:
                    error_msg = "Unknown error"
                error_msg = f"Worker exited with {process.returncode}: {error_msg}"

    except Exception as e:
        error_msg = str(e)
    finally:
        if os.path.exists(output_json_path):
            os.remove(output_json_path)

    processing_time = time.perf_counter() - start_time

    # Update part hash
    part_update = {"status": part_status, "processing_time": processing_time}
    if error_msg:
        part_update["error"] = error_msg

    await redis.hset(f"task:{task_id}:part:{part_index}", mapping=part_update)

    if part_status == PartStatus.COMPLETED.value:
        async with await open_file(result_path, "w", encoding="utf-8") as f:
            await f.write(parsed_content)
        await redis.sadd(f"task:{task_id}:completed_set", part_index)

        # Keep hash synced for quick access
        completed = await redis.scard(f"task:{task_id}:completed_set")
        await redis.hset(f"task:{task_id}", "completed_parts", completed)

    elif part_status == PartStatus.FAILED.value:
        await redis.sadd(f"task:{task_id}:failed_set", part_index)

    elif part_status == PartStatus.CANCELLED.value:
        await redis.sadd(f"task:{task_id}:cancelled_set", part_index)
        current_master_status = await redis.hget(f"task:{task_id}", "status")
        if current_master_status == TaskStatus.CANCELLING.value:
            await redis.hset(f"task:{task_id}", "status", TaskStatus.CANCELLED.value)

    # Check if master is fully processed
    completed_count = await redis.scard(f"task:{task_id}:completed_set")
    failed_count = await redis.scard(f"task:{task_id}:failed_set")
    cancelled_count = await redis.scard(f"task:{task_id}:cancelled_set")

    total = int(await redis.hget(f"task:{task_id}", "total_parts") or 0)
    total_processed = completed_count + failed_count + cancelled_count

    if total > 0 and total_processed == total:
        current_master_status = await redis.hget(f"task:{task_id}", "status")

        # Determine final status
        if completed_count > 0:
            final_status = TaskStatus.COMPLETED.value
        elif cancelled_count > 0:
            final_status = TaskStatus.CANCELLED.value
        else:
            final_status = TaskStatus.FAILED.value

        if current_master_status not in [TaskStatus.COMPLETED.value]:
            created_at_str = await redis.hget(f"task:{task_id}", "created_at")
            if created_at_str:
                created_at = datetime.fromisoformat(created_at_str)
                master_processing_time = (
                    datetime.now(timezone.utc) - created_at
                ).total_seconds()
                await redis.hset(
                    f"task:{task_id}", "processing_time", master_processing_time
                )

            await redis.hset(f"task:{task_id}", "status", final_status)
            if final_status == TaskStatus.FAILED.value:
                await redis.hset(
                    f"task:{task_id}", "error", "All parts failed to process."
                )

    return {
        "task_id": task_id,
        "part_index": part_index,
        "status": part_status,
        "kiq_task_id": kiq_task_id,
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
