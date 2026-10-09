# Android build status

Capacitor core/CLI/Android `7.4.3`, App plugin `7.0.1`; app `org.reliefmesh.app`, name ReliefMesh, bundled `dist` with hash navigation. Native Android source and Gradle wrapper are committed. Generated web assets, build outputs, machine SDK paths and signing material are excluded.

9 October 2026 early gate: `cap add android` succeeded. `gradlew.bat assembleDebug` failed with exit 1:

```text
ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
Please set the JAVA_HOME variable in your environment to match the
location of your Java installation.
```

No Android SDK environment or usual local SDK/Android Studio installation was found; `adb` is unavailable. No APK binary/checksum/device evidence exists yet. APK acceptance is incomplete.

Final source check: production frontend build and `cap sync android` passed with 1,671 modules (5.63s build, 0.375s sync). Debug manifest alone enables cleartext. MainActivity enables mixed content only when `BuildConfig.DEBUG`; explicit `buildFeatures.buildConfig` is enabled. These Java/manifest changes remain uncompiled because the JDK is absent. File input supports gallery and an optional camera capture intent; cancellation/permissions/keyboard/Back on a real Android device are unverified.

Use the [Capacitor 7 environment requirements](https://capacitorjs.com/docs/v7/getting-started/environment-setup). With JDK and Android SDK installed:

```powershell
cd frontend
npm ci
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

Then copy `app/build/outputs/apk/debug/app-debug.apk` to an artifact named `ReliefMesh-demo.apk`, record SHA-256 and source commit, and separately install/launch/test using `adb install -r` on a named device. Desktop screenshots cannot establish device behavior.

APK contains React assets only; the model/API runs on a reachable laptop. Set backend origin to an HTTPS host or laptop LAN origin; emulator host alias is `http://10.0.2.2:8000`. Local HTTP must be enabled only for debug builds. Test actual multipart/photo fetching, picker cancellation/permissions, keyboard/safe areas/Back, unreachable-API save, force-close/reopen and one delivery after reconnect. No background synchronization guarantee.
