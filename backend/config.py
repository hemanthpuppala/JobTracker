import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
DB_PATH = BASE_DIR / "jobs.db"
GENERATED_RESUMES_DIR = BASE_DIR / "generated_resumes"
STATIC_DIR = BASE_DIR / "backend" / "static"
UI_PASSWORD = os.getenv("UI_PASSWORD", "Bhoomika")

CORS_ORIGINS = [
    o.strip() for o in os.getenv(
        "CORS_ORIGINS",
        "https://resumeforge.hemanthpuppala.com,http://localhost:18383,http://localhost:13952"
    ).split(",")
]

VALENTINE_PASSWORD = {"month": "7", "day": "11", "year": "2002"}
