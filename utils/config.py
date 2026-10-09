import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")


@dataclass(frozen=True)
class Settings:
    db_path: Path
    upload_dir: Path
    ai_mode: str
    ai_backend: str
    model_id: str
    ollama_url: str
    hf_url: str
    hf_token: str = field(repr=False)
    embedding_mode: str = "sentence_transformers"
    embedding_model: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    allow_model_download: bool = False
    timeout: float = 90.0


def settings() -> Settings:
    backend = os.getenv("RELIEFMESH_AI_BACKEND", "ollama")
    return Settings(
        db_path=Path(os.getenv("RELIEFMESH_DB_PATH", str(ROOT / "database/reliefmesh.db"))).resolve(),
        upload_dir=Path(os.getenv("RELIEFMESH_UPLOAD_DIR", str(ROOT / "uploads"))).resolve(),
        ai_mode=os.getenv("RELIEFMESH_AI_MODE", "live"),
        ai_backend=backend,
        model_id=os.getenv("RELIEFMESH_MODEL_ID", "gemma4:e2b" if backend == "ollama" else "google/gemma-4-31B-it"),
        ollama_url=os.getenv("RELIEFMESH_OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/"),
        hf_url=os.getenv("RELIEFMESH_HF_URL", "https://router.huggingface.co/v1").rstrip("/"),
        hf_token=os.getenv("HF_TOKEN", ""),
        embedding_mode=os.getenv("RELIEFMESH_EMBEDDING_MODE", "sentence_transformers"),
        embedding_model=os.getenv("RELIEFMESH_EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"),
        allow_model_download=os.getenv("RELIEFMESH_ALLOW_MODEL_DOWNLOAD", "false").lower() == "true",
        timeout=float(os.getenv("RELIEFMESH_AI_TIMEOUT", "90")),
    )
