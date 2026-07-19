from pydantic_settings import BaseSettings, SettingsConfigDict


class IndexSettings(BaseSettings):
    default_db_name: str = "qdrant"
    default_url: str = "http://host.docker.internal:6333"
    default_embedding_dim: int = 1024
    default_distance_metric: str = "Cosine"
    upload_batch_size: int = 100
    max_preview_items: int = 50

    supported_dbs: list[dict[str, str]] = [
        {
            "id": "qdrant",
            "name": "Qdrant",
        }
    ]

    model_config = SettingsConfigDict(
        env_prefix="INDEX_", case_sensitive=False, extra="ignore"
    )


settings = IndexSettings()
