# Build tasks and acceptance checklist

This React/FastAPI/Android revision replaces the earlier Streamlit plan for the same prototype. Each developer updates only assigned entries. Reconcile any already-completed work from existing branches rather than discarding it. Follow [progress checkpoints](../prompts/progress-checkpoint.md) throughout.

## B1 - Persistence foundation (Developer 1)

Files: schemas, DB, incident service, backend requirements, gitignore. Dependencies: contract. Scope: medium.

- [ ] Validated shared models and SQLite init/create/list/get with image storage work.
- [ ] Atomic UUID replay/conflict handling preserves original output and initial edits together.
- [ ] Verify restart, invalid inputs, same/changed payload retries and file cleanup on failure.

## B2 - FastAPI boundary (Developer 1)

Files: API main/routes, root requirements/env, API tests. Dependencies: B1. Scope: medium.

- [ ] Multipart routes, JSON/error envelopes, pagination, health/OpenAPI are available early.
- [ ] Safe image-by-ID route and explicit browser/Android origins work.
- [ ] Verify metadata, errors, CORS, pagination and invalid/oversized images with TestClient/httpx.

## B3 - Genuine multimodal analysis (Developer 1)

Files: Gemma service, config/requirements, analysis tests. Dependencies: B1/B2. Scope: medium.

- [ ] Verify required model/runtime; actual image and text reach inference; unknowns stay unknown.
- [ ] Explicit live/fixture/deferred provenance, originals and saved-source reanalysis are supported.
- [ ] Verify provider/malformed errors and genuine Hinglish/image smoke; record actual model/runtime/outcome.

## U1 - React shell and design (Developer 2)

Files: frontend package/config, app shell/styles, API client/types. Dependencies: contract/design brief. Scope: separate shell/config and API-client increments.

- [x] React/TypeScript/Tailwind/shadcn and tokens implement desktop/phone design direction. Sidebar, metrics/list/detail and phone form/bottom navigation visually checked; local Manrope bundled.
- [x] Typed HTTP client, labelled opt-in mocks, browser proxy and APK API setting follow contract. Checkpoint 1: typed client and settings implemented; health fixture only; live contract validation pending.
- [x] Verify typecheck/build, navigation and 320/390/768/1440px layouts. Edge browser checks pass at all four widths, no horizontal overflow; build/typecheck pass.

## U2 - Early Android package (Developer 2)

Files: Capacitor config, Android source/wrapper, npm scripts, frontend env. Dependencies: U1 minimal shell. Scope: generated native project plus focused config.

- [x] Verify SDK/JDK/Node/Capacitor by 0:25; build minimal APK by 0:45 or record concrete blocker. Node 24/Capacitor 7 work; Gradle exits 1 because JAVA_HOME/java is missing; SDK/adb unavailable. No APK built.
- [ ] Bundled app opens without Vite server; routing/name/ID and API reachability are correct.
- [ ] Record Gradle output separately from actual emulator/device installation/launch.

## U3 - Citizen report (Developer 2)

Files: report page, form components, API client, form tests. Dependencies: U1; B2/B3 for live flow. Scope: medium.

- [x] Required inputs, image picker/preview, optional coordinates, editable analysis and Submit work. Connected UI and focused form tests pass; actual browser/Android checks pending.
- [x] Stable UUID survives retry; changed source invalidates stale output; original/edited analyses remain separate. Queue and form tests verify retry UUID and separate payloads.
- [ ] Verify invalid input, double-click/timeout, picker cancel, provenance and live multipart requests.

## Checkpoint 1 - First live API report (both)

- [ ] By 1:15 connect genuine text/image inference to persisted source, or report model blocker.
- [ ] Developer 2 records early APK build outcome before extensive polish.
- [ ] Both update handoff/checklist, commit progress and push owned branches.

## B4 - Duplicate suggestions and grouping (Developer 1)

Files: embedding/incident services, DB, duplicate tests. Dependencies: B1/B3. Scope: medium.

- [ ] Cached/persisted embeddings yield location-aware suggestions; unavailable matching is disclosed.
- [ ] Human grouping/separation preserves sources/dismissals and avoids summing people.
- [ ] Verify related/unrelated cases, no automatic merge and repeat-safe membership.

## U4 - Dashboard and review (Developer 2)

Files: dashboard/detail pages, components, API client, review tests. Dependencies: U1; B2/B4 for live flow. Scope: separate list/detail and control increments.

- [x] Polished desktop/phone metrics, sources/photos, needs, language, dates and per-source counts render. Fixture screenshots and real browser interaction checked; API integration pending.
- [ ] Human grouping, separate, correction, deferred analysis and verification call real routes.
- [ ] Verify states, hub filtering, keyboard/focus, touch and source inspection.

## B5 - Review integrity and sync (Developer 1)

Files: incident/sync services, routes, DB, sync/review tests. Dependencies: B1-B4. Scope: medium.

- [ ] Corrections preserve originals/reset verification; deferred sources need analysis before verification.
- [ ] SQLite queue survives restart; repeated sync delivers once; reconnect accepts raw deferred phone uploads.
- [ ] Verify changed-network retries, offline no-op, mixed hub counts and deferred reanalysis.

## U5 - Device queue and phone behavior (Developer 2)

Files: queue storage/service/page, transport adapter, queue tests, Android config. Dependencies: U2/U3, B2/B5. Scope: separate storage/retry and native finish increments.

- [x] IndexedDB commits UUID/text/location/image Blob/result/edits and handles quota errors. Four queue tests and form quota-failure check pass; browser restart/Android checks pending.
- [x] Device/server pending states differ; acknowledgment-before-dequeue and retries create one source. Actual browser Blob/reload + stub HTTP acknowledgment scenario passes; API/Android acceptance pending.
- [ ] Verify APK cold start, picker/keyboard/safe-area/Back, unreachable-API save, force-close/reopen and reconnect.

## Checkpoint 2 - Branch handoff by 3:25 (both)

- [ ] Developer 1 tests pass; pushed backend handoff includes OpenAPI/examples/setup/live-model evidence.
- [ ] Developer 2 has web/phone fixture screens, durable queue and populated APK; commit before merge.
- [ ] Both preserve/commit progress and push branch checkpoints.

## B6 - Backend reproducibility (Developer 1)

Files: handoff, sample report JSON, tests/requirements. Dependencies: B1-B5. Scope: medium.

- [ ] Document models/runtime, install/start/CORS/env, multipart examples and actual test results.
- [ ] Include illustrative A-C reports and disposable seed setup without personal data/secrets.
- [ ] Verify clean temporary storage and give exact pushed handoff commit.

## U6 - Integrated web/APK delivery (Developer 2)

Files: README, demo/frontend/Android handoffs, sample images, integration checks. Dependencies: B6/U1-U5. Scope: separate validation and documentation/artifact increments.

- [ ] Merge backend; default uses real HTTP; document frontend/backend/API-origin setup.
- [ ] Verify A-E and screenshots, typecheck/build/backend suite, actual APK and device behavior.
- [ ] Deliver APK link/checksum/source commit and separate installation evidence; push branch and final PR/compare link.

## Checkpoint 3 - Freeze 4:10, finish 4:30 (both)

- [ ] Genuine live-AI loop passes, or inference blocker is explicitly reported.
- [ ] Desktop/phone finish gate and APK build/install outcomes are honest and separate.
- [ ] No secrets/generated runtime artifacts tracked; progress committed/pushed with final handoff.
