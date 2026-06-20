import structlog
from docling.document_converter import DocumentConverter

from .schemas import OutputFormat, TaskResultResponse, TaskStatus
from .tasks import parse_document_task

logger = structlog.get_logger()


class ParserService:
    def __init__(self, converter: DocumentConverter):
        self.converter = converter

    async def submit_parse_task(
        self, filename: str, content: bytes, output_format: OutputFormat
    ) -> str:
        """Submits the task to TaskIQ and returns the task_id."""
        result = await parse_document_task.kiq(
            filename=filename,
            content_hex=content.hex(),
            output_format=output_format.value,
        )
        task_id = result.task_id
        logger.info("submitted_parse_task", task_id=task_id, filename=filename)
        return task_id

    async def get_task_result(self, task_id: str) -> TaskResultResponse | None:
        """Queries the task result from Redis."""
        from apps.backend.app.core.broker import broker

        is_ready = await broker.result_backend.is_result_ready(task_id)
        if not is_ready:
            return TaskResultResponse(
                task_id=task_id,
                status=TaskStatus.PROCESSING,
            )

        result = await broker.result_backend.get_result(task_id)

        if result.is_err:
            return TaskResultResponse(
                task_id=task_id,
                status=TaskStatus.FAILED,
                error=str(result.error),
            )

        if not result.return_value:
            # No result yet -> task is still running
            return TaskResultResponse(
                task_id=task_id,
                status=TaskStatus.PROCESSING,
            )

        data = result.return_value
        if not isinstance(data, dict):
            return TaskResultResponse(
                task_id=task_id,
                status=TaskStatus.FAILED,
                error="Invalid result format returned from task.",
            )

        status_str = str(data.get("status", "processing"))
        status = TaskStatus(status_str)

        filename = data.get("filename")
        output_format_str = data.get("output_format")
        content = data.get("content")
        error = data.get("error")

        return TaskResultResponse(
            task_id=task_id,
            status=status,
            filename=str(filename) if filename is not None else None,
            output_format=OutputFormat(str(output_format_str))
            if output_format_str is not None
            else None,
            content=str(content) if content is not None else None,
            error=str(error) if error is not None else None,
        )
