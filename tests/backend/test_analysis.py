import base64
import json

import httpx
import pytest


def install_transport(monkeypatch, handler):
    from services import gemma_service

    client = httpx.Client(transport=httpx.MockTransport(handler))
    monkeypatch.setattr(gemma_service, "http_client", lambda timeout: client)
    return client


def test_ollama_receives_image_and_validated_schema(draft, analysis, monkeypatch):
    from services.gemma_service import analyze_report

    monkeypatch.setenv("RELIEFMESH_AI_MODE", "live")
    monkeypatch.setenv("RELIEFMESH_AI_BACKEND", "ollama")
    monkeypatch.setenv("RELIEFMESH_MODEL_ID", "gemma4:e2b")

    def handler(request):
        body = json.loads(request.content)
        assert body["model"] == "gemma4:e2b"
        assert draft.original_text in body["messages"][1]["content"]
        assert base64.b64decode(body["messages"][1]["images"][0]) == draft.image_bytes
        assert body["format"]["type"] == "object"
        output = analysis.analysis.model_dump() | {"verification_required": False}
        return httpx.Response(200, json={"message": {"content": json.dumps(output)}})

    with install_transport(monkeypatch, handler):
        result = analyze_report(draft)
    assert result.analysis_mode == "live"
    assert result.analysis.verification_required is True


def test_huggingface_receives_actual_image_and_server_token(draft, analysis, monkeypatch):
    from services.gemma_service import analyze_report

    monkeypatch.setenv("RELIEFMESH_AI_MODE", "live")
    monkeypatch.setenv("RELIEFMESH_AI_BACKEND", "huggingface")
    monkeypatch.setenv("RELIEFMESH_MODEL_ID", "google/gemma-4-31B-it")
    monkeypatch.setenv("HF_TOKEN", "test-token-not-a-secret")

    def handler(request):
        assert request.headers["authorization"] == "Bearer test-token-not-a-secret"
        body = json.loads(request.content)
        image = body["messages"][1]["content"][0]["image_url"]["url"]
        assert image.startswith("data:image/png;base64,")
        assert base64.b64decode(image.split(",", 1)[1]) == draft.image_bytes
        assert body["max_tokens"] <= 1024
        return httpx.Response(200, json={"choices": [{"message": {"content": json.dumps(analysis.analysis.model_dump())}}]})

    with install_transport(monkeypatch, handler):
        result = analyze_report(draft)
    assert result.model_id == "google/gemma-4-31B-it"
    assert result.analysis.confidence is None


@pytest.mark.parametrize("response", [
    {"message": {"content": "not json"}},
    {"message": {"content": '{"people_affected": -5}'}},
    {"unexpected": "shape"},
])
def test_malformed_model_output_does_not_become_incident(draft, monkeypatch, response):
    from services.gemma_service import analyze_report
    from utils.schemas import AnalysisUnavailableError

    monkeypatch.setenv("RELIEFMESH_AI_MODE", "live")
    monkeypatch.setenv("RELIEFMESH_AI_BACKEND", "ollama")
    with install_transport(monkeypatch, lambda request: httpx.Response(200, json=response)):
        with pytest.raises(AnalysisUnavailableError) as error:
            analyze_report(draft)
    assert error.value.code == "INVALID_MODEL_OUTPUT"


def test_missing_token_fails_without_any_network_call(draft, monkeypatch):
    from services.gemma_service import analyze_report
    from utils.schemas import AnalysisUnavailableError

    monkeypatch.setenv("RELIEFMESH_AI_MODE", "live")
    monkeypatch.setenv("RELIEFMESH_AI_BACKEND", "huggingface")
    monkeypatch.setenv("HF_TOKEN", "")
    with install_transport(monkeypatch, lambda request: pytest.fail("must not send unauthenticated inference")):
        with pytest.raises(AnalysisUnavailableError) as error:
            analyze_report(draft)
    assert "HF_TOKEN" in error.value.message


def test_fixture_is_explicit_and_unknown_reports_not_fabricated(draft):
    from services.gemma_service import analyze_report
    from utils.schemas import ValidationError

    known = draft.model_copy(update={"original_text": "City School ke paas pura road flooded hai.", "location": "City School"})
    result = analyze_report(known)
    assert result.analysis_mode == "fixture"
    assert result.warnings
    assert result.analysis.image_observations == []
    with pytest.raises(ValidationError):
        analyze_report(draft)
