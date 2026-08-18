# Notification Center + PWA Shell — Design Spec

**Date:** 2026-08-18
**Status:** Approved in brainstorm (sections 1–4); visual layer pending a Claude-Design pass after the landing-page handoff.
**Decision trail:** user decisions 2026-07-16 (feature agreed), 2026-08-06 (PWA shell bundled into the same project), 2026-08-17/18 (this brainstorm).

## Goal

Members currently learn about reactions to their contributions only by stumbling over them — and moderation decisions reach them not at all (a post silently disappears). This project adds an in-app notification center (bell + panel in the kiosk nav) and, in a second release, a PWA shell whose sole purpose is web push delivery.

**The PWA is the delivery vehicle; notifications are the cargo.** One project, two releases.

## Phasing (locked)

- **Release 1 — in-app center:** `notifications` collection, write hooks, API, bell + panel in `KioskNav`, read/unread. Fully useful on its own.
- **Release 2 — push tier:** manifest + icons + installability, minimal service worker (push only, **no offline caching** — locked 2026-08-06), `pushSubscriptions`, VAPID keys, explicit opt-in UI. Planned in detail only after R1 ships.

Build order note: R1 touches `KioskNav`, which the landing-page release also touches (`/`→`/forum` move). Landing ships first; this project is planned now, built after.

## Scope decisions (locked in brainstorm)

- **Fan-out model: Approach A — fan-out on write.** One doc per recipient per event, including broadcasts (official announcement → `insertMany`, one doc per member). Trivial reads, single-query unread count. Fine at current scale (dozens) and into the thousands; a hybrid broadcast-cursor model was rejected as complexity that pays only at ~10k+ members.
- **Event sources (R1):** comments/replies on own content, moderation decisions, official announcements, marketplace contact. *Dropped:* likes (noise), calendar reminders (needs scheduled generation — different machinery), `market_reserved` (verified: reservations are owner-initiated — `status.ts` 403s non-owners — so the event has no recipient).
- **UI surface: panel only.** Bell opens a dropdown (desktop) / bottom sheet (mobile) — the avatar-menu pattern. No dedicated page.
- **No per-type opt-out settings in R1.** Everyone gets all four types; the schema's `type` field makes later opt-outs a query filter, not a migration. Push opt-in (R2) is separate and always explicit.

## Data model

New collection `notifications`, one doc per recipient per event:

```ts
{
  _id: ObjectId,
  userId: string,          // recipient (user-id string, like all content refs)
  type: 'comment' | 'moderation' | 'official' | 'market_contact',
  actorId?: string,        // who triggered it — NO name stored (read-time join)
  target: {
    contentType: string,   // 'topic' | 'announcement' | 'recommendation' | 'event' | 'listing'
    contentId: string,
    title: string,         // snapshot of the target's title at event time
    href: string           // deep link, e.g. '/topics/abc123'
  },
  meta?: object,           // type-specific extras, e.g. moderation outcome:
                           //   { outcome: 'approved' | 'warned' | 'rejected', strike?: true }
  createdAt: Date,
  readAt: Date | null
}
```

Principles:

