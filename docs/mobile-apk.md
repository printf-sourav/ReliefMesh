# Android APK deliverable

Developer 2 owns an installable **ReliefMesh-demo.apk**, using the same React frontend via Capacitor. This is a demo debug build signed with the standard debug key, not a Play Store release. No iOS or separate React Native application is requested.

## Required implementation

- `frontend/capacitor.config.ts`: app name ReliefMesh, app ID `org.reliefmesh.app`, `webDir: "dist"`.
- Commit `frontend/android/**` native source/config and Gradle wrapper; exclude generated builds, machine-specific SDK paths, caches, signing material and APK binaries from normal Git commits.
- Bundle `frontend/dist` into the APK through `cap sync android`; no `server.url` pointing at a dev server in the delivered config. Include local styles/icons/fonts and stable routing.
- Native-safe report image capture/picking, with cancellation and denied-permission handling. Try the standard file input first; use Capacitor Camera if Android testing shows it is needed. Persist image blobs in device IndexedDB before claiming offline save.
- Respect status/navigation bars, safe areas, Android Back behavior, keyboard, and rotation. Confirm the app cold-starts with network disabled and keeps queue data after force-close/reopen.
- Build an actual APK, record its SHA-256 and build commit, and install/launch it on an emulator or physical device. Report build success and device testing separately.

## Check the toolchain early

Within the first 25 minutes verify Node/npm, a compatible Capacitor release, Java/JDK, Android SDK/build tools and Gradle. Consult [Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup) for the selected version. Run a minimal Android build by 45 minutes before polishing the UI. Prefer installed compatible tools; report concrete missing SDK/JDK/build blockers promptly while continuing the web application.

## Planned build sequence

From `frontend`, initialize Capacitor and add Android once, then use the same-major compatible core/CLI/Android packages. After each frontend change rebuild assets and sync again:

```powershell
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

Expected generated file: `frontend/android/app/build/outputs/apk/debug/app-debug.apk`. Copy the final output to a user-accessible artifact path as `ReliefMesh-demo.apk`; include its absolute download link and checksum in the handoff. Source/config/build commands alone do not satisfy APK delivery. Preserve source if tooling is unavailable and report exactly what prevented the binary/device test; never pretend a responsive page is an APK.

Current delivered artifact: `artifacts/ReliefMesh-demo.apk`, source `ac39a8b696137ac84aed17413a22e10c53bbe68b`, SHA-256 `8487c7a327982128f13bfea4c5093d6e1185835923c9b5199e9edec5fd8283c9`. Signature, identity/native plugin and 47 bundled files verify. Installation and single-phone offline/discovery/reconnect checks pass on Android 16; two-phone transfer remains pending. See [actual delivery evidence](integration-continuation-2026-10-09.md).

## Backend reachability

The APK bundles the frontend, not Python, SQLite, or Gemma. Backend runs on the laptop or a reachable demo host. Browser desktop development uses a Vite API proxy; the APK needs `VITE_API_BASE_URL` or a validated user-editable demo API origin. Show a connection-test action and persist the chosen origin. Credentials stay on the backend.

For a physical phone, use the laptop's reachable LAN address on the same network and bind FastAPI to `0.0.0.0:8000`. `localhost` on the phone is the phone. Android Emulator uses host alias `10.0.2.2` for the usual host loopback setup; verify the actual selected environment. See [Android emulator networking](https://developer.android.com/studio/run/emulator-networking).

Prefer a reachable HTTPS origin. If local HTTP is used for a trusted demo, configure and document **debug-only** Android cleartext/network settings and any WebView mixed-content requirement; keep release defaults restrictive. Test real multipart uploads and image loading on Android, since a desktop fetch test is insufficient. If using [CapacitorHttp](https://capacitorjs.com/docs/apis/http), follow documented FormData handling; native helper methods cannot simply accept arbitrary browser Blob/FormData objects. Keep one tested transport adapter rather than sprinkling platform branches through components.

## Offline behavior and demonstration

When the backend is unreachable, text + image + location are saved to device IndexedDB with a stable UUID. Analysis shows pending, unless it was genuinely performed before disconnecting. On reconnect, queued sources upload with the same UUID; remove them only after acknowledgment, then trigger simulated hub synchronization. Both failed and timed-out uploads retain the queue item for repeat-safe retry.

Demonstrate APK launch, reporting UI, photo picking, offline save, force-close/reopen, reconnection, delivery acknowledgment, and responder review. Do not claim on-device Gemma inference, actual mesh networking, or guaranteed background synchronization.

## Delivery

Include desktop and Android screenshots, install steps (for example `adb install -r <apk-path>`), API address setup, exact tested device/Android version, build commands, checksum, known limitations and the binary link in `docs/android-build.md`. Push native source and reproducible setup to the development branch. An optional GitHub Release binary upload requires a request to publish that release; the normal deliverable is the local APK artifact plus committed source and final integration PR.
