# Frontend handoff — Developer 2

Branch: `feature/frontend-demo`. Isolated checkout: `.worktrees/frontend` beneath the original checkout. Baseline: `6d92ac6` (React/Android planning revision). Do not edit the primary `main` checkout.

## Checkpoint 1 — 9 October 2026

Implemented the React/TypeScript/Vite/Tailwind shell, bundled Manrope, Radix-based shadcn Button/Dialog, desktop sidebar/mobile hash navigation, explicit API settings, typed contract client, multipart transport and IndexedDB queue. Fixture mode is opt-in and development-only; real HTTP is the default. Queue transaction completion precedes saved feedback; deletion requires a matching server UUID; concurrent retries share one operation. Citizen form/editor source is in progress and not connected to routing yet.

Actual validation:

- Node `v24.19.0`; pinned dependencies installed with npm `10.9.3` via bundled pnpm launcher. npm lockfile committed.
- `tsc --noEmit`: passed. `vite build`: passed (1,662 modules, 16.58 seconds).
- Multipart/origin tests: 2 passed. Queue tests: initially 3 passed/1 failed because jsdom Blob cannot be cloned by Node structuredClone; switched the fixture Blob to Node's cloneable Blob. Rerun: 4 passed. Actual browser Blob/restart checks remain pending.
- `cap add android`: passed with Capacitor `7.4.3` and App `7.0.1`. Native source/wrapper retained; compiled assets/builds excluded.
- `gradlew.bat assembleDebug`: exit 1, `ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.` Java/adb absent from PATH; no SDK environment settings or Android installation found in usual locations. No APK exists and no device testing has occurred.
- Browser layout/keyboard checks, live HTTP, live Gemma and backend integration have not run. Origin currently exposes only `main`; backend handoff is unavailable.

Setup: `cd frontend; npm ci; npm run dev`. Browser `/api` proxies to `http://127.0.0.1:8000`. APK requires a reachable origin in Connection settings or `VITE_API_BASE_URL`; no credentials in frontend variables. `npm run build; npx cap sync android; cd android; .\gradlew.bat assembleDebug` after installing a compatible JDK/Android SDK.

Next: connect/report and review screens, full fixture transport, queue controls, focused form tests and real browser checks. Then fetch backend handoff and integrate when available. Keep missing live-AI/APK evidence explicit.

Commit/push result is recorded by the working chat after this checkpoint; use `git log -1` for its exact hash.

## Checkpoint 2 — Reporting, review and queues

Checkpoint 1 was pushed as `610132d5b402e9b90973284593dc0be800292988`. Now connected all three screens: required text/location/photo and optional coordinates, image MIME/10 MB/decoding checks, independent original result and editable fields, explicit raw deferred save, dashboard metrics/search/filter/list/detail, original words/photo/model analysis, human confirmation dialogs for group/separate/verify, correction and explicit saved-source analysis. Device and backend queues show separate counts and retry feedback. No automatic grouping, people aggregation, or inference during sync.

The development fixture adapter supports the HTTP shapes/actions with labelled synthetic illustration and preset A-C analysis/suggestions. Its data resets on reload. This is UI evidence only. Production builds strip fixture behavior; real HTTP remains default. Native manifest permits cleartext in debug only; release defaults prohibit cleartext, and MainActivity enables mixed content only under `BuildConfig.DEBUG`. Android compilation remains blocked by Java, so these settings are source changes without device evidence.

Actual checks: `tsc --noEmit` passed; connected `vite build` passed (1,671 modules, 9.14 seconds); all 11 Vitest tests passed (multipart/origin 2, durable queue 4, citizen form 5). Form checks cover missing photo, stale analysis reset, original/current separation, double submission, uncertain delivery UUID and quota failure before API. Browser screenshots/layout checks are the next action. Bundled Playwright could not launch because its Chromium headless executable is missing; attempting installed Edge next. Backend branch still absent at the prior fetch; no real HTTP/Gemma evidence yet.

## Checkpoint 3 — Browser evidence and retry contract fix

