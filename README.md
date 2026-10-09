# ReliefMesh

A local prototype for turning multilingual citizen reports with images into structured incidents for human responders.

**Current status:** the responsive React reporting/review/queue UI and Capacitor native source are implemented. The early FastAPI persistence/analysis checkpoint is integrated on `feature/frontend-demo`. Live Gemma, full backend review/matching/sync, and Android APK installation acceptance are still incomplete. See the exact results in [frontend handoff](docs/frontend-handoff.md), [backend handoff](docs/backend-handoff.md), [demo checks](docs/demo.md), and [Android build status](docs/android-build.md).

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
npm run dev
```

On macOS/Linux use `.venv/bin/python`. Copy the root `.env.example` to ignored `.env` and configure the model/provider on the backend only; review [backend setup and availability](docs/backend-handoff.md). Never put tokens into `VITE_*`. Default analysis mode is live, and API health does not prove inference. Explicit backend fixture mode supports only the documented A-C sample reports.

The browser dev server proxies `/api` to `127.0.0.1:8000`. A production preview or APK needs `VITE_API_BASE_URL` (an origin without `/api/v1`) at build time or a saved origin in Connection settings. On a physical phone use a reachable laptop LAN/HTTPS address; phone localhost is the phone. Bind the API to `0.0.0.0` and configure explicit CORS clients. Responder routes have no production authentication; use a trusted demo network.

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

Native source uses app ID `org.reliefmesh.app` and bundles `dist`; it does not point at a Vite server. Local HTTP/mixed content is permitted only in debug configuration. **No APK artifact exists yet:** this machine's Gradle build fails because `JAVA_HOME` and `java` are missing; Android SDK/adb were also not found. Compilation and device testing remain separate requirements. The APK bundles React, while Python/Gemma stays on the backend.

Offline behavior: a reachable API with simulated transport offline stores a backend pending source; an unreachable API retains text/photo/UUID in device IndexedDB. Failed/unknown deliveries stay in the device queue until a matching acknowledgment. Deferred reports remain analysis-pending after delivery and require explicit saved-source analysis. No peer mesh, on-device model, guaranteed background sync or deployment is implemented.

See [the condensed prototype brief](docs/prototype-brief.md) for the agreed demo journey. Event rules quoted in the original pasted text have not been independently verified.
