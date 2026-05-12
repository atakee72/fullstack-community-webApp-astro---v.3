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
