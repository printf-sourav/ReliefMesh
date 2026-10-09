# Progress checkpoint prompt (for either developer)

Paste this after your assigned developer prompt, or use it as a follow-up in an already-running ReliefMesh Codex chat.

---

Continue your assigned ReliefMesh work in https://github.com/printf-sourav/ReliefMesh.git. Read the latest README, your assigned prompt under `prompts/`, `docs/shared-contract.md`, `tasks/plan.md`, and `tasks/todo.md`. The latest plan uses React/FastAPI and a Capacitor Android APK; incorporate it into any branch started from the older Streamlit plan without discarding current work.

**Always preserve and commit the progress you make.** Use your assigned isolated worktree/branch: Developer 1 `feature/backend-ai`; Developer 2 `feature/frontend-demo`. Do not share one working directory or commit/push directly to `main` during implementation.

1. At each meaningful implementation milestone, run the relevant focused checks, update your own task checkboxes and handoff note, and commit all changes belonging to that milestone with a specific message. Do this throughout the work, approximately every 20-30 minutes when there are meaningful changes; do not wait for the whole feature to finish.
2. Before ending any working turn, handing work over, or stopping for a blocker, save a checkpoint containing all current task-owned progress, even if incomplete. Use `wip: <specific progress>` for incomplete work; document exactly what works, what failed or remains untested, the blocker, and the next step. Never mark an unchecked/unverified feature complete to make a commit look finished. A WIP commit is allowed on your own feature branch, not evidence that the prototype passes.
3. Update `docs/backend-handoff.md` or `docs/frontend-handoff.md` with the current completed/partial work, exact verification outcomes, changed interfaces if agreed, known issues and next action. Keep each checkpoint small enough to review. Avoid unrelated formatting/refactoring.
4. Inspect `git status` and the staged diff. Stage only your assigned work and your own task/handoff updates. Include source, tests, configuration, lockfiles and documentation necessary to reproduce progress. Do not include someone else's changes, credentials, `.env` secrets, personal data, local DB/uploads, model weights, build caches, signing keys or generated binaries. Deliver the APK separately as an artifact.
5. Push each checkpoint to your assigned GitHub feature branch without force-pushing. Verify the push succeeded. If authentication/network/branch protection prevents it, keep the local commit and report the actual error and commit hash; do not claim GitHub is updated. Do not discard work to make a push succeed.
6. At every handoff/final response give the branch, latest commit hash/link, what was completed, actual validation, unresolved work and next step. If there is no new change, say so rather than create an empty commit. Before resuming, inspect the existing branch/history/handoff and continue from the saved checkpoint.

Developer 2 integrates Developer 1's agreed handoff commit and opens the final reviewable PR. Do not merge `main`, deploy, publish a release or change the shared API without the authorization/coordination described in your assigned prompt. Keep building independently within your ownership and report concrete blockers early.
