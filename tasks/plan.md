# ReliefMesh: two-developer execution plan

## Outcome

Build the loop described in [the brief](../docs/prototype-brief.md) with a polished React web/phone UI and Android APK within 4.5 hours. Developer 1 owns Python/FastAPI/AI/SQLite; Developer 2 owns React/TypeScript/Tailwind/shadcn, Capacitor Android and integration. Implement the [HTTP contract](../docs/shared-contract.md), [visual direction](../docs/ui-design.md) and [APK specification](../docs/mobile-apk.md).

## Working arrangement

Use independent checkouts/worktrees and branches `feature/backend-ai` and `feature/frontend-demo` from the latest React/Android planning commit. Existing branches merge updated `origin/main` while preserving work. Push tested increments; never force-push or commit secrets, DB/uploads, model weights, APK builds, signing keys or local SDK paths. Commit native Android source and Gradle wrapper.

Both start simultaneously. Developer 1 delivers route schemas/OpenAPI and minimal create/list, then inference. Developer 2 builds against explicit HTTP fixtures and checks Android tools immediately; minimal APK build by 0:45. At 0:25 confirm JSON/multipart contract; at 1:15 connect first live API report. Backend handoff is due 3:25. Android adds schedule risk: reserve native build time before optional UI extras.

## Schedule (elapsed time)

| Time | Developer 1 | Developer 2 | Checkpoint |
| --- | --- | --- | --- |
| 0:00-0:25 | Schema/DB, minimal API/OpenAPI, model feasibility | Design tokens, React shell, Android tools | Same HTTP contract; SDK/JDK available |
| 0:25-1:15 | Multimodal adapter, multipart/JSON validation | Minimal APK by 0:45; citizen form/analysis | First APK build and live API report |
| 1:15-2:00 | Storage, image route, embedding suggestions | Desktop/phone dashboard and detail | API photos/reports visible |
| 2:00-2:55 | Review/grouping, deferred analysis, errors | Review controls, IndexedDB image queue/retry | Human confirmation; durable device queue |
| 2:55-3:25 | Sync/API tests and backend handoff | Phone checks, populated APK and assets | Backend branch pushed; APK opens |
| 3:25-3:50 | Fix backend integration defects | Merge backend branch; test actual full flow | All core services connected |
| 3:50-4:10 | Support final fixes | UI finish, final APK, README/screenshots | Web/API/Android acceptance complete |
| 4:10-4:30 | Bug fixes only | Install/rehearse/checksum, freeze, final PR | Actual APK artifact and honest limitations |

Tasks and verification are in [todo.md](todo.md); update only your assigned entries. No new functionality after 4:10. Voice and resource matching require the complete core loop first.

Both developers follow [progress checkpoints](../prompts/progress-checkpoint.md): commit/push meaningful increments and preserve current progress before ending a working turn or handing off. Update owned task/handoff notes and use labelled WIP commits for partial work with honest validation/blockers. Do not wait until a whole feature is complete to commit it.

## Integration procedure (Developer 2 owns)

1. Ensure frontend work is committed; fetch `origin`.
2. Merge `origin/feature/backend-ai` into `feature/frontend-demo`. Resolve checklist changes by preserving completed entries from both developers. Respect the file ownership table.
3. Install Python requirements and run `npm ci` in `frontend`; configure FastAPI/model/CORS/phone reachability. Keep credentials out of browser builds and Git.
4. Run backend tests, frontend typecheck/build and browser checks. Run A-E using actual HTTP services, including Blob persistence, force-close/reopen, retry and one source per UUID. Build/sync Android assets and install-test APK.
5. Deliver `ReliefMesh-demo.apk` with checksum/build commit and screenshots as local artifacts. Push integrated branch and open one PR with model/runtime, actual web/APK/device evidence and limitations. If tooling is unavailable give a compare link. Attach any created PR to the Codex chat.
6. Leave the PR reviewable. Do not merge to `main` or deploy unless the user explicitly asks in that development chat.

## Risks and decisions

| Risk | Mitigation |
| --- | --- |
| Model version/runtime unavailable | Verify official support early; disclose blocker; explicit fixture mode supports UI work but does not satisfy real AI acceptance |
| Inference requires internet | Local inference supports offline analysis; otherwise queue raw reports/defer analysis or analyze before disconnecting |
| Two chats modify the same file | Ownership map, separate branches, one integration owner |
| Duplicate detection overstates certainty | Suggestions plus human confirmation; keep source reports and source-level people counts |
| Timeout/retry duplicates a phone report | Stable UUID, IndexedDB retention, server payload hash/uniqueness and acknowledge before dequeue |
| Model downloads exceed available time/hardware | Use a verified available compatible runtime/model; warm it before demo; keep fallback explicit |
| Missing Android SDK/JDK or incompatible Gradle | Check by 0:25/build by 0:45; report exact blockers instead of claiming an APK exists |
| Phone cannot reach laptop API | Test LAN/HTTPS or debug HTTP origin, CORS, multipart upload and image display |
| Mobile screenshot mistaken for an Android app | Require actual APK binary plus separate installation/launch evidence |

No missing preference blocks creating these prompts. Runtime availability and organizer model requirements are implementation feasibility checks, not reasons to invent a model or claim a successful live demo.
