from contextlib import asynccontextmanager
from typing import AsyncGenerator

from docling.document_converter import DocumentConverter
from litestar import Litestar, get
from litestar.config.cors import CORSConfig
from litestar.datastructures import State
from litestar.di import Provide
from litestar.plugins.structlog import StructlogPlugin

from apps.backend.app.features.document_parsing.controller import ParserController
from apps.backend.app.features.document_parsing.service import ParserService


@get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint for Docker HEALTHCHECK."""
    return {"status": "healthy"}


@asynccontextmanager
async def app_lifespan(app: Litestar) -> AsyncGenerator[None, None]:
    """Manages the lifecycle of global resources."""
    # Initialize DocumentConverter once at startup.
    # This prevents loading ML models on every request.
    app.state.converter = DocumentConverter()
    app.state.parser_service = ParserService(converter=app.state.converter)
    yield
    # Cleanup resources if necessary
    del app.state.converter
    del app.state.parser_service


def provide_parser_service(state: State) -> ParserService:
    """Dependency provider for ParserService using the global instance."""
    return state.parser_service


def create_app() -> Litestar:
    """Application factory function."""

    cors_config = CORSConfig(allow_origins=["*"])

    return Litestar(
        route_handlers=[ParserController, health_check],
        plugins=[StructlogPlugin()],
        lifespan=[app_lifespan],
        dependencies={
            "parser_service": Provide(provide_parser_service, sync_to_thread=False)
        },
        cors_config=cors_config,
        debug=True,
    )


app = create_app()
