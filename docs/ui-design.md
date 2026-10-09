# ReliefMesh visual design contract

Goal: a polished civic-response product that judges can understand immediately on a laptop and an Android phone. Developer 2 implements this direction, not a generic admin template or a marketing landing page.

## Stack

React + TypeScript + Vite; Tailwind CSS; owned shadcn/ui components from one consistent primitive family; Lucide icons. React Router for Report, Dashboard, Queue, and incident detail; use hash routing in the shared app for reliable bundled Android navigation. `idb` persists device reports. React local state and a small typed fetch client are sufficient; add further state/form libraries only when needed. CSS transitions are enough for this deadline.

Official setup references: [Vite](https://vite.dev/guide/), [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite), [shadcn with Vite](https://ui.shadcn.com/docs/installation/vite), [Capacitor](https://capacitorjs.com/docs). Pin compatible versions and keep the npm lockfile.

## Visual language

Use a calm light theme: background `#F4F7F8`, white surfaces, slate text `#172B36`, teal brand/primary action `#0F766E`, muted text `#526672`, subtle borders `#DCE5E8`. Amber communicates review/queued state and red communicates errors; always pair colors with words/icons. Verify actual foreground/background contrast before delivery.

Bundle a licensed Manrope font locally with a system sans-serif fallback; no runtime Google Fonts dependency in the APK. Use a clear 16px body, 28-36px desktop titles, and 24-28px mobile titles. Apply a 4/8px spacing rhythm, 10-14px surface corners, restrained shadows only on floating elements, and consistent outlined icons. Keep long incident descriptions readable rather than squeezing them into pills.

Use real report photos to give incidents context. Show metadata through alignment and type hierarchy. No decorative charts, fabricated map pins, urgency/severity scores, huge gradient heroes, glass overlays, or animated backgrounds. The product's function supplies the visual interest.

## Desktop

Use a narrow persistent sidebar with ReliefMesh wordmark, Report, Dashboard, and Queue navigation; a compact top bar shows connectivity and the primary report action. Dashboard: a compact metrics strip, filter/search row, and a generous incident list alongside selected incident detail where width allows. Each row has a small photo, location/title, concise summary, source count, needs, and verification status. Keep filters functional; avoid unused controls.

Citizen reporting uses a two-column workspace: clear text/location/image fields on the left, image/analysis preview on the right after analysis. Before analysis, use a short explanation of what will be extracted, not fabricated results. Separate Analyze and Submit with clear progress/status feedback. Correction controls should feel like normal form fields.

## Phone and APK

Design mobile screens first at 390px, also test 320px. Use compact top app bar, Report/Dashboard/Queue bottom navigation, safe-area-aware content and bottom padding. Render a focused one-column form, large image picker, location input, analysis sheet/page, and one clear primary action. Minimum 44px touch targets; input text at least 16px. Keep the keyboard from covering focused inputs or the submission action.

Dashboard becomes a scannable list with compact metrics; incident details use a full page or accessible sheet, never an unscrollable desktop table. Offline queue shows each item's photo, location, age, analysis status, and retry action. Settings for the demo API address belong in an unobtrusive settings sheet, with actual connection-test feedback.

## Interaction quality

Provide intentional empty, analyzing, saving, saved, queued, synchronizing, retry, and API-unavailable states. Use short 120-180ms transitions and respect reduced motion. Show saved/delivered feedback only after persistence/acknowledgment. A toast complements, rather than replaces, durable status in the screen.

Use visible labels, descriptive errors, keyboard focus rings, semantic headings, accessible dialogs/focus return, useful image alt text, and icon-button names. Test narrow/medium/wide screens, long Hinglish descriptions, unknown values, and image-picker cancellation. Status badges say AI suggested, Review pending, Verified, or Analysis pending according to actual data.

## Finish gate

Developer 2 captures actual rendered desktop and phone screenshots, checks keyboard/touch interactions and console errors, and documents outcomes. Inspect both initial empty screens and populated incident/detail/queue screens. A mobile viewport screenshot is evidence of layout only; an APK must separately build and open on Android. Keep fixture data visibly labelled during development and remove default mock wiring before integration.
