from litestar import Litestar, get
from litestar.plugins.structlog import StructlogPlugin

from apps.backend.app.features.document_parsing.controller import ParserController


@get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint for Docker HEALTHCHECK."""
    return {"status": "healthy"}


def create_app() -> Litestar:
    """Application factory function."""
    return Litestar(
        route_handlers=[ParserController, health_check],
        plugins=[StructlogPlugin()],
        debug=True,
    )


app = create_app()
