from pydantic_settings import BaseSettings, SettingsConfigDict


class EmbedSettings(BaseSettings):
    default_model_name: str = "intfloat/multilingual-e5-large"
    embed_batch_size: int = 8
    max_preview_items: int = 50

    supported_models: list[dict[str, str]] = [
        {
            "id": "intfloat/multilingual-e5-large",
            "name": "Multilingual E5 Large",
        }
    ]

    model_config = SettingsConfigDict(
        env_prefix="EMBED_", case_sensitive=False, extra="ignore"
    )


settings = EmbedSettings()
