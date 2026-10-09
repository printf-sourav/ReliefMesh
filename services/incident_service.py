import hashlib
import json
import math
import re
from datetime import datetime, timezone
from uuid import uuid4

from pydantic import ValidationError as ModelValidationError

from database.db import connection
from utils.config import settings
from utils.schemas import (
    AnalysisResult, ClusterSummary, ConflictError, DashboardMetrics, DuplicateCandidate,
    IncidentAnalysis, IncidentRecord, MatchingUnavailableError, NotFoundError, ReportDraft, ValidationError,
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


def get_cluster_reports(cluster_id: str) -> list[IncidentRecord]:
    with connection() as conn:
        rows = conn.execute("SELECT * FROM reports WHERE cluster_id=? ORDER BY created_at, id", (cluster_id,)).fetchall()
        if not rows:
            raise NotFoundError("Incident cluster was not found.")
        return [_from_row(row) for row in rows]


def list_clusters(*, synced_only: bool = True) -> list[ClusterSummary]:
    groups: dict[str, list[IncidentRecord]] = {}
    for source in list_reports(synced_only=synced_only):
        groups.setdefault(source.cluster_id, []).append(source)
    return [ClusterSummary(
        cluster_id=cluster_id, title=sources[0].location,
        report_count=len(sources), photo_count=sum(bool(source.image_path) for source in sources),
        reported_needs=sorted({need for source in sources if source.analysis for need in source.analysis.reported_needs}),
        languages=sorted({source.analysis.language for source in sources if source.analysis}),
        people_counts_by_report={source.id: source.analysis.people_affected if source.analysis else None for source in sources},
        first_report_at=min(source.created_at for source in sources),
        latest_report_at=max(source.updated_at for source in sources),
        verification_status="verified" if all(source.verification_status == "verified" for source in sources) else "pending",
    ) for cluster_id, sources in groups.items()]


def update_report_analysis(report_id: str, analysis: IncidentAnalysis) -> IncidentRecord:
    try:
        analysis = IncidentAnalysis.model_validate(analysis.model_dump())
    except ModelValidationError as exc:
        raise ValidationError("Corrected analysis fields are invalid.") from exc
    with connection(write=True) as conn:
        record = _get(conn, report_id)
        if record.analysis_mode == "deferred":
            raise ConflictError("Analyze the saved report before correcting its AI analysis.", code="ANALYSIS_PENDING")
        changed = record.model_copy(update={"analysis": analysis, "updated_at": now(), "verification_status": "pending"})
        _save(conn, changed)
        conn.execute("DELETE FROM embeddings WHERE report_id=?", (report_id,))
        return changed


def verify_report(report_id: str) -> IncidentRecord:
    with connection(write=True) as conn:
        record = _get(conn, report_id)
        if record.analysis is None or record.analysis_mode == "deferred":
            raise ConflictError("This report still needs analysis before verification.", code="ANALYSIS_PENDING")
        if record.verification_status == "verified":
            return record
        changed = record.model_copy(update={"verification_status": "verified", "updated_at": now()})
        _save(conn, changed)
        return changed


def analyze_saved_report(report_id: str) -> IncidentRecord:
    from services.gemma_service import analyze_report

    source = get_report(report_id)
    if source.analysis_mode != "deferred":
        return source  # no repeated paid inference on an already-analyzed source
    root = settings().upload_dir
    path = (root / source.image_path).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise NotFoundError("Saved report image was not found.")
    mime = {".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}[path.suffix]
    try:
        image_data = path.read_bytes()
    except OSError as exc:
        from utils.schemas import StorageError
        raise StorageError("Saved report image could not be read.") from exc
    draft = ReportDraft(client_report_id=source.client_report_id, original_text=source.original_text,
                        location=source.location, latitude=source.latitude, longitude=source.longitude,
                        image_bytes=image_data, image_name=path.name, image_mime=mime)
    result = analyze_report(draft)
    with connection(write=True) as conn:
        current = _get(conn, report_id)
        if current.analysis_mode != "deferred":
            return current
        changed = current.model_copy(update={"analysis": result.analysis, "original_analysis": result.analysis,
                                             "analysis_mode": result.analysis_mode, "model_id": result.model_id,
                                             "verification_status": "pending", "updated_at": now()})
        _save(conn, changed)
        conn.execute("DELETE FROM embeddings WHERE report_id=?", (report_id,))
        return changed


def link_report(report_id: str, target_cluster_id: str) -> IncidentRecord:
    with connection(write=True) as conn:
        source = _get(conn, report_id)
        rows = conn.execute("SELECT * FROM reports WHERE cluster_id=?", (target_cluster_id,)).fetchall()
        if not rows:
            raise NotFoundError("Target cluster was not found.")
        if source.cluster_id == target_cluster_id:
            return source
        timestamp = now()
        for row in rows:
            target = _from_row(row)
            _save(conn, target.model_copy(update={"verification_status": "pending", "updated_at": timestamp}))
        changed = source.model_copy(update={"cluster_id": target_cluster_id, "verification_status": "pending", "updated_at": timestamp})
        _save(conn, changed)
        return changed


def _compatible_location(first: IncidentRecord, second: IncidentRecord) -> bool:
    if all(value is not None for value in [first.latitude, first.longitude, second.latitude, second.longitude]):
        lat1, lat2 = math.radians(first.latitude), math.radians(second.latitude)
        dlat = lat2 - lat1
        dlon = math.radians(second.longitude - first.longitude)
        distance = 6371 * 2 * math.asin(min(1, math.sqrt(math.sin(dlat / 2) ** 2 +
                                       math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2)))
        if distance > 1:
            return False
    ignored = {"near", "beside", "at", "the", "junction", "road", "street", "ke", "paas"}
    first_words = set(re.findall(r"\w+", first.location.casefold())) - ignored
    second_words = set(re.findall(r"\w+", second.location.casefold())) - ignored
    return bool(first_words and second_words and (first_words <= second_words or second_words <= first_words))


def keep_report_separate(report_id: str) -> IncidentRecord:
    try:
        suggested_ids = {candidate.incident_id for candidate in find_possible_duplicates(report_id)}
    except MatchingUnavailableError:
        suggested_ids = set()
    with connection(write=True) as conn:
        source = _get(conn, report_id)
        all_sources = [_from_row(row) for row in conn.execute("SELECT * FROM reports").fetchall()]
        siblings = [item for item in all_sources if item.cluster_id == source.cluster_id and item.id != source.id]
        for other in all_sources:
            if other.id != source.id and (other.cluster_id == source.cluster_id or other.id in suggested_ids):
                conn.executemany("INSERT OR IGNORE INTO dismissals VALUES (?, ?)", [(source.id, other.id), (other.id, source.id)])
        if not siblings:
            return source
        changed = source.model_copy(update={"cluster_id": str(uuid4()), "verification_status": "pending", "updated_at": now()})
        _save(conn, changed)
        return changed


def find_possible_duplicates(report_id: str, *, threshold: float = 0.80) -> list[DuplicateCandidate]:
    return duplicate_candidates(report_id, threshold=threshold, synced_only=False)


def duplicate_candidates(report_id: str, *, threshold: float = 0.80,
                         synced_only: bool = False) -> list[DuplicateCandidate]:
    from services import embedding_service

    source = get_report(report_id)
    if not math.isfinite(threshold) or not 0 <= threshold <= 1:
        raise ValidationError("Similarity threshold must be between 0 and 1.")
    embedding_service.require_matching()
    with connection() as conn:
        dismissed = {row[0] for row in conn.execute("SELECT other_report_id FROM dismissals WHERE report_id=?", (report_id,))}
    candidates = [candidate for candidate in list_reports(synced_only=synced_only)
                  if candidate.id != source.id and candidate.cluster_id != source.cluster_id
                  and candidate.id not in dismissed and _compatible_location(source, candidate)]
    if not candidates:
        return []
    vector = embedding_service.get_embedding(source)
    matches = []
    for candidate in candidates:
        score = embedding_service.cosine(vector, embedding_service.get_embedding(candidate))
        if score >= threshold:
            matches.append(DuplicateCandidate(incident_id=candidate.id, cluster_id=candidate.cluster_id,
                           similarity=score, summary=candidate.analysis.summary if candidate.analysis else candidate.original_text,
                           location=candidate.location))
    return sorted(matches, key=lambda match: (-match.similarity, match.incident_id))


def dashboard_snapshot() -> tuple[DashboardMetrics, bool, list[str]]:
    synced = list_reports(synced_only=True)
    pending = list_reports()
    duplicate_count = 0
    available, warnings = True, []
    try:
        from services.embedding_service import require_matching
        require_matching()
        duplicate_count = sum(bool(duplicate_candidates(source.id, synced_only=True)) for source in synced)
    except MatchingUnavailableError as exc:
        available, warnings = False, [exc.message]
    metrics = DashboardMetrics(active_clusters=len({source.cluster_id for source in synced}),
                               possible_duplicate_reports=duplicate_count,
                               pending_verification_reports=sum(source.verification_status == "pending" for source in synced),
                               pending_sync_reports=sum(source.sync_status == "pending" for source in pending))
    return metrics, available, warnings


def get_dashboard_metrics() -> DashboardMetrics:
    return dashboard_snapshot()[0]
