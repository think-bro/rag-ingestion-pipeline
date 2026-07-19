from typing import List, Tuple
from pydantic_settings import BaseSettings, SettingsConfigDict


class ChunkSettings(BaseSettings):
    default_tokenizer_id: str = "intfloat/multilingual-e5-large"
    default_chunk_size: int = 512
    default_chunk_overlap: int = 64
    default_min_chars_per_chunk: int = 24

    default_headers_to_split_on: List[Tuple[str, str]] = [
        ("#", "Header 1"),
        ("##", "Header 2"),
        ("###", "Header 3"),
        ("####", "Header 4"),
    ]

    max_preview_items: int = 50

    model_config = SettingsConfigDict(
        env_prefix="CHUNK_", case_sensitive=False, extra="ignore"
    )


settings = ChunkSettings()
