# Build tasks and acceptance checklist

This React/FastAPI/Android revision replaces the earlier Streamlit plan for the same prototype. Each developer updates only assigned entries. Reconcile any already-completed work from existing branches rather than discarding it. Follow [progress checkpoints](../prompts/progress-checkpoint.md) throughout.

## B1 - Persistence foundation (Developer 1)

Files: schemas, DB, incident service, backend requirements, gitignore. Dependencies: contract. Scope: medium.

- [x] Validated shared models and SQLite init/create/list/get with image storage work.
- [x] Atomic UUID replay/conflict handling preserves original output and initial edits together.
- [x] Verify restart, invalid inputs, same/changed payload retries and file cleanup on failure (7 persistence tests pass).

## B2 - FastAPI boundary (Developer 1)

Files: API main/routes, root requirements/env, API tests. Dependencies: B1. Scope: medium.

- [x] Multipart routes, JSON/error envelopes, pagination, health/OpenAPI are available early.
- [x] Safe image-by-ID route and explicit browser/Android origins work.
- [x] Verify metadata, errors, CORS, pagination and invalid/oversized images with TestClient/httpx.

## B3 - Genuine multimodal analysis (Developer 1)

Files: Gemma service, config/requirements, analysis tests. Dependencies: B1/B2. Scope: medium.

- [x] Verify required model/runtime; actual image and text reach inference; unknowns stay unknown.
- [x] Explicit live/fixture/deferred provenance, originals and saved-source reanalysis are supported.
- [x] Verify provider/malformed errors and genuine Hinglish/image smoke (Hugging Face Gemma 4 31B live request passed; recorded in backend handoff).

## U1 - React shell and design (Developer 2)

Files: frontend package/config, app shell/styles, API client/types. Dependencies: contract/design brief. Scope: separate shell/config and API-client increments.

- [x] React/TypeScript/Tailwind/shadcn and tokens implement desktop/phone design direction. Sidebar, metrics/list/detail and phone form/bottom navigation visually checked; local Manrope bundled.
- [x] Typed HTTP client, labelled opt-in mocks, browser proxy and APK API setting follow contract. Checkpoint 1: typed client and settings implemented; health fixture only; live contract validation pending.
- [x] Verify typecheck/build, navigation and 320/390/768/1440px layouts. Edge browser checks pass at all four widths, no horizontal overflow; build/typecheck pass.

## U2 - Early Android package (Developer 2)

Files: Capacitor config, Android source/wrapper, npm scripts, frontend env. Dependencies: U1 minimal shell. Scope: generated native project plus focused config.

- [x] Verify SDK/JDK/Node/Capacitor by 0:25; build minimal APK by 0:45 or record concrete blocker. Early missing-Java/SDK result recorded. On resumed work, workspace-local JDK 21/SDK 35 provisioned and debug APK/native unit build passed; physical devices remain absent.
- [ ] Bundled app opens without Vite server; routing/name/ID and API reachability are correct.
- [x] Record Gradle output separately from actual emulator/device installation/launch. Gradle testDebugUnitTest/assembleDebug passed; adb lists no devices, so no installation/launch claim.

## U3 - Citizen report (Developer 2)

Files: report page, form components, API client, form tests. Dependencies: U1; B2/B3 for live flow. Scope: medium.

- [x] Required inputs, image picker/preview, optional coordinates, editable analysis and Submit work. Connected UI and focused form tests pass; actual browser/Android checks pending.
- [x] Stable UUID survives retry; changed source invalidates stale output; original/edited analyses remain separate. Queue and form tests verify retry UUID and separate payloads.
- [ ] Verify invalid input, double-click/timeout, picker cancel, provenance and live multipart requests.

## Checkpoint 1 - First live API report (both)

- [x] Developer 1: genuine text/image inference and API persistence are verified independently; frontend connection remains Developer 2's checkpoint.
- [ ] Developer 2 records early APK build outcome before extensive polish.
- [ ] Both update handoff/checklist, commit progress and push owned branches.

## B4 - Duplicate suggestions and grouping (Developer 1)

Files: embedding/incident services, DB, duplicate tests. Dependencies: B1/B3. Scope: medium.

- [x] Cached/persisted embeddings yield location-aware suggestions; unavailable matching is disclosed.
- [x] Human grouping/separation preserves sources/dismissals and avoids summing people.
- [x] Verify related/unrelated cases, no automatic merge and repeat-safe membership (real CPU model: A/B 0.984567, same-location fire 0.541896; details in backend handoff).

## U4 - Dashboard and review (Developer 2)

Files: dashboard/detail pages, components, API client, review tests. Dependencies: U1; B2/B4 for live flow. Scope: separate list/detail and control increments.

- [x] Polished desktop/phone metrics, sources/photos, needs, language, dates and per-source counts render. Fixture screenshots and real browser interaction checked; API integration pending.
- [x] Human grouping, separate, correction, deferred analysis and verification call real routes. Actual HTTP/SQLite browser smoke passed with explicit backend fixture AI; deferred verification rejection and correction reset verified.
- [x] Verify states, hub filtering, keyboard/focus, touch and source inspection. Browser layouts/navigation/dialog focus and source inspection pass; native device checks remain under U5/U6.

## B5 - Review integrity and sync (Developer 1)

Files: incident/sync services, routes, DB, sync/review tests. Dependencies: B1-B4. Scope: medium.

- [x] Corrections preserve originals/reset verification; deferred sources need analysis before verification.
- [x] SQLite queue survives restart; repeated sync delivers once; reconnect accepts raw deferred phone uploads.
- [x] Verify changed-network retries, offline no-op, mixed hub counts and deferred reanalysis.

## U5 - Device queue and phone behavior (Developer 2)

