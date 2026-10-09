"""Explicit live inference check: never run as part of the ordinary test suite."""
import argparse
import json
from pathlib import Path
from uuid import uuid4

from services.gemma_service import analyze_report
from utils.schemas import AppError, ReportDraft


def main() -> int:
    parser = argparse.ArgumentParser(description="Perform one live text/image inference request.")
    parser.add_argument("--image", type=Path, required=True)
    parser.add_argument("--text", required=True)
    parser.add_argument("--location", required=True)
    args = parser.parse_args()
    mime = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}.get(args.image.suffix.lower(), "")
    try:
        draft = ReportDraft(client_report_id=str(uuid4()), original_text=args.text, location=args.location,
                            image_bytes=args.image.read_bytes(), image_name=args.image.name, image_mime=mime)
        result = analyze_report(draft)
    except AppError as exc:
        print(json.dumps({"error": {"code": exc.code, "message": exc.message, "details": exc.details}}))
        return 1
    print(result.model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
