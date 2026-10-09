from io import BytesIO
from uuid import uuid4

import pytest
from PIL import Image


@pytest.fixture(autouse=True)
def isolated_storage(tmp_path, monkeypatch):
    monkeypatch.setenv("RELIEFMESH_DB_PATH", str(tmp_path / "reports.db"))
    monkeypatch.setenv("RELIEFMESH_UPLOAD_DIR", str(tmp_path / "uploads"))
    monkeypatch.setenv("RELIEFMESH_AI_MODE", "fixture")
    monkeypatch.setenv("RELIEFMESH_EMBEDDING_MODE", "disabled")


@pytest.fixture
def image_bytes():
    stream = BytesIO()
    Image.new("RGB", (24, 24), color="blue").save(stream, format="PNG")
    return stream.getvalue()


@pytest.fixture
def draft(image_bytes):
    from utils.schemas import ReportDraft

    return ReportDraft(client_report_id=str(uuid4()),
                       original_text="Flooding at our house; four people need water.",
                       location="Riverside Colony", image_bytes=image_bytes,
                       image_name="../../unsafe.png", image_mime="image/png")


@pytest.fixture
def analysis():
    from utils.schemas import AnalysisResult, IncidentAnalysis

    return AnalysisResult(analysis=IncidentAnalysis(
        incident_type="Residential Flooding", summary="Water has entered a residence.",
        people_affected=4, vulnerable_people=[], reported_needs=["drinking water"],
        location_context="Riverside Colony", language="English", image_observations=[],
        confidence=None, verification_required=True), analysis_mode="fixture",
        model_id="reliefmesh-fixture-v1", warnings=["Fixture output; no model inference."])
