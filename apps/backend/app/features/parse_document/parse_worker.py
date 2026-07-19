import argparse
import json
import sys
import signal
from docling.datamodel.base_models import InputFormat
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.document_converter import DocumentConverter, PdfFormatOption

from .config import settings as parse_settings


def handle_sigterm(signum, frame):
    """Handle SIGTERM signal by exiting gracefully with an error JSON."""
    print(json.dumps({"error": "Task cancelled by user (SIGTERM received)"}))
    sys.exit(143)


def main():
    parser = argparse.ArgumentParser(description="Standalone Docling worker")
    parser.add_argument("file_path", help="Path to the document to parse")
    parser.add_argument("output_format", help="Output format (e.g. markdown)")
    parser.add_argument("output_json_path", help="Path to save the result JSON")
    args = parser.parse_args()

    # Register SIGTERM handler
    signal.signal(signal.SIGTERM, handle_sigterm)

    try:
        pipeline_options = PdfPipelineOptions(
            do_ocr=parse_settings.docling_do_ocr,
            generate_page_images=parse_settings.docling_generate_page_images,
            generate_picture_images=parse_settings.docling_generate_picture_images,
        )

        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )
        result = converter.convert(args.file_path)

        content = ""
        if args.output_format == "markdown":
            content = result.document.export_to_markdown()
        else:
            # Fallback to markdown
            content = result.document.export_to_markdown()

        # Write result as JSON to file
        with open(args.output_json_path, "w", encoding="utf-8") as f:
            json.dump({"content": content}, f)
        sys.exit(0)
    except Exception as e:
        with open(args.output_json_path, "w", encoding="utf-8") as f:
            json.dump({"error": str(e)}, f)
        sys.exit(1)


if __name__ == "__main__":
    main()
