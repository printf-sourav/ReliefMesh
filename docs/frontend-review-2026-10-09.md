# Frontend review and remaining integration work

Reviewed on 2026-10-09. **Changes are required before the final web, APK and nearby-sharing demo is ready to merge.** The existing UI and core HTTP integration work, but three reproducible frontend defects need fixes. Native nearby sharing, an actual APK and the live-provider UI acceptance check remain incomplete.

This review is documentation only. At the owner's request, the review, regression attachments, evidence and implementation handoffs are being published on `feature/frontend-demo`. No application source was changed and no branch was merged. The owner will approve the later merge after the implementation is ready.

## Exact reviewed versions

| Item | Version / status |
| --- | --- |
| Frontend | [`feature/frontend-demo` at `0a4575d60439a3c8815bd41117c00ecbac22f412`](https://github.com/printf-sourav/ReliefMesh/tree/0a4575d60439a3c8815bd41117c00ecbac22f412) |
| Backend included in frontend | `bb51e84`; complete core API and model handoff |
| Newer backend extension | [`feature/backend-ai` at `c8f4d4578b9473f6780bc60dd56a147ee7275377`](https://github.com/printf-sourav/ReliefMesh/tree/c8f4d4578b9473f6780bc60dd56a147ee7275377), not included in the reviewed frontend |
| Main checkout | `6d92ac6a1732c57c04a399f33a49cb0e2eadf6f0`; planning baseline |

The newer backend adds delivery receipts and the native-relay contract. Publication update: while this handoff was being prepared, Developer 2 incorporated it into `feature/frontend-demo` at `ebd3b5e`. Preserve that integration; the version table and test results above describe the earlier reviewed snapshot. The existing frontend correctly handles matching-availability headers and has a secure UUID fallback for LAN HTTP; those older review concerns are already fixed.

## Verification performed for this review

Tests ran against an isolated archive of the exact frontend commit, rather than another developer's working checkout. Dependencies were reused from an identical package/lockfile installation.

| Check | Result |
| --- | --- |
| Frontend TypeScript and production build | Passed; 1,671 modules |
| Existing frontend unit tests | 14 passed across four files |
| Backend tests included in this frontend branch | 32 passed; one upstream Starlette/httpx deprecation warning |
| Real browser checks | Nine scenarios passed; 320, 390, 768 and 1440 px layouts, mobile touch targets, navigation, grouping/correction/verification, dialog focus and device-queue recovery |
| Actual HTTP integration | Passed against isolated FastAPI/SQLite, fixture AI and disabled matching; no missing expected routes or uncaught page errors |
| Three additional review regressions | All three fail on the reviewed frontend, reproducing R1-R3 below |
| Mutation check | Temporarily broke the matching-header condition in the disposable copy; its unavailable-matching test failed. Restored the source and all four API tests passed again |
| APK build / installed Android / physical radios | Not established by this review |
| Frontend with live Hugging Face inference | Not established by these fixture runs; no new paid inference was requested |

HTTP checks exercised multipart original/edited analysis, image retrieval, source verification and correction reset, deferred upload/reanalysis, browser reload, backend restart persistence, repeated sync without duplicate sources, and human grouping. They establish HTTP/storage integration, not Bluetooth behavior or live-model quality.

Browser and HTTP result summaries are saved in [frontend-review-evidence](frontend-review-evidence/). The first browser attempt encountered Vite 403s for fonts because this review reused dependencies through a directory junction outside Vite's default serving boundary. A serving-path adjustment confined to the disposable test configuration resolved this; the final run had zero fixture console errors and zero uncaught page errors. This is a review-environment issue, not a requested product change. The HTTP runner's test origin/CORS was adjusted to its isolated preview port, 4273.

## R1 — P1: replacement photos can inherit analysis of the previous photo

**Files:** `frontend/src/pages/report.tsx:25` (`choose`), `:29` (`analyze`), and the Analyze/Save disabled conditions.

`choose()` awaits image decoding before invalidating the previous result, but does not mark photo validation as busy. While the replacement is decoding, Analyze and Save still use the previous photo. If analysis starts then the replacement finishes decoding, the late AI response is installed without checking which source it analyzed.

Reproduced sequence:

1. Select `old.png` and enter text/location.
2. Select `new.png` with a delayed decoder.
3. Click Analyze while the replacement is pending; this analyzes the old photo.
4. Finish decoding the new photo, then return the old inference result.
5. Save. The queued image is `new.png`, but its analysis summary/observations describe `old.png`.

**Required fix:** Track validation synchronously with a ref and visibly with state; block Analyze and Save while selection validation is pending. Use a source-generation counter and capture it when starting inference; apply a response only if the source generation still matches. Use a selection counter as well so out-of-order image validations cannot overwrite the latest selection. Invalidate obsolete results consistently and handle cancelled/invalid selections without leaving stale busy state.

**Acceptance:** The attached delayed-decoder/inference regression passes. Also test two replacements completing in reverse order and Save during replacement validation. A queued photo, original text and analysis must always refer to the same source snapshot.

## R2 — P2: frontend cancels analyses before the backend's allowed timeout

**Files:** `frontend/src/lib/api.ts:27`, its `analyze` and `reanalyze` methods; backend `utils/config.py`.

All frontend requests use `AbortSignal.timeout(60000)`. The backend permits 90 seconds for inference by default. A successful response at 70 seconds is therefore discarded by the frontend and reported as an unreachable API while the backend may still be running the paid inference.

**Required fix:** Make timeout selection operation-specific. Allow analysis and saved-source reanalysis at least the configured inference budget plus upload/HTTP overhead; 120 seconds is a reasonable default for the current 90-second backend setting. Keep shorter health/read timeouts where appropriate and document how to align a custom inference budget. Give a useful timeout message and preserve the pending source. Do not automatically repeat paid analysis on a timer.

**Acceptance:** The attached fake-clock 70-second response test passes; add coverage for saved-source reanalysis and an actual timeout. Normal connection failures must still retain queued reports for retry.

## R3 — P2: client validation admits reports that cannot be uploaded

**Files:** `frontend/src/lib/draft.ts:11` and `:18`, `frontend/src/components/analysis-editor.tsx` (`cleanAnalysis`), and device queue recovery controls. Match `utils/schemas.py`.

The frontend checks image bytes/MIME/decoding but omits the backend's 20-million-pixel limit. A decoded 6000 × 4000 image below 10 MiB is accepted locally and rejected by the API with 413. The report is already saved and locked; Queue only retries the unchanged payload. The attached controlled decoder test reproduces the missing limit.

Related contract omissions found by inspection: original text must be at most 10,000 characters, location at most 300, and analysis text fields must be nonempty and at most 10,000 characters. In particular, `cleanAnalysis` currently allows an empty `location_context`, although the backend rejects it. Native relay will also need the package/metadata bounds in its separate contract.

**Required fix:** Enforce the backend's pixel and text bounds before persisting a new submission, including trimmed required analysis fields. Show a useful resize/field error. Add a recovery action for already-stored invalid submissions; classify permanent validation errors rather than repeatedly uploading them automatically. Editing a rejected source must create a new source UUID while preserving the original until the user completes recovery. Do not silently alter an immutable payload that may already be on another phone.

**Acceptance:** The attached oversized-image test passes. Add exact-boundary tests, overlong text/location, blank analysis location context, and recovery of an existing permanently rejected queue item without losing its photo.

## R4 — required feature: implement automatic Android nearby relay

The reviewed branch has no Nearby native plugin, radio permissions/dependency, typed bridge, relay queue, delivery-receipt client or automatic foreground delivery worker. `MainActivity` only provides the Capacitor bridge/debug mixed-content setup; the main manifest only requests Internet. Queue delivery is button-driven. Its current wording correctly says no peer mesh is implemented.

Use the full [backend nearby-relay contract at c8f4d45](https://github.com/printf-sourav/ReliefMesh/blob/c8f4d4578b9473f6780bc60dd56a147ee7275377/docs/nearby-relay.md) and [Developer 2 implementation handoff](https://github.com/printf-sourav/ReliefMesh/blob/c8f4d4578b9473f6780bc60dd56a147ee7275377/prompts/nearby-relay-frontend.md). This user-approved feature extends the original brief.

| Frontend/native area | Required work |
| --- | --- |
| `frontend/android/.../ReliefMeshNearbyPlugin.java` plus small helpers | Nearby discovery/advertising, automatic connection acceptance, group authentication, bounded FILE transfers and durable native inbox |
| `MainActivity.java`, manifest and Gradle | Register plugin, pin compatible Nearby SDK, declare/request permissions appropriate to device Android version and target SDK |
| New `frontend/src/lib/nearby.ts` | Typed Capacitor bridge, native support/state checks, event subscriptions and cleanup |
| New `frontend/src/lib/mesh.ts` | Immutable source packaging, digest validation, inventories, peer acknowledgments, deduplication, hop limits and serialized gateway retries |
| `frontend/src/lib/queue.ts` | Safe IndexedDB upgrade retaining existing reports; atomic relay imports, delivery state and tombstones |
| `frontend/src/lib/api.ts` / `api-types.ts` | `GET /api/v1/receipts/{client_report_id}` and DeliveryReceipt type; retain the explicit multipart wire-field selector |
| App lifecycle and Nearby/Queue UI | Sharing toggle, one-time group setup, permission/radio readiness, authenticated peer count, progress and automatic foreground work after saves, connections and API recovery |

The desired experience is **one-time setup, then automatic sharing while both apps are open**, without an Accept/Reject dialog for each peer. Nearby supports application-controlled [automatic acceptance](https://developers.google.com/nearby/connections/android/manage-connections). Complete the contract's shared-group authentication before exchanging incident data. Required Android permission prompts remain. Radios must be enabled: Google has announced that Nearby will stop automatically enabling Bluetooth/Wi-Fi in late 2026, so show an actionable radios-off state ([official change notice](https://android-developers.googleblog.com/2026/07/upcoming-changes-nearby-connections-api.html)).

Keep distinct labels for saved locally, shared nearby/delivery pending, relay reports delivery, and directly API-confirmed delivery. A peer storage acknowledgment is not hub delivery and must not delete the origin's only copy. Preserve source UUID/photo/text/original analysis across hops; forwarding must not trigger AI inference. A receipt lookup is not a content verification: reconcile using a same-payload POST before deleting an origin copy. Browser builds should explain that real nearby transfer requires Android.

**Acceptance:** Install the same APK on the two phones, join the same group once, leave Bluetooth/Wi-Fi on and make A's API unreachable. Saving on A must automatically transfer text/photo to B without a peer prompt. B's received copy must survive force-close/reopen; B must automatically upload when its API becomes reachable. Reconnect A and repeat/reconcile: exactly one backend source must exist. Complete the contract's wrong-group, interrupted-transfer, duplicate/conflict and storage-failure checks. Two phones prove nearby relay; they do not prove multi-hop coverage or always-running background delivery.

## R5 — required deliverable: build and verify the APK

The published frontend handoff explicitly records no APK binary/checksum or installed-device evidence. Its missing-Java/SDK result belongs to that developer's host, and must be rechecked on the machine used to build.

The project pins Capacitor 7.4.3 and its native variables use compile/target SDK 35. Capacitor 7 requires JDK 21 and Android Studio Ladybug or newer; Java 17 alone is insufficient ([version-specific official guide](https://capacitorjs.com/docs/v7/updating/7-0)). Install/select the compatible toolchain and SDK/build tools, then build the source already committed to the frontend branch:

```powershell
Set-Location frontend
npm ci
npm run build
npm run android:sync
Set-Location android
.\gradlew.bat assembleDebug
Get-FileHash .\app\build\outputs\apk\debug\app-debug.apk -Algorithm SHA256
```

Deliver `ReliefMesh-demo.apk`, its SHA-256 and the exact source commit. Record build success separately from successful installation on both phones. Verify native photo selection/cancellation, keyboard/safe areas/Back, debug LAN API access, unreachable-API save, force-close/reopen and single-source delivery after recovery. Keep generated outputs, machine SDK paths, signing secrets and provider tokens out of normal source commits.

## R6 — required demo evidence: one live-provider frontend loop

Backend handoff already records real Hugging Face text/photo inference and real multilingual embeddings. The frontend HTTP tests use disclosed fixtures and disabled semantic matching; they do not establish the live UI path.

Run the frontend against an actual ReliefMesh backend with its existing private environment, on a free port. Confirm `/api/v1/health` and the service identity before configuring Connection settings. The other developer's reported unrelated service on 8000 should be left running. The frontend origin is the bare scheme/host/port, **without `/api/v1`**; the client adds that path.

Analyze a clearly labelled demo photo/text through the UI, preserve original output and citizen edits, save, retrieve the photo and review the source on the dashboard. Record live mode/model and human review behavior. If semantic suggestions are part of the demonstration, ensure the model/cache is loaded on that runtime; otherwise retain the honest unavailable state. Keep HF_TOKEN on the backend only. Deferred offline reports must remain analysis-pending until explicit analysis is requested after reconnecting.

## Regression attachments and next steps

The three test attachments under [frontend-review-tests](frontend-review-tests/) reproduce R1-R3. They are documentation attachments, not changes to the application test suite. Copy each into the matching `frontend/src/...` path on Developer 2's branch, run them to confirm the failures, implement the fixes, then keep the passing tests in the frontend suite. The timeout test uses a controlled response and fake time; the image test uses a controlled decoded dimension. Neither is a paid provider call or a physical-camera test.

Suggested completion order:

1. The owner requested publication of these review documents on `feature/frontend-demo`. Developer 2 should fetch/pull that branch and read [the consolidated follow-up prompt](../prompts/frontend-review-followup.md).
2. Developer 2 adds the three regressions and fixes R1-R3, including related boundary/recovery checks.
3. Preserve and verify the now-integrated backend `c8f4d45`, and implement R4 using its full contract.
4. Complete R5 and R6, then the physical two-phone acceptance scenario. Update owned handoff/demo/task documents with actual evidence and remaining limitations.
5. Rerun build, the complete frontend/backend suites and both browser/HTTP scripts against the final integrated version. Record the exact commit and APK hash.
6. Request the owner's review, then merge when approved. This review has not performed that merge.

Developer 2 should commit and push each meaningful completed increment, including clearly labelled WIP checkpoints if tooling/device checks are blocked. Do not mark mesh, APK or live-provider acceptance complete solely because browser fixtures pass. Keep the current polished React/TypeScript/Tailwind/Capacitor stack; this review found no reason to replace it.
