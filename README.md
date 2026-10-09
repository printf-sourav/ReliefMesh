# ReliefMesh

A planned 4.5-hour prototype for turning multilingual citizen reports with images into structured incidents for human responders.

**Current status:** this repository contains the build brief and two Codex developer prompts. The application has not been implemented yet.

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

Run instructions, exact dependencies, model configuration, and demo limitations will be added after implementation. Intended commands from the repository root:

```powershell
pip install -r requirements.txt
uvicorn api.main:app --host 0.0.0.0 --port 8000
```

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

These commands describe the planned application; the source does not exist yet. Developer 2 must also build, install-test, and deliver `ReliefMesh-demo.apk`, or report the exact build/device blocker. Responsive screenshots alone do not satisfy APK delivery. The phone connects to a reachable backend; the APK does not bundle Python/Gemma.

See [the condensed prototype brief](docs/prototype-brief.md) for the agreed demo journey. Event rules quoted in the original pasted text have not been independently verified.
