import os
import tempfile
import structlog
from docling.document_converter import DocumentConverter

logger = structlog.get_logger()


class ParserService:
    def __init__(self):
        self.converter = DocumentConverter()

    def parse_document(self, content: bytes) -> str:
        """
        Takes raw document bytes, saves them to a temporary file,
        processes it with Docling, and returns the markdown representation.
        """
        logger.info("saving_temp_file", file_size_bytes=len(content))
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name

        try:
            result = self.converter.convert(temp_path)
            return result.document.export_to_markdown()
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
