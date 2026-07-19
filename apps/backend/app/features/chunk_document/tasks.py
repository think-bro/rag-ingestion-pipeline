import asyncio
import os

from datetime import datetime, timezone


import structlog
from litestar.datastructures import State
from taskiq import Context, TaskiqDepends
import json

from apps.backend.app.core.broker import broker
from apps.backend.app.core.config import settings as core_settings
from .schemas import TaskStatus

logger = structlog.get_logger()


@broker.task()
async def chunk_task(
    task_id: str,
    file_path: str,
    filename: str,
    config_json: str,
    context: Context = TaskiqDepends(),
    state: State = TaskiqDepends(),
) -> dict:
    """
    TaskIQ task: Chunks a document using a subprocess with cancellation polling.
    """
    redis = state.redis
    kiq_task_id = context.message.task_id

    logger.info("started_chunk_task", task_id=task_id)

    cancel_key = f"{core_settings.cancel_key_prefix}{task_id}"
    if await redis.exists(cancel_key):
        logger.info("chunk_task_cancelled_before_start", task_id=task_id)
        await redis.hset(f"chunk_task:{task_id}", "status", TaskStatus.CANCELLED.value)
        if os.path.exists(file_path):
            os.remove(file_path)
        return {"task_id": task_id, "status": TaskStatus.CANCELLED.value}

    await redis.hset(f"chunk_task:{task_id}", "status", TaskStatus.PROCESSING.value)

    output_json_path = str(core_settings.chunks_dir / f"{task_id}_chunks_temp.json")
    final_output_path = core_settings.chunks_dir / f"{task_id}_chunks.json"
    output_preview_path = str(core_settings.chunks_dir / f"{task_id}_preview.json")

    task_status = TaskStatus.FAILED.value
    error_msg = None

    try:
        process = await asyncio.create_subprocess_exec(
            "python",
            "-B",
            "-m",
            "apps.backend.app.features.chunk_document.chunk_worker",
            file_path,
            config_json,
            output_json_path,
            output_preview_path,
            filename,
        )

        while True:
            try:
                await asyncio.wait_for(
                    process.wait(), timeout=core_settings.subprocess_poll_interval
                )
                break
            except asyncio.TimeoutError:
                pass

            if await redis.exists(cancel_key):
                logger.info("chunk_task_cancellation_requested", task_id=task_id)
                process.terminate()
                try:
                    await asyncio.wait_for(
                        process.wait(),
                        timeout=core_settings.subprocess_terminate_timeout,
                    )
                except asyncio.TimeoutError:
                    process.kill()
                    await process.wait()

                task_status = TaskStatus.CANCELLED.value
                break

        if task_status != TaskStatus.CANCELLED.value:
            if process.returncode == 0:
                task_status = TaskStatus.COMPLETED.value
            else:
                error_msg = f"Worker exited with code {process.returncode}"
                if os.path.exists(output_json_path):
                    try:
                        with open(output_json_path, "r", encoding="utf-8") as f:
                            err_data = json.load(f)
                            if "error" in err_data:
                                error_msg = err_data["error"]
                    except Exception:
                        pass
    except Exception as e:
        error_msg = str(e)
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

    created_at_str = await redis.hget(f"chunk_task:{task_id}", "created_at")
    if created_at_str:
        created_at = datetime.fromisoformat(created_at_str)
        master_processing_time = (
            datetime.now(timezone.utc) - created_at
        ).total_seconds()
        await redis.hset(
            f"chunk_task:{task_id}", "processing_time", master_processing_time
        )

    if task_status == TaskStatus.COMPLETED.value:
        if os.path.exists(output_json_path):
            os.rename(output_json_path, final_output_path)
            with open(final_output_path, "r", encoding="utf-8") as f:
                result_data = json.load(f)
                total_chunks = result_data.get("total_chunks", 0)
                await redis.hset(f"chunk_task:{task_id}", "total_chunks", total_chunks)
        await redis.hset(f"chunk_task:{task_id}", "status", TaskStatus.COMPLETED.value)
    elif task_status == TaskStatus.FAILED.value:
        await redis.hset(f"chunk_task:{task_id}", "status", TaskStatus.FAILED.value)
        if error_msg:
            await redis.hset(f"chunk_task:{task_id}", "error", error_msg)
    elif task_status == TaskStatus.CANCELLED.value:
        await redis.hset(f"chunk_task:{task_id}", "status", TaskStatus.CANCELLED.value)

    if os.path.exists(output_json_path):
        os.remove(output_json_path)

    return {
        "task_id": task_id,
        "status": task_status,
        "kiq_task_id": kiq_task_id,
    }
