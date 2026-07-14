import structlog
from litestar import Controller, delete, post
from litestar.datastructures import UploadFile
from litestar.enums import RequestEncodingType
from litestar.params import Body
from typing import Annotated

from .schemas import UploadResponse
from .service import UploadDocumentService

logger = structlog.get_logger()


class UploadDocumentController(Controller):
    path = "/uploads"

    @post(status_code=201)
    async def upload_document_endpoint(
        self,
        data: Annotated[UploadFile, Body(media_type=RequestEncodingType.MULTI_PART)],
        upload_service: UploadDocumentService,
    ) -> UploadResponse:
        """
        Pre-uploads a document and extracts metadata (like page count).
        """
        logger.info(
            "received_upload_request",
            filename=data.filename,
            content_type=data.content_type,
        )
        return await upload_service.upload_file(data)

    @delete(path="/{file_id:str}", status_code=204)
    async def delete_upload_endpoint(
        self,
        file_id: str,
        upload_service: UploadDocumentService,
    ) -> None:
        """
        Deletes a pre-uploaded document.
        """
        await upload_service.delete_upload(file_id)
