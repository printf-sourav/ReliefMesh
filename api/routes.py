import json
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, Form, Query, Response, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, ValidationError as ModelValidationError
from starlette.concurrency import run_in_threadpool

from services import gemma_service, incident_service, sync_service
from utils.config import settings
from utils.schemas import (
    MAX_IMAGE_BYTES, AnalysisResult, AnalysisUpdate, ClusterSummary, CreateMetadata,
    DashboardMetrics, DuplicatePage, ImageTooLargeError, IncidentRecord, MatchingUnavailableError, MembershipUpdate, NotFoundError, Page,
    ReportDraft, ReportMetadata, SyncRequest, SyncResult, ValidationError,
)

router = APIRouter()
Offset = Annotated[int, Query(ge=0)]
Limit = Annotated[int, Query(ge=1, le=100)]


def page(items: list, offset: int, limit: int) -> dict:
    return {"items": items[offset:offset + limit], "total": len(items), "offset": offset, "limit": limit}


async def read_draft(image: UploadFile, metadata: str, schema: type[BaseModel]):
    try:
        values = schema.model_validate(json.loads(metadata))
    except (json.JSONDecodeError, ModelValidationError, ValueError) as exc:
        raise ValidationError("The metadata field must be valid JSON with the documented report fields.") from exc
    try:
        data = await image.read(MAX_IMAGE_BYTES + 1)
    finally:
        await image.close()
    if len(data) > MAX_IMAGE_BYTES:
        raise ImageTooLargeError("Image must be at most 10 MB.")
    draft_fields = {name: getattr(values, name) for name in ReportMetadata.model_fields}
    try:
        draft = ReportDraft(**draft_fields, image_bytes=data, image_name=image.filename or "image",
                            image_mime=image.content_type or "application/octet-stream")
    except ModelValidationError as exc:
        raise ValidationError("Report fields are invalid.") from exc
    return draft, values


@router.get("/health")
def health():
    config = settings()
    return {"status": "ok", "ai_mode": config.ai_mode, "model_id": config.model_id or None}


@router.post("/reports", response_model=IncidentRecord, status_code=201)
async def submit_report(response: Response, image: Annotated[UploadFile, File()], metadata: Annotated[str, Form()]):
    draft, values = await read_draft(image, metadata, CreateMetadata)
    record, created = await run_in_threadpool(incident_service.create_report_with_status, draft,
                                            values.analysis_result, network_online=values.network_online,
                                            edited_analysis=values.edited_analysis)
    response.status_code = 201 if created else 200
    return record


@router.post("/analyses", response_model=AnalysisResult)
async def analyze(image: Annotated[UploadFile, File()], metadata: Annotated[str, Form()]):
    draft, _ = await read_draft(image, metadata, ReportMetadata)
    return await run_in_threadpool(gemma_service.analyze_report, draft)


@router.get("/reports", response_model=Page[IncidentRecord])
def reports(synced_only: bool = False, offset: Offset = 0, limit: Limit = 50):
    return page(incident_service.list_reports(synced_only=synced_only), offset, limit)


@router.get("/reports/{report_id}", response_model=IncidentRecord)
def report(report_id: UUID):
    return incident_service.get_report(str(report_id))


@router.get("/reports/{report_id}/image", response_class=FileResponse)
def image(report_id: UUID):
    record = incident_service.get_report(str(report_id))
    root = settings().upload_dir
    path = (root / record.image_path).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise NotFoundError("Report image was not found.")
    mime = {".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp"}.get(path.suffix)
    if mime is None:
        raise NotFoundError("Report image was not found.")
    return FileResponse(path, media_type=mime, headers={"X-Content-Type-Options": "nosniff"})


@router.patch("/reports/{report_id}/analysis", response_model=IncidentRecord)
def correct(report_id: UUID, values: AnalysisUpdate):
    return incident_service.update_report_analysis(str(report_id), values.analysis)


@router.post("/reports/{report_id}/analyses", response_model=IncidentRecord)
def analyze_saved(report_id: UUID):
    return incident_service.analyze_saved_report(str(report_id))


@router.post("/reports/{report_id}/verifications", response_model=IncidentRecord)
def verify(report_id: UUID):
    return incident_service.verify_report(str(report_id))


@router.put("/reports/{report_id}/cluster-membership", response_model=IncidentRecord)
def link(report_id: UUID, values: MembershipUpdate):
    return incident_service.link_report(str(report_id), values.target_cluster_id)


@router.delete("/reports/{report_id}/cluster-membership", response_model=IncidentRecord)
def separate(report_id: UUID):
    return incident_service.keep_report_separate(str(report_id))


@router.get("/clusters", response_model=Page[ClusterSummary])
def clusters(synced_only: bool = True, offset: Offset = 0, limit: Limit = 50):
    return page(incident_service.list_clusters(synced_only=synced_only), offset, limit)


@router.get("/clusters/{cluster_id}/reports", response_model=Page[IncidentRecord])
def cluster_reports(cluster_id: UUID, synced_only: bool = True, offset: Offset = 0, limit: Limit = 50):
    sources = incident_service.get_cluster_reports(str(cluster_id))
    if synced_only:
        sources = [source for source in sources if source.sync_status == "synced"]
    return page(sources, offset, limit)


@router.get("/queue", response_model=Page[IncidentRecord])
def queue(offset: Offset = 0, limit: Limit = 50):
    return page(sync_service.get_pending_reports(), offset, limit)


@router.post("/sync", response_model=SyncResult)
def synchronize(values: SyncRequest):
    return sync_service.sync_pending_reports(network_online=values.network_online)


@router.get("/reports/{report_id}/duplicates", response_model=DuplicatePage)
def duplicates(report_id: UUID, threshold: Annotated[float, Query(ge=0, le=1)] = 0.80,
               synced_only: bool = False, offset: Offset = 0, limit: Limit = 50):
    try:
        items = incident_service.duplicate_candidates(str(report_id), threshold=threshold, synced_only=synced_only)
        return page(items, offset, limit) | {"matching_available": True, "warnings": []}
    except MatchingUnavailableError as exc:
        return page([], offset, limit) | {"matching_available": False, "warnings": [exc.message]}


@router.get("/dashboard/metrics", response_model=DashboardMetrics)
def metrics(response: Response):
    result, available, warnings = incident_service.dashboard_snapshot()
    response.headers["X-ReliefMesh-Matching-Available"] = str(available).lower()
    if warnings:
        response.headers["X-ReliefMesh-Matching-Warning"] = warnings[0]
    return result