Files: queue storage/service/page, transport adapter, queue tests, Android config. Dependencies: U2/U3, B2/B5. Scope: separate storage/retry and native finish increments.

- [x] IndexedDB commits UUID/text/location/image Blob/result/edits and handles quota errors. Four queue tests and form quota-failure check pass; browser restart/Android checks pending.
- [x] Device/server pending states differ; acknowledgment-before-dequeue and retries create one source. Actual browser Blob/reload + stub HTTP acknowledgment scenario passes; API/Android acceptance pending.
- [ ] Verify APK cold start, picker/keyboard/safe-area/Back, unreachable-API save, force-close/reopen and reconnect.

## Checkpoint 2 - Branch handoff by 3:25 (both)

- [x] Developer 1 tests pass; backend handoff includes OpenAPI/examples/setup/live-model evidence and is delivered with the final backend branch checkpoint.
- [ ] Developer 2 has web/phone fixture screens, durable queue and populated APK; commit before merge.
- [ ] Both preserve/commit progress and push branch checkpoints.

## B6 - Backend reproducibility (Developer 1)

Files: handoff, sample report JSON, tests/requirements. Dependencies: B1-B5. Scope: medium.

- [x] Document models/runtime, install/start/CORS/env, multipart examples and actual test results (32 tests, live HTTP loop, real multilingual embeddings).
- [x] Include illustrative A-C reports and disposable seed setup without personal data/secrets.
- [x] Verify isolated temporary storage and repeat-safe seed; deliver exact pushed handoff commit to the human with this backend checkpoint.

## U6 - Integrated web/APK delivery (Developer 2)

Files: README, demo/frontend/Android handoffs, sample images, integration checks. Dependencies: B6/U1-U5. Scope: separate validation and documentation/artifact increments.

- [x] Merge backend; default uses real HTTP; document frontend/backend/API-origin setup. Backend e3b2ccc integrated; real multipart/image/review/deferred/sync HTTP smoke passes; README/handoff updated.
- [ ] Verify A-E and screenshots, typecheck/build/backend suite, actual APK and device behavior.
- [ ] Deliver APK link/checksum/source commit and separate installation evidence; push branch and final PR/compare link.

## Checkpoint 3 - Freeze 4:10, finish 4:30 (both)

- [ ] Genuine live-AI loop passes, or inference blocker is explicitly reported.
- [ ] Desktop/phone finish gate and APK build/install outcomes are honest and separate.
- [ ] No secrets/generated runtime artifacts tracked; progress committed/pushed with final handoff.

### Developer 2 saved handoff — 9 October 2026

- [x] Frontend milestones and backend integration committed/pushed on `feature/frontend-demo`; tested source `6ef4ec6`, subsequent documentation checkpoint records final delivery.
- [x] Recorded actual results: 14 frontend tests, 32 backend tests, 9 browser scenarios, typecheck/build/native sync and actual HTTP/SQLite/restart/review/sync smoke pass. Zero fixture console/uncaught page errors.
- [x] Reported blockers and next action: missing Java/SDK/adb/device prevents APK; local 8000 is an unrelated API, so configure a separate ReliefMesh port/provider for live UI acceptance. PR connector returns 403; pushed compare view supplied.
- [ ] APK binary/checksum/install and native scenario E completed.
- [ ] Frontend genuine live-provider loop and final-runtime semantic availability verified.

## Authorized extension - Automatic nearby relay

The user explicitly expanded scope after the original prototype freeze. Use `docs/nearby-relay.md` and `prompts/nearby-relay-frontend.md`; existing completed tasks remain intact.

- [x] Developer 1: typed receipt lookup and relay retry/conflict/provenance/restart tests; 36 backend tests pass and live receipt route checked.
- [x] Developer 1: publish automatic Nearby protocol/frontend-native handoff and a recheck of frontend build, 12 tests and real browser HTTP/queue flow.
- [ ] Developer 2: merge the complete backend; add native Nearby plugin/group authentication/automatic accept and foreground transfer, durable relay storage, receipts and nearby UI.
- [ ] Developer 2: build APK and prove automatic two-phone photo/report relay, interrupted-transfer recovery and one server source after gateway/origin retries.

### Developer 2 review fixes and relay implementation

- [x] Imported backend receipt extension c8f4d45, preserving completed frontend and backend checklist entries.
- [x] Reproduce and fix photo validation/inference races, operation timeouts and backend validation limits; add immutable rejected-source recovery. All three supplied regressions failed before fixes and pass now; 29 frontend tests/typecheck/build pass.
- [ ] Implement and test native authenticated nearby sharing, durable packages/inboxes and foreground gateway delivery.
- [ ] Recheck this host, build APK, verify live frontend loop and record physical two-phone outcomes separately.

### Nearby WIP evidence

- [x] Preserve packages, digest/UUID deduplication, receipt distinctions and actual IDB v1 migration in source; expanded frontend suite passes 39 tests, including automatic gateway, native-inbox quota retention, shared manual/automatic upload and stop-during-upload checks.
- [x] Provision ignored JDK 21/SDK 35 and compile the native plugin/APK; four Gradle authentication tests pass. Latest compatible Nearby pin is 19.3.0 for retained minSdk 23; 19.5.1 requires minSdk 24.
- [x] Actual HTTP smoke verifies receipt route and permanent 422 rejection recovery through the UI/new UUID, preserving the original until replacement acknowledgment. Nine Edge scenarios pass with no page/fixture-console errors.
- [ ] Deliver final APK checksum and exact source commit after source freeze.
- [ ] Install on both physical phones and complete all radio/permission/restart/interruption/conflict/storage-failure acceptance checks.
- [ ] Configure a reachable live ReliefMesh backend and complete the frontend Hugging Face analyze/edit/save/review loop.
