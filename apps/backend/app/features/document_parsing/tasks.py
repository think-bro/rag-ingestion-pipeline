import asyncio
import json
import os
import tempfile

import structlog
from litestar.datastructures import State
from taskiq import TaskiqDepends

from apps.backend.app.core.broker import broker
from .schemas import OutputFormat

logger = structlog.get_logger()


@broker.task()
async def parse_document_task(
    filename: str,
    content_hex: str,  # bytes -> hex string (for serialization)
    output_format: str,
    state: State = TaskiqDepends(),
) -> dict:
    """
    TaskIQ task: Parses the document and returns the result.

    NOTE: TaskIQ task parameters must be JSON-serializable.
    Therefore, the bytes content is sent as a hex string.
    """
    content = bytes.fromhex(content_hex)
    converter = state.converter

    logger.info("started_parse_task", filename=filename)

    _, ext = os.path.splitext(filename)
    if not ext:
        ext = ".pdf"

    temp_path = ""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        result = await asyncio.to_thread(converter.convert, temp_path)
        doc = result.document

        parsed_content = ""
        fmt = OutputFormat(output_format)
        if fmt == OutputFormat.MARKDOWN:
            parsed_content = doc.export_to_markdown()
        elif fmt == OutputFormat.JSON:
            parsed_content = json.dumps(doc.export_to_dict(), indent=2)
        else:
            parsed_content = doc.export_to_markdown()

        logger.info("completed_parse_task", filename=filename)
        return {
            "status": "completed",
            "filename": filename,
            "output_format": output_format,
            "content": parsed_content,
        }

    except Exception as e:
        logger.exception("failed_parse_task", filename=filename, error=str(e))
        return {
            "status": "failed",
            "filename": filename,
            "output_format": output_format,
            "error": str(e),
        }
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
