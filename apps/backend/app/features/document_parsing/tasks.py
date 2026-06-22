import asyncio
import json
import os
import time
from datetime import datetime, timezone

import anyio
import structlog
from litestar.datastructures import State
from taskiq import Context, TaskiqDepends

from apps.backend.app.core.broker import broker
from apps.backend.app.core.config import RESULTS_DIR
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
    async with await anyio.open_file(result_path, "w") as f:
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
    async with await anyio.open_file(result_path, "w") as f:
        await f.write(json.dumps(output_data, indent=2))

    # Return minimal data to Redis (Best Practice for large payloads)
    return {
        "task_id": task_id,
        "status": output_data["status"],
        "result_uri": str(result_path),
    }
