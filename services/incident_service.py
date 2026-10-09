import hashlib
import json
from datetime import datetime, timezone
from uuid import uuid4

from pydantic import ValidationError as ModelValidationError

from database.db import connection
from utils.config import settings
from utils.schemas import (
    AnalysisResult, ConflictError, IncidentAnalysis, IncidentRecord,
    NotFoundError, ReportDraft, ValidationError,
)


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _from_row(row) -> IncidentRecord:
    return IncidentRecord.model_validate_json(row["record_json"])


def _get(conn, report_id: str) -> IncidentRecord:
    row = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
    if row is None:
        raise NotFoundError("Report was not found.")
    return _from_row(row)


def _save(conn, record: IncidentRecord, *, archive_previous: bool = True) -> None:
    if archive_previous:
        previous = _get(conn, record.id)
        conn.execute("INSERT INTO revisions(report_id, changed_at, previous_record_json) VALUES(?, ?, ?)",
                     (record.id, record.updated_at, previous.model_dump_json()))
    conn.execute("""UPDATE reports SET cluster_id=?, sync_status=?, verification_status=?, record_json=?
                    WHERE id=?""", (record.cluster_id, record.sync_status, record.verification_status,
                                    record.model_dump_json(), record.id))


def create_report(draft: ReportDraft, result: AnalysisResult | None, *, network_online: bool,
                  edited_analysis: IncidentAnalysis | None = None) -> IncidentRecord:
    return create_report_with_status(draft, result, network_online=network_online,
                                     edited_analysis=edited_analysis)[0]


def create_report_with_status(draft: ReportDraft, result: AnalysisResult | None, *, network_online: bool,
                              edited_analysis: IncidentAnalysis | None = None) -> tuple[IncidentRecord, bool]:
    try:
        draft = ReportDraft.model_validate(draft.model_dump())
        if result:
            result = AnalysisResult.model_validate(result.model_dump())
        if edited_analysis:
            edited_analysis = IncidentAnalysis.model_validate(edited_analysis.model_dump())
    except ModelValidationError as exc:
        raise ValidationError("Report fields are invalid.") from exc
    if edited_analysis and result is None:
        raise ValidationError("A citizen correction requires an original analysis result.")
    identity = {
        "client_report_id": draft.client_report_id, "original_text": draft.original_text,
        "location": draft.location, "latitude": draft.latitude, "longitude": draft.longitude,
        "image_sha256": hashlib.sha256(draft.image_bytes).hexdigest(),
        "result": result.model_dump() if result else None,
        "edited_analysis": edited_analysis.model_dump() if edited_analysis else None,
    }
    request_hash = hashlib.sha256(json.dumps(identity, sort_keys=True).encode()).hexdigest()
    new_file = None
    try:
        with connection(write=True) as conn:
            existing = conn.execute("SELECT * FROM reports WHERE client_report_id=?", (draft.client_report_id,)).fetchone()
            if existing:
                if existing["request_hash"] != request_hash:
                    raise ConflictError("This report UUID was already used for a different source.",
                                        code="IDEMPOTENCY_CONFLICT")
                return _from_row(existing), False
            report_id = str(uuid4())
            extension = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}[draft.image_mime]
            timestamp = now()
            record = IncidentRecord(
                id=report_id, client_report_id=draft.client_report_id, cluster_id=str(uuid4()),
                original_text=draft.original_text, location=draft.location,
                latitude=draft.latitude, longitude=draft.longitude,
                image_path=report_id + extension, created_at=timestamp, updated_at=timestamp,
                analysis=edited_analysis or (result.analysis if result else None),
                original_analysis=result.analysis if result else None,
                analysis_mode=result.analysis_mode if result else "deferred",
                model_id=result.model_id if result else None,
                verification_status="pending",
                network_status_at_submission="online" if network_online else "offline",
                sync_status="synced" if network_online else "pending",
            )
            conn.execute("INSERT INTO reports VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                         (record.id, record.client_report_id, request_hash, record.cluster_id,
                          record.sync_status, record.verification_status, record.created_at,
                          record.model_dump_json(), draft.image_mime))
            new_file = settings().upload_dir / record.image_path
            with new_file.open("xb") as stream:
                stream.write(draft.image_bytes)
        return record, True
    except Exception:
        if new_file:
            new_file.unlink(missing_ok=True)
        raise


def list_reports(*, synced_only: bool = False) -> list[IncidentRecord]:
    with connection() as conn:
        where = "WHERE sync_status='synced'" if synced_only else ""
        return [_from_row(row) for row in conn.execute(
            f"SELECT * FROM reports {where} ORDER BY created_at, id").fetchall()]


def get_report(report_id: str) -> IncidentRecord:
    with connection() as conn:
        return _get(conn, report_id)
