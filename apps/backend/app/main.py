from contextlib import asynccontextmanager
from typing import AsyncGenerator

from docling.document_converter import DocumentConverter
from litestar import Litestar, get, Router
from litestar.config.cors import CORSConfig
from litestar.datastructures import State
from litestar.di import Provide
from litestar.middleware.logging import LoggingMiddlewareConfig
from litestar.plugins.structlog import StructlogConfig, StructlogPlugin

from apps.backend.app.core.broker import broker
from apps.backend.app.features.document_parsing.controller import ParserController
from apps.backend.app.features.document_parsing.service import ParserService


@get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint for Docker HEALTHCHECK."""
    return {"status": "healthy"}


@asynccontextmanager
async def app_lifespan(app: Litestar) -> AsyncGenerator[None, None]:
    """Manages the lifecycle of global resources."""
    if not broker.is_worker_process:
        await broker.startup()

    app.state.converter = DocumentConverter()
    app.state.parser_service = ParserService(converter=app.state.converter)
    yield

    del app.state.converter
    del app.state.parser_service

    if not broker.is_worker_process:
        await broker.shutdown()


def provide_parser_service(state: State) -> ParserService:
    """Dependency provider for ParserService using the global instance."""
    return state.parser_service


def create_app() -> Litestar:
    """Application factory function."""
    cors_config = CORSConfig(allow_origins=["*"])

    api_router = Router(path="/api", route_handlers=[ParserController])

    structlog_config = StructlogConfig(
        middleware_logging_config=LoggingMiddlewareConfig(
            request_log_fields=(
                "path",
                "method",
                "content_type",
                "headers",
                "cookies",
                "query",
                "path_params",
            ),
            response_log_fields=("status_code", "cookies", "headers"),
        )
    )

    return Litestar(
        route_handlers=[api_router, health_check],
        plugins=[StructlogPlugin(config=structlog_config)],
        lifespan=[app_lifespan],
        dependencies={
            "parser_service": Provide(provide_parser_service, sync_to_thread=False)
        },
        cors_config=cors_config,
        request_max_body_size=100
        * 1024
        * 1024,  # TODO: Implement async PDF splitting to handle >100MB files without OOM
        debug=True,
    )


app = create_app()
