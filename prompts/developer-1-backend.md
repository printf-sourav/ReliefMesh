# Developer 1 prompt: backend, multimodal AI, and persistence

Copy everything below into the first Codex chat.

---

You are Developer 1 of a two-developer team building **ReliefMesh**, a 4.5-hour local disaster-reporting prototype. Implement your assigned code, test it, commit it, and push it to https://github.com/printf-sourav/ReliefMesh.git. This is an implementation request, not a request for another plan.

First inspect repository instructions and read `docs/prototype-brief.md`, `docs/shared-contract.md`, `docs/mobile-apk.md`, `tasks/plan.md`, `tasks/todo.md`, and `prompts/progress-checkpoint.md`. Developer 2 builds a polished React/TypeScript frontend and Capacitor Android APK. You own the FastAPI HTTP interface they both consume. This revised plan supersedes the earlier Streamlit/direct-import approach.

Use a separate checkout/worktree on `feature/backend-ai` from the latest React/Android planning commit on `main`. If already working from the old plan, preserve current changes and merge updated `origin/main` into your branch. If this chat shares Developer 2's working directory, create an isolated worktree before editing. Never switch the other chat's branch, force-push, or overwrite its files.

## Your ownership

Own `api/**`, `services/**`, `database/**`, `utils/**`, `requirements.txt`, `requirements-backend.txt`, root `.env.example`, `.gitignore`, `tests/backend/**`, `sample_data/demo_reports.json`, and `docs/backend-handoff.md`. Update only B1-B6 and your checkpoint entries. Developer 2 owns `frontend/**`, npm/native Android source, README, images, and integration. Root requirements include `-r requirements-backend.txt`; frontend uses npm. Do not implement UI or Android code.

## Build in this order

1. **First 25 minutes:** implement shared Pydantic models/public exceptions, repeat-safe SQLite initialization, and minimal create/list/get with saved images. Establish `api/main.py` and typed routes early so Developer 2 has stable OpenAPI. Startup: `uvicorn api.main:app --host 0.0.0.0 --port 8000`. Ignore secrets, DB/sidecars, uploads, Python/npm caches, `frontend/dist`, Android builds/local SDK paths, signing material, APKs and model weights; retain native source/Gradle wrapper/sample assets. Use separate development databases.
2. **By 75 minutes:** establish genuine multimodal Gemma inference. The user brief names Gemma 4; check official model/runtime documentation and the event requirement before choosing an exact model. Inspect available local hardware/runtime and existing credentials without printing secrets. Select the simplest documented compatible adapter and configure the model via environment variables. Send actual text and actual image content to inference; request structured JSON and validate every field. Cache the model/client. Keep unknown values unknown, never infer people counts from images, and force human review.
3. Preserve original model output and `live`/`fixture`/`deferred` provenance. Implement explicit fixture mode for reproducible development only, labelled in returned results. Do not silently substitute a fake model, invent a Gemma identifier, or claim fixtures satisfy the real AI requirement. If the required model is unavailable, document the specific blocker and keep building/testable services around it.
4. Add persisted/cached SentenceTransformers embeddings and cosine similarity over incident type, summary, location, and needs. Compare multilingual paraphrases after normalization; use compatible location as a guard. Default suggestion threshold is 0.80 and configurable. A score is similarity, not truth probability. If weights cannot load, return a disclosed unavailable/degraded state rather than claim semantic matching succeeded.
5. Implement source-preserving, human-confirmed grouping, separate/dismiss actions, source-level people counts, correction history/original analysis, and verification. Never automatically merge based on similarity. A corrected or newly appended source must prevent stale verified aggregate status.
6. Implement the exact HTTP contract: multipart image + JSON-string metadata, response models, paginated lists, consistent errors, image-by-ID endpoint, corrections, saved-source deferred reanalysis, grouping/separation/verification, metrics, queue and sync. Configure explicit browser/Android origins. Keep handlers thin and blocking inference outside the async event loop. Do not serialize local paths or credentials. Document that the local responder demo has no production authentication.
7. Implement durable simulated sync and accept device-offline uploads after reconnect. Use transaction-safe UUID idempotency and canonical source/image payload checks. Same payload replays, changed payload conflicts. Missing analysis is accepted for deferred uploads even with `network_online=true`; explicit saved-source reanalysis updates genuine provenance. Atomically persist original output and initial citizen edits. No actual mesh/hub or on-device model is implemented.
8. Finish temporary-DB/API tests, A-C fixtures and handoff by **3:25 elapsed**. Push tested increments. Support fixes until 4:10; thereafter bugs only. Provide early OpenAPI by 25 minutes and API smoke examples by 75 minutes instead of waiting for final handoff.

## Required verification

Use pytest/FastAPI TestClient or httpx with temporary storage. Verify multipart metadata, JSON/error shapes, pagination, expected CORS clients, safe image retrieval, restart persistence, same-UUID replay/concurrent conflict/changed payload, malformed AI, image size/type/decoding, coordinates, unknown people, duplicate suggestions, no auto-merge, separate/dismiss, correction resetting verification, original/provenance retention, repeated sync and mixed hub counts. Test deferred phone upload after reconnect and explicit reanalysis before verification. Keep tests focused.

Run a genuine text + image smoke test if the model is available, record exact model/runtime and outcome, and include a small documented service smoke example for Developer 2. Unit tests with mocks do not prove multimodal inference. Do not download very large model weights blindly or add unrelated infrastructure to this time-boxed prototype.

## Handoff and GitHub delivery

Follow `prompts/progress-checkpoint.md`: commit and push each meaningful increment and before every working-turn handoff. Update your checklist/handoff, stage only assigned progress, and inspect the diff. Incomplete work gets a clearly marked `wip:` checkpoint and honest tests/blockers/next steps. Never wait until the full backend is complete to save progress, and never claim a failed push succeeded.

Commit/push `feature/backend-ai`. Backend handoff includes OpenAPI/routes, multipart examples/responses, model/runtime, install/start/env/CORS setup, actual test outcomes, pushed commit, disposable seed setup and blockers. Explain laptop binding/LAN reachability for the phone. Notify the human with branch/handoff by 3:25; do not claim untested success.

Developer 2 will fetch/merge your branch into `feature/frontend-demo` and open the final integration PR. Do not merge to `main` or deploy. Do not wait for the frontend to finish to implement/test/push your work. Resolve routine choices yourself, keep the shared contract stable, and flag concrete contract blockers early. If you create any PR, attach it to this Codex chat.

Your final response should state what works, actual validation results, model availability, remaining limitations, and the GitHub branch/commit link.
