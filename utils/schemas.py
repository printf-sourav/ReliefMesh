from io import BytesIO
from typing import Annotated, Generic, Literal, TypeVar
from uuid import UUID

from PIL import Image, UnidentifiedImageError
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StrictInt, model_validator

MAX_IMAGE_BYTES = 10 * 1024 * 1024
IMAGE_FORMATS = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}


class AppError(Exception):
    status_code = 500
    code = "INTERNAL_ERROR"

    def __init__(self, message: str, *, code: str | None = None, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.code = code or type(self).code
        self.details = details or {}


class ValidationError(AppError):
    status_code = 422
    code = "VALIDATION_ERROR"


class AnalysisUnavailableError(AppError):
    status_code = 503
    code = "ANALYSIS_UNAVAILABLE"


class MatchingUnavailableError(AnalysisUnavailableError):
    code = "MATCHING_UNAVAILABLE"


class StorageError(AppError):
    code = "STORAGE_ERROR"


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"


class ImageTooLargeError(ValidationError):
    status_code = 413
    code = "IMAGE_TOO_LARGE"


class UnsupportedImageError(ValidationError):
    status_code = 415
    code = "UNSUPPORTED_IMAGE"


def validate_image(data: bytes, mime: str) -> None:
    if len(data) > MAX_IMAGE_BYTES:
        raise ImageTooLargeError("Image must be at most 10 MB.")
    if mime not in IMAGE_FORMATS:
        raise UnsupportedImageError("Use a JPEG, PNG or WebP image.")
    try:
        with Image.open(BytesIO(data)) as image:
            if image.format != IMAGE_FORMATS[mime]:
                raise UnsupportedImageError("Image content does not match its media type.")
            if image.width * image.height > 20_000_000:
                raise ImageTooLargeError("Image exceeds 20 million pixels; resize it before uploading.")
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as exc:
        raise ValidationError("Image could not be decoded.") from exc


def uuid_string(value: str) -> str:
    return str(UUID(value))


Identifier = Annotated[str, AfterValidator(uuid_string)]
Text = Annotated[str, Field(min_length=1, max_length=10_000)]


class Schema(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)


class ReportMetadata(Schema):
    client_report_id: Identifier
    original_text: Text
    location: Annotated[str, Field(min_length=1, max_length=300)]
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)


class ReportDraft(ReportMetadata):
    image_bytes: bytes
    image_name: Annotated[str, Field(min_length=1, max_length=255)]
    image_mime: str

    @model_validator(mode="after")
    def valid_image(self):
        validate_image(self.image_bytes, self.image_mime)
        return self


class IncidentAnalysis(Schema):
    incident_type: Text
    summary: Text
    people_affected: Annotated[StrictInt, Field(ge=0)] | None
    vulnerable_people: list[Text]
    reported_needs: list[Text]
    location_context: Text
    language: Text
    image_observations: list[Text]
    confidence: float | None = Field(ge=0, le=1)
    verification_required: Literal[True] = True


class AnalysisResult(Schema):
    analysis: IncidentAnalysis
    analysis_mode: Literal["live", "fixture"]
    model_id: Text
    warnings: list[str] = Field(default_factory=list)


class CreateMetadata(ReportMetadata):
    analysis_result: AnalysisResult | None = None
    edited_analysis: IncidentAnalysis | None = None
    network_online: bool


class IncidentRecord(Schema):
    id: Identifier
    client_report_id: Identifier
    cluster_id: Identifier
    original_text: str
    location: str
    latitude: float | None
    longitude: float | None
    image_path: str
    created_at: str
    updated_at: str
    analysis: IncidentAnalysis | None
    original_analysis: IncidentAnalysis | None
    analysis_mode: Literal["live", "fixture", "deferred"]
    model_id: str | None
    verification_status: Literal["pending", "verified"]
    network_status_at_submission: Literal["online", "offline"]
    sync_status: Literal["pending", "synced"]


class DuplicateCandidate(Schema):
    incident_id: Identifier
    cluster_id: Identifier
    similarity: float = Field(ge=-1, le=1)
    summary: str
    location: str


class ClusterSummary(Schema):
    cluster_id: Identifier
    title: str
    report_count: int
    photo_count: int
    reported_needs: list[str]
    languages: list[str]
    people_counts_by_report: dict[str, int | None]
    first_report_at: str
    latest_report_at: str
    verification_status: Literal["pending", "verified"]


class DashboardMetrics(Schema):
    active_clusters: int
    possible_duplicate_reports: int
    pending_verification_reports: int
    pending_sync_reports: int


class SyncResult(Schema):
    synced_report_ids: list[str]
    pending_count: int


T = TypeVar("T")


class Page(Schema, Generic[T]):
    items: list[T]
    total: int
    offset: int
    limit: int


class DuplicatePage(Page[DuplicateCandidate]):
    matching_available: bool
    warnings: list[str] = Field(default_factory=list)


class AnalysisUpdate(Schema):
    analysis: IncidentAnalysis


class MembershipUpdate(Schema):
    target_cluster_id: Identifier


class SyncRequest(Schema):
    network_online: bool
