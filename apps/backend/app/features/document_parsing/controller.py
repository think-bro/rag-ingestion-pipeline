import structlog
from litestar import Controller, get, post
from litestar.datastructures import UploadFile
from litestar.enums import RequestEncodingType
from litestar.exceptions import NotFoundException
from litestar.params import Body
from typing import Annotated

from .schemas import OutputFormat, TaskResponse, TaskResultResponse, TaskStatus
from .service import ParserService

logger = structlog.get_logger()


class ParserController(Controller):
    path = "/documents"

    @post(path="/parse", status_code=202)
    async def parse_document_endpoint(
        self,
        data: Annotated[UploadFile, Body(media_type=RequestEncodingType.MULTI_PART)],
        parser_service: ParserService,
        output_format: OutputFormat = OutputFormat.MARKDOWN,
    ) -> TaskResponse:
        """
        Receives an uploaded file via multipart form and starts a background task
        to process it. Returns a task ID immediately.
        """
        logger.info(
            "received_parse_request",
            filename=data.filename,
            content_type=data.content_type,
            output_format=output_format,
        )
        content = await data.read()

        task_id = await parser_service.submit_parse_task(
            filename=data.filename, content=content, output_format=output_format
        )

        return TaskResponse(
            task_id=task_id,
            status=TaskStatus.PENDING,
            message="Document parsing task submitted successfully.",
        )

    @get(path="/tasks/{task_id:str}")
    async def get_task_status(
        self,
        task_id: str,
        parser_service: ParserService,
    ) -> TaskResultResponse:
        """
        Retrieves the status and result of a document parsing task.
        """
        result = await parser_service.get_task_result(task_id)
        if not result:
            raise NotFoundException(f"Task {task_id} not found")

        return result
