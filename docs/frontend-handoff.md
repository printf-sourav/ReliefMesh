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
