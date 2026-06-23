import argparse
import json
import sys
import signal
from docling.document_converter import DocumentConverter


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
        converter = DocumentConverter()
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
