# ReliefMesh

Frontend inference requests allow 120 seconds by default, aligned with the backend's default 90-second `RELIEFMESH_AI_TIMEOUT` plus upload/HTTP overhead. Set `VITE_ANALYSIS_TIMEOUT_MS` to the custom backend budget in milliseconds plus at least 30 seconds and rebuild when increasing that budget. Health uses 5 seconds, reads 15 seconds and uploads/mutations 60 seconds. An inference timeout retains the source and requires an explicit user decision before another paid analysis; transport never retries inference automatically.

A local prototype for turning multilingual citizen reports with images into structured incidents for human responders.

**Current status:** `main` is the final integrated demo branch. The browser contains only the responder dashboard; the Android APK contains simple Report/My reports screens. Full FastAPI routes, human review and native foreground Nearby relay are integrated. The APK is built, verified and installed on one Android 16 phone. Frontend/API/browser/native checks pass, and an earlier real Hugging Face frontend loop is verified. Two-phone acceptance remains untested; the user deferred it. [UI split](docs/web-mobile-ui-split.md), [Render hosting steps](docs/host-demo-render.md), and [frontend handoff](docs/frontend-handoff.md) record the current behavior and limitations. Hosting configuration deploys from `main`; the Render service is not deployed yet.

## Start two Codex chats

Use a separate checkout or Codex worktree for each chat. Do not run both developers in the same working directory.

1. Give the first chat the entire [Developer 1 prompt](prompts/developer-1-backend.md). It owns AI, SQLite, duplicate suggestions, human-confirmed clusters, and simulated synchronization.
2. Give the second chat the entire [Developer 2 prompt](prompts/developer-2-frontend.md). It owns the React application, mobile layouts, Android APK, demo, and final integration.
3. Both chats must read the [shared contract](docs/shared-contract.md), [execution plan](tasks/plan.md), and their assigned [tasks](tasks/todo.md).

Both prompts require committing/pushing progress throughout the work and at each working-turn handoff. To reinforce this in an existing chat, paste [the progress checkpoint prompt](prompts/progress-checkpoint.md). Unfinished progress is saved as a labelled WIP commit on the developer's own branch with test outcomes and next steps.

Developer 1 uses `feature/backend-ai`; Developer 2 uses `feature/frontend-demo`. Start both from the latest planning commit on `main`, including the React/Android revision. If work has already started from the older commit, merge the updated `origin/main` into each branch before continuing. Developer 2 integrates Developer 1's completed branch, validates the web and APK demos, and opens the final integration pull request.

## Technology and design

| Layer | Choice |
| --- | --- |
| Web and mobile UI | React + TypeScript + Vite |
| Styling and components | Tailwind CSS + shadcn/ui + Lucide icons |
| Android packaging | Capacitor; installable debug APK for the demonstration |
| API and AI | FastAPI + Python + Gemma multimodal inference |
| Server persistence | SQLite + local image files |
| Device offline storage | IndexedDB with the `idb` helper, including image blobs |

Use one shared frontend with separate responder-web and citizen-phone routes. Follow the [current UI contract](docs/web-mobile-ui-split.md) and [Android delivery specification](docs/mobile-apk.md). No Streamlit frontend or separate React Native app is required.

## Prototype scope

- Required text, image, and location; optional coordinates.
- Genuine Gemma text/image analysis into validated JSON, followed by an editable citizen preview.
- SQLite persistence, embedding-based possible duplicates, and human-confirmed grouping.
- A simulated offline transport queue with repeat-safe synchronization.
- Responder metrics, source reports, images, corrections, and verification.
- A polished mobile reporting experience and an actual Android APK with bundled frontend assets.

Voice, resource matching, actual device mesh networking, and deployment are outside the initial build.

The user subsequently authorized automatic Android nearby relay through Google Nearby Connections. Its foreground implementation, one-time group setup and separate storage/delivery states follow [the relay extension](docs/nearby-relay.md). One-phone discovery and pause/resume are verified; actual peer transfer remains unverified. The user also requested demo hosting, for which [Render configuration and instructions](docs/host-demo-render.md) are now provided.

