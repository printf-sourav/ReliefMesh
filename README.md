# ReliefMesh

A planned 4.5-hour prototype for turning multilingual citizen reports with images into structured incidents for human responders.

**Current status:** this repository contains the build brief and two Codex developer prompts. The application has not been implemented yet.

## Start two Codex chats

Use a separate checkout or Codex worktree for each chat. Do not run both developers in the same working directory.

1. Give the first chat the entire [Developer 1 prompt](prompts/developer-1-backend.md). It owns AI, SQLite, duplicate suggestions, human-confirmed clusters, and simulated synchronization.
2. Give the second chat the entire [Developer 2 prompt](prompts/developer-2-frontend.md). It owns the Streamlit application, citizen/responder screens, demo, and final integration.
3. Both chats must read the [shared contract](docs/shared-contract.md), [execution plan](tasks/plan.md), and their assigned [tasks](tasks/todo.md).

Developer 1 uses `feature/backend-ai`; Developer 2 uses `feature/frontend-demo`. Start both from the same planning commit on `main`. Developer 2 integrates Developer 1's completed branch, validates the full demo, and opens the final integration pull request. Keep `main` as the common baseline until that review is complete.

## Prototype scope

- Required text, image, and location; optional coordinates.
- Genuine Gemma text/image analysis into validated JSON, followed by an editable citizen preview.
- SQLite persistence, embedding-based possible duplicates, and human-confirmed grouping.
- A simulated offline transport queue with repeat-safe synchronization.
- Responder metrics, source reports, images, corrections, and verification.

Voice, resource matching, actual device mesh networking, and deployment are outside the initial build.

The supplied brief names **Gemma 4**. Developers must verify the event-required model and available multimodal runtime before choosing an implementation; no unverified model identifier is prescribed here. Fixture analysis can support UI development but cannot prove the live AI requirement.

## Running the app

Run instructions, exact dependencies, model configuration, and demo limitations will be added by Developer 2 after implementation. The intended entry point is `streamlit run app.py`.

See [the condensed prototype brief](docs/prototype-brief.md) for the agreed demo journey. Event rules quoted in the original pasted text have not been independently verified.
