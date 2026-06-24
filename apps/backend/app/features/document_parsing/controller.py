import os
import structlog
from litestar import Controller, delete, get, post
from litestar.datastructures import UploadFile
from litestar.enums import RequestEncodingType
from litestar.exceptions import NotFoundException, ClientException
from litestar.params import Body
from litestar.response import File
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

    @get(path="/tasks/{task_id:str}/parts/{part_index:int}/download")
    async def download_part_endpoint(
        self,
        task_id: str,
        part_index: int,
        parser_service: ParserService,
    ) -> File:
        """
        Downloads the parsed markdown content for a specific part.
        """
        file_path = await parser_service.download_part_content(task_id, part_index)
        if not file_path:
            raise NotFoundException(
                f"Content for task {task_id} part {part_index} not found."
            )

        filename = f"{task_id}_part_{part_index:03d}.md"
        return File(
            path=file_path,
            filename=filename,
            content_disposition_type="attachment",
        )

    @get(path="/tasks/{task_id:str}/download")
    async def download_full_endpoint(
        self,
        task_id: str,
        parser_service: ParserService,
    ) -> File:
        """
        Downloads the merged markdown content for the entire task.
        """
        file_path = await parser_service.download_full_content(task_id)
        if not file_path:
            raise NotFoundException(
                f"Content for task {task_id} not found or task not completed."
            )

        result = await parser_service.get_task_result(task_id)
        base_name = "document"
        if result and result.filename:
            base_name, _ = os.path.splitext(result.filename)

        filename = f"{base_name}_parsed.md"
        return File(
            path=file_path,
            filename=filename,
            content_disposition_type="attachment",
        )

    @post(path="/tasks/{task_id:str}/parts/{part_index:int}/retry", status_code=202)
    async def retry_part_endpoint(
        self,
        task_id: str,
        part_index: int,
        parser_service: ParserService,
    ) -> TaskResponse:
        """
        Retries a failed part of a document parsing task.
        """
        success = await parser_service.retry_part(task_id, part_index)
        if not success:
            raise ClientException(
                f"Part {part_index} of task {task_id} cannot be retried."
            )

        return TaskResponse(
            task_id=task_id,
            status=TaskStatus.PROCESSING,
            message=f"Retry initiated for part {part_index}.",
        )
