from contextlib import asynccontextmanager
from typing import AsyncGenerator

from litestar import Litestar, get, Router
from litestar.config.cors import CORSConfig
from litestar.datastructures import State
from litestar.di import Provide
from litestar.middleware.logging import LoggingMiddlewareConfig
from litestar.plugins.structlog import StructlogConfig, StructlogPlugin

from apps.backend.app.core.broker import broker
from apps.backend.app.core.redis_client import get_redis_pool
from apps.backend.app.features.upload_document.controller import (
    UploadDocumentController,
)
from apps.backend.app.features.upload_document.service import UploadDocumentService
from apps.backend.app.features.parse_document.controller import ParseDocumentController
from apps.backend.app.features.parse_document.service import ParseDocumentService
from apps.backend.app.features.chunk_document.controller import ChunkDocumentController
from apps.backend.app.features.chunk_document.service import ChunkDocumentService
from apps.backend.app.features.get_presets.controller import GetPresetsController
import redis.asyncio as aioredis


@get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint for Docker HEALTHCHECK."""
    return {"status": "healthy"}


@asynccontextmanager
async def app_lifespan(app: Litestar) -> AsyncGenerator[None, None]:
    """Manages the lifecycle of global resources."""
    if not broker.is_worker_process:
        await broker.startup()

    app.state.redis_pool = await get_redis_pool()

    app.state.redis = aioredis.Redis(connection_pool=app.state.redis_pool)
    app.state.upload_service = UploadDocumentService()
    app.state.parse_document_service = ParseDocumentService(
        redis=app.state.redis,
    )
    app.state.chunk_document_service = ChunkDocumentService(
        redis=app.state.redis,
    )
    yield

    del app.state.upload_service
    del app.state.parse_document_service
    del app.state.chunk_document_service

    await app.state.redis_pool.disconnect()
    del app.state.redis
    del app.state.redis_pool

    if not broker.is_worker_process:
        await broker.shutdown()


def provide_upload_service(state: State) -> UploadDocumentService:
    """Dependency provider for UploadDocumentService using the global instance."""
    return state.upload_service


def provide_parse_document_service(state: State) -> ParseDocumentService:
    """Dependency provider for ParseDocumentService using the global instance."""
    return state.parse_document_service


def provide_chunk_document_service(state: State) -> ChunkDocumentService:
    """Dependency provider for ChunkDocumentService using the global instance."""
    return state.chunk_document_service


def create_app() -> Litestar:
    """Application factory function."""
    cors_config = CORSConfig(allow_origins=["*"])

    v1_router = Router(
        path="/v1",
        route_handlers=[
            UploadDocumentController,
            ParseDocumentController,
            ChunkDocumentController,
            GetPresetsController,
        ],
    )
    api_router = Router(path="/api", route_handlers=[v1_router])

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
            "upload_service": Provide(provide_upload_service, sync_to_thread=False),
            "parse_document_service": Provide(
                provide_parse_document_service, sync_to_thread=False
            ),
            "chunk_document_service": Provide(
                provide_chunk_document_service, sync_to_thread=False
            ),
        },
        cors_config=cors_config,
        request_max_body_size=512
        * 1024
        * 1024,  # TODO: Move synchronous PDF splitting to a TaskIQ background task to prevent API blocking
        debug=True,
    )


app = create_app()
