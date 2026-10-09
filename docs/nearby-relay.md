# Automatic Android nearby relay

## Scope and actual status

The user approved Bluetooth/BLE + Wi-Fi via Google Nearby Connections and has two Android phones with Google Play services. They explicitly want automatic device acceptance and report transfer without an Accept/Reject dialog for each connection. Provide one Nearby Sharing enable action, required Android permission prompts and one shared demo-group setup. Afterwards the app discovers, connects, authenticates and transfers automatically while in the foreground.

Backend support is implemented: existing repeat-safe multipart upload, durable raw deferred reports, original/provenance preservation, and additive `GET /api/v1/receipts/{client_report_id}`. Backend extension `c8f4d45` was incorporated into `feature/frontend-demo` at `ebd3b5e` while the review handoff was being published. The native plugin and frontend changes below are Developer 2's implementation work. No actual radio transfer or APK installation has been proved by the backend tests.

This is store-and-forward application behavior. Nearby supplies links between devices in radio range; it does not automatically route reports across disconnected phones. Any onward forwarding must use the durable relay queue described here. Do not claim an always-running background mesh.

## Android transport

Use a local Capacitor Android plugin named `ReliefMeshNearby` backed by `Nearby.getConnectionsClient(...)`, with the same service ID `org.reliefmesh.app.relay.v1` and `Strategy.P2P_CLUSTER` on both phones. Pin a compatible `com.google.android.gms:play-services-nearby` release after checking Google's Maven metadata. Do not replace the app's existing Capacitor major version or use browser Web Bluetooth as the Android transport.

Advertise and discover after permissions/radio readiness. Request connections automatically and call `acceptConnection` programmatically in `onConnectionInitiated`; SDK acceptance does not require a human dialog. Hold application reports until authentication below succeeds. Resolve simultaneous discovery/connection attempts deterministically using persistent random app-device UUIDs; keep one active session per peer, deduplicate callbacks and back off on disconnect. Stop scanning/disconnect on Disable, app pause or plugin destruction; resume when enabled and foregrounded. Display denied permissions, unavailable Play services and radios off as actionable states.

Use FILE payloads for report/photo packages. Nearby BYTES messages are limited to 32 KB: use them only for small handshake, inventory and acknowledgment messages. Both metadata and file can arrive out of order; receipt of the first byte is not completion. Process a file only after `PayloadTransferUpdate.Status.SUCCESS`. Cancel oversized transfers and keep incomplete ones out of the report queue. Use generated private filenames, never received paths.

### Automatic group authentication

Both phones join one demo group once using an out-of-band shared random key of at least 128 bits, entered/scanned during setup. Generate it at runtime; never hard-code it, commit it, put it in VITE variables, broadcast it or include it in report packages. Store it in native app-private storage protected with Android Keystore. Group membership authorizes automatic sharing, not responder verification.

Auto-accept the transport connection, then authenticate in native code before inventory or reports. Both sides send a small HELLO containing protocol version, group ID, app-device UUID and a fresh random nonce. Construct the same ordered transcript containing the two device IDs/nonces plus the local `ConnectionInfo.getRawAuthenticationToken()`; do not transmit that raw token. Exchange HMAC-SHA256 proofs using the shared group key with a distinct signer-device-ID suffix. Verify constant-time, reject reflected proofs, and require both peer proof verification and proof acknowledgment. Timeout/disconnect failed or missing authentication. Only then emit an authenticated peer event and exchange reports. Including the raw Nearby token binds the proof to this connection; names/group IDs alone do not authenticate a phone.

Google documents the raw token specifically for programmatic/headless authentication. Missing/null raw token is an authentication failure, never a reason to silently skip verification. Peer session state and nonces are cleared on disconnect. Native tests must cover wrong group key, modified transcript, reflection, stale/replayed proof and no data before authentication. The demo group key is shared trust, not per-user identity or production authentication.

## Capacitor bridge and frontend files

Developer 2 adds:

