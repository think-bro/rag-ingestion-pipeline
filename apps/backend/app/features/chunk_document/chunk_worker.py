import argparse
import json
import sys
import signal
from typing import cast, Any
from uuid import NAMESPACE_URL, uuid5

from tokenizers import Tokenizer as HFTokenizer
from langchain_text_splitters import MarkdownHeaderTextSplitter
from chonkie import RecursiveChunker, OverlapRefinery
from chonkie.types import Chunk

from .config import settings as chunk_settings


def handle_sigterm(signum, frame):
    """Handle SIGTERM signal by exiting gracefully with an error JSON."""
    print(json.dumps({"error": "Task cancelled by user (SIGTERM received)"}))
    sys.exit(143)


def build_breadcrumb(metadata: dict[str, str | None]) -> str:
    """Builds human-readable breadcrumb path from metadata dict."""
    parts = [v for v in metadata.values() if v is not None]
    return " > ".join(parts)


def main() -> None:
    parser = argparse.ArgumentParser(description="Standalone chunking worker")
    parser.add_argument("file_path", help="Path to the markdown document to chunk")
    parser.add_argument("config_json", help="JSON serialized ChunkConfig")
    parser.add_argument("output_json_path", help="Path to save the result JSON")
    parser.add_argument("preview_json_path", help="Path to save the preview JSON")
    parser.add_argument("source_filename", help="Original filename of the document")
    args = parser.parse_args()

    # Register SIGTERM handler
    signal.signal(signal.SIGTERM, handle_sigterm)

    try:
        config = json.loads(args.config_json)

        with open(args.file_path, "r", encoding="utf-8") as f:
            md_text = f.read()

        # ── Stage 1: MarkdownHeaderTextSplitter ──
        headers_to_split_on = [tuple(h) for h in config["headers_to_split_on"]]
        splitter = MarkdownHeaderTextSplitter(
            headers_to_split_on=headers_to_split_on,
            strip_headers=config.get("strip_headers", False),
        )
        docs = splitter.split_text(md_text)

        # ── Stage 2: Chonkie RecursiveChunker ──
        tokenizer_id = config.get("tokenizer_id", chunk_settings.default_tokenizer_id)
        tokenizer_obj = HFTokenizer.from_pretrained(tokenizer_id)

        chunk_size = config.get("chunk_size", chunk_settings.default_chunk_size)
        overlap_val = config.get("chunk_overlap", chunk_settings.default_chunk_overlap)

        # In Chonkie, OverlapRefinery *adds* context to the chunk. To stay under the max
        # embedding token limit (chunk_size), the base chunker must leave room for the overlap.
        base_chunk_size = chunk_size - overlap_val
        if base_chunk_size <= 0:
            base_chunk_size = chunk_size  # Fallback just in case

        chunker = RecursiveChunker(
            tokenizer=tokenizer_obj,
            chunk_size=base_chunk_size,
            min_characters_per_chunk=config.get(
                "min_chars_per_chunk", chunk_settings.default_min_chars_per_chunk
            ),
        )

        if overlap_val > 0:
            refinery = OverlapRefinery(
                tokenizer=tokenizer_obj,
                context_size=overlap_val,
                method="prefix",
                mode="recursive",
            )
        else:
            refinery = None

        # ── Build enriched chunks ──
        result = []
        chunk_index = 0
        for doc in docs:
            chunks = cast(list[Chunk], chunker(doc.page_content))
            if refinery is not None:
                chunks = refinery(chunks)

            for chunk in chunks:
                # Normalize metadata: ensure all header levels present
                metadata: dict[str, Any] = {}
                for _, label in headers_to_split_on:
                    metadata[label] = doc.metadata.get(label)

                breadcrumb = build_breadcrumb(metadata)

                # Merge custom metadata from config
                custom_metadata = config.get("custom_metadata", {})
                for k, v in custom_metadata.items():
                    metadata[k] = v

                text = chunk.text

                # Contextual Retrieval: prepend breadcrumb to text
                if breadcrumb:
                    contextualized = f"[{breadcrumb}]\n{text}"
                else:
                    contextualized = text

                # Deterministic Chunk ID
                # Helps vector databases to upsert instead of duplicating chunks
                deterministic_id = str(uuid5(NAMESPACE_URL, text))

                metadata["chunk_index"] = chunk_index
                metadata["source_file"] = args.source_filename
                metadata["token_count"] = chunk.token_count
                metadata["char_count"] = len(text)
                metadata["breadcrumb"] = breadcrumb

                result.append(
                    {
                        "chunk_id": deterministic_id,
                        "text": text,
                        "contextualized_text": contextualized,
                        "metadata": metadata,
                    }
                )
                chunk_index += 1

        output = {
            "total_chunks": len(result),
            "config": config,
            "chunks": result,
        }

        with open(args.output_json_path, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        # Generate preview JSON
        preview_items = []
        for c in result[: chunk_settings.max_preview_items]:
            preview_items.append(
                {
                    "chunk_id": c.get("chunk_id", ""),
                    "metadata": c.get("metadata", {}),
                }
            )

        preview_data = {
            "total_chunks": len(result),
            "config": config,
            "items": preview_items,
        }

        with open(args.preview_json_path, "w", encoding="utf-8") as f:
            json.dump(preview_data, f)

        sys.exit(0)

    except Exception as e:
        with open(args.output_json_path, "w", encoding="utf-8") as f:
            json.dump({"error": str(e)}, f)
        sys.exit(1)


if __name__ == "__main__":
    main()
