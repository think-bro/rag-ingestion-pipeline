import structlog
from litestar import Controller, delete, get, post
from litestar.exceptions import NotFoundException, ClientException

from .schemas import (
    IndexRequest,
    IndexTaskResponse,
    IndexTaskListDTO,
    TaskStatus,
)
from .service import IndexDocumentService
from .config import settings as index_settings

logger = structlog.get_logger()


class IndexDocumentController(Controller):
    path = "/index-tasks"

    @post(status_code=202)
    async def index_document_endpoint(
        self,
        data: IndexRequest,
        index_document_service: IndexDocumentService,
    ) -> IndexTaskResponse:
        """Starts a background task to index a parquet file."""
        logger.info(
            "received_index_request",
            file_id=data.file_id,
            filename=data.filename,
        )

        try:
            task_id = await index_document_service.submit_index_task(request=data)
        except ValueError as e:
            raise ClientException(str(e))

        return IndexTaskResponse(
            task_id=task_id,
            status=TaskStatus.PENDING,
        )

    @get(path="/{task_id:str}")
    async def get_index_task_status(
        self,
        task_id: str,
        index_document_service: IndexDocumentService,
    ) -> IndexTaskResponse:
        """Retrieves the status and result of a document indexing task."""
        result = await index_document_service.get_task_result(task_id)
        if not result:
            raise NotFoundException(f"Index task {task_id} not found")

        return result

    @get(return_dto=IndexTaskListDTO)
    async def get_index_tasks(
        self,
        index_document_service: IndexDocumentService,
    ) -> list[IndexTaskResponse]:
        """Retrieves a list of all document indexing tasks."""
        return await index_document_service.get_all_tasks()

    @post(path="/{task_id:str}/cancel", status_code=202)
    async def cancel_index_task_endpoint(
        self,
        task_id: str,
        index_document_service: IndexDocumentService,
    ) -> IndexTaskResponse:
        """Cancels an ongoing document indexing task."""
        success = await index_document_service.cancel_task(task_id)
        if not success:
            raise ClientException(f"Index task {task_id} cannot be cancelled.")

        return IndexTaskResponse(
            task_id=task_id,
            status=TaskStatus.CANCELLING,
        )

    @delete(path="/{task_id:str}", status_code=204)
    async def delete_index_task_endpoint(
        self,
        task_id: str,
        index_document_service: IndexDocumentService,
    ) -> None:
        """Deletes a document indexing task result."""
        result = await index_document_service.get_task_result(task_id)
        if not result:
            raise NotFoundException(f"Index task {task_id} not found")

        if result.status in [
            TaskStatus.PENDING,
            TaskStatus.PROCESSING,
            TaskStatus.CANCELLING,
        ]:
            raise ClientException(
                f"Cannot delete a task in {result.status.value} state."
            )

        await index_document_service.delete_task(task_id)


class VectorDBsController(Controller):
    path = "/vector-dbs"

    @get()
    async def list_vector_dbs(self) -> list[dict[str, str]]:
        """Retrieves a list of all supported vector databases."""
        dbs = []
        for db in index_settings.supported_dbs:
            db_copy = db.copy()
            if db_copy["id"] == index_settings.default_db_name:
                db_copy["default_url"] = index_settings.default_url
            dbs.append(db_copy)
        return dbs
