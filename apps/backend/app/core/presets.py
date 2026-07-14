from typing import Any

CHUNK_PRESETS: dict[str, dict[str, Any]] = {
    "meb_textbook": {
        "name": "MEB Textbook",
        "description": "Optimized preset for Turkish Ministry of Education textbooks with specific hierarchy and metadata.",
        "config_overrides": {
            "chunk_size": 512,
            "chunk_overlap": 64,
            "headers_to_split_on": [
                ("#", "Ünite"),
                ("##", "Bölüm"),
                ("###", "Konu"),
                ("####", "Alt Konu"),
            ],
            "custom_metadata": {
                "document_type": "Milli Eğitim Bakanlığı Ders Kitabı",
                "grade": "Unspecified",
                "subject": "Unspecified",
                "publication_year": "2026",
            },
        },
    },
}
