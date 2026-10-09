from fastapi.testclient import TestClient
import pytest


def test_hosted_dashboard_preserves_api_and_native_cors(tmp_path, monkeypatch):
    web = tmp_path / "web"
    web.mkdir()
    (web / "index.html").write_text("<html>Responder dashboard</html>", encoding="utf-8")
    (web / "app.js").write_text("window.demo = true;", encoding="utf-8")
    monkeypatch.setenv("RELIEFMESH_FRONTEND_DIR", str(web))
    from api.main import create_app
    with TestClient(create_app()) as client:
        assert client.get("/").text == "<html>Responder dashboard</html>"
        assert client.get("/app.js").status_code == 200
        assert client.get("/api/v1/health").json()["status"] == "ok"
        assert client.get("/api/v1/missing").status_code == 404
        assert client.get("/../.env").status_code == 404
        response = client.options("/api/v1/reports", headers={
            "Origin": "https://localhost", "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        })
        assert response.headers["access-control-allow-origin"] == "https://localhost"


def test_missing_hosted_bundle_fails_at_startup(tmp_path, monkeypatch):
    monkeypatch.setenv("RELIEFMESH_FRONTEND_DIR", str(tmp_path / "missing"))
    from api.main import create_app
    with pytest.raises(RuntimeError, match="does not exist"):
        create_app()
