from typing import Any

CHUNK_PRESETS: dict[str, dict[str, Any]] = {
    "meb_textbook": {
        "name": "MEB Textbook",
        "description": "Optimized preset for Turkish Ministry of Education textbooks with specific hierarchy and metadata.",
        "metadata_options": {
            "grade": [
                "1.Sınıf",
                "2.Sınıf",
                "3.Sınıf",
                "4.Sınıf",
                "5.Sınıf",
                "6.Sınıf",
                "7.Sınıf",
                "8.Sınıf",
                "9.Sınıf",
                "10.Sınıf",
                "11.Sınıf",
                "12.Sınıf",
            ],
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
        "config_overrides": {
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
    },
}
