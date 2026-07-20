import argparse
import json
import sys
import signal
import traceback
import pyarrow.parquet as pq
from qdrant_client import QdrantClient, models

from .config import settings as index_settings


def handle_sigterm(signum, frame):
    """Handle SIGTERM signal by exiting gracefully with an error JSON."""
    print(json.dumps({"error": "Task cancelled by user (SIGTERM received)"}))
    sys.exit(143)


def write_error(error_json_path: str, msg: str):
    with open(error_json_path, "w", encoding="utf-8") as f:
        json.dump({"error": msg}, f)


def main():
    parser = argparse.ArgumentParser(description="Standalone indexing worker")
    parser.add_argument("file_path", help="Path to the uploaded parquet file")
    parser.add_argument("config_json", help="JSON serialized IndexConfig")
    parser.add_argument("output_preview_path", help="Path to save the preview JSON")
    parser.add_argument("error_json_path", help="Path to save error JSON if failed")
    parser.add_argument("progress_json_path", help="Path to save progress JSON")
    args = parser.parse_args()

    # Register SIGTERM handler
    signal.signal(signal.SIGTERM, handle_sigterm)

    try:
        config = json.loads(args.config_json)
        db_name = config.get("db_name", index_settings.default_db_name)
        url = config.get("url", index_settings.default_url)
        collection_name = config.get("collection_name")

        if not collection_name:
            write_error(args.error_json_path, "collection_name is required")
            sys.exit(1)

        # Load parquet file
        try:
            parquet_file = pq.ParquetFile(args.file_path)
        except Exception as e:
            write_error(args.error_json_path, f"Failed to read parquet file: {str(e)}")
            sys.exit(1)

        total_vectors = parquet_file.metadata.num_rows
        if total_vectors == 0:
            write_error(args.error_json_path, "No vectors found in input file")
            sys.exit(1)

        progress_data = {"completed": 0, "total": total_vectors}
        with open(args.progress_json_path, "w", encoding="utf-8") as f:
            json.dump(progress_data, f)

        embedding_dim = config.get(
            "embedding_dim", index_settings.default_embedding_dim
        )
        distance_metric_str = config.get(
            "distance_metric", index_settings.default_distance_metric
        )
        try:
            distance_metric = getattr(models.Distance, distance_metric_str.upper())
        except AttributeError:
            write_error(
                args.error_json_path,
                f"Invalid distance metric: {distance_metric_str}",
            )
            sys.exit(1)

        sparse_modifier_str = config.get(
            "sparse_modifier", index_settings.default_sparse_modifier
        )
        try:
            sparse_modifier = getattr(models.Modifier, sparse_modifier_str.upper())
        except AttributeError:
            write_error(
                args.error_json_path,
                f"Invalid sparse modifier: {sparse_modifier_str}",
            )
            sys.exit(1)

        # Connect to Qdrant
        try:
            client = QdrantClient(url=url)
        except Exception as e:
            write_error(args.error_json_path, f"Failed to connect to Qdrant: {str(e)}")
            sys.exit(1)

        # Check and create collection (hybrid: dense + sparse named vectors)
        if not client.collection_exists(collection_name):
            # TODO: The collection is currently hardcoded as a Hybrid collection (dense + sparse).
            # This provides maximum flexibility at query time (allowing purely semantic, purely keyword,
            # or fused hybrid search). However, if storage optimization becomes a priority in the future,
            # consider adding an `index_mode` (e.g., "dense", "sparse", "hybrid") to `IndexConfig`
            # and creating the collection schema dynamically based on that mode.
            client.create_collection(
                collection_name=collection_name,
                vectors_config={
                    "dense": models.VectorParams(
                        size=embedding_dim, distance=distance_metric
                    ),
                },
                sparse_vectors_config={
                    "sparse": models.SparseVectorParams(
                        modifier=sparse_modifier,
                    ),
                },
            )

        completed_vectors = 0
        preview_items = []

        # Read in batches
        batch_size = index_settings.upload_batch_size
        for record_batch in parquet_file.iter_batches(batch_size=batch_size):
            batch_data = record_batch.to_pylist()

            points = []
            for row in batch_data:
                chunk_id = str(row.get("chunk_id", ""))
                payload = {
                    "chunk_id": chunk_id,
                    "text": row.get("text", ""),
                    "contextualized_text": row.get("contextualized_text", ""),
                }

                raw_metadata = row.get("metadata", "{}")
                if raw_metadata:
                    try:
                        metadata = json.loads(raw_metadata)
                        payload.update(metadata)
                    except Exception:
                        pass

                dense_vector = row.get("dense_vector", [])
                sparse_indices = row.get("sparse_indices", []) or []
                sparse_values = row.get("sparse_values", []) or []

                points.append(
                    models.PointStruct(
                        id=chunk_id,
                        vector={
                            "dense": dense_vector,
                            "sparse": models.SparseVector(
                                indices=sparse_indices,
                                values=sparse_values,
                            ),
                        },
                        payload=payload,
                    )
                )

                if len(preview_items) < index_settings.max_preview_items:
                    preview_items.append(
                        {
                            "chunk_id": chunk_id,
                            "metadata": payload,
                        }
                    )

            if points:
                client.upload_points(
                    collection_name=collection_name,
                    points=points,
                    batch_size=batch_size,
                )
                completed_vectors += len(points)
                progress_data["completed"] = completed_vectors
                with open(args.progress_json_path, "w", encoding="utf-8") as f:
                    json.dump(progress_data, f)

        # Generate preview JSON
        preview_data = {
            "db_name": db_name,
            "collection_name": collection_name,
            "total_vectors": total_vectors,
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
