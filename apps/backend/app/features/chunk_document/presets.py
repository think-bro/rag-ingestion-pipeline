from pydantic import BaseModel

from .schemas import ChunkConfig


class ChunkPreset(BaseModel):
    name: str
    description: str
    metadata_options: dict[str, list[str]] = {}
    config_overrides: dict[str, object] = {}

    def build_config(self, base: ChunkConfig | None = None) -> ChunkConfig:
        """Applies preset overrides on top of the base config and validates it."""
        merged = (base or ChunkConfig()).model_dump()
        merged.update(self.config_overrides)
        return ChunkConfig(**merged)


CHUNK_PRESETS: dict[str, ChunkPreset] = {
    "meb_textbook": ChunkPreset(
        name="MEB Textbook",
        description=(
            "Optimized preset for Turkish Ministry of Education textbooks "
            "with specific hierarchy and metadata."
        ),
        metadata_options={
            "grade": [f"{i}.Sınıf" for i in range(1, 13)],
            "subject": [
                "Hayat Bilgisi",
                "Fen Bilimleri",
                "Sosyal Bilgiler",
                "Türkçe",
                "Matematik",
                "İngilizce",
                "Din Kültürü ve Ahlak Bilgisi",
                "T.C. İnkılap Tarihi ve Atatürkçülük",
                "Tarih",
                "Coğrafya",
                "Biyoloji",
                "Fizik",
                "Kimya",
                "Felsefe",
                "Türk Dili ve Edebiyatı",
            ],
        },
        config_overrides={
            "chunk_size": 512,
            "chunk_overlap": 64,
            "headers_to_split_on": [
                ("#", "unit"),
                ("##", "section"),
                ("###", "topic"),
                ("####", "subtopic"),
            ],
            "custom_metadata": {
                "document_type": "Milli Eğitim Bakanlığı Ders Kitabı",
                "grade": "Unspecified",
                "subject": "Unspecified",
                "publication_year": "2026",
            },
        },
    ),
}
