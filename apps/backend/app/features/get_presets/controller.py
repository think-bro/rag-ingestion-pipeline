from typing import Any
from litestar import Controller, get
from litestar.di import Provide

from apps.backend.app.core.presets import CHUNK_PRESETS


def provide_presets() -> dict[str, Any]:
    """Dependency provider for chunking configuration presets."""
    return CHUNK_PRESETS


class GetPresetsController(Controller):
    path = "/presets"
    dependencies = {"presets": Provide(provide_presets, sync_to_thread=False)}

    @get(status_code=200)
    async def get_presets_endpoint(
        self,
        presets: dict[str, Any],
    ) -> dict[str, Any]:
        """Returns the registry of available chunking configuration presets."""
        return presets
