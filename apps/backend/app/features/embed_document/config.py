from pydantic_settings import BaseSettings, SettingsConfigDict


class EmbedSettings(BaseSettings):
    # Dense model settings
    default_dense_model_name: str = "intfloat/multilingual-e5-large"

    supported_dense_models: list[dict[str, str]] = [
        {
            "id": "intfloat/multilingual-e5-large",
            "name": "Multilingual E5 Large",
        }
    ]

    # Sparse model settings
    default_sparse_model_name: str = "Qdrant/bm25"
    default_sparse_language: str = "turkish"

    supported_sparse_models: list[dict[str, str]] = [
        {
            "id": "Qdrant/bm25",
            "name": "BM25 (Qdrant)",
        }
    ]

    supported_sparse_languages: list[dict[str, str]] = [
        {"id": "arabic", "name": "Arabic"},
        {"id": "danish", "name": "Danish"},
        {"id": "dutch", "name": "Dutch"},
        {"id": "english", "name": "English"},
        {"id": "finnish", "name": "Finnish"},
        {"id": "french", "name": "French"},
        {"id": "german", "name": "German"},
        {"id": "greek", "name": "Greek"},
        {"id": "hungarian", "name": "Hungarian"},
        {"id": "italian", "name": "Italian"},
        {"id": "norwegian", "name": "Norwegian"},
        {"id": "portuguese", "name": "Portuguese"},
        {"id": "romanian", "name": "Romanian"},
        {"id": "russian", "name": "Russian"},
        {"id": "spanish", "name": "Spanish"},
        {"id": "swedish", "name": "Swedish"},
        {"id": "tamil", "name": "Tamil"},
        {"id": "turkish", "name": "Turkish"},
    ]

    # Shared settings
    embed_batch_size: int = 8
    max_preview_items: int = 50

    model_config = SettingsConfigDict(
        env_prefix="EMBED_", case_sensitive=False, extra="ignore"
    )


settings = EmbedSettings()
