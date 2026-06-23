import structlog
from litestar import Controller, delete, get, post
from litestar.datastructures import UploadFile
from litestar.enums import RequestEncodingType
from litestar.exceptions import NotFoundException, ClientException
from litestar.params import Body
from typing import Annotated

from .schemas import (
    TaskResponse,
    TaskResultResponse,
    TaskStatus,
    TaskListDTO,
    UploadResponse,
    ParseRequest,
)
from .service import ParserService

logger = structlog.get_logger()


class ParserController(Controller):
    path = "/documents"

    @post(path="/uploads", status_code=201)
    async def upload_document_endpoint(
        self,
        data: Annotated[UploadFile, Body(media_type=RequestEncodingType.MULTI_PART)],
        parser_service: ParserService,
    ) -> UploadResponse:
        """
        Pre-uploads a document and extracts metadata (like page count).
        """
        logger.info(
            "received_upload_request",
            filename=data.filename,
            content_type=data.content_type,
        )
        return await parser_service.upload_file(data)

    @delete(path="/uploads/{file_id:str}", status_code=204)
    async def delete_upload_endpoint(
        self,
        file_id: str,
        parser_service: ParserService,
    ) -> None:
        """
        Deletes a pre-uploaded document.
        """
        await parser_service.delete_upload(file_id)

    @post(path="/parse", status_code=202)
    async def parse_document_endpoint(
        self,
        data: ParseRequest,
        parser_service: ParserService,
    ) -> TaskResponse:
        """
        Starts a background task to process a pre-uploaded file.
        """
        logger.info(
            "received_parse_request",
            file_id=data.file_id,
            filename=data.filename,
            output_format=data.output_format,
        )

        try:
            task_id = await parser_service.save_and_submit_task(parse_request=data)
        except ValueError as e:
            raise ClientException(str(e))

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

    @get(path="/tasks", return_dto=TaskListDTO)
    async def get_tasks(
        self,
        parser_service: ParserService,
    ) -> list[TaskResultResponse]:
        """
        Retrieves a list of all document parsing tasks.
        """
        return await parser_service.get_all_tasks()

    @post(path="/tasks/{task_id:str}/cancel", status_code=202)
    async def cancel_task_endpoint(
        self,
        task_id: str,
        parser_service: ParserService,
    ) -> TaskResponse:
        """
        Cancels an ongoing document parsing task.
        """
        success = await parser_service.cancel_task(task_id)
        if not success:
            raise ClientException(f"Task {task_id} cannot be cancelled.")

        return TaskResponse(
            task_id=task_id,
            status=TaskStatus.CANCELLING,
            message="Task cancellation initiated.",
        )

    @delete(path="/tasks/{task_id:str}", status_code=204)
    async def delete_task_endpoint(
        self,
        task_id: str,
        parser_service: ParserService,
    ) -> None:
        """
        Deletes a document parsing task result.
        """
        result = await parser_service.get_task_result(task_id)
        if not result:
            raise NotFoundException(f"Task {task_id} not found")

        if result.status in [
            TaskStatus.PENDING,
            TaskStatus.PROCESSING,
            TaskStatus.CANCELLING,
        ]:
            raise ClientException(
                f"Cannot delete a task in {result.status.value} state."
            )

        await parser_service.delete_task(task_id)
