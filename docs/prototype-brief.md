# ReliefMesh prototype brief

Source: the user's pasted prototype description, supplied on 9 October 2026. This is a condensed implementation brief, not a verified copy of organizer rules.

Updated user requirements: use a polished React frontend instead of Streamlit, show a purpose-built phone UI, and deliver an Android APK. Keep the Python AI/SQLite core behind a FastAPI HTTP interface. Package the shared frontend with Capacitor. See [UI design](ui-design.md) and [APK delivery](mobile-apk.md).

## Goal

Complete one demonstrable loop in 4.5 hours:

Citizen text + image + location -> Gemma multimodal understanding -> editable structured analysis -> persistent report -> possible related reports -> offline queue -> simulated connectivity restoration -> responder review and verification.

## Required behavior

The citizen screen accepts required text, an image, and a location, with optional GPS coordinates. Analysis extracts incident type, summary, explicitly reported people, vulnerability information, needs, location context, language, image observations, confidence, and a human-verification flag. Show the analysis before submission and allow corrections.

Persist reports and images locally using SQLite and a local uploads folder. Use SentenceTransformers embeddings and cosine similarity to suggest possible duplicates. Suggestions must never automatically merge reports. Human responders can confirm grouping, separate reports, correct information, and verify incidents while retaining source reports.

SQLite lives on the backend host. When the browser/APK cannot reach that host, save the report and image blob in device IndexedDB; on reconnect, deliver it using a stable UUID and remove the local queued copy only after server acknowledgment. The APK must open without a running Vite dev server. Offline phone analysis is deferred unless a separate on-device model is actually implemented, which is outside this prototype.

Simulate disrupted transport with an online/offline toggle. Offline submissions remain in a durable pending queue; reconnecting marks them delivered to the simulated hub. Do not claim real Bluetooth, Wi-Fi peer transfer, or a remote hub exists.

The responder dashboard shows incident groups, source counts, photo counts, reported needs, source languages, first/latest report times, verification state, and pending queue count. Show individual sources in incident detail. Counts of people across overlapping reports must not be represented as unique people or added together automatically.

## Structured analysis

Use the exact fields and types in [the shared contract](shared-contract.md). `people_affected` may be unknown; never infer a number from an image. Keep AI observations separate from verified facts.

## Demo scenarios

| Case | Input | Expected result |
| --- | --- | --- |
| A | "City School ke paas pura road flooded hai." + suitable flood photo + City School | Road flooding with human review required |
| B | "Cannot cross road near City School because of flooding." + suitable photo + City School | Possible related report A; human confirmation before grouping |
| C | "Hamare ghar mein paani aa gaya hai. Chaar log hain. Ek elderly person hai aur drinking water chahiye." + flood photo + Riverside Colony | Residential flooding, 4 explicitly reported people, reported elderly person, drinking water need |
| D | Submit with simulated transport offline, restart, then reconnect | SQLite pending report survives restart and delivers once |
| E | On the installed APK, make the API unreachable, submit text + image, force-close/reopen, then reconnect | Device queue and image survive; retry creates one server record |

Use genuine, appropriately licensed images or clearly labelled synthetic test images. Fixtures are illustrative and are not records of real emergencies.

## 90-second demonstration

1. Set simulated transport offline.
2. Analyze scenario C with a locally available multimodal model; show the structured preview.
3. Submit and show "Saved locally; waiting for sync."
4. Submit a similar report and show a possible-duplicate suggestion.
5. Restore transport; show delivery count and an empty queue.
6. Open the responder dashboard, inspect original reports, confirm grouping, and verify the incident.

If inference requires an online endpoint, analyze before switching transport offline or show raw report queuing and deferred analysis. A phone disconnected from the backend cannot use the backend's local model either. Disclose that limitation; do not present fixture output as live Gemma output. Include opening the installed APK and its offline queue in the phone demonstration.

## Stretch scope

Voice transcription and need-resource suggestions are optional only after the complete loop passes. Never auto-dispatch resources. Real mesh transport, distributed hubs, agency integration, LoRa, and satellite backhaul are future ideas.