Checkpoint 2 was pushed as `38a9ab102148ad1a8850fd5177efff1a0787e44b`. Isolated headless Microsoft Edge now passes all nine browser scenarios: dashboard/search/detail, human grouping/correction/verification/separation, layouts at 320/390/768/1440, citizen fixture preview/edits, dialog focus trap/return, and production transport with API unreachable -> actual IndexedDB photo -> reload -> same-UUID upload -> acknowledgment -> no second upload. No uncaught page errors. One initial test locator matched summary text in both list and detail; scoped it to detail, rerun passed. Screenshots were captured and desktop dashboard/phone reporting visually inspected. These are browser evidence, not Android installation or live AI evidence.

Fixed a contract bug found in review: device QueueItem fields (`attempts`, `created_at`, `last_error`, `server_id`) no longer leak into multipart retry metadata. Wire fields are explicitly selected; new regression test passes. All 12 focused tests pass. Production build and `cap sync android` pass again; Gradle APK remains blocked by absent Java. Explicit BuildConfig generation supports the debug-only mixed-content branch. Source verification is unavailable for deferred provenance even if fields have been manually corrected. Manual human grouping also works without semantic suggestions; browser checking that new control remains a next step.

Browser runner: `npm run browser:check` with fixture dev server on 5173 and production preview on 4173. It launches an isolated Edge profile by default. Output defaults to ignored `frontend/browser-artifacts`; screenshot/results evidence for this run was saved outside Git in the chat artifact directory. Install a Playwright browser or set `RELIEFMESH_BROWSER_CHANNEL` on other hosts. See `docs/demo.md`.

Latest backend available: `46614f3` (20 backend tests reported by its owner); persistence/multimodal adapters/early routes exist, matching/review/sync incomplete. A transient fetch failed with `Could not resolve host: github.com`; later fetch succeeded. Next: merge this available handoff checkpoint without changing backend ownership, run backend suite, and exercise actual multipart/image/deferred uploads. Further backend handoffs and genuine inference remain required.

## Checkpoint 4 — Early backend integration preserved

Checkpoint 3 pushed as `8bf371738a7596be0b58225a24c9476413b32df5`. Imported backend checkpoint `46614f3` without conflicts and preserved B/U checkboxes. Added real-HTTP browser smoke runner and actual startup/limitations to README. Tests against the merged Python source are pending while isolated `.venv` requirements install; no new backend test success is claimed yet. npm's Playwright dependency download encountered `ECONNRESET`; the exact pinned lockfile subsequently generated successfully with `--package-lock-only`. Browser verification used the bundled Playwright runtime and installed Edge. All nine browser scenarios reran successfully, including the new manual grouping control; phone detail and restored queue screenshots inspected. The offline screenshot viewport was corrected to an explicit 390px for the next run.

A newer backend checkpoint `e3b2ccc` is now available with review/duplicates/sync. Save this early merge first, then merge the new handoff and run complete Python/HTTP checks. Live inference and Android binary/device evidence remain unresolved. Neither backend ownership nor the shared API was changed.

## Checkpoint 5 — Full HTTP integration

Checkpoint 4 pushed as `20aabeb73e705cd30a68298894b93c9a45b3d19a`. Merged backend handoff `e3b2ccc` cleanly, preserving both developers' tasks. All shared routes are present. Adopted its additive matching availability headers in the client/dashboard while retaining the four-field JSON contract. Unavailable matching is labelled, with manual grouping still available. Native and backend source ownership was preserved; backend changes came from its committed branch.

Actual outcomes:

