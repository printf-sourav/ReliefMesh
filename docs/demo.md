# Demonstration and verification

The current branch includes reviewed source/photo race fixes, 120-second explicit inference requests, backend validation/rejected-source recovery, authenticated native nearby sharing, durable relay queues and automatic foreground gateway transport. Fixture tests, live inference, APK compilation and physical radio acceptance have separate evidence.

## Startup

Use the real API by default. On this host port 8000 serves an unrelated GroundOne API; leave it running and use a free ReliefMesh port such as 8002. Configure the root ignored `.env` with backend-only provider settings, start FastAPI, then run the frontend on the user-requested 8001:

```powershell
.\.venv\Scripts\python.exe -m uvicorn api.main:app --host 0.0.0.0 --port 8002
```

```powershell
cd frontend
npm ci
npm run dev -- --port 8001
```

Set Connection settings to `http://127.0.0.1:8002` for the browser or the laptop's LAN/HTTPS origin for a phone. Origins contain no `/api/v1`. Empty origin uses the development proxy to 8000, so explicit configuration is required on this host. Provider credentials must never enter `VITE_*` or Git. The actual 8001 frontend responds HTTP 200.

## Current automated evidence, 9 October 2026

- Frontend: **39 tests passed across 12 files**, including all three supplied review regressions, late inference/reversed photo validation, exact text/byte/pixel bounds, operation-specific timeouts, immutable recovery, actual IDB v1 migration, UUID/digest conflicts, receipts/tombstones and automatic gateway behavior. Mock-native tests verify quota failure retains the native inbox, manual/automatic retry shares one request, and disabling sharing stops subsequent uploads. They do not prove native radio transfer.
- Backend: **36 tests passed**, one upstream Starlette/httpx deprecation warning, isolated temporary SQLite/uploads and explicit fixture mode. The receipt extension remains intact.
- Nine isolated Edge scenarios passed at 320/390/768/1440px: dashboard/detail/search, grouping/correction/verification reset/separation, editable fixture reporting, focus return and real browser Blob save/reload/one UUID acknowledgment. No horizontal overflow, uncaught page errors or fixture console errors; mobile buttons meet 44px touch targets.
- Actual HTTP integration passed against FastAPI/SQLite/multipart/photo endpoints with explicit backend fixture AI and matching disabled. It covers original/citizen edits, human review, backend restarts, deferred saves, repeated sync, receipt lookup and an old persisted invalid source receiving 422 then recovering through the UI into a new UUID. Original text/photo remain saved until replacement acknowledgment. Four intended server sources, no missing expected routes and no uncaught page errors.
- Production typecheck/build/Capacitor sync pass; native compilation/APK and four Gradle authentication tests pass. Final APK/checksum/source and lint evidence are in [Android build](android-build.md).

Screenshots and JSON results are external artifacts under the chat's `relay-browser` folder, with generated runtime files excluded from Git. Dashboard/phone queue/report screenshots were visually inspected. An initial HTTP recovery locator was ambiguous because the legacy textarea's accessible name included its contents; the explicit `Recovered description` label fixed it and the actual HTTP smoke reran successfully.

## Reproduce browser and HTTP checks

Fixture UI is an explicit development-only adapter. It shows an amber banner, fixture model label and synthetic illustration, resets on reload and is disabled in production. It never establishes genuine AI or embeddings.

Run a fixture dev server on 5173:

```powershell
cd frontend
$env:VITE_ENABLE_MOCKS='true'
npm run dev -- --port 5173
```

In another terminal, without fixture variables:

```powershell
cd frontend
npm run build
npm run preview -- --port 4173
```

Then run `npm run browser:check` and `npm run test:http` from frontend. The browser runner launches an isolated Microsoft Edge profile; install Playwright Chromium or set `RELIEFMESH_BROWSER_CHANNEL` if needed. `RELIEFMESH_BROWSER_OUTPUT` selects an external/ignored artifact directory. Fixture and production origins can be set with `RELIEFMESH_FIXTURE_URL`/`RELIEFMESH_PRODUCTION_URL`.

The HTTP runner starts and stops its own disposable fixture API on **8002**, preserving the user's frontend on 8001. Set `RELIEFMESH_HTTP_PORT` when needed. It uses the root `.venv`, temporary DB/uploads and semantic matching disabled; no paid inference is performed.

## Acceptance still open

No connected devices were listed by adb. Install the same APK on both physical phones and run every [two-phone relay check](nearby-relay.md#two-phone-demonstration-and-acceptance), plus native picker/cancel/permissions, force-close storage recovery, keyboard/safe areas/Back and LAN API access. Build success and mock-native behavior are not physical-device proof.

No reachable configured live ReliefMesh backend was available: 8000 health is 404 and 8002/8080 were unreachable outside the disposable test. This checkout has no backend `.env` and its process has no HF token. A reachable backend origin or backend-only environment-file path is required for the frontend genuine Hugging Face analyze/edit/save/review loop. The backend owner records separate live Gemma/semantic evidence; this frontend run used fixtures. Keep semantic unavailability disclosed until the chosen runtime/cache is verified. Deferred transport never automatically invokes AI.

The branch is reviewable with these limitations; full acceptance is incomplete. Do not merge main or deploy. PR creation previously failed with GitHub integration 403 `Resource not accessible by integration`; the pushed [compare view](https://github.com/printf-sourav/ReliefMesh/compare/main...feature/frontend-demo) remains available.
