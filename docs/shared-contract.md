# Shared contract for both developers

Freeze this interface before parallel implementation. Developer 1 owns validated Python models, services, and the FastAPI routes. Developer 2 consumes the HTTP API from a React/TypeScript frontend shared by web and Capacitor Android. The Python signatures below are internal backend interfaces; the frontend never imports Python. Do not change the HTTP contract independently. This revision supersedes the earlier Streamlit/direct-import plan.

## Ownership

| Developer 1: backend and AI | Developer 2: UI and integration |
| --- | --- |
| `api/**`, `services/**`, `database/**`, `utils/**` | `frontend/**`, including Capacitor config and `frontend/android/**` |
| `requirements.txt`, `requirements-backend.txt`, `.env.example`, `.gitignore` | `frontend/package.json`, lockfile, `.env.example`, `README.md` |
| `tests/backend/**`, `sample_data/demo_reports.json` | Frontend tests, `sample_data/images/**`, `docs/demo.md`, `docs/android-build.md` |
| `docs/backend-handoff.md` | `docs/frontend-handoff.md` |

The current planning files are the shared baseline. Each developer updates only their task entries in `tasks/todo.md`; Developer 2 resolves those changes during integration. Developer 1 records model/backend documentation in its handoff; Developer 2 incorporates it into README. Add Python package markers only in directories you own. Do not share a runtime database between development checkouts.

## Types in `utils/schemas.py`

Use Pydantic models. Services accept/return these models; API responses serialize them to JSON using the same snake_case fields. Developer 2 mirrors those JSON types in `frontend/src/lib/api-types.ts`. Dates are timezone-aware UTC ISO 8601 strings; the UI displays local time with a timezone label. IDs are UUID strings; readable short labels may be derived for display. `ReportDraft.image_bytes` is internal only, never a JSON field.

```python
class ReportDraft:
    client_report_id: str  # UUID generated once by UI, reused on retry
    original_text: str
    location: str
    image_bytes: bytes
    image_name: str
    image_mime: str
    latitude: float | None = None
    longitude: float | None = None

class IncidentAnalysis:
    incident_type: str
    summary: str
    people_affected: int | None
    vulnerable_people: list[str]
    reported_needs: list[str]
    location_context: str
    language: str
    image_observations: list[str]
    confidence: float | None  # [0, 1]; unknown is None, not invented certainty
    verification_required: bool  # always True until human verification

class AnalysisResult:
    analysis: IncidentAnalysis
    analysis_mode: str  # "live" or "fixture"
    model_id: str
    warnings: list[str]

class IncidentRecord:
    id: str
    client_report_id: str
    cluster_id: str
    original_text: str
    location: str
    latitude: float | None
    longitude: float | None
    image_path: str  # application-managed relative path
    created_at: str
    updated_at: str
    analysis: IncidentAnalysis | None
    original_analysis: IncidentAnalysis | None  # retain pre-correction output
    analysis_mode: str  # "live", "fixture", or "deferred"
    model_id: str | None
    verification_status: str  # "pending" or "verified"
    network_status_at_submission: str  # "online" or "offline"
    sync_status: str  # "pending" or "synced"

class DuplicateCandidate:
    incident_id: str
    cluster_id: str
    similarity: float  # cosine score [-1, 1], not probability of truth
    summary: str
    location: str

class ClusterSummary:
    cluster_id: str
    title: str
    report_count: int
    photo_count: int
    reported_needs: list[str]
    languages: list[str]
    people_counts_by_report: dict[str, int | None]  # no automatic sum
    first_report_at: str
    latest_report_at: str
    verification_status: str  # pending if any source report is pending

class DashboardMetrics:
    active_clusters: int
    possible_duplicate_reports: int  # reports with >=1 suggestion; count once
    pending_verification_reports: int
    pending_sync_reports: int

class SyncResult:
    synced_report_ids: list[str]
    pending_count: int
```

