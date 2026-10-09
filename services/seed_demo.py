"""Seed labelled illustrative reports into explicitly selected local demo storage."""
import argparse
import json
import os
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from utils.config import ROOT
from utils.schemas import AnalysisResult, IncidentAnalysis, ReportDraft


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, required=True)
    parser.add_argument("--uploads", type=Path, required=True)
    parser.add_argument("--image", type=Path, required=True, help="Licensed or synthetic demo image; retain attribution.")
    args = parser.parse_args()
    os.environ["RELIEFMESH_DB_PATH"] = str(args.db.resolve())
    os.environ["RELIEFMESH_UPLOAD_DIR"] = str(args.uploads.resolve())
    from services.incident_service import create_report

    mime = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}.get(args.image.suffix.lower(), "")
    image = args.image.read_bytes()
    fixture_reports = json.loads((ROOT / "sample_data/demo_reports.json").read_text(encoding="utf-8"))
    for fixture in fixture_reports:
        draft = ReportDraft(client_report_id=str(uuid5(NAMESPACE_URL, "reliefmesh/demo/" + fixture["case"])),
                            original_text=fixture["original_text"], location=fixture["location"],
                            image_bytes=image, image_name=args.image.name, image_mime=mime)
        result = AnalysisResult(analysis=IncidentAnalysis.model_validate(fixture["analysis"]), analysis_mode="fixture",
                                model_id="reliefmesh-fixture-v1", warnings=["Illustrative seed; no AI inference performed."])
        source = create_report(draft, result, network_online=fixture["case"] != "C")
        print(f"Fixture {fixture['case']}: {source.id}; {source.sync_status}; AI mode={source.analysis_mode}")


if __name__ == "__main__":
    main()