| File area | Change |
| --- | --- |
| `frontend/android/app/src/main/java/org/reliefmesh/app/ReliefMeshNearbyPlugin.java` and small native helpers | Nearby lifecycle, permission aliases, group authentication, bounded private-file transfers, persistent received-package inbox and progress events |
| `MainActivity.java`, Android manifest and Gradle | Register plugin, add the pinned Nearby dependency and Android-version-specific manifest/runtime permissions |
| `frontend/src/lib/nearby.ts` | Typed `registerPlugin('ReliefMeshNearby')` bridge; Android support check and event subscription cleanup |
| `frontend/src/lib/mesh.ts` | Serialize/import immutable packages, inventories, deduplication, retries, peer acknowledgments and gateway uploads |
| `frontend/src/lib/queue.ts` | Upgrade IndexedDB safely; preserve old origin reports and add relay entries/receipt/tombstone stores and atomic import |
| `frontend/src/lib/api.ts` and `api-types.ts` | Add delivery-receipt lookup; continue using the exact existing multipart wire-field selector |
| Nearby/queue UI and app lifecycle | Sharing toggle, one-time group setup, peer count, transfer progress and truthful delivery states; start automatic work after saves, authenticated connections and API reachability changes |

Suggested plugin surface: `configureGroup`, `start`, `stop`, `getState`, `sendReport`, `sendControl`, `listInbox`, `readInbox`, `acknowledgeInbox` and an `event` listener. Keep group secrets/raw connection tokens inside native code after configuration. Pass payload IDs as strings because Nearby uses Java longs beyond JavaScript's safe integer range. Bridge methods must resolve/reject exactly once and recover retained inbox entries when WebView listeners restart. Browser builds show "Nearby transfer is available in the Android app"; no silent mock transport.

Use the permissions appropriate to the actual Android versions and target SDK from the official setup page, including runtime Bluetooth permissions on Android 12+ and nearby Wi-Fi permissions where required. Do not request broad storage access just to manage app-private files. Verify the SDK's actual FILE receipt URI/storage behavior on both target devices and handle content URIs using ContentResolver. Filesystem access remains native, not arbitrary web paths.

## Package and queue rules

Define a versioned JSON report package transported as a FILE, capped at 16 MiB total. Its fields are:

```text
version: 1
origin_device_id: random app UUID
source_json: immutable JSON string
image_base64: original bytes encoded as Base64
content_sha256: lowercase hex digest
hop_count: integer 0..3
visited_device_ids: bounded unique UUID list
```

`source_json` encodes `{metadata, image_name, image_mime}`. Metadata contains ONLY `client_report_id`, `original_text`, `location`, optional coordinates, `analysis_result` and `edited_analysis`. The current gateway adds `network_online` when making HTTP requests; it is not part of the immutable source. Do not forward server IDs, cluster edits, queue attempts, errors, group keys or provider tokens as source metadata. Preserve `source_json` bytes when forwarding; never reserialize them or replace original analysis with responder corrections.

Digest: SHA256 of `uint32-big-endian(source_json UTF-8 byte length) || source_json UTF-8 bytes || decoded image bytes`. Exclude hop bookkeeping. Native code validates lengths/digest, JSON version/types, UUIDs, supported MIME, decoded image size <=10 MiB, metadata size <=64 KiB and decoded dimensions <=20 million pixels. Frontend validation and eventual backend validation remain required. Freeze the serialized source/digest once prepared; a changed source requires a new UUID. Do not truncate an oversized report silently.

The receiver durably retains the bounded validated native package before notifying the WebView, then imports photo Blob/source into IndexedDB in one transaction. Only after the transaction commits can it send `peer_stored` with UUID and digest and remove the redundant native inbox file. Native transfer SUCCESS alone is not a storage acknowledgment. `listInbox/readInbox` recovers packages after app/WebView interruption. Quota failure sends no success acknowledgment.

Deduplicate by original client UUID and immutable content digest. Same UUID/same digest is a repeat and can be acknowledged after durable presence is confirmed; different digest is a visible conflict and never overwrites a source. Apply the same rule to existing locally created reports. Keep a compact tombstone after completed delivery so inventories do not reimport removed uploads. Never use endpoint IDs as report IDs. Persistent own-device IDs, authenticated inventory batches, no forwarding to a visited device and max 3 hops bound loops. Hop/retention limits stop forwarding without silently deleting the originating citizen's saved source.

Use small batched inventories of UUID/digest pairs and request only unknown items. Start with one file transfer per peer. Serialize the delivery worker and use bounded exponential retry; do not launch a new upload on every repeated event. Test actual health/request outcomes for API reachability instead of trusting `navigator.onLine`. Listen for newly saved local reports, foreground resume and authenticated-peer events, and perform a modest foreground health check to recover connectivity.

