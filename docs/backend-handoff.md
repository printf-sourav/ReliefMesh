# Developer 1 backend handoff

Branch: `feature/backend-ai`. Implementation started from planning commit `6d92ac6` in an isolated managed worktree.

## Current checkpoint

All agreed HTTP routes are implemented: report persistence/images, live/fixture analysis, deferred analysis, duplicate suggestions, human grouping/separation/corrections/verification, dashboard metrics, clusters, queue and repeat-safe sync. Real semantic model verification is recorded below separately from automated tests.

Python 3.12.10; pinned core dependencies. `python -m pytest tests/backend -q --tb=short`: **36 passed** (3.14s). One upstream Starlette TestClient deprecation warning remains. Tests cover storage, HTTP errors/retries/images, both inference request formats, malformed outputs, explicit fixtures, grouping, original-output retention, deferred reanalysis, duplicate cache/dismissals, repeat-safe sync and relay delivery receipts. Automated model/provider-boundary tests use controlled doubles; the separate live inference check below uses the actual configured provider.

Start: `python -m uvicorn api.main:app --host 0.0.0.0 --port 8000`. Open `/docs` or `/openapi.json` on the backend host. Phone requires the laptop's reachable LAN address; its own localhost cannot reach the laptop. No credentials are exposed by health or OpenAPI.

## AI connections and evidence

