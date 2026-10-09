# Developer 1 backend handoff

Branch: `feature/backend-ai`. Implementation started from planning commit `6d92ac6` in an isolated managed worktree.

## Current checkpoint

All agreed HTTP routes are implemented: report persistence/images, live/fixture analysis, deferred analysis, duplicate suggestions, human grouping/separation/corrections/verification, dashboard metrics, clusters, queue and repeat-safe sync. Semantic model installation/prewarming and final reproducibility checks remain in progress.

Python 3.12.10; pinned core dependencies. `python -m pytest tests/backend -q --tb=short`: **32 passed** (4.44s). One upstream Starlette TestClient deprecation warning remains. Tests cover storage, HTTP errors/retries/images, both inference request formats, malformed outputs, explicit fixtures, grouping, original-output retention, deferred reanalysis, duplicate cache/dismissals and repeat-safe sync. Automated model/provider-boundary tests use controlled doubles; the separate live inference check below uses the actual configured provider.

Start: `python -m uvicorn api.main:app --host 0.0.0.0 --port 8000`. Open `/docs` or `/openapi.json` on the backend host. Phone requires the laptop's reachable LAN address; its own localhost cannot reach the laptop. No credentials are exposed by health or OpenAPI.

## Planned AI connections

Local Ollama `gemma4:e2b` is documented by [Ollama](https://ollama.com/library/gemma4); Gemma 4 multimodality is confirmed by [Google's model card](https://ai.google.dev/gemma/docs/core/model_card_4). The user also offered Hugging Face inference credit; an optional server-side adapter will read `HF_TOKEN` from ignored local environment configuration and follow [Hugging Face vision chat completion](https://huggingface.co/docs/inference-providers/tasks/chat-completion).

The user configured `HF_TOKEN` in ignored backend `.env`. No token was printed or committed. One bounded live request succeeded using `google/gemma-4-31B-it`, which currently lists vision providers on [its model page](https://huggingface.co/google/gemma-4-31B-it). The genuine result extracted 4 explicitly reported people, an elderly person and a drinking-water need from scenario C, with distinct observations of the supplied flood photograph. It returned `analysis_mode=live` and human verification required. Confidence 0.95 is an uncalibrated model estimate. No local Ollama executable was found; that adapter is request-tested, not live-tested. Never put tokens into `VITE_*`.

Live smoke command: `python -m services.smoke --image <path.jpg> --text '<scenario C text>' --location 'Riverside Colony'`. Each invocation can consume inference credit; ordinary tests never make paid calls. A historical demonstration photograph does not substantiate the fictitious Riverside report.

Photo used only in ignored `.cache/flood-smoke.jpg`: [Gloucester Road Tewkesbury, July 2007](https://commons.wikimedia.org/wiki/File:Gloucester_Road_Tewkesbury,_during_the_flood_of_July_2007_-_geograph.org.uk_-_2205066.jpg), Helen Iwanczuk, [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/), unmodified. If reusing it in the frontend, retain attribution and mark it as a historical demo image, not a current incident photo.

## Frontend integration notes

- Use multipart `image` + stringified JSON `metadata`; do not set multipart Content-Type manually. Routes and models follow `docs/shared-contract.md`.
- Original AI result and citizen edits are submitted together; server corrections preserve originals and reset verification. Raw offline sources upload without analysis and require explicit `/reports/{id}/analyses` before verification.
- Hub clusters default to synced sources; per-source people counts must not be summed. No real mesh/hub transfer exists.
- Duplicate endpoint exposes `matching_available` and warnings. Dashboard response retains four JSON fields and adds exposed `X-ReliefMesh-Matching-Available`/`X-ReliefMesh-Matching-Warning` headers; if unavailable, render duplicate count as unavailable, not zero. This is an additive availability diagnostic, not a changed JSON schema.
- Separate dismisses current suggested source pairs and former cluster siblings. Already-separated and repeated-membership operations are repeat-safe.
- This is a trusted-network demonstration API without production responder authentication. Credentials stay on the backend.

## Next

Deliver typed HTTP routes/OpenAPI, then multimodal adapters, embedding suggestions, human review and repeat-safe sync. Frontend developer can continue using the existing shared contract.
