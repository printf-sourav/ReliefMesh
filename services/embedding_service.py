import hashlib
import json
import math
from functools import lru_cache

from database.db import connection
from utils.config import settings
from utils.schemas import IncidentRecord, MatchingUnavailableError


@lru_cache(maxsize=2)
def encoder(model_id: str, allow_download: bool):
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer(model_id, device="cpu", local_files_only=not allow_download)
    except Exception as exc:
        raise MatchingUnavailableError("Semantic model is unavailable. Install requirements-models.txt and prewarm the configured embedding model.") from exc


def require_matching() -> None:
    config = settings()
    if config.embedding_mode != "sentence_transformers":
        raise MatchingUnavailableError("Semantic matching is disabled; duplicate count is unavailable.")
    encoder(config.embedding_model, config.allow_model_download)


def embedding_text(source: IncidentRecord) -> str:
    if not source.analysis:
        return source.original_text + "\n" + source.location
    analysis = source.analysis
    return "\n".join([analysis.incident_type, analysis.summary, source.location, ", ".join(analysis.reported_needs)])


def get_embedding(source: IncidentRecord) -> list[float]:
    config = settings()
    text = embedding_text(source)
    fingerprint = hashlib.sha256(text.encode("utf-8")).hexdigest()
    with connection() as conn:
        cached = conn.execute("SELECT * FROM embeddings WHERE report_id=? AND model_id=? AND fingerprint=?",
                              (source.id, config.embedding_model, fingerprint)).fetchone()
    if cached:
        return json.loads(cached["vector_json"])
    try:
        raw = encoder(config.embedding_model, config.allow_model_download).encode(text, normalize_embeddings=True)
        vector = [float(value) for value in raw]
        norm = math.sqrt(sum(value * value for value in vector))
        if not vector or not all(math.isfinite(value) for value in vector) or norm == 0:
            raise ValueError("Invalid embedding vector")
        vector = [value / norm for value in vector]
    except MatchingUnavailableError:
        raise
    except Exception as exc:
        raise MatchingUnavailableError("The semantic model could not encode this report.") from exc
    with connection(write=True) as conn:
        conn.execute("INSERT OR REPLACE INTO embeddings VALUES (?, ?, ?, ?)",
                     (source.id, config.embedding_model, fingerprint, json.dumps(vector)))
    return vector


def cosine(first: list[float], second: list[float]) -> float:
    if len(first) != len(second):
        raise MatchingUnavailableError("Embedding dimensions differ; clear cached vectors and reload the configured model.")
    return max(-1.0, min(1.0, sum(left * right for left, right in zip(first, second))))


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Prewarm the configured multilingual embedding model.")
    parser.add_argument("--download", action="store_true", help="Explicitly allow downloading model weights.")
    args = parser.parse_args()
    model = encoder(settings().embedding_model, args.download)
    vector = model.encode("Model preparation test", normalize_embeddings=True)
    print(f"Embedding model ready: {settings().embedding_model}; dimensions={len(vector)}")