- Isolated `.venv` installation of pinned core backend dependencies passed. `python -m pytest tests/backend -q --tb=short`: **32 passed**, one upstream Starlette/httpx deprecation warning, 6.69s.
- Frontend: **14 passed**, typecheck passed, production build passed (1,671 modules, 5.63s), `cap sync android` passed (0.375s). One intermediate form test exceeded Vitest's default 5s under a slow run; raised only the test timeout to 15s and retained assertions. Follow-up 13-test run passed, then final expanded 14-test run passed in 10.96s.
- `tests/http-integration.cjs`: passed against actual FastAPI/multipart/SQLite/image routes, with explicit backend fixture AI and disabled matching. Original/edit preservation, correction/reset, human verification, browser-photo reload, reconnect/deferred upload, no extra upload, backend restart, deferred verification rejection, explicit reanalysis, durable simulated-offline queue/repeated sync and A/B human grouping all passed. No routes missing; no uncaught page errors.
- Backend handoff separately records an actual Hugging Face `google/gemma-4-31B-it` text/image smoke success. This checkout's integrated browser run used fixtures; no frontend live-provider evidence is claimed. No credentials were copied into frontend or Git. Semantic weight availability in this checkout is unverified and is disclosed in UI.
- Android APK remains blocked by the exact `JAVA_HOME`/missing-java error; SDK/adb/device absent. No binary, checksum or installation claim.

Remaining: configure a reachable backend/provider for one frontend live-Gemma loop; install/prewarm semantic runtime or retain disclosed unavailable matching; provide JDK/Android SDK and an emulator/device to compile/install the APK, complete E and native picker/permissions/keyboard/safe-area/Back tests, and deliver binary/checksum/source commit. A draft review PR preserves this incomplete checkpoint; do not merge or deploy. Startup/test commands are in README/demo/Android docs.

Final browser rerun passed all nine scenarios with mobile touch navigation, every rendered mobile button at least 44px high, zero fixture console errors and zero uncaught page errors. A favicon 404 found by that console check was fixed with bundled SVG/ICO source assets. Latest production asset build passed in 6.94s and native sync in 0.339s. The HTTP smoke also passed with unavailable matching visible at 320px. Screenshots of phone detail, actual HTTP grouping and restored device queue were captured and visually inspected. The newly fetched backend `bb51e84` completes its handoff; preserve this reviewed integration before importing its final changes.

## Final handoff checkpoint

Previous verified integration was pushed as `6c59c9f490e53d6f3af4b214464f5a2afad5e408`. Imported final backend `bb51e84` (cache path, pinned optional semantic runtime, complete documentation/checklist) without conflicts. Backend tests reran: **32 passed**, one unchanged upstream warning, 5.18s. Actual HTTP smoke reran: passed, all expected routes present, no uncaught page errors. Frontend source remains at the 14-test/9-browser-scenario/build/sync-verified checkpoint. Backend owner separately records two live Gemma requests and real cached multilingual cosine comparisons; this integration run used fixture AI and disabled matching.

Concrete live UI blocker: the documented `http://127.0.0.1:8000` on this host returns 404 for `/api/v1/health` and `/api/v1/reports`; `/openapi.json` identifies **GroundOne Audit Intelligence API**. Its service was neither modified nor stopped. Thus the handed-off live source could not be inspected through this host's frontend, and no extra paid inference was attempted. Use a free ReliefMesh port (for example 8002), configure its own backend environment/model cache, and set the frontend origin accordingly. Origin is a bare scheme/host/port, without `/api/v1`. API and shared wire fields remain unchanged.

Remaining acceptance: one frontend live-provider loop; semantic availability in the final runtime; actual APK build/binary/checksum and installed-device scenario E. JDK/SDK/adb/device are unavailable, with exact Gradle error recorded in Android docs. All current progress is saved as WIP on `feature/frontend-demo`; no merge to main, force-push, deployment, release or secrets/runtime artifacts. Draft PR/commit link will be reported after push and recorded below.