- **Actor name is a read-time join, never stored** — same `$in`-batched pattern and allowlist projection as `populateSellers()` (`src/lib/listingsQuery.ts`). Deleted users automatically render as „Ehemaliges Mitglied"; the account-deletion pipeline needs no actor-side step.
- **No rendered copy stored.** The API returns structured docs; the client renders DE/EN copy from `kiosk-i18n.ts` keyed by `type` (+ `target`/`meta` interpolation) — the language toggle works retroactively on old notifications.
- **Self-notifications suppressed at write time** (`actorId === userId` → skip).
- **Indexes** (idempotent creation script, same pattern as `scripts/create-auth-indexes.ts`):
  - `{ userId: 1, createdAt: -1 }` — list + unread count.
  - TTL index on `createdAt`, `expireAfterSeconds: 90 days` — a real Mongo TTL index (unlike `chronikCache`'s in-code check). Read and unread expire alike; no prune script.

## Write hooks

One server-only helper, `src/lib/notifications.ts`: `notify(doc)` and `notifyAll(docs)`.

**Never-throw contract:** a failed notification write must never fail the parent request — catch → `Sentry.captureException` + `await Sentry.flush(2000)` (the swallowed-failure rule; Vercel freeze eats unflushed events), then continue.

Four emit points:

1. **`src/pages/api/comments/create.ts`** — after insert, if `moderationStatus === 'approved'`: notify the parent content's author. `collectionType` (already in the request) becomes `target.contentType`. Pending (flagged) comments notify nobody yet — see hook 2.
2. **`src/lib/reviewAction.ts` → `processReviewAction()`** — the single choke point for single + bulk review; two emissions:
   - *Moderation decision → content author:* rejected / approved-with-warning (`meta.strike: true` when a strike was issued). Clean approval of a previously-pending item also notifies — the author never knew it was held, but silent rejection was the dark pattern this fixes.
   - *Deferred comment notification:* when a pending **comment** is approved, fire the hook-1 notification to the parent author now (the comment just became visible).
3. **Admin official-announcement create** (the `isOfficial: true` endpoint) — `notifyAll`: one doc per user except the author. Community (non-official) announcements do NOT broadcast.
4. **`POST /api/listings/[id]/contact`** — after successful relay send: notify the seller (`market_contact`, **no `actorId`** — the buyer is anonymous by design, matching the metadata-only GDPR stance of `listingContacts`).

## API

Two endpoints under `src/pages/api/notifications/`, both session-gated, both `Cache-Control: no-store` + `Vary: Cookie` (session-varying responses):

- **`GET /api/notifications`**
  - `?count=1` → `{ unreadCount }` only — one indexed `countDocuments({ userId, readAt: null })`. The polling target.
  - full → `{ items, unreadCount }`: newest 30, `actorName` resolved via the batched join. Fetched only on panel open.
- **`POST /api/notifications/read`** — `updateMany({ userId, readAt: null }, { $set: { readAt: now } })`. Fired when the panel opens; badge clears. The open panel keeps its pre-mark state client-side so just-marked items still render as "fresh" for that session.

No CSRF/origin guard needed: GET is safe; the POST is a harmless idempotent self-scoped write.

## Freshness

Polling from the bell (inside the `KioskNav` Svelte island), logged-in only:

- count fetch on mount, on tab focus / `visibilitychange`, and every **90s while the tab is visible** (interval paused when hidden);
- no SSE/WebSockets — held-open connections cost on serverless, and 90s latency is fine for neighborhood volume.

Badge renders the count, capped at „9+".

## UI (structural sketch — visual layer goes to Claude Design)

- **Bell** in `KioskNav` beside the avatar; wine badge.
- **Panel:** desktop dropdown / mobile bottom sheet — a structural sibling of `AvatarMenu.svelte`, reusing its hard-won mechanics verbatim:
  - dual **html + body** scroll-lock with inline-style save/restore (root CLAUDE.md corollary),
  - header `z-50` bump while open (sibling stacking context vs. bottom nav),
  - scrim, reduced-motion source-order guard,
  - **styles in `global.css`** with an `.nc-*` prefix — the component is reachable only through the `KioskNav` island (nested-island CSS orphan rule).
- **Rows:** type icon, copy rendered client-side from `type` + `target.title` + `meta`, actor name, relative time; whole row links to `target.href`.
- **Empty state:** one friendly kiosk line. All copy DE/EN in `kiosk-i18n.ts`.
- CD scoping note goes out **after** the landing-page handoff (don't split CD's focus); CD's answer slots in before implementation. Structural contract above is fixed; look-and-feel is CD's.

## Cross-cutting

- **Deleted users:** actor side handled by the read-time join (tombstone name). Recipient side: the account-deletion pipeline (day-7 tombstone step, `src/lib/auth/accountDeletion.ts`) gains one step — delete the departing user's received notifications (`deleteMany({ userId })`).
- **Deleted/rejected target content:** the deep link may 404 or hide — acceptable; the row still tells the story. No cascade cleanup in R1.
- **Banned users:** keep read access (bell + panel work), consistent with ban policy; they stop generating events because content writes are blocked (`banGuard`).
- **Verification gates:** `pnpm type-check` baseline + `pnpm build` green + browser verification of the panel on desktop and mobile viewports (kiosk standing rule: `.svelte` changes need the browser gate), including scroll-lock behavior verified by actually scrolling.

## Release 2 outline (broad strokes — detailed plan comes after R1 ships)

- `manifest.webmanifest` + icons + installability via `KioskLayout`.
- **Minimal service worker: `push` + `notificationclick` handlers ONLY.** No offline caching, no fetch interception (locked 2026-08-06: live community content + auth-gated SSR = stale-cache misery).
- `pushSubscriptions` collection (endpoint, keys, userId, createdAt); VAPID key pair in env (server secret + `PUBLIC_` app key).
- Explicit opt-in UI (panel footer); iOS requires home-screen install — the opt-in UI explains that.
- `notify()`/`notifyAll()` grow a best-effort push send to subscribed recipients after the doc insert; push failures follow the same never-throw + Sentry rule; dead subscriptions (410) are pruned on send.

## Out of scope

Likes, calendar reminders, per-type opt-out settings, a dedicated notifications page, read receipts per item, SSE/live updates, offline caching, notification e-mails.
