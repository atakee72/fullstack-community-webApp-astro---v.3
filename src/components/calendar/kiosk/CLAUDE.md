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
- `POST /api/events/edit/[id].ts` re-runs `moderateText + checkSpamWithGPT + tag moderation` in parallel on every edit (mirroring create-path in `events/create.ts`). Flag → flip `moderationStatus` to `pending`, clear `rejectionReason`, write a new `flaggedContent` record.
- Edits are **blocked** with `403 'edit_blocked_by_moderation'` while the existing event is `pending` / `rejected` / `hasWarningLabel`. Author can delete + recreate if they want to amend.
- This mirrors the forum topics-edit gate. Pre-fix, an author could publish clean then edit dirty — that bypass is closed.

### Event compose toast
- `EventComposePageInner.svelte:176-203`: `mutateAsync` returns `{ event, message, moderationStatus? }`. The component reads `result.moderationStatus` and fires:
  - `'pending'` → `showToast(result.message || $t['compose.toast.pending'], { type: 'info', duration: 6000 })` — uses server's userMessage when present so the wording stays canonical.
  - else → `showSuccess($t['compose.toast.approved'])`.
- Toast survives the full-page `window.location` redirect to `/calendar?just_posted=1` because `<ToastProvider>` re-mounts on the new page and the event was already dispatched onto `window`.

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