Local Ollama `gemma4:e2b` is documented by [Ollama](https://ollama.com/library/gemma4); Gemma 4 multimodality is confirmed by [Google's model card](https://ai.google.dev/gemma/docs/core/model_card_4). The implemented server-side Hugging Face adapter reads `HF_TOKEN` from ignored local environment configuration and follows [Hugging Face vision chat completion](https://huggingface.co/docs/inference-providers/tasks/chat-completion).

The user configured `HF_TOKEN` in ignored backend `.env`. No token was printed or committed. Two bounded live requests succeeded using `google/gemma-4-31B-it`, which currently lists vision providers on [its model page](https://huggingface.co/google/gemma-4-31B-it). The service smoke extracted 4 explicitly reported people, an elderly person and a drinking-water need from scenario C, with distinct observations of the supplied flood photograph. It returned `analysis_mode=live` and human verification required. Confidence 0.95 is an uncalibrated model estimate. No local Ollama executable was found; that adapter is request-tested, not live-tested. Never put tokens into `VITE_*`.

The second request exercised the running HTTP API end to end with an explicitly labelled prototype scenario: live multipart analysis, 201 creation, 200 same-UUID replay after changing only network status, identical retrieved photo bytes, successful simulated sync and an empty newly-synced list on repeated sync. Source UUID: `7239995e-f88a-4319-b4a1-008f9583bbb2`. This demonstration source remains in ignored local storage for frontend integration, pending human verification. Running server: `http://127.0.0.1:8000`; health and all 15 OpenAPI paths were checked.

Live smoke command: `python -m services.smoke --image <path.jpg> --text '<scenario C text>' --location 'Riverside Colony'`. Each invocation can consume inference credit; ordinary tests never make paid calls. A historical demonstration photograph does not substantiate the fictitious Riverside report.

Photo used in ignored local smoke/storage files: [Gloucester Road Tewkesbury, July 2007](https://commons.wikimedia.org/wiki/File:Gloucester_Road_Tewkesbury,_during_the_flood_of_July_2007_-_geograph.org.uk_-_2205066.jpg), Helen Iwanczuk, [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/), unmodified. If reusing it in the frontend, retain attribution and mark it as a historical demo image, not a current incident photo.

## Frontend integration notes

- Use multipart `image` + stringified JSON `metadata`; do not set multipart Content-Type manually. Routes and models follow `docs/shared-contract.md`.
- Original AI result and citizen edits are submitted together; server corrections preserve originals and reset verification. Raw offline sources upload without analysis and require explicit `/reports/{id}/analyses` before verification.
- Hub clusters default to synced sources; per-source people counts must not be summed. No real mesh/hub transfer exists.
- Duplicate endpoint exposes `matching_available` and warnings. Dashboard response retains four JSON fields and adds exposed `X-ReliefMesh-Matching-Available`/`X-ReliefMesh-Matching-Warning` headers; if unavailable, render duplicate count as unavailable, not zero. This is an additive availability diagnostic, not a changed JSON schema.
- Separate dismisses current suggested source pairs and former cluster siblings. Already-separated and repeated-membership operations are repeat-safe.
- This is a trusted-network demonstration API without production responder authentication. Credentials stay on the backend.

## Install and configure

Run from a backend checkout with Python 3.12. The commands below use Windows PowerShell; activating the environment is optional because the executable is explicit.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

For online inference, edit ignored `.env`: set `RELIEFMESH_AI_BACKEND=huggingface`, `RELIEFMESH_MODEL_ID=google/gemma-4-31B-it`, `RELIEFMESH_AI_MODE=live`, and your own `HF_TOKEN`. Restart the backend after editing settings. The development token is private to the backend worktree and is not transferred by Git. The documented model/provider can change; unavailable inference returns a visible 503 and never falls back to fixtures.

For local inference, install Ollama, pull `gemma4:e2b`, retain the default backend/model settings, and verify its resource requirements on your machine. This optional path was not run on this laptop.

For illustrative fixtures, explicitly set `RELIEFMESH_AI_MODE=fixture`. Only the exact A-C texts/locations in `sample_data/demo_reports.json` are accepted. Fixture analysis does not understand the supplied photo, returns empty image observations, and is labelled `fixture`.

Semantic matching runs on CPU independently of the image model:

```powershell
.\.venv\Scripts\python.exe -m pip install torch==2.14.1 --index-url https://download.pytorch.org/whl/cpu
.\.venv\Scripts\python.exe -m pip install -r requirements-models.txt
.\.venv\Scripts\python.exe -m services.embedding_service --download
```

The last command intentionally downloads the multilingual MiniLM weights into ignored `.cache/embeddings`. Keep `RELIEFMESH_ALLOW_MODEL_DOWNLOAD=false` afterwards so requests load cached weights only. A new checkout needs its own model preparation. Without the optional runtime/weights, report storage and review still work, and semantic matching is explicitly unavailable.

Runtime verified: SentenceTransformers 5.7.0, PyTorch 2.14.1+cpu, Transformers 5.19.0. The encoder's `cache_folder` and `local_files_only` settings follow the [official API reference](https://sbert.net/docs/package_reference/sentence_transformer/model.html). Prewarming produced 384-dimensional vectors. A fresh process then loaded cached weights with downloads disabled and verified these cosine scores:

| Comparison | Score | Outcome at threshold 0.80 |
| --- | --- | --- |
| A/B normalized flood reports, same location | 0.984567 | Suggested, sources remain separate |
| A vs illustrative building fire, same location | 0.541896 | No suggestion |
| Direct Hindi/English flood paraphrases | 0.945337 | Semantic comparison succeeds |
| Hindi flood vs English building fire | 0.577750 | Below threshold |

Location gating excluded scenario C at Riverside Colony. The disposable storage retained one cluster per source: there was no automatic merge. These few cases establish working real inference, not an evaluated precision/recall guarantee. Location comparison uses normalized name tokens plus a one-kilometre coordinate guard, not geocoding. Transliteration, vague locations and different incident wording can require human inspection or threshold adjustment.

```powershell
.\.venv\Scripts\python.exe -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Browser documentation: `http://127.0.0.1:8000/docs`. OpenAPI: `http://127.0.0.1:8000/openapi.json`. API health: `http://127.0.0.1:8000/api/v1/health`. Health confirms HTTP availability, not AI readiness. Default storage is checkout-local `database/reliefmesh.db` and `uploads/`; set `RELIEFMESH_DB_PATH` and `RELIEFMESH_UPLOAD_DIR` to absolute paths for disposable runs. Never share a runtime DB across development checkouts.

Default CORS permits Vite localhost:5173 and common Capacitor localhost origins. Add an actual browser LAN origin to `RELIEFMESH_ALLOWED_ORIGINS` if needed. APK configuration must use the laptop's reachable API origin, such as `http://<laptop-LAN-IP>:8000/api/v1`, according to the frontend client's base-path convention. Phone localhost refers to the phone. Host firewall/network rules may need to allow the demo connection; the APK developer owns Android cleartext and device checks.

## Multipart example

This Python example sends one paid live request when live Hugging Face mode is configured. Replace the image and source with a legitimate demonstration report. Its UUID is generated once and retained through analysis, storage and replay. The frontend should retain it across retries.

```python
import json
from pathlib import Path
from uuid import uuid4
import httpx

base = "http://127.0.0.1:8000/api/v1"
photo = Path("demo.jpg")
image_bytes = photo.read_bytes()
metadata = {
    "client_report_id": str(uuid4()),
    "original_text": "City School ke paas pura road flooded hai.",
    "location": "City School",
    "latitude": None,
    "longitude": None,
}
with httpx.Client(timeout=100) as client:
    def post_photo(route, fields):
        response = client.post(base + route,
            data={"metadata": json.dumps(fields)},
            files={"image": (photo.name, image_bytes, "image/jpeg")})
        response.raise_for_status()
        return response

    result = post_photo("/analyses", metadata).json()
    submission = metadata | {
        "analysis_result": result, "edited_analysis": None,
        "network_online": False,
    }
    first = post_photo("/reports", submission)  # 201, pending sync
    repeated = post_photo("/reports", submission)  # 200, same source
    assert first.json()["id"] == repeated.json()["id"]
    source_id = first.json()["id"]
    photo_response = client.get(f"{base}/reports/{source_id}/image")
    photo_response.raise_for_status()
    assert photo_response.content == image_bytes
    sync = client.post(base + "/sync", json={"network_online": True})
    sync.raise_for_status()
    print(source_id, result["analysis_mode"], sync.json())
```

`/analyses` returns `{analysis, analysis_mode, model_id, warnings}`. `/reports` returns the authoritative `IncidentRecord`, including retained `original_analysis`, current `analysis`, source/cluster UUIDs and sync/review states. Full field definitions and every route are in `docs/shared-contract.md` and generated OpenAPI. Error example: `{"error":{"code":"IDEMPOTENCY_CONFLICT","message":"This report UUID was already used for a different source.","details":{}}}` with HTTP 409.

For raw device-offline uploads, skip `/analyses`, submit `analysis_result=null` and `edited_analysis=null`, and show `analysis_mode=deferred`. `/sync` never calls AI. Explicit `POST /reports/{id}/analyses` later analyzes the saved image/text; repeated calls on an already analyzed source return the stored record. Review controls use the shared-contract routes. Grouping moves one source into an existing cluster and never deletes it.

## Disposable demo seed and verification

```powershell
.\.venv\Scripts\python.exe -m services.seed_demo --db .cache/demo.db --uploads .cache/demo-uploads --image demo.jpg
$env:RELIEFMESH_DB_PATH = [System.IO.Path]::GetFullPath('.cache/demo.db')
$env:RELIEFMESH_UPLOAD_DIR = [System.IO.Path]::GetFullPath('.cache/demo-uploads')
.\.venv\Scripts\python.exe -c "from services.incident_service import list_reports, find_possible_duplicates; print([(s.id, [c.model_dump() for c in find_possible_duplicates(s.id)]) for s in list_reports()])"
.\.venv\Scripts\python.exe -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

Use a licensed or synthetic JPEG/PNG/WebP and retain its attribution. Seed writes three clearly labelled fixture reports, A/B synced and C pending; it performs no AI request. Running it again with the same image/source returns the same UUIDs. A different image with those UUIDs intentionally conflicts. Select another disposable DB rather than clearing existing data. Real image inference and illustrative seed provenance remain distinct.

Automated suite: `.\.venv\Scripts\python.exe -m pytest tests/backend -q --tb=short`. Tests use temporary DB/upload directories and controlled provider/model doubles, never personal incident data or inference credits. Two seed runs against disposable storage returned the same three records. A deliberately inverted offline-sync condition caused the intended regression test to fail; the exact source was restored afterwards.

## Handoff to Developer 2

Fetch and merge `origin/feature/backend-ai` into your own integration branch; preserve your frontend and Android work. Backend changes do not belong on `main` until your integrated delivery is reviewed. Retrieve the precise branch tip with `git rev-parse origin/feature/backend-ai`; the human receives its commit link at handoff.

The backend does not build the APK. An isolated recheck of frontend snapshot `20aabeb` passed production build, 12 frontend tests and actual browser multipart/photo/offline-reload/reconnect checks against the current backend using explicitly labelled fixtures. See [verification report](verification-2026-10-09.md). These combined-source checks do not update the other developer's branch. Installed-device behavior remains pending.

## Authorized automatic nearby extension

The user now approved real Bluetooth/BLE + Wi-Fi phone-to-phone relay using Nearby Connections, automatic connection acceptance, and two Android phones. This extends the original scope. Existing repeat-safe uploads support multiple gateways, and `GET /api/v1/receipts/{client_report_id}` now exposes durable server acceptance/sync status. The restarted live API returned the saved demonstration receipt successfully and exposes 16 OpenAPI paths. Four new tests verify duplicate relay retries, receipt persistence, changed-source conflict and preservation of later human corrections. A deliberately inverted receipt lookup condition was detected; source was restored and the full suite passed.

Frontend/native implementation rules are in [nearby relay](nearby-relay.md); give the other developer [this follow-up prompt](../prompts/nearby-relay-frontend.md). Automatic SDK acceptance is permitted after one-time group/sharing/Android permission setup; authenticate group membership before transferring reports. The Python API cannot discover or exchange Bluetooth packets between phones. The native plugin, foreground automatic queue transfer and two-device proof remain Developer 2's work. Server `/sync` remains a local simulation; no on-device model or background delivery is implemented.
