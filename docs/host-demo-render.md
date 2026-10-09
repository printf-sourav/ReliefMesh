# Host the demo on Render

The UI and API use **one HTTPS address**. The browser opens the responder dashboard. Paste that same address into the APK’s Connection settings → Team address; do not append `/api/v1`. Bluetooth sharing stays on the phones and needs both apps open.

1. In Render, connect GitHub and grant access to `printf-sourav/ReliefMesh`.
2. Choose **New → Blueprint**, select this repository and branch **main**, and use `render.yaml`.
3. Review the service and **1 GB persistent disk** shown by Render, apply your credit, and approve creation. This is a paid service configuration; the disk keeps reports and photos across deploys. Check the cost shown in your account before creating it.
4. Wait for the deploy to become live. Open its HTTPS address: the dashboard should load. Open `/api/v1/health` at that address and confirm `status: ok`.
5. On the phone, open Connection settings, enter the HTTPS address and save/test. Send a clearly labelled synthetic report and refresh the web dashboard. Then test saving with that address unreachable and sending after reconnecting.

The current Docker configuration avoids downloading large local models and shows semantic matching as unavailable; responders can group reports manually. Hosted AI suggestions have no token configured by default and fail explicitly while raw reporting continues. Your existing Hugging Face token stays on your laptop. Before enabling paid inference on a public service, add access control/rate limits; the current demo APIs are unauthenticated. Use synthetic reports only. Fixture analysis is always labelled and is not a substitute for live inference.

The APK is a locally delivered debug demo build. Hosting the dashboard does not upload or publish the APK. Distribute `artifacts/ReliefMesh-demo.apk` separately.

Verification before deployment: frontend tests/build/browser checks, real local HTTP/report/photo/restart checks, Android build/signature/assets and hosted-static/API route tests. A local Docker image build and actual Render deployment still require their runtimes/account access; do not claim these are complete from the configuration files alone.

Rollback: manually deploy the previous known-good Git commit in Render. Keep the persistent disk attached and back up its contents before schema changes. Remove the demo service when finished if you do not want ongoing charges.

Configuration references: [Render Blueprint specification](https://render.com/docs/blueprint-spec), [persistent disks](https://render.com/docs/disks), and [Docker deployment](https://render.com/docs/docker).
