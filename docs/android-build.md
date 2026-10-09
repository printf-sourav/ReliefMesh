# Android build and artifact

The debug APK now builds. Earlier missing-Java/SDK results in the chronological frontend handoff are superseded. Android compilation is separate from installation and physical two-phone acceptance, which remain unverified.

## Toolchain and reproduction

App ID `org.reliefmesh.app`, version `1.0`/code `1`; Capacitor core/CLI/Android `7.6.9`, App plugin `7.0.1`, JDK 21, Android compile/target SDK 35 and minSdk 23. The Gradle wrapper uses 8.11.1 with AGP 8.7.2. Nearby Connections is pinned to `19.3.0`: Google's AAR manifest supports minSdk 21. The first build with `19.5.1` failed manifest merging because that library requires minSdk 24; no overrideLibrary or minimum-version bypass was used. The compatible Capacitor patch and remaining development-tool audit are documented in [dependency review](dependency-review-2026-10-09.md).

This host uses checksum-verified Temurin JDK `21.0.12.1+1` and official Google SDK command-line tools in ignored `.cache/android-tools`. Platform 35, build-tools 35.0.0 and platform-tools were installed; AGP also installed its default build-tools 34.0.0. Set `JAVA_HOME` to a JDK 21 installation, `ANDROID_HOME`/`ANDROID_SDK_ROOT` to an SDK containing platform 35, and add their executable directories to PATH. Machine paths, SDK downloads, licenses, caches, keys and build outputs are excluded from Git.

From a feature checkout:

```powershell
cd frontend
npm ci
npm run typecheck
npm test
npm run build
npx cap sync android
cd android
.\gradlew.bat --no-daemon testDebugUnitTest lintDebug assembleDebug
```

Capacitor bundles production web assets; no development-server URL is configured. Debug alone permits LAN HTTP/mixed content; release configuration prohibits cleartext. Configure Connection settings with the backend's bare origin, without `/api/v1`. A physical phone uses the laptop LAN/HTTPS origin; emulator alias is `http://10.0.2.2:8002` when the API runs on port 8002. Python/AI and all provider tokens stay on the backend.

## Actual build evidence

Initial native compile/unit/APK run: **BUILD SUCCESSFUL in 3m 21s**, 124 tasks. Gradle's authentication suite: **4 tests, 0 failures/errors/skips**, covering wrong key/group, changed raw-token transcript, reflection/replay and mutual proof acknowledgment before incident data. These tests establish protocol behavior in Java; they do not establish Nearby radio behavior.

Additional lint initially found 11 API-compatibility errors from Java collection APIs unavailable on Android 6. Compatible iteration/access fixed all errors. Transfer cleanup cancels stalled/disconnected files after a bounded timeout while preserving durable origin/inbox copies. Combined `testDebugUnitTest lintDebug assembleDebug`: **BUILD SUCCESSFUL in 1m 37s**, 176 tasks; app lint **0 errors, 22 warnings**. Warnings include pinned dependency updates, template resources, ignored newer permission flags on older Android, synchronous durable preferences and backup configuration suggestions. No lint baseline/suppression was added. Other nonfatal build warnings include generated flatDir repositories, SDK XML version mismatch and deprecated SDK APIs.

## Artifact and installation

The generated source APK is `frontend/android/app/build/outputs/apk/debug/app-debug.apk`. Deliver it separately as `ReliefMesh-demo.apk`; APKs and debug signing material are ignored. Exact source commit, artifact checksum and final build results will be recorded at the artifact checkpoint.

`adb devices -l` was actually run and returned an empty device list. Neither installation nor launch occurred. Connect both authorized phones with USB debugging and Google Play services, then install the same delivered artifact on each named serial:

```powershell
adb devices -l
adb -s PHONE_A_SERIAL install -r PATH_TO_ReliefMesh-demo.apk
adb -s PHONE_B_SERIAL install -r PATH_TO_ReliefMesh-demo.apk
adb -s PHONE_A_SERIAL shell am start -n org.reliefmesh.app/.MainActivity
adb -s PHONE_B_SERIAL shell am start -n org.reliefmesh.app/.MainActivity
```

Follow every step in [the two-phone acceptance scenario](nearby-relay.md#two-phone-demonstration-and-acceptance). Join the same one-time group in Queue, grant version-specific Android permissions and enable sharing. Keep both apps foregrounded with Bluetooth/Wi-Fi enabled. No per-peer acceptance dialog is implemented. Verify B's durable received photo, later gateway upload, A's same-payload reconciliation, one backend UUID, wrong group, denied permissions, interrupted transfer, digest conflict and storage failure. Also verify native picker cancellation, keyboard/safe areas/Back and LAN API access. Multi-hop routing needs a third-device scenario before it can be claimed tested.

References: [Capacitor 7 environment requirements](https://capacitorjs.com/docs/v7/getting-started/environment-setup), [Nearby setup](https://developers.google.com/nearby/connections/android/get-started), [FILE completion and scoped-storage URI access](https://developers.google.com/nearby/connections/android/exchange-data), [Android Java API compatibility](https://developer.android.com/studio/write/java8-support).

## Final source freeze before user stop

From tested/pushed source `975fa80de0af2aee91da72376de2d528a6f510fc`, final `assembleDebug` after final production web sync passed in **47s**, 113 tasks. The generated APK is preserved at the path above. The user stopped this chat before separate artifact copying, checksum/signature/asset checks or device installation. Developer 1 continues those tasks using `prompts/developer-1-continuation.md`; no physical acceptance is claimed.

## Delivered continuation artifact and one-phone verification

The earlier artifact/install blockers above are superseded by [the continuation delivery](integration-continuation-2026-10-09.md). Verified APK: `artifacts/ReliefMesh-demo.apk`, source **ac39a8b696137ac84aed17413a22e10c53bbe68b**, SHA-256 **8487c7a327982128f13bfea4c5093d6e1185835923c9b5199e9edec5fd8283c9**. Signature/identity/native plugin and all 47 production assets pass independent checks. [Manifest evidence](frontend-review-evidence/apk-verification.json) includes app/SDK/signature/asset details. Final combined native tests/lint/assembly passes in **38s**, 176 tasks: **five tests pass**, lint **0 errors/22 warnings**.

Installed and checksum-verified on an authorized Motorola Edge 60 Fusion, Android 16/API 36. Its real startup exposed status 8033 because the old manifest capped `CHANGE_WIFI_STATE` at SDK 32; the pinned Nearby client still checks it on Android 16. The uncapped normal permission fixes discovery, with a failed-before/passing-after regression. Runtime Bluetooth/Nearby grants remain explicit. Native picker launch/cancel, Android Back, exact offline UUID/text/photo across force-stop/reopen/APK update, foreground pause/resume and automatic API reconnect/receipt-only cleanup passed. No transport AI request occurred. Photo selection itself was supplied by a dedicated debug input and remains separate from native picker cancellation evidence.

The user has only one phone; two-phone authenticated transfer and interruption/wrong-group/conflict/storage-failure acceptance remain open. A third phone is needed for tested multi-hop. For local API access without exposing it to LAN, use `adb -s PHONE_SERIAL reverse tcp:8080 tcp:8080` and Connection settings `http://127.0.0.1:8080`; the laptop API stays loopback-only. Group keys, phone serial and personal device files are absent from published evidence.
