"""Server guarantees used by Android peers; these are not radio transport tests."""
import json
from uuid import uuid4

from fastapi.testclient import TestClient


def upload(client, draft, *, result=None, network_online=True, **changes):
    fields = {
        "client_report_id": draft.client_report_id, "original_text": draft.original_text,
        "location": draft.location, "analysis_result": result.model_dump() if result else None,
        "edited_analysis": None, "network_online": network_online,
    } | changes
    return client.post("/api/v1/reports", data={"metadata": json.dumps(fields)},
                       files={"image": ("relayed.png", draft.image_bytes, draft.image_mime)})


def test_multiple_relays_preserve_one_raw_source_and_receipt_after_restart(draft, monkeypatch):
    from api.main import create_app
    from services import gemma_service

    def unexpected_inference(*args):
        raise AssertionError("Transport must not invoke inference")

    monkeypatch.setattr(gemma_service, "analyze_report", unexpected_inference)
    with TestClient(create_app()) as client:
        first = upload(client, draft, network_online=False)
        assert first.status_code == 201
        for _ in range(3):
            replay = upload(client, draft)
            assert replay.status_code == 200
            assert replay.json()["id"] == first.json()["id"]
            assert replay.json()["analysis_mode"] == "deferred"
            assert replay.json()["analysis"] is None
        assert client.get("/api/v1/reports").json()["total"] == 1
        receipt = client.get(f"/api/v1/receipts/{draft.client_report_id}")
        assert receipt.status_code == 200
        assert receipt.json() == {
            "client_report_id": draft.client_report_id, "report_id": first.json()["id"],
            "accepted_at": first.json()["created_at"], "sync_status": "pending",
        }
        assert client.post("/api/v1/sync", json={"network_online": True}).status_code == 200
        assert client.get(f"/api/v1/reports/{first.json()['id']}/image").content == draft.image_bytes
    with TestClient(create_app()) as restarted:
        durable = restarted.get(f"/api/v1/receipts/{draft.client_report_id}").json()
        assert durable == receipt.json() | {"sync_status": "synced"}


def test_changed_relay_payload_conflicts_without_overwriting_source(draft):
    from api.main import create_app

    with TestClient(create_app()) as client:
        original = upload(client, draft)
        conflict = upload(client, draft, original_text="Different source with reused UUID")
        assert conflict.status_code == 409
        assert conflict.json()["error"]["code"] == "IDEMPOTENCY_CONFLICT"
        receipt = client.get(f"/api/v1/receipts/{draft.client_report_id}").json()
        assert receipt["report_id"] == original.json()["id"]
        assert client.get(f"/api/v1/reports/{receipt['report_id']}").json()["original_text"] == draft.original_text


def test_delayed_relay_does_not_overwrite_responder_correction(draft, analysis):
    from api.main import create_app

    with TestClient(create_app()) as client:
        original = upload(client, draft, result=analysis).json()
        correction = analysis.analysis.model_dump() | {"summary": "Human correction retained"}
        client.patch(f"/api/v1/reports/{original['id']}/analysis", json={"analysis": correction}).raise_for_status()
        client.post(f"/api/v1/reports/{original['id']}/verifications").raise_for_status()
        replay = upload(client, draft, result=analysis).json()
        assert replay["analysis"]["summary"] == "Human correction retained"
        assert replay["original_analysis"] == analysis.analysis.model_dump()
        assert replay["verification_status"] == "verified"
        receipt = client.get(f"/api/v1/receipts/{draft.client_report_id}").json()
        assert receipt["accepted_at"] == original["created_at"]


def test_unknown_and_invalid_receipt_ids_use_consistent_errors():
    from api.main import create_app

    with TestClient(create_app()) as client:
        missing = client.get(f"/api/v1/receipts/{uuid4()}")
        assert missing.status_code == 404
        assert missing.json()["error"]["code"] == "NOT_FOUND"
        invalid = client.get("/api/v1/receipts/not-a-uuid")
        assert invalid.status_code == 422
        assert invalid.json()["error"]["code"] == "VALIDATION_ERROR"
