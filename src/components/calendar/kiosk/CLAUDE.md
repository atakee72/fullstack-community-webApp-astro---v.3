# Calendar (kiosk) notes

Loaded lazily when Claude reads/edits files in `src/components/calendar/kiosk/` (or any subtree). Pairs with the forum-side notes at `src/components/forum/kiosk/CLAUDE.md` and the project-root `CLAUDE.md`.

### Page-accent rule (teal)
- Calendar's accent is **teal** (`text-teal`, `#3f8f9f`). Apply to kickers (mono-uppercase eyebrows) and carved-italic title accents (e.g. "passiert im Kiez?" → italic teal accent).
- **Don't touch** these wine/ochre semantics — they stay wine/ochre across all kiosk surfaces: live-now indicator (ochre dot + `k-cal-live-dot`), today indicator, weekend-day labels, required-field asterisks, compose step numbers (`01`, `02`), CTA wine-shadows, modal wine-shadows, the floating wine FAB on mobile.
- Root CLAUDE.md "Page-accent rule" has the full convention.

### Live ticker — `src/lib/calendar/nowTicker.ts`
- Shared `readable<Date>` Svelte store that ticks every 60 s aligned to wall-clock minute (uses an initial `setTimeout` to align, then `setInterval`). Auto-cleanup on last unsubscribe.
- Every component that needs "is this event live right now?" reactivity (EventDetailModal, AgendaRow, CalendarSidebar, CalendarMonthGrid, CalendarMobileMonth) subscribes via `import { now } from '.../nowTicker'` and reads `$now` inside `isLiveNow(ev, $now)`. **Don't call `new Date()` ad-hoc** in components for live checks — you'll lose reactivity.

### Saved events — `src/lib/savedEventsQueries.ts` + `/api/events/save`
- Mirrors `savedPosts` exactly: `{ userId, eventId, savedAt }` collection, optimistic mutation pattern (onMutate snapshot + onError rollback + onSettled invalidate). Keyed by `qk.savedEvents` in `src/lib/queryKeys.ts`.
- The bookmark UI is wired into AgendaRow (paper-card variant action column) and the mobile day-panel rows. Calendar's mobile "Gespeichert" filter pill toggles a client-side filter on the resulting set.

### Attendee profiles — `src/lib/userProfilesQueries.ts` + `/api/users/profiles`
- Batch endpoint returning `{ users: { id, name, image }[] }` for up to 60 ids. Used by EventDetailModal's attendee stack to fetch the going-list profiles **only when the modal is open** (`enabled: open && goingArr.length > 0`). Dedupes + sorts ids in the cache key.
- The endpoint is intentionally **public (no session gate)** so anonymous viewers can see who's attending. Mirrors the comments endpoint.

### Moderation visibility on calendar surfaces
Calendar reached parity with forum on 2026-05-12 (commit `3bad8d15`). The visual vocabulary mirrors `ForumPostCard.svelte:167-173` exactly — don't invent new state classes here.

- **Badge precedence** (`inferredBadge` derive used in every event-rendering surface):
  ```ts
  ev.moderationStatus === 'rejected' ? 'rejected'
  : ev.isUserReported && ev.moderationStatus === 'pending' ? 'reported'
  : ev.moderationStatus === 'pending' ? 'pending'
  : ev.hasWarningLabel ? 'warning'
  : null
  ```
  Drop `<StatusBadge state={badge} size="sm" />` (sm for inline rows, md for the detail-modal title block).

- **Author-only ghosting** (dashed outline + body opacity-70):
  - `pending` → `outline-warn`
  - `reported` → `outline-plum`
  - `rejected` → `outline-danger`
  - Implementation uses `outline outline-2 outline-dashed outline-{color} outline-offset-[-2px] rounded-md` because (1) `outline` doesn't shift layout, (2) negative offset draws inward so `overflow-hidden` parents (e.g. agenda paper-card wrapper) don't clip it. Forum uses `border-dashed` on a wrapping div; calendar uses `outline` on the article itself to avoid extra nesting.
  - Author detection is **defensive** because `event.author` can be a populated user object OR a plain id string depending on which endpoint produced the doc. Derive `authorId` checking both shapes.
  - **Title + badge stay sharp** (no opacity); only the meta line, location, body, and confirmed-count fade. The title is the affordance to click back in to the detail modal.

