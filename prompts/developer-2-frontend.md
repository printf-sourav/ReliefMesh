# Developer 2 prompt: Streamlit UI, demo, and final integration

Copy everything below into the second Codex chat.

---

You are Developer 2 of a two-developer team building **ReliefMesh**, a 4.5-hour local disaster-reporting prototype. Implement the Streamlit experience, integrate Developer 1's backend, test the complete demo, commit, and push to https://github.com/printf-sourav/ReliefMesh.git. This is an implementation request, not a request for another plan.

First inspect repository instructions and read `docs/prototype-brief.md`, `docs/shared-contract.md`, `tasks/plan.md`, and `tasks/todo.md`. Developer 1 implements the shared service contract in another Codex chat; consume those Python interfaces directly.

Use a separate checkout/worktree on `feature/frontend-demo`, starting from the same planning commit on `main` as Developer 1. If both chats share a working directory, create an isolated worktree before editing. Preserve user changes; never switch the other chat's branch or force-push.

## Your ownership

Own `app.py`, `pages/**`, `ui/**`, `requirements.txt`, `requirements-ui.txt`, `README.md`, `tests/ui/**`, `sample_data/images/**`, `docs/demo.md`, and `docs/frontend-handoff.md`. Update only U1-U4 and your checkpoint entries in `tasks/todo.md`. Developer 1 owns services/database/utils and backend configuration/dependencies. Do not add stub backend files, change service signatures independently, or build a separate API server.

Make root `requirements.txt` include both `-r requirements-backend.txt` and `-r requirements-ui.txt` so the integrated project has one install command. Until the backend file arrives, document installing UI requirements separately. Preserve links to the developer prompts and planning documents when adding runtime instructions to README.

## Build in this order

1. **First 25 minutes:** build Streamlit navigation and clear citizen/responder pages. Avoid duplicate auto-discovered/custom navigation. Use private, clearly labelled UI fixtures in `ui/dev_fixtures.py` to work immediately against the exact documented shapes. Fixture selection must be explicit; the final default uses real services. Backend import/configuration failures must produce actionable messages, never silent fixture fallback.
2. **By 75 minutes:** finish citizen reporting: required text/image/location, optional coordinates, safe image preview, clear validation, an Analyze action, editable structured preview, and a separate Submit action. Retain a stable per-draft UUID across reruns/retries. Store original `AnalysisResult` separately from edited fields; create the source with the original result, then apply corrections via the shared service. Editing text/image/location invalidates stale analysis. Avoid resubmission on rerun; allow a deliberate new report to generate a new UUID. Show live/fixture/deferred provenance and human-review status visibly.
3. Build responder metrics and cluster cards with location, needs, languages, report/photo counts, first/latest times, and pending/verified state. Detail includes original text, model observations, citizen corrections, and source photos. Show reported people per source with unknowns intact; never sum overlapping sources into a unique population count. Filter hub detail to synced sources; show the local queue separately.
4. Add explicit human confirmation for grouping, keep separate/dismiss, editable corrections, and verification controls. All actions call Developer 1's services. Explain that similarity indicates a possible related report and is not a probability that a report is true. Preserve source inspection before verification.
5. Add a clearly labelled **simulated transport** online/offline toggle, durable pending queue display, restoration action/feedback, and repeat-safe sync. Render the service's newly delivered IDs/count; repeated actions must not claim the same report was delivered again. Real offline analysis requires local inference. If a remote model is used, offer raw deferred offline submission or analyze before toggling transport offline, and disclose the difference in UI/demo documentation. Do not fabricate a live offline AI result.
6. Prepare controlled A-D demo cases and suitable licensed or explicitly synthetic flood images, documenting source/provenance. Show clear empty/loading/error states and readable, accessible layouts that work on a narrow screen. Voice and resource matching are stretch scope after the core loop; do not implement mesh networking or unrelated product features.
7. **At 3:25:** commit your frontend work, fetch `origin`, and merge `origin/feature/backend-ai` into your branch when its handoff is available. Inspect handoff/setup, preserve both developers' checklist updates, connect actual services, and resolve integration defects. Do not cherry-pick arbitrary partial commits or modify backend files concurrently while Developer 1 is still editing them; coordinate a specific handoff commit. Make backend fixes after handoff only when required to complete integration, and explain them.
8. **By 4:10:** finish real-service acceptance, README setup/model dependencies/architecture/limitations, `docs/demo.md` with a 90-second walkthrough, and frontend handoff. Freeze features; spend the last 20 minutes on bug fixes, reproducibility, and rehearsal.

## Required verification

Use Streamlit AppTest where practical plus manual browser checks. Verify required input errors, image preview, analysis edit/retry behavior, stale-analysis invalidation, double-click/rerun repeat safety, original-output/provenance retention, correct metrics, source-level people counts, group/separate/correct/verify actions, pending queue visibility, and actionable failure messages.

Run Developer 1's backend test suite after merge. Demonstrate A and B as similar reports that remain separate until human confirmation; C as Hinglish + image structured analysis; D as offline submit -> application restart -> restore -> one delivery -> responder inspection -> verify. Repeating sync must return no newly delivered records. Test genuine multimodal inference where available; disclose any unavailable model instead of claiming the MVP is fully met. Report actual outcomes and commands.

## GitHub delivery and final integration

Push tested increments to `feature/frontend-demo`. Once integrated, push the completed branch and open a single PR to `main` titled `feat: build ReliefMesh multimodal reporting prototype`. Describe implemented behavior, AI model/runtime, validation evidence, simulated transport, and unresolved limitations. If PR tooling is unavailable, provide the GitHub compare link for the pushed branch. Attach any created PR to this Codex chat. Leave the PR reviewable; do not merge to `main` or deploy without an explicit user request in this development chat.

Do not wait idle for backend work; build against your labelled private fixtures, then integrate. Resolve routine choices yourself, keep the shared contract stable, and report concrete blockers early. Your final response must include app run instructions, what passed, known limitations, and the pushed branch/PR link. A fixture-only demo must be described as incomplete for the live Gemma requirement.