The supplied brief names **Gemma 4**. Developers must verify the event-required model and available multimodal runtime before choosing an implementation; no unverified model identifier is prescribed here. Fixture analysis can support UI development but cannot prove the live AI requirement.

## Running the app

From the final `main` checkout, create a separate Python environment and install the pinned backend requirements:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev -- --port 8001
```

On macOS/Linux use `.venv/bin/python`. Copy the root `.env.example` to ignored `.env` and configure the model/provider on the backend only; review [backend setup and availability](docs/backend-handoff.md). Never put tokens into `VITE_*`. Default analysis mode is live, and API health does not prove inference. Explicit backend fixture mode supports only the documented A-C sample reports.

The browser dev server proxies `/api` to `127.0.0.1:8000`. A production preview or APK needs `VITE_API_BASE_URL` (an origin without `/api/v1`) at build time or a saved origin in Connection settings. On a physical phone use a reachable laptop LAN/HTTPS address; phone localhost is the phone. Bind the API to `0.0.0.0` and configure explicit CORS clients. Responder routes have no production authentication; use a trusted demo network.

This checkout's final check found an unrelated GroundOne API already on port 8000, returning 404 for ReliefMesh routes. Leave it running. Start ReliefMesh with `--port 8002` (or another free port), then save `http://127.0.0.1:8002` in Connection settings; use the laptop LAN equivalent for a phone. API paths remain `/api/v1`.

For UI development only, `VITE_ENABLE_MOCKS=true` enables labelled private fixtures in the dev server. It never activates on network failure and is disabled in production builds. Synthetic illustrations and preset output do not establish model inference.

Frontend checks: `npm run typecheck`, `npm test`, `npm run build`. The browser runner is `npm run browser:check`; [the UI contract](docs/web-mobile-ui-split.md) describes its separate responder/citizen fixture and production preview servers and [demo verification](docs/demo.md) describes isolated Edge/Playwright setup.

APK build commands:

```powershell
cd frontend
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

Native source uses app ID `org.reliefmesh.app`, SDK 35 and JDK 21, with bundled production `dist`. Local HTTP/mixed content is permitted only in debug configuration. Android build/unit checks pass with a workspace-local ignored toolchain. The latest APK checksum/source is in [the verification manifest](docs/frontend-review-evidence/apk-verification.json); [phone UI evidence](docs/frontend-review-evidence/android-ui-split.json) records its installation and citizen-only routes. The APK bundles React, while Python/Gemma stays on the backend.

Offline behavior: an unreachable API retains text/photo/UUID in device IndexedDB. Failed/unknown deliveries stay on the phone until a matching acknowledgment. Deferred reports require explicit saved-source analysis after delivery. In Android, open My reports → Share nearby and use the same team name/code on both phones. Authenticated transfers and gateway retries operate with sharing enabled in the foreground; peer storage or a relay delivery hint retains the original until its own same-payload API confirmation. Without sharing enabled, use Try sending now after reconnecting. Pending server reports can be brought into the web dashboard by responders. On-device inference and guaranteed background delivery are outside this implementation.

See [the condensed prototype brief](docs/prototype-brief.md) for the agreed demo journey. Event rules quoted in the original pasted text have not been independently verified.

Latest continued delivery: [verified APK, live UI and Android evidence](docs/integration-continuation-2026-10-09.md), [draft PR #1](https://github.com/printf-sourav/ReliefMesh/pull/1). The separate local APK is `artifacts/ReliefMesh-demo.apk`; tokens/signing material/binaries remain outside Git. One Android 16 phone passes installation, discovery, offline restart persistence and automatic receipt-confirmed gateway upload. Actual transfer between two phones still needs a second device. Local session frontend is on 8001 with a loopback ReliefMesh API on 8080; API access from the connected phone uses `adb reverse`, preserving the unrelated port-8000 service.
