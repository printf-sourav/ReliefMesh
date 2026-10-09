# ReliefMesh: two-developer execution plan

## Outcome

Build the loop described in [the brief](../docs/prototype-brief.md) within 4.5 hours. This planning commit is the common starting point. Developer 1 owns backend/AI; Developer 2 owns UI and integration. Implement the agreed [contract](../docs/shared-contract.md) without a separate API server.

## Working arrangement

Use independent checkouts or worktrees and the branches `feature/backend-ai` and `feature/frontend-demo`. Each developer commits tested increments and pushes their own branch. Never force-push, overwrite the other developer's files, or commit secrets, local databases, uploads, or model weights.

Both developers start simultaneously. Developer 1 prioritizes a working schema and minimal create/list path, then multimodal analysis. Developer 2 works against private labelled fixtures while those services are built. At 25 minutes, confirm matching schemas/signatures; at 75 minutes, connect the first live analyze/submit flow. The branch handoff must happen by 3:25, leaving time for integration.

## Schedule (elapsed time)

| Time | Developer 1 | Developer 2 | Checkpoint |
| --- | --- | --- | --- |
| 0:00-0:25 | Schema, DB, create/list, model/runtime feasibility | App navigation, forms, private fixtures | Same contract and branch baseline |
| 0:25-1:15 | Genuine multimodal adapter and JSON validation | Citizen form, editable preview, submission states | Text + image reach model; first live report |
| 1:15-2:00 | Durable records, image storage, embedding suggestions | Dashboard, detail, source media and counts | Saved report visible after restart |
| 2:00-2:55 | Human grouping, corrections, verification | Group/separate/correct/verify UI and offline queue | Similar reports remain separate until confirmed |
| 2:55-3:25 | Repeat-safe simulated sync, tests, backend handoff | Reconnect flow, demo assets and UI checks | Developer 1 branch pushed and ready |
| 3:25-3:50 | Fix backend integration defects | Merge backend branch; test actual full flow | All core services connected |
| 3:50-4:10 | Support final fixes | UI polish, README, 90-second demo | MVP acceptance complete |
| 4:10-4:30 | Bug fixes only | Rehearse, validate, freeze, final PR | Reproducible demo and honest limitations |

Tasks and verification are in [todo.md](todo.md); update only your assigned entries. No new functionality after 4:10. Voice and resource matching require the complete core loop first.

## Integration procedure (Developer 2 owns)

1. Ensure frontend work is committed; fetch `origin`.
2. Merge `origin/feature/backend-ai` into `feature/frontend-demo`. Resolve checklist changes by preserving completed entries from both developers. Respect the file ownership table.
3. Install `requirements.txt`; configure the backend exactly as its handoff documents. Do not copy credentials into Git.
4. Run backend tests and focused UI/integration checks. Run the demo with actual services, restart persistence, then repeated synchronization.
5. Push `feature/frontend-demo` and open one integration PR to `main`, including tested commands, model/runtime, and known limitations. If PR tooling is unavailable, give the user a GitHub compare link for the pushed branch. Attach any created PR to the Codex chat.
6. Leave the PR reviewable. Do not merge to `main` or deploy unless the user explicitly asks in that development chat.

## Risks and decisions

| Risk | Mitigation |
| --- | --- |
| Model version/runtime unavailable | Verify official support early; disclose blocker; explicit fixture mode supports UI work but does not satisfy real AI acceptance |
| Inference requires internet | Local inference supports offline analysis; otherwise queue raw reports/defer analysis or analyze before disconnecting |
| Two chats modify the same file | Ownership map, separate branches, one integration owner |
| Duplicate detection overstates certainty | Suggestions plus human confirmation; keep source reports and source-level people counts |
| Streamlit reruns duplicate writes | Stable per-draft UUID plus database uniqueness and transaction-safe retries |
| Model downloads exceed available time/hardware | Use a verified available compatible runtime/model; warm it before demo; keep fallback explicit |

No missing preference blocks creating these prompts. Runtime availability and organizer model requirements are implementation feasibility checks, not reasons to invent a model or claim a successful live demo.
