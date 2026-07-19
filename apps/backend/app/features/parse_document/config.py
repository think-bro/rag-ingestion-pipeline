from pydantic_settings import BaseSettings, SettingsConfigDict


class ParseSettings(BaseSettings):
    # TODO: Make OCR and image generation toggles configurable via the frontend UI
    docling_do_ocr: bool = False
    docling_generate_picture_images: bool = False
    docling_generate_page_images: bool = False

    pages_per_part: int = 10

    orphan_upload_max_age_seconds: int = 86400  # 24 hours
    orphan_cleanup_cron: str = "0 * * * *"  # Every hour

    model_config = SettingsConfigDict(
        env_prefix="PARSE_", case_sensitive=False, extra="ignore"
    )


settings = ParseSettings()
