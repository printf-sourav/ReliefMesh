# Developer 1 continuation — verified APK and live UI

The continued implementation is committed/pushed on `feature/frontend-demo`. Frozen executable source: [`ac39a8b696137ac84aed17413a22e10c53bbe68b`](https://github.com/printf-sourav/ReliefMesh/commit/ac39a8b696137ac84aed17413a22e10c53bbe68b). Later documentation/evidence commits do not change this APK's source. Main has not been merged, and no release or deployment was performed.

## Delivered APK

The verified debug artifact is available locally at:

```text
C:\Users\soura\OneDrive\Documents\projects\ReliefMesh\artifacts\ReliefMesh-demo.apk
```

- SHA-256: `8487c7a327982128f13bfea4c5093d6e1185835923c9b5199e9edec5fd8283c9`
- Size: **5,345,987 bytes**. App ID `org.reliefmesh.app`, version `1.0`/code `1`, minSdk **23**, targetSdk **35**.
- Android signature verification succeeds with v1/v2 signing; the certificate is the local Android debug certificate. Signature/SDK/app identity are recorded in [APK verification](frontend-review-evidence/apk-verification.json).
- All **47** final production files match the packaged `assets/public` bytes. Native `ReliefMeshNearbyPlugin` is present in DEX; no development-server URL is configured.
- APK, checksum sidecar, keys and tool caches are ignored by Git. Transfer the APK directly to the two phones; this is a demonstration debug build, not a published store release.

To reproduce, use [Android build instructions](android-build.md), then set JDK 21 on PATH and run from the source-frozen repository:

```powershell
python scripts/verify_apk.py --sdk PATH_TO_ANDROID_SDK
```

This checks signature/identity/assets/native plugin, copies the APK to `artifacts`, and writes the public evidence manifest. It rejects uncommitted executable inputs. Always perform production build, Capacitor sync and Android assembly before verification; the manifest records the current committed source, not a claim of bit-for-bit reproducibility across machines/keystores.

## Implemented continuation fixes

Valid maximum-size 10 MiB photos now decode without exhausting the JavaScript regex stack. Noncanonical Base64 is rejected consistently with native validation. Stored delivery receipts preserve their issuing origin; foreign/legacy hints cannot falsely claim delivery to a new configured destination. Changed-destination identical sources can be reimported, while digest conflicts remain rejected. Physical Android 16 testing exposed Nearby status 8033: the pinned client requires `CHANGE_WIFI_STATE`, excluded by the former SDK 32 cap. Removing that cap fixes startup without bypassing runtime permissions or toggling radios; a native regression fails before the fix and passes afterward.

Every delivery path captures its API origin. A destination change during upload/receipt/acknowledgment retains the source. Central acknowledgment also closes the direct-submit/foreground-sharing race: relay originals cannot be deleted without matching client/server IDs, a valid synced receipt and the issuing origin. Failed transfer pairs remain paused after four attempts until real peer reconnection, including duplicate events. Transport never invokes AI.

Pinned compatible Capacitor/Vite/Router/Vitest updates and the remaining test-only audit findings are in [dependency review](dependency-review-2026-10-09.md). Runtime-only npm audit reports zero vulnerabilities; the full audit still reports three development-tool packages. No forced major upgrade was applied.

## Actual verification

| Check | Result |
| --- | --- |
| Frontend tests | **62 pass in 14 files**, 9.33s; meaningful regressions reproduced before fixes |
| Typecheck / production build / native sync | Pass; 1,675 modules, build 9.16s; sync 0.306s or less |
| Backend tests on frozen source | **36 pass**, 4.48s; one upstream Starlette/httpx deprecation warning |
| Edge browser scenarios on frozen bundle | **9 pass**, 320/390/768/1440px, no page errors or fixture console errors |
| Actual FastAPI/SQLite integration on frozen bundle | Pass: four intended sources, exact images, reload/reconnect/restarts, repeated sync, grouping/review, receipts and permanent-422/new-UUID recovery; no missing routes/page errors |
| Android authentication / manifest / lint / assembly | **5 pass** (four authentication + one manifest regression); **0 lint errors/22 warnings**; final combined build **38s**, 176 tasks |
| Final APK assembly | Included in the final combined build, after the Android 16 permission correction |
| APK signature / asset / plugin checks | Pass, **47 matching assets**, checksum above |
| Real frontend Hugging Face loop | Pass, **one explicit paid request**, live `google/gemma-4-31B-it` |
| Final production UI reopens live source | Pass, **zero additional inference requests**; original/edit/photo/verification/receipt retained |
| Real semantic runtime | Available; cached multilingual model loaded successfully |
| Physical phone installation / discovery | Pass on **Motorola Edge 60 Fusion, Android 16/API 36**, Google Play services; installed APK checksum matches; discovery starts; foreground pause/resume passes |
| Physical offline persistence / automatic gateway | Pass: UUID/text/exact synthetic photo survive force-stop/reopen and APK update; restore API connection, automatic upload creates one source, matching receipt precedes device cleanup; no inference |
| Physical two-phone transfer | **Not tested: user currently has only one phone** |

The single paid frontend loop was performed on pre-fix source `0a0f864`; original analysis and citizen edit were checked separately against the live response, exact synthetic photo bytes saved, human verification completed and synced receipt confirmed. [Live evidence](frontend-review-evidence/live-ui-results.json) and [final source replay](frontend-review-evidence/final-live-replay.json) distinguish that request from the final production-bundle recheck. Fixture browser/HTTP checks are explicitly labelled and make no inference claims. Screenshots show synthetic demonstration data, not real emergency reports: [mobile](frontend-review-evidence/live-mobile.png), [desktop](frontend-review-evidence/live-desktop.png).

## Current local demo and remaining acceptance

Normal frontend runs on **http://127.0.0.1:8001**, with its backend origin set to **http://127.0.0.1:8080** through the process configuration. The live backend is loopback-only and uses ignored demonstration DB/uploads. Provider token stays in the backend environment; it is absent from frontend/Git/APK. Unrelated port 8000 is preserved. These running processes are local to this session; ordinary restart instructions remain in the backend handoff.

The user currently has **one phone**. Its authorized installation, launch, native photo-picker opening/cancellation, Android Back dialog dismissal, offline persistence, APK-update persistence, real Nearby discovery, foreground pause/resume and automatic API gateway delivery passed. [Device evidence](frontend-review-evidence/device-results.json) and [Queue viewport](frontend-review-evidence/android-queue.png) record the checks without personal photos or group keys. The test supplied the synthetic photo through the debug WebView input; actual native photo selection, camera capture and the full keyboard/safe-area matrix remain open. Two-phone radio acceptance still needs a second phone.

Connect authorized Android phones by USB, enable USB debugging, and approve the computer prompt. Use named serials to install the same delivered APK. If an existing installation has a different signing certificate, preserve its reports and obtain approval before uninstalling it.

For the local API over USB, on each connected phone run `adb -s PHONE_SERIAL reverse tcp:8080 tcp:8080`, then set Connection settings to `http://127.0.0.1:8080`. This routes only the API connection through USB; nearby sharing must still use the native Bluetooth/Wi-Fi transport. To demonstrate an unreachable API while keeping radios on, temporarily select an unused API port. Grant Android permissions, join the same one-time group and enable Nearby Sharing in Queue on both phones; keep both apps foregrounded.

Complete every step in [physical acceptance](nearby-relay.md#two-phone-demonstration-and-acceptance): automatic same-group connection without per-peer dialogs, A offline, B initially offline, exact received image/source, force-close/reopen durability, later automatic B gateway upload, truthful A hint and eventual own same-payload reconciliation, one backend UUID; wrong group, denied permissions/radios/Play services, interruptions, conflicts, storage failure/no acknowledgment and foreground pause/resume. Also verify native picker/cancel, keyboard/safe areas/Back. A third phone is required before claiming tested multi-hop. Compilation, Java tests, simulated native events and responsive browser screens cannot establish these physical outcomes.

The integration is available in [draft PR #1](https://github.com/printf-sourav/ReliefMesh/pull/1), created and attached to this chat. The previous connector-403 limitation is superseded by successful creation using existing Git authentication without printing/storing credentials. The [branch comparison](https://github.com/printf-sourav/ReliefMesh/compare/main...feature/frontend-demo) is also available. Do not mark complete acceptance or merge main until the remaining actual device results are recorded.
