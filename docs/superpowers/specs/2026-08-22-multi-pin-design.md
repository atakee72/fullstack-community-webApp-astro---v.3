# Multi-pin for official announcements — design

Date: 2026-08-22. Approved in chat (Design A).

## Why

The admin board and the forum's top slot hold exactly one pinned official
announcement. With the Gründungsnachbar:innen onboarding the team needs to
keep a welcome/guide announcement pinned while also pinning the weekly
"what's new" note (and possibly an event call-out) — three concurrent pins.

## Rule

- **`MAX_PINS = 3`** official announcements may have `pinnedUntil > now` at
  once. The server enforces it; the client mirrors it for optimistic UI.
- Each pin keeps its own **7-day** expiry (unchanged `PIN_DURATION_MS`).
- Creating an official pins it. If the board is at the cap, the pin with
  the **earliest `pinnedUntil`** (the oldest pin) is displaced — exactly one
  item loses its pin, never more.
- Re-pinning from the archive (PATCH with a future `pinnedUntil`) follows
  the same cap rule; the item being pinned is excluded from the displacement
  candidates.
- Unpinning and editing are unaffected.
- Ordering everywhere (admin board, forum): **newest pin first** — sort by
  `pinnedUntil` descending (a later expiry means a later pin, since the
  duration is fixed).

## Out of scope (unchanged deferred list)

Pinning user-made announcements, per-pin duration picker, scheduled
publishing, displacement notifications.

## Surfaces

1. **Server** — `POST /api/admin/announcements/create` and
   `PATCH /api/admin/announcements/[id]` share one displacement helper.
2. **Admin dashboard** (`AnnounceApp.svelte` + `AnnComposer.svelte`) —
   board section lists up to three cards; counter reads "{p} angepinnt";
   composer hint names the item that would be displaced only when the board
   is full; create/re-pin displace the oldest pin optimistically with the
   existing one-PATCH undo toast.
3. **Forum index** (`ForumIndexInner.svelte`) — up to three pinned officials
   at the top (newest first). The first keeps the full-width `featured`
   treatment; the second and third render as regular-width cards with the
   `pinned` strap marker, before the regular feed. All three are excluded
   from the regular feed. Hidden when the kind filter excludes announcements
   (existing behaviour).

   **Variant B addendum (2026-08-24, user-picked from the "Angepinnte
   Mitteilungen" design canvas):** only the newest pin renders as the
   full-width featured card; older pins render as slim one-line pin bars
   (ink bg, 1.5px teal border, teal print shadow, 📌 + AMTLICH label +
   truncated title + relative time + →), each spanning the full grid row.

   **Swap addendum (2026-08-25, user-decided):** a pin bar is a button, not
   a link — clicking it expands that announcement into the featured slot and
   collapses the previously featured pin to a bar (one maximized at a time).
   View-only, per-visit state; the featured card still navigates to detail.
   Bars end in ▾ (expand affordance) instead of →.
4. **Docs** — `src/components/admin/CLAUDE.md` invariant + root `CLAUDE.md`
   `announcements` entry and "Admin official announcements" line.

## Data

No schema change. `pinnedUntil: Date | null` stays the only pin field.
