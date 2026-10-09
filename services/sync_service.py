from database.db import connection
from services.incident_service import _from_row, _save, now
from utils.schemas import IncidentRecord, SyncResult


def get_pending_reports() -> list[IncidentRecord]:
    with connection() as conn:
        return [_from_row(row) for row in conn.execute(
            "SELECT * FROM reports WHERE sync_status='pending' ORDER BY created_at, id").fetchall()]


def sync_pending_reports(*, network_online: bool) -> SyncResult:
    with connection(write=True) as conn:
        pending = [_from_row(row) for row in conn.execute(
            "SELECT * FROM reports WHERE sync_status='pending' ORDER BY created_at, id").fetchall()]
        if not network_online:
            return SyncResult(synced_report_ids=[], pending_count=len(pending))
        timestamp = now()
        for source in pending:
            _save(conn, source.model_copy(update={"sync_status": "synced", "updated_at": timestamp}), archive_previous=False)
        return SyncResult(synced_report_ids=[source.id for source in pending], pending_count=0)
