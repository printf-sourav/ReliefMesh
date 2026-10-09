# Build tasks and acceptance checklist

The unchecked entries are implementation work for the two future Codex chats, not work claimed complete by the planning commit. Each developer updates only their assigned tasks. Use temporary databases for automated checks.

## B1 - Backend foundation (Developer 1)

Files: `utils/schemas.py`, `database/db.py`, `services/incident_service.py`, `requirements-backend.txt`, `.gitignore`. Dependencies: shared contract. Scope: medium.

- [ ] Validated shared models and public exceptions implement the exact contract.
- [ ] Init/create/list/get use SQLite and durable image storage; retrying a UUID returns one source record.
- [ ] Verify temporary-DB persistence after reopening, invalid inputs, and retry behavior.

## B2 - Genuine multimodal analysis (Developer 1)

Files: `services/gemma_service.py`, `.env.example`, backend requirements, `tests/backend/test_analysis.py`. Dependencies: B1 types. Scope: medium.

- [ ] Verify the required Gemma version/runtime with official docs; actual text and image both reach live inference.
- [ ] Validate output; preserve unknowns and force human review; fixture provenance is explicit.
- [ ] Verify malformed JSON/provider failures and a genuine image + Hinglish smoke example; record hardware/runtime and outcome.

## U1 - Citizen workflow (Developer 2)

Files: `app.py`, `pages/citizen.py`, `ui/dev_fixtures.py`, `requirements-ui.txt`, `requirements.txt`. Dependencies: contract; B1/B2 for live connection. Scope: medium.

- [ ] Required inputs, image preview, validation, editable structured analysis, and separate Analyze/Submit steps work.
- [ ] Draft UUID is stable through reruns/retries; edits do not overwrite original AI output or provenance.
- [ ] Verify fixture flow first, then live Analyze/Submit; edited input invalidates stale analysis.

## Checkpoint 1 - First live source (both)

- [ ] By 1:15, align shapes and connect a genuine multimodal result to a saved report; disclose any model blocker.

## B3 - Duplicate suggestions and grouping (Developer 1)

Files: `services/embedding_service.py`, incident service, DB module, `tests/backend/test_duplicates.py`. Dependencies: B1/B2. Scope: medium.

- [ ] Cached embeddings and cosine similarity produce location-aware suggestions; unavailable matching is disclosed.
- [ ] Reports group only after confirmation; separation/dismissal preserves sources and avoids recurring rejected suggestions.
- [ ] Verify similar paraphrases suggest a match, distant/unrelated reports do not, and creation never auto-merges.

## U2 - Responder inspection (Developer 2)

Files: `pages/responder.py`, `ui/components.py`, `tests/ui/test_responder.py`. Dependencies: contract; B1/B3 for live connection. Scope: medium.

- [ ] Metrics, cluster list, detail, source text/photos, needs/languages, and per-source people counts render.
- [ ] Pending local sources are distinguished from simulated delivered hub records; loading/empty/error states are clear.
- [ ] Verify unknown people stay unknown, source overlap is not summed, and live records survive app restart.

## B4 - Review and simulated sync (Developer 1)

Files: incident service, `services/sync_service.py`, DB module, `tests/backend/test_sync_review.py`. Dependencies: B1/B3. Scope: medium.

- [ ] Corrections retain original output; verification resets on correction; pending queue survives restart.
- [ ] Offline sync does nothing; online sync delivers each pending UUID once and leaves deferred analysis honest.
- [ ] Verify repeated sync/retry, corrections, mixed-state cluster aggregation, and new sources in verified groups.

## U3 - Review controls and transport demo (Developer 2)

Files: citizen/responder pages, app entry point, UI components. Dependencies: U1/U2 and B3/B4. Scope: medium.

- [ ] Confirm grouping, keep separate, correct, and verify actions call the shared services.
- [ ] Simulated transport toggle displays pending count, delivery feedback, and live/fixture/deferred labels.
- [ ] Verify offline submission -> restart -> restore -> dashboard -> human review with real services.

## Checkpoint 2 - Branch handoff by 3:25 (both)

- [ ] Developer 1: backend tests pass; push branch with signatures, setup, live model evidence and blockers in backend handoff.
- [ ] Developer 2: fixture UI is demonstrable; commit frontend before integrating backend; preserve both task updates.

## B5 - Backend reproducibility (Developer 1)

Files: `docs/backend-handoff.md`, `sample_data/demo_reports.json`, backend tests/requirements. Dependencies: B1-B4. Scope: medium.

- [ ] Document exact dependency/runtime configuration, inference/embedding model IDs, setup commands, and mode limitations.
- [ ] Include illustrative A-C source reports and focused service smoke commands without secrets or real personal data.
- [ ] Verify from clean temporary storage and hand off the pushed branch commit.

## U4 - Integration and demo package (Developer 2)

Files: `README.md`, `docs/demo.md`, `docs/frontend-handoff.md`, `sample_data/images/**`, `tests/ui/test_flow.py`. Dependencies: B5, U1-U3. Scope: medium.

- [ ] Integrate backend branch, remove default fixture wiring, and document one reproducible install/run path and asset provenance.
- [ ] Run full A-D acceptance flow, offline persistence, repeated sync, human grouping and correction/verification checks.
- [ ] Publish both developer branches and final integration PR/compare link with test outcomes and explicit remaining limitations.

## Checkpoint 3 - Freeze at 4:10, finish by 4:30 (both)

- [ ] Core loop passes with genuine Gemma multimodal inference, or live inference is explicitly reported blocked.
- [ ] Demo distinguishes simulated transport, AI suggestions, fixture data, and human-verified facts.
- [ ] No secrets/databases/uploads/model weights are tracked; final branch is reviewable and demo rehearsed.
