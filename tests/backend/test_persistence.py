from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest


def test_report_and_image_survive_reinitialization(draft, analysis):
    from database.db import init_db
    from services.incident_service import create_report, get_report, list_reports
    from utils.config import settings

    init_db()
    saved = create_report(draft, analysis, network_online=False)
    assert saved.sync_status == "pending"
    assert saved.verification_status == "pending"
    assert (settings().upload_dir / saved.image_path).read_bytes() == draft.image_bytes
    assert Path(saved.image_path).name == saved.image_path
    init_db()
    assert get_report(saved.id) == saved
    assert len(list_reports()) == 1
    assert list_reports(synced_only=True) == []


def test_retry_reuses_report_but_changed_payload_conflicts(draft, analysis):
    from services.incident_service import create_report, list_reports
    from utils.schemas import ConflictError

    first = create_report(draft, analysis, network_online=False)
    assert create_report(draft, analysis, network_online=True) == first
    assert len(list_reports()) == 1
    changed = draft.model_copy(update={"original_text": "Different emergency"})
    with pytest.raises(ConflictError) as error:
        create_report(changed, analysis, network_online=True)
    assert error.value.code == "IDEMPOTENCY_CONFLICT"


def test_concurrent_retries_do_not_duplicate_rows_or_images(draft, analysis):
    from services.incident_service import create_report, list_reports
    from utils.config import settings

    with ThreadPoolExecutor(max_workers=4) as pool:
        records = list(pool.map(lambda _: create_report(draft, analysis, network_online=False), range(4)))
    assert len({record.id for record in records}) == 1
    assert len(list_reports()) == 1
    assert len(list(settings().upload_dir.iterdir())) == 1


def test_initial_correction_retains_original_analysis(draft, analysis):
    from services.incident_service import create_report

    edited = analysis.analysis.model_copy(update={"people_affected": 5})
    saved = create_report(draft, analysis, network_online=True, edited_analysis=edited)
    assert saved.analysis.people_affected == 5
    assert saved.original_analysis.people_affected == 4
    assert saved.analysis_mode == "fixture"
    assert saved.verification_status == "pending"


def test_raw_reconnected_phone_report_stays_deferred(draft):
    from services.incident_service import create_report

    saved = create_report(draft, None, network_online=True)
    assert saved.analysis is None
    assert saved.original_analysis is None
    assert saved.analysis_mode == "deferred"
    assert saved.sync_status == "synced"


def test_invalid_people_coordinates_and_image_are_rejected(draft, analysis):
    from pydantic import ValidationError as ModelValidationError
    from utils.schemas import IncidentAnalysis, ReportDraft, ValidationError

    with pytest.raises(ModelValidationError):
        ReportDraft.model_validate(draft.model_dump() | {"latitude": 100})
    with pytest.raises(ModelValidationError):
        IncidentAnalysis.model_validate(analysis.analysis.model_dump() | {"people_affected": -1})
    with pytest.raises(ValidationError):
        ReportDraft.model_validate(draft.model_dump() | {"image_bytes": b"not an image"})


def test_failed_image_write_rolls_back_report(draft, analysis, monkeypatch):
    from services.incident_service import create_report, list_reports
    from utils.schemas import StorageError

    original_open = Path.open

    def fail_image(path, mode="r", *args, **kwargs):
        if mode == "xb":
            raise OSError("disk is full")
        return original_open(path, mode, *args, **kwargs)

    monkeypatch.setattr(Path, "open", fail_image)
    with pytest.raises(StorageError):
        create_report(draft, analysis, network_online=True)
    assert list_reports() == []
