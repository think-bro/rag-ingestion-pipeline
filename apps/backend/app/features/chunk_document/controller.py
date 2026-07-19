import os
import structlog
from litestar import Controller, delete, get, post
from litestar.exceptions import NotFoundException, ClientException
from litestar.response import File

from .schemas import (
    ChunkRequest,
    ChunkTaskResponse,
    ChunkTaskListDTO,
    TaskStatus,
    ChunkPresetListResponse,
)
from .service import ChunkDocumentService

logger = structlog.get_logger()


class ChunkDocumentController(Controller):
    path = "/chunk-tasks"

    @post(status_code=202)
    async def chunk_document_endpoint(
        self,
        data: ChunkRequest,
        chunk_document_service: ChunkDocumentService,
    ) -> ChunkTaskResponse:
        """Starts a background task to chunk a pre-uploaded markdown file."""
        logger.info(
            "received_chunk_request",
            file_id=data.file_id,
            filename=data.filename,
        )

        try:
            task_id = await chunk_document_service.submit_chunk_task(request=data)
        except ValueError as e:
            raise ClientException(str(e))

        return ChunkTaskResponse(
            task_id=task_id,
            status=TaskStatus.PENDING,
        )

    @get(path="/{task_id:str}")
    async def get_chunk_task_status(
        self,
        task_id: str,
        chunk_document_service: ChunkDocumentService,
    ) -> ChunkTaskResponse:
        """Retrieves the status and result of a document chunking task."""
        result = await chunk_document_service.get_task_result(task_id)
        if not result:
            raise NotFoundException(f"Chunk task {task_id} not found")

        return result

    @get(return_dto=ChunkTaskListDTO)
    async def get_chunk_tasks(
        self,
        chunk_document_service: ChunkDocumentService,
    ) -> list[ChunkTaskResponse]:
        """Retrieves a list of all document chunking tasks."""
        return await chunk_document_service.get_all_tasks()

    @post(path="/{task_id:str}/cancel", status_code=202)
    async def cancel_chunk_task_endpoint(
        self,
        task_id: str,
        chunk_document_service: ChunkDocumentService,
    ) -> ChunkTaskResponse:
        """Cancels an ongoing document chunking task."""
        success = await chunk_document_service.cancel_task(task_id)
        if not success:
            raise ClientException(f"Chunk task {task_id} cannot be cancelled.")

        return ChunkTaskResponse(
            task_id=task_id,
            status=TaskStatus.CANCELLING,
        )

    @delete(path="/{task_id:str}", status_code=204)
    async def delete_chunk_task_endpoint(
        self,
        task_id: str,
        chunk_document_service: ChunkDocumentService,
    ) -> None:
        """Deletes a document chunking task result."""
        result = await chunk_document_service.get_task_result(task_id)
        if not result:
            raise NotFoundException(f"Chunk task {task_id} not found")

        if result.status in [
            TaskStatus.PENDING,
            TaskStatus.PROCESSING,
            TaskStatus.CANCELLING,
        ]:
            raise ClientException(
                f"Cannot delete a task in {result.status.value} state."
            )

        await chunk_document_service.delete_task(task_id)

    @get(path="/{task_id:str}/download")
    async def download_chunks_endpoint(
        self,
        task_id: str,
        chunk_document_service: ChunkDocumentService,
    ) -> File:
        """Downloads the chunked output JSON."""
        file_path = await chunk_document_service.download_chunks(task_id)
        if not file_path:
            raise NotFoundException(
                f"Content for chunk task {task_id} not found or task not completed."
            )

        result = await chunk_document_service.get_task_result(task_id)
        base_name = "document"
        if result and result.filename:
            base_name, _ = os.path.splitext(result.filename)

        filename = f"{base_name}_chunks.json"
        return File(
            path=file_path,
            filename=filename,
            content_disposition_type="attachment",
        )


class ChunkPresetController(Controller):
    path = "/chunk-presets"

    @get()
    async def list_chunk_presets(
        self,
        chunk_document_service: ChunkDocumentService,
    ) -> ChunkPresetListResponse:
        """Retrieves a list of all document chunking presets."""
        return chunk_document_service.list_presets()
