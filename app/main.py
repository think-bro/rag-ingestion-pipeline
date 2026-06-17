from litestar import Litestar
from litestar.plugins.structlog import StructlogPlugin

from app.controllers.greeting import GreetingController

def create_app() -> Litestar:
    """Application factory function."""
    return Litestar(
        route_handlers=[GreetingController],
        plugins=[StructlogPlugin()],
        debug=True,
    )

app = create_app()
