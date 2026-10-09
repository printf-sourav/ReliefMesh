# Developer 2: frontend fixes, automatic nearby relay and APK

Continue ReliefMesh on `feature/frontend-demo`. Fetch the remote and incorporate its new handoff commit before working. Preserve your local changes; commit them first if necessary and resolve conflicts carefully. Keep the existing polished React/TypeScript/Tailwind/Capacitor UI.

Read `docs/shared-contract.md`, `docs/frontend-review-2026-10-09.md`, `docs/frontend-review-tests/README.md`, `docs/backend-handoff.md`, and the full `docs/nearby-relay.md`. The review covers frontend `0a4575d60439a3c8815bd41117c00ecbac22f412`; its original build, 14 tests, nine browser scenarios and actual HTTP integration passed. Three additional regression attachments reproduce defects that must be fixed.

Commit and push every meaningful completed increment and before ending each work session. If a tooling/device check is blocked, save completed work as a clearly labelled WIP with the exact blocker and next action. Do not merge `main`, deploy or mark untested work complete. The owner will review the completed integration before merging.

## Fix the three reviewed frontend defects

Copy the three tests from `docs/frontend-review-tests/src/` into their matching `frontend/src/` paths and confirm the failures, then implement:

1. **Photo/AI consistency:** In `pages/report.tsx`, track pending image validation with state and a synchronous guard; block Analyze and Save while validation is pending. Use source-generation and selection counters to reject late AI responses and out-of-order image validations. Handle invalid/cancelled selections cleanly. Test delayed decoding, late inference, two replacements completing in reverse order, and Save during validation. The saved photo/text/analysis must refer to one source snapshot.
2. **Analysis timeout:** In `lib/api.ts`, replace the universal 60-second timeout with operation-specific settings. New-source analysis and saved-source reanalysis must allow the backend inference budget plus upload/HTTP overhead; default to 120 seconds for the current 90-second backend setting. Keep shorter health/read timeouts, document configuration alignment, show useful timeout feedback and preserve pending sources. Do not automatically repeat paid inference.
3. **Validation/recovery:** Match `utils/schemas.py`: supported, decodable photos at most 10 MiB and 20 million pixels; trimmed nonempty original text at most 10,000 characters; trimmed nonempty location at most 300; backend-compatible analysis fields including nonempty `location_context` and text limits. Validate before persistence. Provide recovery for already-saved permanent validation failures rather than blindly retrying them. Changes to an immutable rejected source require a new UUID while preserving the original until recovery completes. Add boundary and recovery tests.

Keep the passing regressions in the application suite. Preserve the existing matching-availability display, secure LAN UUID fallback, explicit multipart field selector, original-versus-edited analysis, deferred saves and human review behavior.

## Integrate and implement automatic nearby sharing

The reviewed snapshot contained backend `bb51e84`. Developer 2 subsequently incorporated extension `c8f4d4578b9473f6780bc60dd56a147ee7275377` into the frontend branch at `ebd3b5e`. Preserve that integration and confirm the receipt API is available in your current checkout. Read the updated backend handoff and `prompts/nearby-relay-frontend.md`; do not repeat already-completed integration work.

Follow the full relay contract exactly. Implement the native `ReliefMeshNearby` Capacitor plugin using Google Nearby Connections, pinned compatible SDK/permissions, typed TypeScript bridge, connection-bound native group authentication, bounded FILE transfers, durable native inbox, safe IndexedDB migration, immutable source packages, UUID/digest deduplication, inventories, receipts, tombstones, hop limits and serialized foreground retries/gateway uploads.

The user approved Bluetooth/BLE plus Wi-Fi and has two Android phones with Google Play services. They require one-time group setup and sharing enablement, then automatic discovery/acceptance/transfer without a per-peer Accept/Reject dialog. Required Android permission prompts remain. Authenticate the group before incident data exchange; keep group secrets and raw connection tokens in native code. Handle radios off, denied permissions and unavailable Play services. Stop/recover correctly across foreground lifecycle changes.

Add a polished sharing toggle, setup, authenticated peer count and progress. Distinguish saved locally, shared nearby/delivery pending, relay reports delivery and directly API-confirmed delivery. A peer acknowledgment must not delete the origin's only copy or claim hub delivery. Reconcile content through same-payload POST before origin deletion; receipt lookup alone is not content verification. Preserve UUID/photo/text/original analysis across hops. Forwarding must never trigger AI inference. Browser builds should explain that real nearby transfer requires Android; do not claim background or tested multi-hop delivery.

## Deliver and verify the APK and live UI

Keep Capacitor 7 and select a compatible toolchain: JDK 21 and the committed SDK 35 requirements. Recheck the actual build machine. Run production build, Capacitor sync and Gradle `assembleDebug`. Deliver `ReliefMesh-demo.apk`, SHA-256 and exact source commit. Keep generated outputs, signing secrets, machine SDK paths and provider credentials out of normal Git commits.

Install the same APK on both phones. Run every two-phone acceptance step in `docs/nearby-relay.md`: A cannot reach the API but both radios remain on; saving on A transfers to B without peer prompts; B's received photo/source survives force-close/reopen; B automatically uploads when its API becomes reachable; A later reconciles; exactly one backend source exists. Include wrong-group, interrupted transfer, duplicate/conflict and storage-failure checks. Verify native photo selection/cancellation, keyboard/safe areas/Back and LAN API access. Record build success separately from physical-device proof.

Complete one frontend analyze/edit/save/review loop against the actual configured Hugging Face backend. Keep HF_TOKEN only on the backend. Confirm the selected port serves ReliefMesh; leave unrelated services running and use a free port if needed. The frontend origin contains only scheme/host/port, without `/api/v1`. Record live mode/model and original/citizen-edit preservation. Ensure semantic runtime/cache availability if suggestions are demonstrated; otherwise retain the honest unavailable display. Deferred offline reports remain analysis-pending until explicit analysis after reconnecting.

Rerun the complete frontend/backend suites, build, browser checks and real HTTP integration on the final integrated commit. Update owned frontend/Android/demo/task documents with actual evidence and limitations. Distinguish fixture tests, live inference, APK build and two-phone radio proof. Finish with pushed branch/commit links, checks, APK location/hash, blockers and readiness for owner review. Do not merge `main` yet.
