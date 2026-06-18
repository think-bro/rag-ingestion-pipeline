import asyncio
import json
import os
import tempfile
import uuid
from typing import Dict

import structlog
from docling.document_converter import DocumentConverter

from .schemas import OutputFormat, TaskResultResponse, TaskStatus

logger = structlog.get_logger()


class ParserService:
    def __init__(self, converter: DocumentConverter):
        self.converter = converter
        # In a real app, this should be backed by Redis or similar persistent storage
        self._tasks: Dict[str, TaskResultResponse] = {}

    def get_task_result(self, task_id: str) -> TaskResultResponse | None:
        return self._tasks.get(task_id)

    def submit_parse_task(
        self, filename: str, content: bytes, output_format: OutputFormat
    ) -> tuple[str, str, str, bytes, OutputFormat]:
        """Creates a task entry and returns (task_id, ...) along with args
        for the background processing method.

        The caller (controller) is responsible for scheduling the processing
        via Litestar's BackgroundTask.
        """
        task_id = str(uuid.uuid4())

        self._tasks[task_id] = TaskResultResponse(
            task_id=task_id,
            status=TaskStatus.PENDING,
            filename=filename,
            output_format=output_format,
        )

        return task_id, task_id, filename, content, output_format

    async def process_document_task(
        self, task_id: str, filename: str, content: bytes, output_format: OutputFormat
    ) -> None:
        """The actual background processing logic."""
        logger.info("started_parse_task", task_id=task_id, filename=filename)

        self._tasks[task_id].status = TaskStatus.PROCESSING

        # Determine temp file suffix based on original filename
        _, ext = os.path.splitext(filename)
        if not ext:
            ext = ".pdf"  # fallback

        temp_path = ""
        try:
            # Write to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as temp_file:
                temp_file.write(content)
                temp_path = temp_file.name

            # Run the CPU-intensive conversion in a thread pool to avoid blocking the event loop
            result = await asyncio.to_thread(self.converter.convert, temp_path)

            doc = result.document

            # Export to the requested format
            parsed_content = ""
            if output_format == OutputFormat.MARKDOWN:
                parsed_content = doc.export_to_markdown()
            elif output_format == OutputFormat.JSON:
                # doc.export_to_dict() returns the DocLang representation as a dictionary
                parsed_content = json.dumps(doc.export_to_dict(), indent=2)
            else:
                parsed_content = doc.export_to_markdown()

            self._tasks[task_id].status = TaskStatus.COMPLETED
            self._tasks[task_id].content = parsed_content
            logger.info("completed_parse_task", task_id=task_id)

        except Exception as e:
            logger.exception("failed_parse_task", task_id=task_id, error=str(e))
            self._tasks[task_id].status = TaskStatus.FAILED
            self._tasks[task_id].error = str(e)
        finally:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