The snippets define shapes, not executable implementation. Validate text/location nonempty, allowed images JPEG/PNG/WebP, decodability and a 10 MB size limit, coordinate bounds, nonnegative reported people, and analysis fields. Unknown information stays null/empty. Do not execute model-generated code. Use `image_observations` consistently, never the singular variant from illustrative examples.

The brief's `confidence: 0.0` example is extended to allow null when confidence is unavailable. Any provided score is model-reported and must be labelled accordingly. Human verification is represented by `verification_status`; keep `verification_required=True` in the original AI analysis.

## Internal Python service interface

```python
# database/db.py
init_db() -> None

# services/gemma_service.py
analyze_report(draft: ReportDraft) -> AnalysisResult

# services/incident_service.py
create_report(draft: ReportDraft, result: AnalysisResult | None,
              *, network_online: bool,
              edited_analysis: IncidentAnalysis | None = None) -> IncidentRecord
list_reports(*, synced_only: bool = False) -> list[IncidentRecord]
get_report(report_id: str) -> IncidentRecord
find_possible_duplicates(report_id: str,
                         *, threshold: float = 0.80) -> list[DuplicateCandidate]
list_clusters(*, synced_only: bool = True) -> list[ClusterSummary]
get_cluster_reports(cluster_id: str) -> list[IncidentRecord]
get_dashboard_metrics() -> DashboardMetrics
update_report_analysis(report_id: str, analysis: IncidentAnalysis) -> IncidentRecord
analyze_saved_report(report_id: str) -> IncidentRecord
verify_report(report_id: str) -> IncidentRecord
link_report(report_id: str, target_cluster_id: str) -> IncidentRecord
keep_report_separate(report_id: str) -> IncidentRecord

# services/sync_service.py
get_pending_reports() -> list[IncidentRecord]
sync_pending_reports(*, network_online: bool) -> SyncResult
```

Define `ValidationError`, `AnalysisUnavailableError`, `StorageError`, and `NotFoundError` in `utils/schemas.py`; routes map these to the error envelope below, which the frontend renders. Do not swallow errors or return fabricated live results.

## HTTP API (Developer 1 implements; Developer 2 consumes)

Base: `/api/v1`, backend port 8000. OpenAPI at `/openapi.json`; interactive docs at `/docs`. Pydantic response models are authoritative. Lists use `{ "items": [...], "total": 0, "offset": 0, "limit": 50 }`; support `offset >= 0` and `limit` 1-100, and deterministic ordering. Backend service lists may remain internal lists; route handlers paginate them for this small prototype.

| Method and route | Input | Response |
| --- | --- | --- |
| `GET /health` | None | `{ "status": "ok", "ai_mode": "live", "model_id": "configured-id-or-null" }`; health means API availability, not proof of successful inference |
| `POST /analyses` | Multipart `image` file and `metadata` JSON string with draft fields | `AnalysisResult` |
| `POST /reports` | Multipart `image` and `metadata` as specified below | `IncidentRecord`; 201 new, 200 replay |
| `GET /reports` | `synced_only=false`, offset, limit | Paginated `IncidentRecord` |
| `GET /reports/{id}` | None | `IncidentRecord` |
| `GET /reports/{id}/image` | None | Validated stored image bytes and media type; no raw path input |
| `GET /reports/{id}/duplicates` | `threshold=0.80`, `synced_only=false`, offset, limit | Paginated `DuplicateCandidate` plus `matching_available: bool` and `warnings: string[]` |
| `PATCH /reports/{id}/analysis` | JSON `{ "analysis": IncidentAnalysis }` | Corrected `IncidentRecord`; original output retained |
| `POST /reports/{id}/analyses` | No body | Analyze a saved deferred source using stored text/image; return updated `IncidentRecord` with genuine provenance |
| `POST /reports/{id}/verifications` | No body | Verified `IncidentRecord`; repeated verification safe; reject unanalyzed deferred sources with 409 |
| `PUT /reports/{id}/cluster-membership` | JSON `{ "target_cluster_id": "uuid" }` | `IncidentRecord`; repeated same membership safe |
| `DELETE /reports/{id}/cluster-membership` | No body | Isolated `IncidentRecord`; already-isolated report remains unchanged; dismiss current suggestions |
| `GET /clusters` | `synced_only=true`, offset, limit | Paginated `ClusterSummary` |
| `GET /clusters/{id}/reports` | `synced_only=true`, offset, limit | Paginated `IncidentRecord` |
| `GET /dashboard/metrics` | None | `DashboardMetrics` |
| `GET /queue` | offset, limit | Paginated backend-pending `IncidentRecord` |
| `POST /sync` | JSON `{ "network_online": true }` | `SyncResult`; simulation only |

