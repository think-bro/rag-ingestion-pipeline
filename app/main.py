from litestar import Litestar
from litestar.plugins.structlog import StructlogPlugin

from app.features.document_parsing.controller import ParserController


def create_app() -> Litestar:
    """Application factory function."""
    return Litestar(
        route_handlers=[ParserController],
        plugins=[StructlogPlugin()],
        debug=True,
    )


app = create_app()