- **EventPill (month grid)** intentionally has no inline StatusBadge (no horizontal room) and no `OwnStatusBanner` (too small). Ghosting via `border-dashed !border-{color} !border-y-2 opacity-60` on the pill itself is the only signal at that size. Author lands on the agenda below or in the detail modal for the full readout.

- **`OwnStatusBanner`** (`src/components/forum/kiosk/states/OwnStatusBanner.svelte`) is reused as-is for the author-only banner inside `EventDetailModal` (above the description block). Generic `state.own.*` i18n copy works for events too.

- **Server filter** (`buildModerationFilter` in `src/lib/topicsQuery.ts`) already gates non-author visibility for own pending/rejected. Reported-pending stays visible to all (anti-abuse). Don't touch this filter; the calendar ghosting wraps cleanly on top.

### Edit-path moderation (events)
- API at `/api/events/edit/[id].ts` exports `PUT` (NOT `POST` — mirrors `/api/topics/edit/[id]`'s verb). Re-runs `moderateText + checkSpamWithGPT + tag moderation` in parallel on every edit (mirroring create-path in `events/create.ts`). Flag → flip `moderationStatus` to `pending`, clear `rejectionReason`, write a new `flaggedContent` record.
- Edits are **blocked** with `403 'edit_blocked_by_moderation'` while the existing event is `pending` / `rejected` / `hasWarningLabel`. Author can delete + recreate if they want to amend.
- This mirrors the forum topics-edit gate. Pre-fix, an author could publish clean then edit dirty — that bypass is closed.

### Edit UI (page route + EventComposePageInner mode prop)
Shipped 2026-05-12. Edit flow is a dedicated page at `/events/edit/[id]` that reuses `EventComposePageInner` in `mode='edit'`, NOT inline-in-modal (the form has 10+ fields — too big for the detail-modal container; forum inline-edit pattern only works because the forum form is title + body).

- **Edit page** `src/pages/events/edit/[id].astro`: SSR gates auth → owner (`isOwner` from `utils/authHelpers`) → moderation (`approved && !hasWarningLabel`). Redirects with flash queries on each fail: `/login?redirect=...` (no auth), silent `/calendar` (not owner), `/calendar?edit_blocked=1` (moderation gate). Belt-and-suspenders with the API 403; UX shortcut so strangers never see the form.
- **`EventComposePageInner` mode prop**: `mode?: 'create' | 'edit'` + `initialEvent?: CalendarEvent`. Edit mode (a) populates initialValues from initialEvent (splitting `startDate`/`endDate` Date → date+time form strings, defensively coercing the post-Astro-JSON-roundtrip ISO string back to Date), (b) skips the eventDraft store entirely (no load, no auto-save, no clear — drafts are scoped to the create flow only), (c) calls `editEventMutation()` instead of `createEventMutation()` with `{ id, input }` payload, (d) redirects to `/calendar?just_edited=1` (approved) or `/calendar?just_edited=pending` (flagged) or `/calendar?edit_blocked=1` (403). `Event` is aliased to `CalendarEvent` at import to avoid shadowing the DOM `Event` global.
- **`editing` prop threaded through compose children**: `EventComposeForm` (flips breadcrumb + title to `cal.compose.crumb.edit` + `cal.compose.title.edit.q1`/`q2`), `EventComposePreview` + `EventComposeStickyPublish` (swap publish→`cal.compose.submit.edit`). Same-component reuse beats forking a parallel "EditPageInner".
- **Edit button on `EventDetailModal`**: author-only, `canEdit = isAuthor && moderationStatus === 'approved' && !hasWarningLabel`. When `canEdit`, anchor links to `/events/edit/${event._id}`. When not, rendered disabled-with-tooltip (line-through + cursor-not-allowed + `detail.edit.blocked` tooltip) — matches `ForumPostDetail.svelte:516-535`. Visible disabled state is a clearer signal to the author than hiding the button.

### Event compose flash redirects + cache-bust
- `EventComposePageInner.svelte` dispatches a toast then full-page `window.location.href` redirects to `/calendar?<flash>`. The toast does NOT survive that redirect — sonner is a React island; the JS state (including the toast queue) is torn down. The flash query param + `CalendarPageInner` mount-time `$effect` re-fire the toast on the next page so the user actually sees it.
- Flash params: `just_posted=1` (create approved), `just_edited=1` (edit approved), `just_edited=pending` (edit flagged → toast `compose.toast.editPending`), `edit_blocked=1` (warn toast). Effect calls `window.history.replaceState` to strip the flag after consuming it (no re-fire on back/forward).
- **Cache-bust on flash** (commit ahead): the same effect calls `queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] })` on any flash param. Reason: TanStack Query v5 holds initialData fresh for `staleTime: 60_000` with `refetchOnWindowFocus: false`, so if SSR served stale data (browser HTTP cache, MongoDB read-after-write timing, or — historically — a stale cursor), the UI would sit on the wrong state for a full minute. Background refetch closes that window to ~150 ms. Tiny perf cost, only on flash redirects.
- **`Cache-Control: no-store, must-revalidate` on `/calendar.astro`**: paired with the cache-bust. Belt-and-suspenders to ensure no browser HTTP cache hit on the post-edit reload. Per-user SSR (author sees own pending) — there's nothing to cache that's safely shared anyway. Pattern reusable for any per-user kiosk page where post-action state must be visible immediately.

### Report flow
- Stub `onReportClick` (was `Phase 6 wires this to the existing report modal. v1: no-op.`) replaced with `reportOpen = true` + `<KioskReportModal contentType="event" ... />` rendered as **sibling of the main `<dialog>`** (not child). Native dialog stacking handles top-layer ordering correctly when both are open.
- Button hidden via `{#if currentUserId && !isAuthor}` — guests can't report, authors can't self-report (and the API would 400 them anyway).

### Native `<dialog>` nested-stacking
- Opening a second `<dialog>` via `showModal()` from inside an already-open dialog works correctly: both go to the top layer, the most recent floats above, ESC closes only the topmost, and click-outside detection via `target === thisDialog` resolves correctly per modal (clicks on the inner backdrop don't bubble as `target === outerDialog`). Verified empirically with EventDetailModal + KioskReportModal.

### Mobile FAB hoisting
- The floating "new event" `+` FAB (`fixed bottom-16 right-4 z-30 lg:hidden bg-wine`) lives at the **page level** in `CalendarPageInner.svelte`, not inside any view component. That way it's visible on mobile in month / agenda / day views uniformly.
- `bottom-16` (64 px) clears the `h-12` mobile bottom-nav with 16 px breathing room. Don't move it to a view component — you'll lose the cross-view persistence.

### `+ neuer termin` desktop CTA
- The text CTA in the title block (`CalendarTitleBlock.svelte`) is `hidden lg:inline-flex` so it doesn't compete with the mobile FAB. If you ever bring back a non-FAB mobile flow, remove the `hidden lg:`.

### Known SEO gap — event detail page (deferred)

Same shape as forum's deferred SEO gap: the calendar surfaces mount Svelte islands with `client:only="svelte"`, so event titles + descriptions + dates are not in raw HTML for crawlers / link-preview bots. The marketplace SEO investigation (2026-05-20) flagged this as a sibling issue across forum + calendar.

**Fix pattern**: hybrid SSR-static + island-hydrate, same recipe as `/marketplace/[id].astro`. Render event title + date + location + body in the Astro template directly; let the Svelte island layer on for interactivity (RSVP, comments, attendee stack). See `src/components/marketplace/kiosk/CLAUDE.md` → "Hybrid SSR-static + island-hydrate pattern" for the recipe + rationale.

**Why deferred**: surfaced during the marketplace SEO investigation, not in the original calendar redesign scope. Calendar SEO matters most for individual event URLs shared in chats / social posts (where the link-preview crawler grabs OG metadata only — but body content in raw HTML still helps for in-page preview tools + accessibility readers). Worth a small separate PR after the marketplace stabilizes; not urgent.

## Compose URL prefill + Termin-Clipper (Aug 2026)

`EventComposePageInner.computeInitialValues` accepts `?title=`, `?body=`, `?location=` alongside the drag-select `?from/to/allDay` — ANY prefill param present makes the URL win over the draft store (edit mode still wins over everything). Values are length-capped client-side (title/location 200, body 3000). Consumer: the **Termin-Clipper bookmarklet** on the ungated page `/event-clipper` (`src/pages/event-clipper.astro`) — its `javascript:` href is built at load time from `location.origin` (dev clips into dev, prod into prod), collects og:title/selection/URL plus best-effort JSON-LD Event dates, and opens `/events/create?…`; the login gate's `?redirect=` bounce preserves the query for logged-out members. On-page clicks are intercepted with a drag-me hint (clicking would clip the clipper page itself).

**Clipper v2–v4 (2026-08-30, iterated on live user tests):** compose additionally accepts `?startTime=`/`?endTime=` (HH:MM-validated, invalid → form defaults) and `?allDay=1` prefill. The bookmarklet extracts, in order: (1) JSON-LD Event — dates, times, `location.name`; (2) **`<time datetime>` fallback** (first element = start date+time, second = end time / end date if different — this is what berlin.de-style pages without JSON-LD carry); (3) **venue label heuristic** — an element whose text is exactly `Where/Wo/Ort/Veranstaltungsort/Location` → next sibling's text (≤120 chars); (4) **paragraph excerpt** when nothing is selected — og:description → meta description → first `<p>` ≥100 chars, capped 400 + „…", followed by the linkified `Quelle:` line; (5) **all-day detection** — a found date with NO time part sends `allDay=1` (form auto-checks ganztägig; mehrtägig auto-checks from start≠end, pre-existing). ⚠ Bookmarklets freeze at drag time — after any SRC change, users must re-drag from `/event-clipper`. Verify SRC edits with the decode-and-`node --check` recipe (extract the string literal, eval, syntax-check) and by running the decoded code against a saved page's HTML via playwright `page.evaluate` with `window.open` stubbed.

## Author delete button (2026-08-30)

`EventDetailModal` footer shows „🗑 löschen" beside „✎ bearbeiten" for authors only (`onDeleted` prop; parent invalidates `['calendar','events']` + success toast). Wired to the pre-existing (previously UI-less) `DELETE /api/events/delete/[id]`, which enforces authorship server-side. Confirm via global `confirmAction` (danger variant). i18n keys `cal.detail.delete.*`.

## Seeded-SSR staleness fix (2026-08-30)

`CalendarPageInner`'s events query stamps its SSR `initialData` as **stale** (`initialDataUpdatedAt: 0`), never fresh: initialData seeds EVERY month key on navigation, and a fresh stamp made just-published events vanish per visited month for `staleTime` (60s) — the "published but not on the calendar" flip-flop. Epoch keeps the instant SSR paint but always triggers an immediate reconciling background refetch. Don't "optimize" it back to `Date.now()`.

## Dev-seed caveat: string user `_id`s break author populate

Seeded dev users have STRING `_id`s, so `populateAuthors`' ObjectId `$in` misses them → list APIs return `author: null` → every dev event/topic shows „anonym" and owner-only UI (edit/delete) never appears for seeded accounts. Browser-gate owner flows on dev by REGISTERING a fresh user via `POST /api/auth/register` (field is `name`, not `userName`; real ObjectId `_id`). Prod is unaffected. Seed-script fix belongs to the hardening batch.

## Day-view navigation sync + clickable mini-calendar (2026-08-30)

Four pieces shipped the same afternoon (`9d28b90b`, `e6f7ed9c`, `ddc8ff49`, `b43dc7c1`) — together they make the Tag view a first-class citizen of the month stepper:

- **Month-grid overflow chip is a button**: the desktop `+ N weitere` chip (day cell caps at 3 pills) opens the Tag view on that exact day via `onOpenDay` → `CalendarPageInner.openDay()`. It mirrors EventPill's `onpointerdown` `stopPropagation` so cell drag-select doesn't fire. Mobile untouched (dot-grid day tap already shows everything).
- **`dayViewDate` state in `CalendarPageInner`** is the single carrier for "which day should the Tag view show": `CalendarDayView` snapshots its `initialDay` prop at init, so the day view is wrapped in `{#key dayViewDate}` — setting the state remounts it on the target day. Manual tab switches (`switchView`) seed it from the header month via `dayForMonth()` (today when the header is on the current month, the 1st otherwise); the month stepper updates it the same way while in day view.
- **Reverse sync via `onDayChange`**: the day view fires it on every internal day step (prev/next/today AND mini-calendar picks); the parent recenters `visibleMonth` (header + query range) only when the month actually changed — deliberately WITHOUT touching `dayViewDate`, which would remount the view mid-step.
- **Mini-calendar (`CalendarSidebar`) day cells become buttons** only when `onPickDay` is passed (day view); the current day gets a wine outline (`selectedDay` prop). Agenda view passes neither — its mini month stays a static reference. Spillover days of adjacent months are clickable too and recenter everything.

## Event description linkify (2026-08-30)

`EventDetailModal` renders `event.body` through `linkifySegments()` (`src/lib/linkify.ts`) — same XSS-safe segment pattern as `ForumPostDetail`, teal hover accent. AgendaRow's 2-line teaser stays plain text (row itself is the click target). Same commit fixed the helper's paren edge: `…wiki/Foo_(Bar).` now keeps the closing `)` (restore loop counts paren balance instead of requiring the raw match to end with `)`).

## Dev-seed caveat #2: legacy category labels blank out whole months

Seed data carried capitalized legacy categories (`"Markt"`, `"Nachbarschaft"`) that aren't in the kiosk `EventCategory` enum (`kiez`/`markt`/…). `displayedEvents` drops any event whose category isn't in the active set, and the page-level branch then replaces the ENTIRE view (grid/agenda/day alike) with `CalendarFilteredEmpty` — a month full of seeded events renders as "Nichts Passendes diese Woche". Normalized in `mahalle-dev` by hand 2026-08-30; the seed-script fix (valid categories + ObjectId `_id`s, see caveat above) belongs to the hardening batch. Prod unaffected (kiosk compose only writes enum values).

## Export row + event deep link (2026-08-30 PM)

The detail modal's EXPORT pills are wired (`01e895eb`): **.ics** and **Google** reuse the legacy `src/utils/calendarExport.ts` helpers untouched (VCALENDAR blob download; `calendar.google.com/render?action=TEMPLATE` URL). **teilen** uses `navigator.share` where available; the desktop fallback copies a deep link — and since a toast can NEVER paint over the native `<dialog>` (top layer beats any z-index), the copy feedback lives IN the button: label flips to „kopiert ✓" for 2s (`4ab29fb9`). Remember this for any future toast-from-inside-a-dialog idea.

**Deep link** `/calendar?event=<id>&d=<yyyy-MM-dd>`: parsed synchronously at `CalendarPageInner` init (client:only — same pattern as compose prefill); `d` seeds `visibleMonth` so the events query fetches the right range, an effect opens the modal once the id appears in the list (keeps waiting while `isPending/isFetching`; settled-and-missing → info toast), then cleans the URL. The login gate's `?redirect=` bounce preserves the query for logged-out recipients. No single-event GET endpoint exists — the deep link deliberately rides the list query instead.

**Map tile** (`ae7c082d`): the striped „KARTE" placeholder is now an `<a>` to `openstreetmap.org/search?query=<Ort>, Berlin` — symbolic on purpose. Real embedded mini-map (OSM iframe + Nominatim geocode + Mongo cache + Datenschutz line) is a queued feature in memory `open-follow-up-tickets-cross-feature`.

**Week-stat range label** (`82bcaec9`): the title block's „N Termine diese Woche" carries a dimmed `· 24.–30. Aug.` range (locale-aware, cross-month weeks show both months) because the stat always means the REAL current week even while another month is browsed.

## Categories: „Sonstiges" replaced „Privat"; visibility select hidden (2026-08-30)

`EventCategory` is now `kiez/oeffentlich/markt/kultur/sport/sonstiges` (`952adeb4`; „Sonstiges" keeps Privat's ◇ ink-soft style; enum swap in types + `categories.ts` + `forum.schema.ts` + i18n; safe — zero `privat` events ever existed in prod/dev). Everything renders from `CATEGORY_ORDER`, so rails/pickers updated automatically.

⚠ **Half-built private-events discovery**: compose had a separate „Sichtbarkeit" public/private select; create/edit persist `visibility` and `landing.ts` filters it — but `fetchEventsWithAuthors` (main calendar API + SSR) NEVER filtered it, so a „privat" event was visible to every member. The select is HIDDEN in `EventComposeForm.svelte` (plumbing kept; everything composes `'public'`). Don't re-show it before adding the `visibility` filter (+ author exception) to EVERY event read path — full feature sketch in memory `open-follow-up-tickets-cross-feature` („private personal events", undecided).

## Polish round 3 (2026-08-30 late PM, `5a0257f9`..`3e338fa7`)

- **„Schnell hinzufügen" placeholder REMOVED** (`5a0257f9`): the agenda/day sidebar's kiosk-v1 mock box was never functional (static text, no input) and read as a broken feature. i18n keys `cal.agenda.quick.*` deleted. If ever wanted: "quick-add parser" sketch in memory `open-follow-up-tickets-cross-feature` — regex parse → compose-prefill URL, misparses safe because compose is the review step.
- **Day view = agenda styling** (`c4cfddc0` + `51242128`): `CalendarDayView` threads `savedIds`/`onToggleSave` into its `AgendaRow`s (save-button parity) and mirrors `CalendarAgendaView`'s card markup — today gets the dark ink block (wine shadow, „N Termine · X läuft gerade" line, dark-variant rows), other days get the date column + per-event paper cards with category borders. This also fixed a latent contrast bug: `AgendaDayHeader`'s today-variant uses light `text-paper` (designed for the dark block), which was near-invisible on the old plain day view. Empty states styled per branch.
- **Day-nav footer is prev/next only** (`f777131f` → `05a1cc24` → `3e338fa7`): a center jump-to-today link went through two label iterations („HEUTE" → „HEUTE · 30.8.2026" → date only) and was then REMOVED — whatever the label, users read the center slot as a caption for the viewed day, not a jump target. Getting back to today: mini-calendar or the rail's HEUTE (month recenter). Don't reintroduce a center link here.
- **Drag-select excludes past days** (`bc766fb4`): `CalendarMonthGrid.onCellPointerDown` bails when the cell is before `startOfDay(new Date())`; `onCellPointerMove` clamps `dragEnd` at today, so a backwards drag from a future day stops at today instead of striping the past. No creating events in the past.
- **RSVP filters** (`5606fd15`): „Zugesagt" now matches `going` ONLY — it previously also matched `maybe`, which looked broken because the row's green ✓ only reflects going (user caught it in prod with a „vielleicht" RSVP). New „Vielleicht" pill (desktop `CalCategoryRail` + mobile `CalendarMobileMonth`, keys `cal.filter.myMaybes`) filters `maybe`; both pills active = OR.
- **Playwright-gate footgun** for drag tests: `page.mouse` coordinates BELOW the viewport fold silently hit nothing (no error, test "passes" vacuously) — scroll the grid into view and assert cell centers are inside `window.innerHeight` first. Also: a cell whose center lands on an EventPill won't start a drag (pill `stopPropagation`s pointerdown by design) — aim below the pills.
