# ReliefMesh

Frontend inference requests allow 120 seconds by default, aligned with the backend's default 90-second `RELIEFMESH_AI_TIMEOUT` plus upload/HTTP overhead. Set `VITE_ANALYSIS_TIMEOUT_MS` to the custom backend budget in milliseconds plus at least 30 seconds and rebuild when increasing that budget. Health uses 5 seconds, reads 15 seconds and uploads/mutations 60 seconds. An inference timeout retains the source and requires an explicit user decision before another paid analysis; transport never retries inference automatically.

A local prototype for turning multilingual citizen reports with images into structured incidents for human responders.

**Current status:** the responsive reporting/review/queue UI, reviewed source-consistency fixes, full FastAPI routes and native authenticated Nearby relay are integrated on `feature/frontend-demo`. Frontend, actual HTTP/SQLite/fixture-analysis and Android compilation/unit checks pass; a debug APK has built. Physical two-phone acceptance and a frontend live-provider loop remain incomplete. See [frontend handoff](docs/frontend-handoff.md), [backend handoff](docs/backend-handoff.md), [demo checks](docs/demo.md), and [Android build and artifact](docs/android-build.md) for actual evidence.

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

Use one shared frontend with purpose-built desktop and phone layouts. Follow the [visual design brief](docs/ui-design.md) and [Android delivery specification](docs/mobile-apk.md). No Streamlit frontend or separate React Native app is required.

## Prototype scope

- Required text, image, and location; optional coordinates.
- Genuine Gemma text/image analysis into validated JSON, followed by an editable citizen preview.
- SQLite persistence, embedding-based possible duplicates, and human-confirmed grouping.
- A simulated offline transport queue with repeat-safe synchronization.
- Responder metrics, source reports, images, corrections, and verification.
- A polished mobile reporting experience and an actual Android APK with bundled frontend assets.

Voice, resource matching, actual device mesh networking, and deployment are outside the initial build.

The user subsequently authorized automatic Android nearby relay through Google Nearby Connections. Its foreground implementation, one-time group setup and separate storage/delivery states follow [the relay extension](docs/nearby-relay.md). Browser builds explain that real nearby transfer requires Android; physical radio behavior remains unverified.

The supplied brief names **Gemma 4**. Developers must verify the event-required model and available multimodal runtime before choosing an implementation; no unverified model identifier is prescribed here. Fixture analysis can support UI development but cannot prove the live AI requirement.

## Running the app

From the integrated feature checkout, create a separate Python environment and install the pinned backend requirements:

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

Frontend checks: `npm run typecheck`, `npm test`, `npm run build`. The reproducible browser runner is `npm run browser:check`; see [demo verification](docs/demo.md) for its two test servers and isolated Edge/Playwright setup.

APK build commands:

```powershell
cd frontend
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

Native source uses app ID `org.reliefmesh.app`, SDK 35 and JDK 21, with bundled production `dist`. Local HTTP/mixed content is permitted only in debug configuration. Android build/unit checks now pass with a workspace-local ignored toolchain; earlier missing-Java/SDK results are superseded. Artifact checksum/source and installation instructions are recorded in [Android build status](docs/android-build.md). No connected adb device was found. The APK bundles React, while Python/Gemma stays on the backend.

Offline behavior: a reachable API with simulated transport offline stores a backend pending source; an unreachable API retains text/photo/UUID in device IndexedDB. Failed/unknown deliveries stay in the device queue until a matching acknowledgment. Deferred reports require explicit saved-source analysis after delivery. In Android, enable Nearby Sharing in Queue after joining the same group on both phones. Authenticated transfers and API gateway retries operate in the foreground; peer storage or a relay delivery hint retains the origin's copy until its own same-payload API confirmation. On-device inference and guaranteed background delivery are outside this implementation.

See [the condensed prototype brief](docs/prototype-brief.md) for the agreed demo journey. Event rules quoted in the original pasted text have not been independently verified.

Latest continued delivery: [verified APK, live UI and Android evidence](docs/integration-continuation-2026-10-09.md), [draft PR #1](https://github.com/printf-sourav/ReliefMesh/pull/1). The separate local APK is `artifacts/ReliefMesh-demo.apk`; tokens/signing material/binaries remain outside Git. One Android 16 phone passes installation, discovery, offline restart persistence and automatic receipt-confirmed gateway upload. Actual transfer between two phones still needs a second device. Local session frontend is on 8001 with a loopback ReliefMesh API on 8080; API access from the connected phone uses `adb reverse`, preserving the unrelated port-8000 service.