## Gateway upload and acknowledgment

Phone A saves its own report/photo without a reachable API; analysis may be null. It automatically sends the immutable package to authenticated phone B. B retains it even when B is also offline. When B can reach the backend, it reconstructs the existing Submission and calls `POST /api/v1/reports` with `network_online=true`, original UUID/image/source and unchanged original analysis/initial edits. It never performs AI analysis as part of transport.

HTTP 201 and same-payload 200 are successful server acceptance. If the returned report is backend-pending because an earlier offline copy exists, call the existing `/sync` and check the receipt; do not reinterpret pending as hub delivery. 409 changed-payload conflict keeps the relay item visible and sends no delivered acknowledgment. Multiple peers uploading the same source should yield exactly one server record.

`GET /api/v1/receipts/{client_report_id}` returns:

```json
{
  "client_report_id": "original-uuid",
  "report_id": "server-uuid",
  "accepted_at": "UTC ISO timestamp",
  "sync_status": "synced"
}
```

404 means no server receipt yet. A pending receipt means accepted but not hub-synced. This lookup is useful after an uncertain HTTP outcome; it is not a content check or signed server proof. Use a same-payload POST replay to reconcile the actual local payload before final deletion. Keep backend origin configuration local; do not accept arbitrary upload destinations supplied by a peer.

B can send an authenticated `hub_receipt` control message with the immutable UUID/digest, configured backend origin and the API receipt after successful same-payload upload and hub sync. A offline labels it "Relay reports delivery" and may suppress repeated forwarding; it preserves its origin copy until its own matching API replay/acknowledgment. A normal `peer_stored` message labels "Shared to nearby phone; delivery pending" and must never delete A's only copy or show hub-delivered. No cryptographic server-signature guarantee is implied by a trusted peer's message.

## Two-phone demonstration and acceptance

1. Install the same built APK on two named Android phones with Google Play services; record APK checksum/source commit. Join the same group and enable sharing on both. There must be no per-peer Accept/Reject dialog.
2. Make A unable to reach the API while leaving Bluetooth and Wi-Fi enabled. Keep both apps open. Save text/photo/location on A, visibly showing analysis pending if it has none.
3. Verify automatic discovery/authentication/transfer. B displays the received source/photo, and A shows peer-stored delivery pending. Neither app invents AI results.
4. Initially keep B offline too; force-close/reopen B and show its received report survives. Transfers only resume after foregrounding; do not claim background execution.
5. Allow B to reach the configured laptop API. Show its automatic gateway upload, one backend UUID, matching photo bytes, retained original text/provenance and server receipt. A remains offline and shows the truthful peer delivery hint.
6. Reconnect A and repeat the same-source upload. Verify HTTP 200 replay and exactly one server source. Repeat peer discovery/disconnection and confirm no repeated source creation.
7. Test wrong group, denied permissions, interrupted photo transfer, duplicate package and conflicting digest. No unauthorized group receives incident bytes, and no incomplete/quota-failed copy gets peer-stored acknowledgment.

Two devices demonstrate a real nearby relay, not validated multi-hop coverage. A third-phone A -> B -> C scenario is needed before claiming tested multi-hop routing. The current model remains backend-hosted; a phone without API access can only queue raw reports or transfer an already analyzed result.

## Official references

- [Nearby overview](https://developers.google.com/nearby/connections/overview): offline links using Bluetooth/BLE/Wi-Fi.
- [Connection management](https://developers.google.com/nearby/connections/android/manage-connections): application-controlled automatic acceptance.
- [ConnectionInfo](https://developers.google.com/android/reference/com/google/android/gms/nearby/connection/ConnectionInfo): raw token for headless authentication.
- [Strategies](https://developers.google.com/nearby/connections/strategies): cluster topology; application forwarding is still required.
- [Payload exchange](https://developers.google.com/nearby/connections/android/exchange-data): completion callbacks, FILE/metadata ordering and limits.
- [Android setup/permissions](https://developers.google.com/nearby/connections/android/get-started).
- [Capacitor Android plugin guide](https://capacitorjs.com/docs/v7/plugins/android).