Delivery result: tested integration source committed and pushed as [`6ef4ec6ba3ab0b6e3ccc3bf47c3b2caf2e0e0a2f`](https://github.com/printf-sourav/ReliefMesh/commit/6ef4ec6ba3ab0b6e3ccc3bf47c3b2caf2e0e0a2f). Every milestone push succeeded; local/remote tips matched. Draft PR creation via GitHub connector failed with **403 `Resource not accessible by integration`** (`FORBIDDEN`). `gh` is unavailable on PATH and in usual installation locations. No PR was created or attached. Use the reviewable [branch compare](https://github.com/printf-sourav/ReliefMesh/compare/main...feature/frontend-demo). This final documentation-only checkpoint follows the tested source commit and is pushed before handoff.

Owned test Vite/preview processes were stopped at handoff; the unrelated service on 8000 was left running. Reproduce from this isolated checkout with README commands. Runtime `.venv`, node_modules, DB/uploads, browser artifacts, compiled assets/build outputs and keys are not tracked. APK and frontend live-provider acceptance stay unchecked.

## Review and nearby extension — resumed checkpoint

Fetched and integrated backend `c8f4d4578b9473f6780bc60dd56a147ee7275377`, including receipts and the full automatic nearby contract. Resolved only the checklist's appended-section conflict by retaining both developers' entries. Existing frontend source is preserved. The referenced frontend review document/tests are absent from all fetched branches and local attachment paths; requested their location and will reproduce the described defects independently meanwhile. Backend suite: **36 passed**, one upstream warning, 3.93s. Initial sandbox execution failed during temporary-directory setup (no tests ran); rerun with normal host temp access passed. Next: fix source/validation races and timeouts, then implement authenticated native relay, build and actual device/live evidence. The user-requested Vite process runs on 8001; HTTP 200 was verified at startup. No new native or live acceptance is claimed.

## Reviewed defects fixed

Fetched the owner's review publication `104783e`. Copied all three supplied regressions into the application suite and confirmed all three failed before fixes (the supplied URL cleanup also exposed a test teardown issue; the component now captures its URL API for matching cleanup). The expanded delayed-decoder, late-inference and reverse-selection cases also reproduced failures. Added synchronous validation guard/state, source/selection generation checks and input cancel handling. Every inference response is tied to its source snapshot. Analyze/Save stay disabled during validation.

Inference/reanalysis now allow 120s (custom `VITE_ANALYSIS_TIMEOUT_MS` documented), health 5s, reads 15s, uploads/mutations 60s. Timeout feedback retains the source and does not repeat paid inference. Image validation enforces 10 MiB/20 million pixels; trimmed text/location and analysis fields match backend bounds, including required location context. Permanent 413/415/422 or changed-UUID conflicts pause queue retries. Recovery atomically saves a new UUID/raw copy and keeps the original until replacement API acknowledgment; validation failure leaves the original intact.

Actual checks: **29 frontend tests passed**, including all supplied regressions, 70-second response, reanalysis/actual timeout, pixel/byte/text exact boundaries, Unicode character counting and recovery. Typecheck passed; production build passed (1,671 modules, 8.41s). Backend extension was separately verified with 36 passing tests. Native relay, final browser/HTTP rerun, APK, physical devices and live frontend loop are still next steps. Workspace-local JDK/SDK provisioning is in progress; no toolchain completion claim yet.

## Native relay implementation checkpoint (WIP)

Implemented typed native bridge, immutable length-prefixed SHA-256 packages, hop/history limits, IndexedDB v2 upgrade retaining v1 reports, atomic imports, digest conflicts, delivery tombstones and foreground single-flight gateway uploads. Nearby UI distinguishes device storage, peer storage/pending, relay-reported and direct API-confirmed delivery; browser explicitly requires Android. Gateway transport preserves raw/analysis fields and never invokes inference. Direct acknowledgment uses same-payload POST, sync if pending and a matching synced receipt; peer hints retain the original.

Native source implements automatic cluster discovery/acceptance with deterministic persistent UUID direction, Keystore-encrypted group setup, fresh native HMAC proofs bound to the raw Nearby token, mutual proof acknowledgment, timeout/disconnect gating, bounded FILE transfer, private atomic inbox retention before WebView events, content-URI reads, recovery APIs and pause/disable cleanup. Google Maven metadata reports pinned Nearby 19.5.1; SDK/runtime permissions follow version-specific setup with legacy FILE read limited to Android 9 and earlier. These are implementation claims pending compilation and devices.

Actual validation: 35 frontend tests passed with no unhandled errors, typecheck passed, production build passed (1,675 modules, 5.43s), Capacitor sync passed (0.36s). An initial conflict test revealed an unobserved aborted-IDB promise; explicit abort completion handling fixed it and the complete rerun passed. Four native Java authentication tests pass on checksum-verified Temurin JDK 21.0.12.1: wrong key, modified raw-token transcript, reflection, stale proof, missing token/wrong group and no authenticated state before mutual proof/ack. This is Java protocol evidence, not Android radio behavior. Automatic approval review briefly failed due its usage quota; after the user's continue, the identical test command was approved and ran successfully.

APK blocked temporarily on SDK 35 provisioning; no installed Android/physical two-phone result yet. JDK is now present locally; earlier no-Java result is superseded. Current live loop blocker rechecked: 8000 health 404, 8002/8080 unreachable; neither checkout has backend .env and the process has no HF token. Requested a reachable ReliefMesh origin/backend-only environment path without asking for a token in chat. Next: native compile/tests, complete foreground/inbox failure coverage, final browser/HTTP checks, APK/hash and actual two-phone/live evidence. All tool downloads and generated outputs remain ignored.

## APK compilation and relay verification checkpoint (WIP)

Provisioned official SDK platform 35/build tools/platform-tools in the ignored workspace cache with checksum-verified JDK 21. The first Nearby 19.5.1 build failed manifest merging because it requires minSdk 24; pinned compatible 19.3.0 (official AAR minSdk 21) while retaining app minSdk 23. Initial native unit/APK build passed in 3m 21s. Added remembered endpoint retries, bounded stalled/disconnected transfer cleanup and an exact native inbox storage cap. Native validation rejects fractional hop counts, missing required analysis fields and noncanonical Base64 without recursive multi-megabyte regexes.

Expanded actual IDB upgrade and mock-native worker checks cover automatic offline inbox import then gateway delivery without AI, quota-failure retention/no acknowledgment, manual/automatic single-flight upload, and no subsequent upload after disabling sharing. Gateway reconciliation remains same-payload POST plus matching synced receipt; peer hints never delete origin data or change the local backend origin. Actual HTTP rejection recovery revealed a dialog unmount/accessibility issue; retained success feedback and labelled its textarea explicitly, then reran successfully. Disposable HTTP API moved to 8002 to preserve the user's frontend on 8001.

Actual outcomes on the integrated source:

- Frontend **39 tests in 12 files passed**, 25.76s; typecheck passed; production build **1,675 modules, 39.90s**; Capacitor sync passed, 0.776s. Vite's existing static/dynamic import chunk warning is nonfatal.
- Backend **36 passed**, 5.38s, one unchanged upstream Starlette/httpx warning; temporary isolated storage and no paid inference.
- Nine Edge browser scenarios and expanded actual FastAPI/SQLite HTTP smoke passed: all expected routes including receipts, four intended sources, permanent 422 recovery/new UUID/original retained until acknowledgment, no uncaught page errors or fixture console errors. Screenshots/JSON are external `relay-browser` artifacts.
- Additional Android lint initially failed with **11 NewApi errors** for Java collection methods on minSdk 23. Replaced those methods with compatible iteration/access. Combined `testDebugUnitTest lintDebug assembleDebug` then **passed in 1m 37s**, 176 tasks. Authentication suite: **4 passed, 0 failures/errors/skips**. App lint: **0 errors, 22 warnings**; no suppression/baseline. Generated flatDir, SDK XML mismatch and deprecated APIs remain nonfatal warnings.
- `adb devices -l` returned **no devices**. No install/launch/physical radio, permissions, native picker or two-phone durability proof is claimed. A third device remains necessary for tested multi-hop.

README/demo/Android docs now reflect the available toolchain and successful APK compilation. Next: freeze/push the source, rebuild its final synced web assets, verify APK signature/identity, deliver `ReliefMesh-demo.apk` with checksum/source commit, then install on both connected phones and execute the complete relay scenario. A reachable live backend/environment-file path is still needed for the frontend Hugging Face loop; fixture evidence remains distinct. PR creation previously failed with connector 403; retry only the reviewable draft after the artifact checkpoint. No main merge/deployment is authorized.

## User stop and Developer 1 handoff

The user explicitly stopped all work in this chat and requested a continuation prompt for Developer 1. Resume instructions are in `prompts/developer-1-continuation.md`; no new thread/message was dispatched.

Implementation source `975fa80de0af2aee91da72376de2d528a6f510fc` was committed/pushed, with local and remote tips matching. After source freeze, all nine browser scenarios and expanded actual HTTP smoke passed again, including exact recovered-photo bytes, post-acknowledgment device cleanup and no missing routes. Final `assembleDebug` after final production sync passed in **47s**, 113 tasks. A first browser/HTTP rerun attempt omitted the bundled Playwright override and failed before checks; both reran successfully with the override. The existing 39 frontend/36 backend/four native authentication checks and lint 0 errors/22 warnings remain the latest actual results.

A real APK remains in `frontend/android/app/build/outputs/apk/debug/app-debug.apk`, built from `975fa80`. Separate `ReliefMesh-demo.apk` copying, SHA-256 recording and independent signature/packaged-asset verification were not performed before the stop. Physical devices remain absent from adb, and the live frontend/provider loop remains blocked on a reachable configured backend or backend-only environment path. Final PR retry did not occur; prior connector 403/compare-view evidence remains unchanged. These tasks transfer to Developer 1.

Stopped the owned normal frontend on 8001, fixture server on 5173 and preview on 4173 using their process sessions. Completed final tests/builds have exited. No further implementation or acceptance testing will run in this chat. The unrelated port-8000 service is preserved. Generated APK/cache/runtime data remain ignored and source is preserved; this documentation-only WIP checkpoint is saved/pushed before returning.

## Developer 1 resumed — large-photo checkpoint

Continuation is authorized on this host's `feature/frontend-demo` checkout. A valid 10 MiB relay photo reproduced a JavaScript regex-stack crash; noncanonical Base64 was also accepted by JavaScript while native validation rejected it. Flat bounded validation plus canonical re-encoding fixes both. The two regressions failed before the fix and all eight package tests pass afterward. Inverting the canonical check makes its regression fail; the source was restored.

The real frontend Hugging Face flow also passed with one explicit `google/gemma-4-31B-it` request in live mode: citizen edits remain separate from original analysis/text, exact photo bytes survive save, human verification succeeds, and the matching synced receipt resolves. Real cached semantic matching reports available. Synthetic demonstration data and isolated ignored storage were used; tokens remain backend-only. Local results are in `.cache/live-demo/evidence/live-ui-results.json`; this live run used source `0a0f864` before the continuation fixes.

Receipt-origin/retry fixes and compatible dependency patches are undergoing final review/build as separate checkpoints. The latest full frontend run has 49 passing tests, production build and native sync, but a further save-time receipt guard is being added. APK assembly/identity checks and physical acceptance are still pending. No Android device is connected. Normal frontend is on `http://127.0.0.1:8001`, live API on loopback port 8080; unrelated port 8000 is preserved.

## Developer 1 — receipt and retry safeguards

Delivery tombstones now retain their normalized issuing API origin. Legacy tombstones do not invent an origin; another destination's hint cannot suppress forwarding, and identical sources can be reimported for a changed destination while immutable digest conflicts remain rejected. Every dependent gateway request and acknowledgment checks destination stability. Direct submissions and ordinary queued POSTs also capture their destination so a settings change cannot acknowledge delivery to the new server.

Final review reproduced a real save-time race: foreground sharing could attach relay metadata while the report page's direct POST was in flight, then receipt-free acknowledgment deleted the photo. The central acknowledgment now requires matching client/server UUIDs, a synced receipt, a valid acceptance timestamp and the captured issuing origin before deleting any relay copy. Missing proof reaches the existing source-retained UI. A valid synced receipt can finalize a POST that initially returned pending. Four failed attempts for one UUID/digest remain paused for that peer session, including repeated inventory requests/events, until real disconnection/reconnection.

All reproduced regressions failed before fixes. Final frontend suite: **62 tests in 14 files pass** (9.33s); typecheck, production build (1,675 modules, 9.16s) and Capacitor sync pass. Nine browser scenarios and expanded four-source FastAPI/SQLite HTTP smoke passed after dependency updates; they will be checked against the final rebuilt bundle at artifact delivery. Android checks with patched Capacitor: four authentication tests pass, lint has **0 errors/22 warnings**, combined unit/lint/assembly succeeds in **1m 21s**. Final asset assembly and separate APK verification remain next.

## Physical Android 16 startup correction

The user connected and authorized one Motorola Edge 60 Fusion running Android 16/API 36 with Google Play services. APK installation/launch succeeded; its installed checksum matched the delivered artifact. Native picker launch/cancel and Android Back dialog dismissal passed. A synthetic offline report retained its UUID, text and exact image across a real app force-stop/reopen. Photo bytes were supplied through the dedicated debug WebView input; actual native photo selection remains untested.

Real Nearby startup failed with **8033 `MISSING_PERMISSION_CHANGE_WIFI_STATE`**, despite granted nearby/Bluetooth runtime permissions and enabled radios. The pinned Nearby 19.3.0 client still requires this normal manifest permission on Android 16; the previous maxSdkVersion 32 cap excluded it. A new native manifest regression reproduced the failure before removing that cap. Runtime permission prompts remain in place; this fix does not bypass user grants or change radios. [Google status-code reference](https://developers.google.com/android/reference/com/google/android/gms/nearby/connection/ConnectionsStatusCodes#MISSING_PERMISSION_CHANGE_WIFI_STATE).

The user currently has only one phone. Native discovery will be retried with the corrected APK, but two-phone authenticated connection/photo transfer, interruption/wrong-group/conflict/storage-failure acceptance and third-phone multi-hop remain physically unverified. Final artifact identity/checksum will supersede the earlier `089c8d6` APK after this native-only correction.

## Current delivery — Developer 1

Corrected source **ac39a8b** is pushed. Its APK is copied to `artifacts/ReliefMesh-demo.apk`, SHA-256 **8487c7a327982128f13bfea4c5093d6e1185835923c9b5199e9edec5fd8283c9**. Signature, app/SDK identity, native plugin and 47 final assets verify. Native tests/lint/assembly passes in **38s**, **five tests**, **0 lint errors/22 warnings**. Installed APK checksum matches on the authorized Android 16 phone.

Real discovery now runs; background pause/foreground resume succeeds. The saved original UUID/text/photo survived force-stop/reopen and APK update, then restored API connectivity triggered automatic gateway delivery without AI. Exactly one backend source and its matching synced receipt were checked; device cleanup followed the receipt. Native picker opening/cancellation and Back dialog dismissal pass; native photo selection/camera/full keyboard checks remain open. [Evidence and remaining steps](integration-continuation-2026-10-09.md) distinguish single-phone results from untested two-phone relay. The live UI/model blocker is resolved: one explicit real Hugging Face frontend loop passed, semantic matching is available, and final UI replay made no extra inference request.

[Draft PR #1](https://github.com/printf-sourav/ReliefMesh/pull/1) was successfully created and attached to this chat, superseding the old PR-connector failure. No main merge/release/deployment. Next: obtain a second phone and execute all physical peer-transfer/failure scenarios before accepting the full mesh demonstration. Normal frontend on 8001 and loopback live API on 8080 remain available; fixture/production-preview verification servers can be stopped after tests.

## Web/mobile separation requested for the demo

The web now contains the responder dashboard only, including review, correction, verification, human grouping and bringing waiting server reports into the dashboard. Native Android opens citizen reporting with Report/My reports tabs. Mobile copy, photo controls, connection help, status and team setup are simplified; server queues, UUIDs, model IDs, confidence scores, hop counts and simulation controls are removed from the citizen flow. The phone retains the same save-before-send and receipt safeguards. See [the design and preview contract](web-mobile-ui-split.md).

Validation: 66 frontend tests in 15 files, typecheck/build, ten browser scenarios across 320/390/768/1440 pixels, and the four-source real FastAPI/SQLite integration pass. Android unit/lint/assembly succeeds (51s). The new APK and connected-phone visual check are being finalized; the earlier APK checksum above is historical until the new verification manifest is recorded. Optional sponsor integrations were deferred to prioritize the UI.