All routes above are relative to `/api/v1`, including `/health`. `model_id` in health is a string or JSON null. `/analyses` metadata contains `client_report_id`, `original_text`, `location`, optional `latitude`/`longitude`; the uploaded file supplies image name/MIME. `/reports` uses those fields plus `analysis_result: AnalysisResult | null`, `edited_analysis: IncidentAnalysis | null`, `network_online: bool`. The `metadata` field is JSON encoded **inside multipart FormData**; do not declare a competing JSON request body. Do not manually set multipart Content-Type in the frontend; let the client create its boundary.

`POST /reports` atomically saves original analysis and optional citizen edits. Edited analysis changes current fields only; it cannot change original output, AI mode/model, or verification. Missing analysis is allowed for a raw deferred report even when uploaded after reconnecting; it remains pending human analysis/review and can be synced. `POST /reports/{id}/analyses` is the explicit deferred-analysis path and must not run automatically as part of transport sync. Stored originals and provenance are server controlled after initial creation.

Stable `client_report_id` is the report idempotency key. Repeating a committed UUID with the same canonical source/image/original analysis/initial edits returns the existing record. Different source payload with the same UUID returns 409 `IDEMPOTENCY_CONFLICT`; a concurrent in-progress duplicate returns 409 `REQUEST_IN_PROGRESS` for later retry. Hash image content, not filenames/boundaries. Exclude `network_online` from the identity hash so a reconnect retry cannot duplicate a report. An offline-created replay keeps its current sync status; use `/sync` to deliver it. No automatic retries for other mutations unless their repeat behavior is specified above.

Every error uses `{ "error": { "code": "VALIDATION_ERROR", "message": "Readable message", "details": {} } }`, including framework validation errors. Statuses: 422 invalid metadata/model fields, 413 oversize image, 415 unsupported image type, 404 missing record, 409 conflict, 503 unavailable AI/matching, 500 storage/unexpected errors without leaked internals. Unavailable matching can return an empty duplicate envelope with `matching_available=false` and warnings; do not silently report zero matches as successful semantic detection.

The frontend accesses images through `/reports/{id}/image`, never laptop filesystem paths. Configure explicit development CORS origins for browser and the actual Capacitor WebView origin, using `RELIEFMESH_ALLOWED_ORIGINS`; avoid wildcard credentials. Vite may proxy `/api` to localhost:8000 in browser development. APK uses a reachable absolute API origin via `VITE_API_BASE_URL` or a validated device settings override. Never expose AI provider credentials through `VITE_*` variables. The responder prototype has no production authentication; use a trusted demo network and document that boundary.

## Device offline queue (Developer 2 owns)

Use IndexedDB (`idb`) for text, location, coordinates, stable UUID, image blob/name/MIME, original analysis result if already available, citizen edits, creation time, retry state, and a known server ID after acknowledgment. Do not use localStorage for image data or claim a saved report before the IndexedDB transaction commits. Handle storage quota failure visibly.

