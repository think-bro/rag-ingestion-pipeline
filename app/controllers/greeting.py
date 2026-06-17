from litestar import Controller, Request, get

class GreetingController(Controller):
    path = "/greeting"

    @get()
    async def index(self, request: Request) -> str:
        request.logger.info("Greeting endpoint accessed")
        return "Hello from the RAG Ingestion Pipeline!"
