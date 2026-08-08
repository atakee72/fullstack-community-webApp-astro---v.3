# Tour ("Die Führung") notes

Loaded lazily when working in `src/components/tour/`. Spans `src/lib/tour/*`
(engine-adjacent, dependency-pure state) and `src/pages/api/profile/tour.ts`
(server persistence) — read those directly when working on those pieces.

## Engine contract (`TourController.svelte`, five non-negotiable duties)

1. **Wait for hydration before measuring an anchor** — `waitForAnchor()` polls
   `document.querySelector` via `requestAnimationFrame` (4s timeout) before a
   chapter starts. Prevents a ghost ring measured against a not-yet-hydrated
   DOM.
2. **Never crash if an anchor is entirely absent** — every `querySelector`
   call is null-guarded; a missing anchor degrades (stop skipped / chapter
   ends), it never throws.
3. **Compute available stops per page load** — `availableStops` filters
   `chapter.stops` down to the ones with a live anchor at start time. Missing
   anchors are skipped and the stop counter (`N / M`) adapts — e.g.
   logged-out users miss "Gespeichert"/"Meine" and see a shorter tour.
4. **Scroll first, measure after the scroll settles** — `showStop()` calls
   `scrollIntoView` then awaits a fixed delay (380ms, 50ms reduced-motion)
   before reading `getBoundingClientRect()`. `content-visibility:auto` cards
   report a stale/zero rect until they're actually in the viewport — measuring
   before the scroll settles would ring the wrong spot.
5. **A chapter never crosses a navigation** — `astro:before-preparation`
   aborts an in-progress tour and stamps it seen (nav-away counts as "shown",
   not "finished", but it still writes — no re-nagging on the next visit).

## Storage schema + first-write-wins

- `users.tours?: { forum?: Date, kalender?: Date, markt?: Date, kurier?: Date, kiezdaten?: Date, blog?: Date, profil?: Date }` +
  `users.tourHelloDismissedAt?: Date` — additive, not ban-gated (reading a UI
  tour isn't content-writing; banned accounts keep read access).
- **Timestamps, never booleans** — leaves room for a future redesign to
  re-offer chapters after a cutoff date without a schema change.
- **First write wins**: `POST /api/profile/tour` (`src/pages/api/profile/tour.ts`)
  only `$set`s a field when it's currently absent on the user doc. A chapter
  restart (avatar menu, dev hook) never rewrites the original seen date —
  `markChapterSeen`/`markHelloDismissed` in `src/lib/tour/tourStore.ts` mirror
  the same idempotency client-side (`writeLocal` happens synchronously before
  the `fetch`, so `getLocalState()` read immediately after a `void mark…()`
  call sees the write even though the POST is still in flight).
- **Anonymous → signed-in merge**: `syncWithServer()` unions local and server
  "seen" state (local wins ties) and pushes any local-only chapters up to the
  server on the first authenticated load — a logged-out tour run isn't lost
  at registration.

## Scrim-via-box-shadow decision (spotlight ring)

`TourSpotlight.svelte`'s `.tour-ring` paints the dim scrim AND the anchor
cutout as a single oversized `box-shadow` (`0 0 0 200vmax rgba(27,26,23,0.5)`)
on a small bordered `<div>` sized to the anchor's rect, rather than a
full-viewport scrim `<div>` with a CSS `mask`/`clip-path` hole. This is
stacking-context-proof: a real scrim element sits at a fixed z-index and can
end up behind/above unrelated `position: relative`/`transform` ancestors
depending on where in the DOM it mounts, while an oversized `box-shadow`
paints relative to its own tiny element and needs no coordination with
anything else on the page. Deviates from the design handoff's `mask` cutout
mechanism (§03) — see task-3-report.md.

**`TourHelloModal` does NOT use this trick.** It has no anchor to reveal, so
its `.tour-hello-scrim` is a plain full-viewport `position: fixed; inset: 0`
div with a flat `rgba(27,26,23,0.5)` fill — the box-shadow mechanism only
earns its complexity when there's a hole to cut.

## Entrance rules (three entrances, `TourController`'s decision effect)

1. **Hello modal** — signed-in **AND** `!state.helloDismissedAt` **AND** the
   current page has a registered chapter (`CHAPTERS_BY_PAGE[page]`). One-shot
   per account, ever; "Später"/✕/Esc all write `tourHelloDismissedAt` and it
   never reappears — the avatar-menu row is the only way back in after that.
2. **Offer strip** — current page has a chapter **AND** that chapter is
   unseen (`!isChapterSeen(state, chapter.key)`). Fires for BOTH logged-out
   and logged-in users (unlike the hello modal), and falls through from a
   dismissed/absent hello modal on the same page load — see the `mode`
   state machine in `TourController.svelte`.
3. **Avatar-menu row** ("Führung starten") — always rendered (no seen-state
   gate, no entrance decision at all), always starts the **current page's**
   chapter via `window.__mahalleTourStart()`. Never writes anything by
   itself — a restart from here still funnels through the same
   `markChapterSeen` first-write-wins path as any other completion/abort, so
   repeat runs are idempotent no-ops against storage.

## How to add a chapter (v1 ships Forum only — six more are confirm-before-code)

1. **Design review first** — the six remaining chapters (Kalender, Markt,
   Kurier, Kiez-Daten, Blog, Profil) are out of scope until CD signs off on
   their stop copy. Don't add a registry entry speculatively.
2. **Registry entry** in `src/lib/tour/tourChapters.ts` — one
   `CHAPTERS_BY_PAGE[page]` object: `key` (must be a `ChapterKey` from
   `tourStore.ts`), `page`, `kickerKey`, an ordered `stops[]`
   (`{ anchor, titleKey, bodyKey }`), `endNoteKey`, `nextChapterKey`,
   `nextChapterHref`.
3. **i18n keys** in both dictionaries of `src/lib/kiosk-i18n.ts` — kicker,
   per-stop title/body, end note, next-chapter link text. No new *engine*
   keys needed (`tour.chrome.*` is shared across all chapters).
4. **`data-tour` anchors** on the real DOM elements the stops point at —
   chrome + top-level controls ONLY, never the n-th item in a list (a card
   can scroll out of existence between page loads; a filter tab or a compose
   CTA can't). Mirrors the forum chapter's anchors (`forum-filter-*`,
   `forum-tag`, `forum-new-topic`).
5. Nothing in `TourController`, `TourSpotlight`, `TourHelloModal`, or
   `TourOfferStrip` needs to change — they're all chapter-agnostic, driven
   entirely by the registry + `page` prop.

## v1 deviations from the design handoff

- **Offer strip renders below the nav, not below the page title.** The
  handoff's mock placed it as "a line under the page title" (per-page, inside
  each page's own header markup). `TourController` mounts once, globally, in
  `KioskLayout.astro` between `<KioskNav>` and `<main>` — it has no way to
  reach into an arbitrary page's title block without every kiosk page
  threading a slot for it. Rendering it in the layout's own flow (still
  full-width, still "first thing you see below the nav") gets the same
  "quiet, page-scoped nudge" effect for one shared mount point instead of N
  page-specific ones. Revisit with CD if the visual distance from the title
  turns out to matter.
- **"Hallo Kiez" composer prefill (stop 7) is copy-only in v1** — the handoff
  mandates a prefilled composer entry point; v1 stop 7 highlights the CTA
  without prefilling `/topics/create`. Tracked in the plan's out-of-scope
  list, blocked on CD delivering template copy.
