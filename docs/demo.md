# Demonstration and verification

Use the real API by default. Browser app: `cd frontend; npm ci; npm run dev`. In Connection settings, test the API origin. Empty origin uses the Vite proxy to port 8000; a phone requires a reachable laptop LAN/HTTPS origin.

For isolated UI development only, set `VITE_ENABLE_MOCKS=true` for `npm run dev`. The amber banner, fixture model badge, synthetic test illustration and preset suggestion disclose simulated data. Fixture changes reset on reload. Production builds disable this adapter even if the variable is set. It cannot establish real AI, embeddings or SQLite durability.

## Browser verification on 9 October 2026

Typecheck and production build passed. Vitest: 12 passed (multipart/metadata/origin 3, queue 4, form 5). `tests/browser-check.cjs` passed 9 scenarios in an isolated Microsoft Edge session at 320, 390, 768 and 1440px; no horizontal overflow or uncaught page errors. Screenshots include populated dashboard/detail, empty form/queue, editable analysis and an actual browser device queue restored after reload. Desktop dashboard and phone form were visually inspected.

The production transport test aborts the HTTP request, saves a real Blob to IndexedDB, reloads, restores a stub acknowledgment and checks only one stable UUID upload. This proves browser transport/storage behavior against the agreed envelope; it is not an integrated FastAPI or Android test. Fixture review controls test explicit group/separate/correct/verify and verification reset.

Reproduce with two terminals:

```powershell
cd frontend
$env:VITE_ENABLE_MOCKS='true'
npm run dev -- --port 5173
```

```powershell
cd frontend
npm run build
npm run preview -- --port 4173
```

Then `npm run browser:check`. Install Playwright Chromium if Edge is unavailable, set `RELIEFMESH_BROWSER_CHANNEL` appropriately, and configure the runner URLs if ports differ. Output goes to ignored `browser-artifacts/`; no runtime files are committed.

## Real acceptance still required

- A/B: submit City School reports, inspect real embedding matching or disclosed unavailability, manually confirm grouping, inspect both originals, and keep separate/dismiss.
- C: submit Hinglish text and a suitable licensed/synthetic flood photo to genuine Gemma, review/edit fields, save with original/provenance retained, correct and verify.
- D: set simulated transport offline, submit to reachable API, restart backend, restore transport and sync twice; exactly one delivery. Analyze saved deferred sources explicitly.
- E: build/install actual APK, make API unreachable, save text/photo, force-close/reopen, reconnect, upload one UUID, analyze explicitly and review/verify.

The APK has not built: Java is unavailable. No Android device/installation evidence, live Gemma result or complete backend integration is claimed. See `android-build.md` and `frontend-handoff.md` for exact blockers and next steps. Responder endpoints have no production authentication; use a trusted demo network.
