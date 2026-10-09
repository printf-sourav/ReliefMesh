# Developer 1 prompt: backend, multimodal AI, and persistence

Copy everything below into the first Codex chat.

---

You are Developer 1 of a two-developer team building **ReliefMesh**, a 4.5-hour local disaster-reporting prototype. Implement your assigned code, test it, commit it, and push it to https://github.com/printf-sourav/ReliefMesh.git. This is an implementation request, not a request for another plan.

First inspect repository instructions and read `docs/prototype-brief.md`, `docs/shared-contract.md`, `tasks/plan.md`, and `tasks/todo.md`. The shared contract is the integration boundary with Developer 2, who builds the Streamlit UI in another Codex chat.

Use a separate checkout/worktree on `feature/backend-ai`, starting from the planning commit on `main`. If this chat shares Developer 2's working directory, create an isolated worktree before editing. Preserve existing user changes. Never switch branches underneath the other chat, force-push, or overwrite its files.

## Your ownership

Own `services/**`, `database/**`, `utils/**`, `requirements-backend.txt`, `.env.example`, `.gitignore`, `tests/backend/**`, `sample_data/demo_reports.json`, and `docs/backend-handoff.md`. Update only B1-B5 and your checkpoint entries in `tasks/todo.md`. Developer 2 owns app/pages/UI, root/UI requirements, README, image assets, and integration. Do not implement UI or invent an HTTP layer.

## Build in this order

1. **First 25 minutes:** implement shared validated models/public exceptions, repeat-safe SQLite initialization, and a minimal create/list/get path with saved images. Implement exactly the documented Python signatures. Add ignore rules for `.env`, local DB/SQLite sidecars, runtime uploads, caches, virtual environments, and model weights, while allowing illustrative sample assets. Use separate development databases for the two checkouts.
2. **By 75 minutes:** establish genuine multimodal Gemma inference. The user brief names Gemma 4; check official model/runtime documentation and the event requirement before choosing an exact model. Inspect available local hardware/runtime and existing credentials without printing secrets. Select the simplest documented compatible adapter and configure the model via environment variables. Send actual text and actual image content to inference; request structured JSON and validate every field. Cache the model/client. Keep unknown values unknown, never infer people counts from images, and force human review.
3. Preserve original model output and `live`/`fixture`/`deferred` provenance. Implement explicit fixture mode for reproducible development only, labelled in returned results. Do not silently substitute a fake model, invent a Gemma identifier, or claim fixtures satisfy the real AI requirement. If the required model is unavailable, document the specific blocker and keep building/testable services around it.
4. Add persisted/cached SentenceTransformers embeddings and cosine similarity over incident type, summary, location, and needs. Compare multilingual paraphrases after normalization; use compatible location as a guard. Default suggestion threshold is 0.80 and configurable. A score is similarity, not truth probability. If weights cannot load, return a disclosed unavailable/degraded state rather than claim semantic matching succeeded.
5. Implement source-preserving, human-confirmed grouping, separate/dismiss actions, source-level people counts, correction history/original analysis, and verification. Never automatically merge based on similarity. A corrected or newly appended source must prevent stale verified aggregate status.
6. Implement the simulated transport queue. Offline creation persists pending records and images. Repeated online sync delivers each report once; offline sync does nothing. No real mesh/hub is implemented. A remote inference adapter cannot analyze during real internet loss: support raw deferred reports, and document the limitation. Synchronization must never fabricate analysis.
7. Finish focused temporary-DB tests, A-C sample text fixtures, and backend handoff by **3:25 elapsed**. Push your branch in tested increments. Support integration fixes until 4:10; thereafter fix bugs only.

## Required verification

Test durable restart/reopen; double submission with the same UUID; malformed/unavailable AI output; valid image decoding/size/type; invalid coordinates; unknown reported people; location-aware duplicate suggestions; no automatic grouping; separate/dismiss behavior; correction resetting verification; preservation of original analysis; repeated offline/online synchronization; mixed pending/synced source counts. Keep tests focused on these behaviors.

Run a genuine text + image smoke test if the model is available, record exact model/runtime and outcome, and include a small documented service smoke example for Developer 2. Unit tests with mocks do not prove multimodal inference. Do not download very large model weights blindly or add unrelated infrastructure to this time-boxed prototype.

## Handoff and GitHub delivery

Commit and push `feature/backend-ai`. Write `docs/backend-handoff.md` with imports/signatures, model/runtime setup, dependency install, environment variables, test commands/results, exact pushed commit, how to initialize/seed a disposable database, and any known blockers. Notify the human with the branch link and handoff location by 3:25. Use explicit commands and observed results; do not mark untested features complete.

Developer 2 will fetch/merge your branch into `feature/frontend-demo` and open the final integration PR. Do not merge to `main` or deploy. Do not wait for the frontend to finish to implement/test/push your work. Resolve routine choices yourself, keep the shared contract stable, and flag concrete contract blockers early. If you create any PR, attach it to this Codex chat.

Your final response should state what works, actual validation results, model availability, remaining limitations, and the GitHub branch/commit link.
