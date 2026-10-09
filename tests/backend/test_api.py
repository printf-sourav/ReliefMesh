import json
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client():
    from api.main import create_app

    with TestClient(create_app()) as api:
        yield api


def metadata(draft, analysis=None, **changes):
    return {
        "client_report_id": draft.client_report_id,
        "original_text": draft.original_text,
        "location": draft.location,
        "network_online": False,
        "analysis_result": analysis.model_dump() if analysis else None,
    } | changes


def submit(client, draft, analysis=None, **changes):
    return client.post("/api/v1/reports", data={"metadata": json.dumps(metadata(draft, analysis, **changes))},
                       files={"image": (draft.image_name, draft.image_bytes, draft.image_mime)})


def test_multipart_create_replay_image_and_openapi(client, draft, analysis):
    saved = submit(client, draft, analysis)
    assert saved.status_code == 201
    report = saved.json()
    assert submit(client, draft, analysis, network_online=True).status_code == 200
    image = client.get(f"/api/v1/reports/{report['id']}/image")
    assert image.status_code == 200
    assert image.content == draft.image_bytes
    assert image.headers["content-type"] == "image/png"
    assert client.get("/api/v1/health").json()["status"] == "ok"
    schema = client.get("/openapi.json").json()
    assert "/api/v1/reports" in schema["paths"]
    assert "IncidentRecord" in schema["components"]["schemas"]


def test_list_pagination_and_hub_filter(client, draft):
    submit(client, draft)
    second = draft.model_copy(update={"client_report_id": str(uuid4())})
    submit(client, second, network_online=True)
    page = client.get("/api/v1/reports?offset=1&limit=1").json()
    assert page["total"] == 2
    assert len(page["items"]) == 1
    assert page["offset"] == 1
    assert page["limit"] == 1
    assert client.get("/api/v1/reports?synced_only=true").json()["total"] == 1


def test_consistent_errors_do_not_echo_raw_payload(client, draft):
    response = client.post("/api/v1/reports", data={"metadata": "{invalid"},
                           files={"image": ("f.png", draft.image_bytes, "image/png")})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert client.get(f"/api/v1/reports/{uuid4()}").status_code == 404
    bad = submit(client, draft, location="")
    assert bad.status_code == 422
    assert "input" not in json.dumps(bad.json())
    assert "error" in client.get("/api/v1/reports?limit=101").json()
    assert "error" in client.post("/api/v1/reports").json()
    assert "error" in client.get("/not-a-route").json()


def test_unsupported_and_oversized_images(client, draft):
    info = {"metadata": json.dumps(metadata(draft))}
    assert client.post("/api/v1/reports", data=info, files={"image": ("x.svg", b"<svg/>", "image/svg+xml")}).status_code == 415
    assert client.post("/api/v1/reports", data=info, files={"image": ("x.png", b"x" * (10 * 1024 * 1024 + 1), "image/png")}).status_code == 413


def test_cors_accepts_known_client_and_rejects_unknown(client):
    headers = {"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"}
    assert client.options("/api/v1/reports", headers=headers).status_code == 200
    headers["Origin"] = "https://untrusted.example"
    assert client.options("/api/v1/reports", headers=headers).status_code == 400


def test_concurrent_http_retry_has_one_creation(client, draft):
    with ThreadPoolExecutor(max_workers=3) as pool:
        responses = list(pool.map(lambda _: submit(client, draft), range(3)))
    assert sorted(response.status_code for response in responses) == [200, 200, 201]
    assert len({response.json()["id"] for response in responses}) == 1


def test_full_offline_review_flow_and_matching_availability(client, draft, analysis):
    first = submit(client, draft, analysis).json()
    second_draft = draft.model_copy(update={"client_report_id": str(uuid4())})
    second = submit(client, second_draft, analysis).json()
    assert client.get("/api/v1/queue").json()["total"] == 2
    assert client.get("/api/v1/clusters").json()["items"] == []
    assert client.post("/api/v1/sync", json={"network_online": False}).json()["pending_count"] == 2
    assert len(client.post("/api/v1/sync", json={"network_online": True}).json()["synced_report_ids"]) == 2
    assert client.post("/api/v1/sync", json={"network_online": True}).json()["synced_report_ids"] == []
    duplicate = client.get(f"/api/v1/reports/{first['id']}/duplicates").json()
    assert duplicate["matching_available"] is False
    assert duplicate["warnings"]
    metrics = client.get("/api/v1/dashboard/metrics")
    assert metrics.headers["X-ReliefMesh-Matching-Available"] == "false"
    assert metrics.json()["active_clusters"] == 2
    assert metrics.json()["pending_sync_reports"] == 0
    linked = client.put(f"/api/v1/reports/{second['id']}/cluster-membership",
                        json={"target_cluster_id": first["cluster_id"]})
    assert linked.status_code == 200
    assert client.get(f"/api/v1/clusters/{first['cluster_id']}/reports").json()["total"] == 2
    assert client.post(f"/api/v1/reports/{first['id']}/verifications").json()["verification_status"] == "verified"
    edited = analysis.analysis.model_dump() | {"people_affected": None}
    corrected = client.patch(f"/api/v1/reports/{first['id']}/analysis", json={"analysis": edited}).json()
    assert corrected["verification_status"] == "pending"
    assert corrected["original_analysis"]["people_affected"] == 4
    assert client.delete(f"/api/v1/reports/{second['id']}/cluster-membership").status_code == 200


def test_http_fixture_analysis_and_saved_deferred_analysis(client, draft):
    from utils.config import ROOT

    fixture = json.loads((ROOT / "sample_data/demo_reports.json").read_text())[0]
    draft = draft.model_copy(update={"original_text": fixture["original_text"], "location": fixture["location"]})
    info = {key: value for key, value in metadata(draft).items() if key not in {"network_online", "analysis_result"}}
    response = client.post("/api/v1/analyses", data={"metadata": json.dumps(info)},
                           files={"image": ("image.png", draft.image_bytes, "image/png")})
    assert response.json()["analysis_mode"] == "fixture"
    source = submit(client, draft).json()
    assert client.post(f"/api/v1/reports/{source['id']}/verifications").status_code == 409
    analyzed = client.post(f"/api/v1/reports/{source['id']}/analyses").json()
    assert analyzed["analysis_mode"] == "fixture"
    assert analyzed["original_analysis"] is not None


def test_stored_image_path_cannot_escape_upload_root(client, draft, tmp_path):
    from database.db import connection

    source = submit(client, draft).json()
    secret = tmp_path / "outside.png"
    secret.write_bytes(b"must not be returned")
    source["image_path"] = "../outside.png"
    with connection(write=True) as conn:
        conn.execute("UPDATE reports SET record_json=? WHERE id=?", (json.dumps(source), source["id"]))
    assert client.get(f"/api/v1/reports/{source['id']}/image").status_code == 404
