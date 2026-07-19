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
async def embed_task(
    task_id: str,
    file_path: str,
    filename: str,
    config_json: str,
    context: Context = TaskiqDepends(),
    state: State = TaskiqDepends(),
) -> dict:
    """
    TaskIQ task: Embeds a document using a subprocess with cancellation polling.
    """
    redis = state.redis
    kiq_task_id = context.message.task_id

    logger.info("started_embed_task", task_id=task_id)

    cancel_key = f"{core_settings.cancel_key_prefix}{task_id}"
    if await redis.exists(cancel_key):
        logger.info("embed_task_cancelled_before_start", task_id=task_id)
        await redis.hset(f"embed_task:{task_id}", "status", TaskStatus.CANCELLED.value)
        if os.path.exists(file_path):
            os.remove(file_path)
        return {"task_id": task_id, "status": TaskStatus.CANCELLED.value}

    await redis.hset(f"embed_task:{task_id}", "status", TaskStatus.PROCESSING.value)

    output_parquet_path = str(core_settings.vectors_dir / f"{task_id}_temp.parquet")
    output_preview_path = str(core_settings.vectors_dir / f"{task_id}_preview.json")
    final_output_path = core_settings.vectors_dir / f"{task_id}.parquet"
    error_json_path = str(core_settings.vectors_dir / f"{task_id}_error.json")
    progress_json_path = str(core_settings.vectors_dir / f"{task_id}_progress.json")

    task_status = TaskStatus.FAILED.value
    error_msg = None

    try:
        process = await asyncio.create_subprocess_exec(
            "python",
            "-B",
            "-m",
            "apps.backend.app.features.embed_document.embed_worker",
            file_path,
            config_json,
            output_parquet_path,
            output_preview_path,
            error_json_path,
            progress_json_path,
        )

        while True:
            try:
                await asyncio.wait_for(
                    process.wait(), timeout=core_settings.subprocess_poll_interval
                )
                break
            except asyncio.TimeoutError:
                if os.path.exists(progress_json_path):
                    try:
                        with open(progress_json_path, "r", encoding="utf-8") as f:
                            prog_data = json.load(f)
                        if "completed" in prog_data:
                            await redis.hset(
                                f"embed_task:{task_id}",
                                "completed_vectors",
                                prog_data["completed"],
                            )
                        if "total" in prog_data:
                            await redis.hset(
                                f"embed_task:{task_id}",
                                "total_vectors",
                                prog_data["total"],
                            )
                    except Exception as e:
                        logger.warning("failed_to_read_progress_json", error=str(e))
                pass

            if await redis.exists(cancel_key):
                logger.info("embed_task_cancellation_requested", task_id=task_id)
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
                if os.path.exists(error_json_path):
                    try:
                        with open(error_json_path, "r", encoding="utf-8") as f:
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

    created_at_str = await redis.hget(f"embed_task:{task_id}", "created_at")
    if created_at_str:
        created_at = datetime.fromisoformat(created_at_str)
        master_processing_time = (
            datetime.now(timezone.utc) - created_at
        ).total_seconds()
        await redis.hset(
            f"embed_task:{task_id}", "processing_time", master_processing_time
        )

    if task_status == TaskStatus.COMPLETED.value:
        if os.path.exists(output_parquet_path):
            os.rename(output_parquet_path, final_output_path)
        if os.path.exists(output_preview_path):
            with open(output_preview_path, "r", encoding="utf-8") as f:
                result_data = json.load(f)
                total_vectors = result_data.get("total_vectors", 0)
                embedding_dim = result_data.get("embedding_dim", 0)
                model_name = result_data.get("model_name", "unknown")
                await redis.hset(
                    f"embed_task:{task_id}",
                    mapping={
                        "total_vectors": total_vectors,
                        "embedding_dim": embedding_dim,
                        "model_name": model_name,
                    },
                )
        await redis.hset(f"embed_task:{task_id}", "status", TaskStatus.COMPLETED.value)
    elif task_status == TaskStatus.FAILED.value:
        await redis.hset(f"embed_task:{task_id}", "status", TaskStatus.FAILED.value)
        if error_msg:
            await redis.hset(f"embed_task:{task_id}", "error", error_msg)
    elif task_status == TaskStatus.CANCELLED.value:
        await redis.hset(f"embed_task:{task_id}", "status", TaskStatus.CANCELLED.value)

    if os.path.exists(error_json_path):
        os.remove(error_json_path)

    return {
        "task_id": task_id,
        "status": task_status,
        "kiq_task_id": kiq_task_id,
    }
