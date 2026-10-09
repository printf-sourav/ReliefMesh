# Frontend review regressions

These are three failing regression tests for the frontend reviewed at `0a4575d60439a3c8815bd41117c00ecbac22f412`. They were reproduced in a disposable copy. They do not run from this documentation directory.

On Developer 2's frontend branch, copy these files into the corresponding application paths:

| Attachment | Destination |
| --- | --- |
| `src/pages/review-regressions.test.tsx` | `frontend/src/pages/review-regressions.test.tsx` |
| `src/lib/review-timeout.test.ts` | `frontend/src/lib/review-timeout.test.ts` |
| `src/lib/review-image-limit.test.ts` | `frontend/src/lib/review-image-limit.test.ts` |

From `frontend`, with the existing dependencies installed:

```powershell
npm test -- src/pages/review-regressions.test.tsx src/lib/review-timeout.test.ts src/lib/review-image-limit.test.ts
```

Expected before fixes: all three fail. After implementing R1-R3 in [the review](../frontend-review-2026-10-09.md), all three should pass. Preserve these tests in the application suite and add the related cases requested by the review.

The tests use controlled decoding and inference completion, fake time, a mocked fetch response and mocked durable storage calls. They require no Hugging Face token, real backend, network or Android device. Additional real HTTP/browser and two-phone checks remain necessary.
