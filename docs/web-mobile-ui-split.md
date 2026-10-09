# Responder website and citizen phone app

The browser opens only the responder dashboard. Report and saved-report routes redirect to the dashboard; its empty state must not offer a citizen-report link. Review, corrections, verification, grouping and the action to bring waiting server reports into the dashboard stay on the web.

The Android APK opens reporting and has two bottom tabs: **Report** and **My reports**. Dashboard routes redirect to reporting. The phone asks **What happened?**, **Where is it?** and for a photo; **Send report** saves locally before attempting delivery. **Help describe this** is optional and requires deliberate use. Original suggestions and citizen edits remain separate.

My reports reads only this device’s saved reports and confirmed nearby-delivery records. It does not fetch or display the shared server queue. **Try sending now**, **Fix report**, **Share nearby**, **Team name** and **Team code** replace technical labels. Nearby copies remain waiting until direct confirmation; sharing requires the app to stay open and the existing one-time team setup and Android permissions. Automatic gateway delivery still follows the existing sharing worker’s enabled/foreground rules. Without sharing enabled, use Try sending now after reconnecting.

## Design contract

Use the existing Manrope/teal design system, with a centered single-column phone layout, soft off-white background, clear white panels, generous 48-pixel buttons and two persistent bottom tabs. A report is the main phone action; responder metrics and technical simulation controls do not belong in that flow. Required, pending, sent, rejected, empty and storage-error states remain explicit. No new UI dependency is needed.

No external visual reference was supplied; the existing app’s components and palette are the reference. Verify at 320, 390, 768 and 1440 pixels and on the connected Android phone.

## Developer preview

Default frontend builds are the responder website. The bundled APK selects citizen mode through Capacitor’s native-platform detection. `VITE_APP_MODE=citizen` is an explicit browser-only preview option for checking phone layouts; this is not authentication or an authorization boundary. Existing APIs remain an unauthenticated demonstration service.

Browser checks use responder fixtures at 5173, citizen fixtures at 5174, responder production preview at 4173 and citizen production preview at 4174. The citizen production preview can be built into ignored `.cache/citizen-dist` without replacing the APK’s `frontend/dist` assets. No fixture mode is included in the APK.

Existing ordinary submissions accepted by the server are removed from the local pending list. The sent section currently shows confirmed nearby-delivery history; it is not a full account-wide report archive.
