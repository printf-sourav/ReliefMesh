# Shared contract for both developers

Freeze this interface before parallel implementation. Developer 1 owns its Python implementation in `utils/schemas.py` and the service modules. Developer 2 consumes it through direct Python imports; there is no HTTP server in this prototype. Do not change signatures independently. Record any necessary agreed change in this document and both handoff notes.

## Ownership

| Developer 1: backend and AI | Developer 2: UI and integration |
| --- | --- |
| `services/**`, `database/**`, `utils/**` | `app.py`, `pages/**`, `ui/**` |
| `requirements-backend.txt`, `.env.example`, `.gitignore` | `requirements.txt`, `requirements-ui.txt`, `README.md` |
| `tests/backend/**`, `sample_data/demo_reports.json` | `tests/ui/**`, `sample_data/images/**`, `docs/demo.md` |
| `docs/backend-handoff.md` | `docs/frontend-handoff.md` |

The current planning files are the shared baseline. Each developer updates only their task entries in `tasks/todo.md`; Developer 2 resolves those changes during integration. Developer 1 records model/backend documentation in its handoff; Developer 2 incorporates it into README. Add Python package markers only in directories you own. Do not share a runtime database between development checkouts.

## Types in `utils/schemas.py`

Use Pydantic models (or equivalent validated models preserving these attributes and `.model_dump()` for UI consumers). Public functions accept/return these models, not undocumented dictionary shapes. Dates are timezone-aware UTC ISO 8601 strings; the UI displays local time with a timezone label. IDs are UUID strings; readable short labels may be derived for display.

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

## Direct Python service interface

```python
# database/db.py
init_db() -> None

# services/gemma_service.py
analyze_report(draft: ReportDraft) -> AnalysisResult

# services/incident_service.py
create_report(draft: ReportDraft, result: AnalysisResult | None,
              *, network_online: bool) -> IncidentRecord
list_reports(*, synced_only: bool = False) -> list[IncidentRecord]
get_report(report_id: str) -> IncidentRecord
find_possible_duplicates(report_id: str,
                         *, threshold: float = 0.80) -> list[DuplicateCandidate]
list_clusters(*, synced_only: bool = True) -> list[ClusterSummary]
get_cluster_reports(cluster_id: str) -> list[IncidentRecord]
get_dashboard_metrics() -> DashboardMetrics
update_report_analysis(report_id: str, analysis: IncidentAnalysis) -> IncidentRecord
verify_report(report_id: str) -> IncidentRecord
link_report(report_id: str, target_cluster_id: str) -> IncidentRecord
keep_report_separate(report_id: str) -> IncidentRecord

# services/sync_service.py
get_pending_reports() -> list[IncidentRecord]
sync_pending_reports(*, network_online: bool) -> SyncResult
```

Define `ValidationError`, `AnalysisUnavailableError`, `StorageError`, and `NotFoundError` in `utils/schemas.py`; service failures raise these, which the UI catches and turns into clear messages. Map Pydantic/runtime validation errors to this public error interface. Do not swallow errors or return fabricated live results.

Configuration comes from environment variables: `RELIEFMESH_DB_PATH`, `RELIEFMESH_UPLOAD_DIR`, `RELIEFMESH_AI_MODE` (`live` or explicit `fixture`), and `RELIEFMESH_MODEL_ID`. Default DB: `database/reliefmesh.db`; uploads: `uploads/`. Developer 1 documents any runtime-specific settings in `.env.example` and its handoff. Default AI mode is live; fixture mode is opt-in and prominently labelled.

## Persistence and behavioral rules

- `init_db()` is safe to repeat. A database unique constraint on `client_report_id` makes `create_report` retries return the existing record without duplicate rows/images. Use transactions and sanitized/generated image filenames; clean up newly written files on failed transactions.
- New reports start in their own cluster and pending verification. Online submissions are marked synced immediately in this **simulated hub**; offline submissions are pending. Raw offline submissions with `result=None` have `analysis_mode="deferred"`. Reject missing analysis for an online submission unless the citizen explicitly saves it offline instead.
- Do not allow fixture, deferred, or live provenance to disappear after citizen edits. At initial submission, `result.analysis` is the original output; `result` remains unchanged by the UI. After `create_report`, apply the citizen's separately retained edited analysis through `update_report_analysis`. Retain original output; reset verification after changes or a new report joining a verified cluster.
- Duplicate suggestions use embeddings of analysis type + summary + location + needs; deferred reports can use original text + location. Compare different reports only, gate by compatible location, and persist embeddings rather than recomputing all of them on every rerun. Explain the configurable threshold and embedding model. Cache model loading. Degraded matching must be visibly labelled if embedding weights are unavailable.
- Suggestions never create clusters automatically. `link_report` moves that source report into an existing target cluster after human confirmation. `keep_report_separate` moves it into its own cluster; record rejected candidate links so the same dismissed suggestion is not repeatedly offered. Preserve every original source.
- Dashboard clusters default to synced sources. A cluster with mixed delivery states includes only its synced sources in hub counts/details displayed there; `get_cluster_reports` returns all sources, so UI filters when showing the hub. Queue counts and local possible-match checks may include pending reports. Metric meanings: active_clusters counts synced nonempty clusters, possible_duplicate_reports counts synced reports with suggestions to synced reports, pending_verification_reports counts synced pending reports, pending_sync_reports counts all pending reports.
- `sync_pending_reports(network_online=False)` changes nothing. Online sync atomically marks pending reports synced, returns only newly delivered IDs, and is safe to repeat or retry. It does not fabricate AI analysis or perform real network transfer. Deferred reports remain deferred until explicitly analyzed and corrected/verified.
- Show people counts per source; overlap is unknown. Show all source needs/languages without turning AI inference into verified facts. Avoid summing people, invented urgency, and automatic dispatch.

## Development handoff

Developer 1 delivers a tiny service smoke example and backend tests against a temporary DB. Developer 2 can build with **private** fixture adapters in `ui/dev_fixtures.py` until that branch is ready; fixtures must implement the shapes above and display a development banner. Never place frontend stubs in backend-owned paths or silently activate them in the final app. Final default imports must use real services.
