import structlog
from typing import Annotated

from litestar import Controller, post
from litestar.datastructures import UploadFile
from litestar.enums import RequestEncodingType
from litestar.params import Body
from litestar.di import Provide

from .service import ParserService

logger = structlog.get_logger()


class ParserController(Controller):
    path = "/documents"
    dependencies = {"parser_service": Provide(ParserService)}

    @post(path="/parse")
    async def parse_document_endpoint(
        self,
        data: Annotated[UploadFile, Body(media_type=RequestEncodingType.MULTI_PART)],
        parser_service: ParserService,
    ) -> dict[str, str]:
        """
        Receives an uploaded file via multipart form and passes its contents
        to the parser service to be processed.
        """
        logger.info(
            "received_parse_request",
            filename=data.filename,
            content_type=data.content_type,
        )
        content = await data.read()
        markdown_content = parser_service.parse_document(content)
        return {"parsed_content": markdown_content}