Two distinct states must remain clear: simulated transport offline while API reachable -> POST with `network_online=false` persists to backend SQLite; actual API unreachable -> save a device-only queue item. On restored API reachability, upload device-only items with their original UUID using `/reports`, then synchronize backend-pending records through `/sync`. Deferred uploads may be marked delivered while analysis remains deferred. Remove local pending copies only after a positive server acknowledgment; preserve queued items after failure/unknown response. Display device queue and hub queue separately or deduplicate by UUID if showing a combined count. Recovery must survive app/browser restart; automatic sync is best effort only while the app runs. No background-delivery guarantee.

Neither airplane mode nor `navigator.onLine` alone proves the configured API is reachable. Use an actual health/request outcome and explicit simulated transport state. An APK in airplane mode cannot call a model running on the laptop; raw reports must say "Saved on this device; analysis pending."

Configuration comes from environment variables: `RELIEFMESH_DB_PATH`, `RELIEFMESH_UPLOAD_DIR`, `RELIEFMESH_AI_MODE` (`live` or explicit `fixture`), and `RELIEFMESH_MODEL_ID`. Default DB: `database/reliefmesh.db`; uploads: `uploads/`. Developer 1 documents any runtime-specific settings in `.env.example` and its handoff. Default AI mode is live; fixture mode is opt-in and prominently labelled.

## Persistence and behavioral rules

- `init_db()` is safe to repeat. A database unique constraint on `client_report_id` plus request identity checks implements repeat-safe creation. Use transactions and sanitized/generated filenames; clean up newly written files on failure.
- New reports start in their own cluster and pending verification. Online submissions are synced in the **simulated hub**; offline submissions are pending. Raw submissions with `result=None` have `analysis_mode="deferred"`, including device uploads after reconnecting.
- Do not allow fixture, deferred, or live provenance to disappear after edits. Atomically create the source with original `result.analysis` and optional `edited_analysis`; later corrections use `update_report_analysis`. Retain original output; reset verification after changes or a new report joining a verified cluster. Deferred sources require genuine analysis before verification.
- Duplicate suggestions use embeddings of analysis type + summary + location + needs; deferred reports can use original text + location. Compare different reports only, gate by compatible location, and persist embeddings rather than recomputing all on every request. Explain the configurable threshold and embedding model. Cache model loading. Degraded matching must be visibly labelled if embedding weights are unavailable.
- Suggestions never create clusters automatically. `link_report` moves that source report into an existing target cluster after human confirmation. `keep_report_separate` moves it into its own cluster; record rejected candidate links so the same dismissed suggestion is not repeatedly offered. Preserve every original source.
- Dashboard clusters default to synced sources. A cluster with mixed delivery states includes only its synced sources in hub counts/details displayed there; `get_cluster_reports` returns all sources, so UI filters when showing the hub. Queue counts and local possible-match checks may include pending reports. Metric meanings: active_clusters counts synced nonempty clusters, possible_duplicate_reports counts synced reports with suggestions to synced reports, pending_verification_reports counts synced pending reports, pending_sync_reports counts all pending reports.
- `sync_pending_reports(network_online=False)` changes nothing. Online sync atomically marks pending reports synced, returns only newly delivered IDs, and is safe to repeat or retry. It does not fabricate AI analysis or perform real network transfer. Deferred reports remain deferred until explicitly analyzed and corrected/verified.
- Show people counts per source; overlap is unknown. Show all source needs/languages without turning AI inference into verified facts. Avoid summing people, invented urgency, and automatic dispatch.

## Development handoff

Developer 1 delivers OpenAPI, sample multipart requests, API smoke examples and temporary-DB tests. Developer 2 can build with **private** HTTP fixtures in `frontend/src/mocks/**`; they must follow the exact JSON envelopes and display a development banner. Never place mocks in backend-owned paths or silently enable them after a request fails. Final default calls real HTTP routes. Both developers consult the exact version's official setup docs and pin compatible dependencies; do not combine obsolete Tailwind instructions with a newer installation.
