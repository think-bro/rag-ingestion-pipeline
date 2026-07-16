import os
import structlog
from litestar import Controller, delete, get, post
from litestar.exceptions import NotFoundException, ClientException
from litestar.response import File

from .schemas import (
    TaskResponse,
    ParseTaskResponse,
    TaskStatus,
    ParseTaskListDTO,
    ParseRequest,
)
from .service import ParseDocumentService

logger = structlog.get_logger()


class ParseDocumentController(Controller):
    path = "/parse-tasks"

    @post(status_code=202)
    async def parse_document_endpoint(
        self,
        data: ParseRequest,
        parse_document_service: ParseDocumentService,
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
            task_id = await parse_document_service.save_and_submit_task(
                parse_request=data
            )
        except ValueError as e:
            raise ClientException(str(e))

        return TaskResponse(
            task_id=task_id,
            status=TaskStatus.PENDING,
            message="Document parsing task submitted successfully.",
        )

    @get(path="/{task_id:str}")
    async def get_task_status(
        self,
        task_id: str,
        parse_document_service: ParseDocumentService,
    ) -> ParseTaskResponse:
        """
        Retrieves the status and result of a document parsing task.
        """
        result = await parse_document_service.get_task_result(task_id)
        if not result:
            raise NotFoundException(f"Task {task_id} not found")

        return result

    @get(return_dto=ParseTaskListDTO)
    async def get_tasks(
        self,
        parse_document_service: ParseDocumentService,
    ) -> list[ParseTaskResponse]:
        """
        Retrieves a list of all document parsing tasks.
        """
        return await parse_document_service.get_all_tasks()

    @post(path="/{task_id:str}/cancel", status_code=202)
    async def cancel_task_endpoint(
        self,
        task_id: str,
        parse_document_service: ParseDocumentService,
    ) -> TaskResponse:
        """
        Cancels an ongoing document parsing task.
        """
        success = await parse_document_service.cancel_task(task_id)
        if not success:
            raise ClientException(f"Task {task_id} cannot be cancelled.")

        return TaskResponse(
            task_id=task_id,
            status=TaskStatus.CANCELLING,
            message="Task cancellation initiated.",
        )

    @delete(path="/{task_id:str}", status_code=204)
    async def delete_task_endpoint(
        self,
        task_id: str,
        parse_document_service: ParseDocumentService,
    ) -> None:
        """
        Deletes a document parsing task result.
        """
        result = await parse_document_service.get_task_result(task_id)
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

        await parse_document_service.delete_task(task_id)

    @get(path="/{task_id:str}/parts/{part_index:int}/download")
    async def download_part_endpoint(
        self,
        task_id: str,
        part_index: int,
        parse_document_service: ParseDocumentService,
    ) -> File:
        """
        Downloads the parsed markdown content for a specific part.
        """
        file_path = await parse_document_service.download_part_content(
            task_id, part_index
        )
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

    @get(path="/{task_id:str}/download")
    async def download_full_endpoint(
        self,
        task_id: str,
        parse_document_service: ParseDocumentService,
    ) -> File:
        """
        Downloads the merged markdown content for the entire task.
        """
        file_path = await parse_document_service.download_full_content(task_id)
        if not file_path:
            raise NotFoundException(
                f"Content for task {task_id} not found or task not completed."
            )

        result = await parse_document_service.get_task_result(task_id)
        base_name = "document"
        if result and result.filename:
            base_name, _ = os.path.splitext(result.filename)

        filename = f"{base_name}_parsed.md"
        return File(
            path=file_path,
            filename=filename,
            content_disposition_type="attachment",
        )

    @post(path="/{task_id:str}/parts/{part_index:int}/retry", status_code=202)
    async def retry_part_endpoint(
        self,
        task_id: str,
        part_index: int,
        parse_document_service: ParseDocumentService,
    ) -> TaskResponse:
        """
        Retries a failed part of a document parsing task.
        """
        success = await parse_document_service.retry_part(task_id, part_index)
        if not success:
            raise ClientException(
                f"Part {part_index} of task {task_id} cannot be retried."
            )

        return TaskResponse(
            task_id=task_id,
            status=TaskStatus.PROCESSING,
            message=f"Retry initiated for part {part_index}.",
        )
