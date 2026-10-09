# Developer 2 prompt: polished React UI, Android APK, and integration

Copy everything below into the second Codex chat.

---

You are Developer 2 of a two-developer team building **ReliefMesh** in 4.5 hours. Build a beautiful responsive React application, an installable Android APK, and the final integrated demo. Implement, test, commit, and push to https://github.com/printf-sourav/ReliefMesh.git. This prompt supersedes the earlier Streamlit plan.

Read repository instructions and `docs/prototype-brief.md`, `docs/shared-contract.md`, `docs/ui-design.md`, `docs/mobile-apk.md`, `tasks/plan.md`, `tasks/todo.md` and `prompts/progress-checkpoint.md`. Developer 1 implements FastAPI/Gemma/SQLite in another chat. Consume the HTTP contract; never import Python into the frontend.

Use an isolated checkout/worktree on `feature/frontend-demo` from the latest React/Android planning commit on `main`. If already started from the old plan, preserve current changes and merge updated `origin/main` first. Never change the other chat's branch, force-push, or overwrite its work.

## Ownership and stack

Own `frontend/**`, including React source, npm lockfile, Vite/Tailwind config, frontend env example, tests, Capacitor config and `frontend/android/**`. Also own README, illustrative images, `docs/demo.md`, `docs/android-build.md`, and `docs/frontend-handoff.md`. Update only U1-U6 and your checkpoint entries. Backend/root Python dependencies and config belong to Developer 1.

Use **React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Lucide + Capacitor Android**. Use `idb` for device IndexedDB storage and React Router hash routing for bundled Android navigation. Build one React app with desktop and mobile layouts. Use one consistent shadcn primitive family; consult official docs for selected versions, pin compatible dependencies and commit the lockfile. CSS transitions and ordinary React state suffice; avoid extra packages without a concrete need.

## Design quality is required

Implement `docs/ui-design.md`: calm slate/white/teal palette, locally bundled Manrope, consistent spacing, restrained corners/shadows and clear hierarchy. Desktop: narrow sidebar, compact metrics and incident list/detail workspace. Phone: compact app bar, bottom navigation, large photo picker, one-column form, accessible detail/analysis sheets. Build intentional empty/loading/error/success states.

Use actual report photos, source information and honest badges. No invented map pins or severity scores, huge gradient hero, heavy glass effects, placeholder controls or generic repeated card grids. Study relevant official component examples or available supplied references and document layout decisions. Include accessible labels/focus/dialogs, 44px touch targets, safe areas, readable contrast and reduced-motion support.

## Build sequence

1. **0:00-0:25:** Vite/React shell, design tokens, routes, mobile navigation, typed API client/types. Use explicit private HTTP fixtures in `frontend/src/mocks/**` with visible development banner and opt-in configuration. Never silently activate mocks on request failure. Configure browser API proxy and a reachable APK API origin.
2. **Android early gate:** inspect Node, compatible Capacitor, JDK and Android SDK/Gradle. Add native source; build a minimal debug APK by **0:45** before extensive polish. Report concrete missing tools while continuing web work.
3. **By 1:15:** required text/image/location, optional coordinates, validation, preview, Analyze, editable result and Submit. UUID stays stable per draft across retries. Source changes invalidate stale analysis. Disable simultaneous submissions. Send original AnalysisResult plus separate edits in one multipart request; retain provenance and pending-analysis honesty.
4. **By 2:00:** dashboard metrics, functional filters/search, list/detail, source text/photos, needs/languages, times and verification. Images use HTTP routes, not laptop file paths. Show people per source without summing overlap. Hub shows synced sources; local queues remain distinct.
5. **By 2:55:** explicit grouping, separate/dismiss, correction and verification. Implement device queue with UUID/text/location/image Blob/original result/edits/retry state. Confirm IndexedDB transaction before claiming save; handle quota failures. API reachable with simulated transport offline -> server pending record; API unreachable -> device-only queue. Reconnect uploads same UUID, retains failed/unknown items, dequeues only after acknowledgment, then synchronizes server queue. Avoid double counts. Deferred uploads remain analysis-pending until explicit saved-source reanalysis succeeds.
6. **2:55-3:25:** native image picker/capture, cancellation/permissions, safe areas/keyboard/Android Back, populated APK and API settings/connection feedback. Phone localhost is not laptop localhost. Follow APK spec for LAN/HTTPS or debug HTTP and actual multipart/image testing. Bundle fonts/assets; no delivered `server.url` pointing to Vite.
7. **At 3:25:** commit frontend, fetch/merge `origin/feature/backend-ai` after its handoff. Preserve both checklists; connect real HTTP by default and resolve defects. Coordinate a handoff commit before modifying backend code. Work against explicit mocks rather than waiting idle.
8. **By 4:10:** integrated A-E, final APK build, desktop/phone screenshots, README and demo/build handoffs. Freeze features; final 20 minutes for bug fixes and install/rehearsal. Voice, resources, maps, iOS and actual mesh are outside initial scope.

## APK required output

App ID `org.reliefmesh.app`, name ReliefMesh, webDir `dist`. Commit native source/config and Gradle wrapper; exclude generated builds/local SDK paths/signing material/APKs from normal Git history. Use compatible same-major Capacitor core/CLI/Android packages.

Run `npm run build`, `npx cap sync android`, then `gradlew.bat assembleDebug` in `frontend/android` (appropriate wrapper on other hosts). Deliver actual `ReliefMesh-demo.apk` as a downloadable local artifact with checksum and source commit. Instructions/screenshots alone are incomplete. Install/launch on an available Android device/emulator; report build success separately from device testing. If tooling blocks the binary, record exact failure and preserve reproducible source while completing web work.

APK bundles React, not Python/Gemma. Disconnected phone cannot use the laptop's model: save raw report/image locally with analysis pending, then upload and explicitly analyze after reconnect. No background-sync guarantee, peer mesh or Play Store release.

## Verification

Run TypeScript checking, production build, focused Vitest/React Testing Library tests for form/queue/retry behavior, and backend tests after merge. Inspect actual browsers at 320/390/768/1440px for keyboard/touch, dialogs, long Hinglish, empty/error/loading states and console errors. Capture rendered screenshots.

Demonstrate A/B related reports without auto-merge; C genuine Hinglish + image analysis; D simulated offline -> restart -> restore -> one delivery -> review; E installed APK with unreachable API -> raw report/photo save -> force-close/reopen -> reconnect -> one server record -> explicit analysis -> verify. Repeated sync/timeout retry must retain stable UUID. Mocks do not prove live AI or Android integration.

## Save progress and deliver

Follow `prompts/progress-checkpoint.md` throughout: commit each meaningful verified increment and preserve progress before every working-turn handoff. Update your task entries/handoff, stage only your owned changes, and push your branch at each checkpoint. For unfinished work, use a clearly marked `wip:` commit with actual validation/blockers; never mark it complete. Never commit secrets/generated runtime files or force-push.

Write frontend/Android/demo handoffs with setup/run/build commands, API address, screenshots, APK artifact/checksum, exact device/runtime, outcomes and limitations. README retains prompt/planning links.

Push integrated branch and open one PR to `main` titled `feat: build ReliefMesh web and Android reporting prototype` with actual AI/browser/APK evidence and limitations. Attach created PR to this chat; if tooling unavailable give pushed compare link. Leave reviewable; merge/deploy only upon user request.

Resolve routine choices, preserve the API, flag concrete blockers early. Final response includes startup, APK link/install, validation and branch/PR. Do not call fixture-only inference or missing APK a complete prototype.
