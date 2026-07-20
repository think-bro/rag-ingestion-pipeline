import os
import structlog
from litestar import Controller, delete, get, post
from litestar.exceptions import NotFoundException, ClientException
from litestar.response import File

from .schemas import (
    EmbedRequest,
    EmbedTaskResponse,
    EmbedTaskListDTO,
    TaskStatus,
)
from .service import EmbedDocumentService
from .config import settings as embed_settings

logger = structlog.get_logger()


class EmbedDocumentController(Controller):
    path = "/embed-tasks"

    @post(status_code=202)
    async def embed_document_endpoint(
        self,
        data: EmbedRequest,
        embed_document_service: EmbedDocumentService,
    ) -> EmbedTaskResponse:
        """Starts a background task to embed a chunks JSON file."""
        logger.info(
            "received_embed_request",
            file_id=data.file_id,
            filename=data.filename,
        )

        try:
            task_id = await embed_document_service.submit_embed_task(request=data)
        except ValueError as e:
            raise ClientException(str(e))

        return EmbedTaskResponse(
            task_id=task_id,
            status=TaskStatus.PENDING,
        )

    @get(path="/{task_id:str}")
    async def get_embed_task_status(
        self,
        task_id: str,
        embed_document_service: EmbedDocumentService,
    ) -> EmbedTaskResponse:
        """Retrieves the status and result of a document embedding task."""
        result = await embed_document_service.get_task_result(task_id)
        if not result:
            raise NotFoundException(f"Embed task {task_id} not found")

        return result

    @get(return_dto=EmbedTaskListDTO)
    async def get_embed_tasks(
        self,
        embed_document_service: EmbedDocumentService,
    ) -> list[EmbedTaskResponse]:
        """Retrieves a list of all document embedding tasks."""
        return await embed_document_service.get_all_tasks()

    @post(path="/{task_id:str}/cancel", status_code=202)
    async def cancel_embed_task_endpoint(
        self,
        task_id: str,
        embed_document_service: EmbedDocumentService,
    ) -> EmbedTaskResponse:
        """Cancels an ongoing document embedding task."""
        success = await embed_document_service.cancel_task(task_id)
        if not success:
            raise ClientException(f"Embed task {task_id} cannot be cancelled.")

        return EmbedTaskResponse(
            task_id=task_id,
            status=TaskStatus.CANCELLING,
        )

    @delete(path="/{task_id:str}", status_code=204)
    async def delete_embed_task_endpoint(
        self,
        task_id: str,
        embed_document_service: EmbedDocumentService,
    ) -> None:
        """Deletes a document embedding task result."""
        result = await embed_document_service.get_task_result(task_id)
        if not result:
            raise NotFoundException(f"Embed task {task_id} not found")

        if result.status in [
            TaskStatus.PENDING,
            TaskStatus.PROCESSING,
            TaskStatus.CANCELLING,
        ]:
            raise ClientException(
                f"Cannot delete a task in {result.status.value} state."
            )

        await embed_document_service.delete_task(task_id)

    @get(path="/{task_id:str}/download")
    async def download_embeddings_endpoint(
        self,
        task_id: str,
        embed_document_service: EmbedDocumentService,
    ) -> File:
        """Downloads the embedded output Parquet."""
        file_path = await embed_document_service.download_embeddings(task_id)
        if not file_path:
            raise NotFoundException(
                f"Content for embed task {task_id} not found or task not completed."
            )

        result = await embed_document_service.get_task_result(task_id)
        base_name = "document"
        if result and result.filename:
            base_name, _ = os.path.splitext(result.filename)

        filename = f"{base_name}_embeddings.parquet"
        return File(
            path=file_path,
            filename=filename,
            content_disposition_type="attachment",
        )


class EmbedOptionsController(Controller):
    path = "/embed-options"

    @get()
    async def get_embed_options(self) -> dict[str, list[dict[str, str]]]:
        """Retrieves all configuration options for the embedding process."""
        return {
            "dense_models": embed_settings.supported_dense_models,
            "sparse_models": embed_settings.supported_sparse_models,
            "sparse_languages": embed_settings.supported_sparse_languages,
        }
