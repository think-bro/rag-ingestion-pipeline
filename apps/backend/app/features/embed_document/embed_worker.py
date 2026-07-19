import argparse
import json
import sys
import signal
import traceback
import pyarrow as pa
import pyarrow.parquet as pq
from fastembed import TextEmbedding

from apps.backend.app.core.config import settings as core_settings
from .config import settings as embed_settings


def handle_sigterm(signum, frame):
    """Handle SIGTERM signal by exiting gracefully with an error JSON."""
    print(json.dumps({"error": "Task cancelled by user (SIGTERM received)"}))
    sys.exit(143)


def write_error(error_json_path: str, msg: str):
    with open(error_json_path, "w", encoding="utf-8") as f:
        json.dump({"error": msg}, f)


def main():
    parser = argparse.ArgumentParser(description="Standalone embedding worker")
    parser.add_argument("file_path", help="Path to the uploaded document")
    parser.add_argument("config_json", help="JSON serialized EmbedConfig")
    parser.add_argument(
        "output_parquet_path", help="Path to save the resulting Parquet"
    )
    parser.add_argument("output_preview_path", help="Path to save the preview JSON")
    parser.add_argument("error_json_path", help="Path to save error JSON if failed")
    parser.add_argument("progress_json_path", help="Path to save progress JSON")
    args = parser.parse_args()

    # Register SIGTERM handler
    signal.signal(signal.SIGTERM, handle_sigterm)

    try:
        config = json.loads(args.config_json)

        with open(args.file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        chunks = data.get("chunks", [])
        if not chunks:
            write_error(args.error_json_path, "No chunks found in input file")
            sys.exit(1)

        model_name = config.get("model_name", embed_settings.default_model_name)
        embedding_model = TextEmbedding(
            model_name=model_name, cache_dir=core_settings.hf_models_cache_dir
        )

        # Prepare texts
        texts = [c.get("contextualized_text", c.get("text", "")) for c in chunks]
        total_chunks = len(chunks)

        progress_data = {"completed": 0, "total": total_chunks}
        with open(args.progress_json_path, "w", encoding="utf-8") as f:
            json.dump(progress_data, f)

        embeddings_list = []
        for i, vector in enumerate(
            embedding_model.embed(texts, batch_size=embed_settings.embed_batch_size),
            start=1,
        ):
            embeddings_list.append(vector)

            if i % embed_settings.embed_batch_size == 0 or i == total_chunks:
                progress_data["completed"] = i
                with open(args.progress_json_path, "w", encoding="utf-8") as f:
                    json.dump(progress_data, f)

        # Build pyarrow table
        chunk_ids = [c.get("chunk_id", "") for c in chunks]
        original_texts = [c.get("text", "") for c in chunks]
        contextualized_texts = [c.get("contextualized_text", "") for c in chunks]

        # Metadata handling
        metadatas = [json.dumps(c.get("metadata", {})) for c in chunks]

        table = pa.Table.from_pydict(
            {
                "chunk_id": chunk_ids,
                "text": original_texts,
                "contextualized_text": contextualized_texts,
                "metadata": metadatas,
                "embedding": pa.array(embeddings_list, type=pa.list_(pa.float32())),
            }
        )

        pq.write_table(table, args.output_parquet_path)

        # Generate preview JSON
        preview_items = []
        for i, c in enumerate(chunks[: embed_settings.max_preview_items]):
            preview_items.append(
                {
                    "chunk_id": c.get("chunk_id", ""),
                    "metadata": c.get("metadata", {}),
                }
            )

        preview_data = {
            "model_name": model_name,
            "embedding_dim": len(embeddings_list[0]) if embeddings_list else 0,
            "total_vectors": len(chunks),
            "items": preview_items,
        }

        with open(args.output_preview_path, "w", encoding="utf-8") as f:
            json.dump(preview_data, f)

        sys.exit(0)

    except Exception as e:
        write_error(args.error_json_path, str(e) + "\n" + traceback.format_exc())
        sys.exit(1)


if __name__ == "__main__":
    main()
