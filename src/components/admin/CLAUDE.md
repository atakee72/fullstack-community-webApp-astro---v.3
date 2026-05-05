# Admin notes

Loaded lazily when Claude reads/edits files in `src/components/admin/`.

### Auth gate
- All admin pages auth-gate at the page level (frontmatter `getSession()` + redirect to `/login` if no session, then `if (session.user.role !== 'admin') return Astro.redirect('/')`).
- API endpoints under `/api/admin/*` should gate via `requireAdminSession()` from `src/lib/auth.ts` — returns a pre-shaped 401/403 `Response` if the session lacks admin role. Used cleanly by `/api/admin/announcements/*`. The older `/api/admin/moderation/{review,bulk-review,index}.ts` still use a degraded `ADMIN_USER_IDS.length === 0 || includes(userId)` stopgap (any logged-in user passes when the array is empty) — switch them to `requireAdminSession` in a follow-up.
- Both admin pages today (`/admin/moderation`, `/admin/announcements`) still use **`BaseLayout`** (legacy dark-glass), not `KioskLayout`. Admin kiosk migration is queued — see `project_kiosk_deferred.md`.

### Admin Moderation Table (`ModerationQueue.svelte`)
- **Sortable columns**: Date (`createdAt`), Flagged For (`maxScore`), Decision (`reviewStatus`) — click header to toggle asc/desc
- **Column visibility**: "Columns" dropdown to show/hide columns; Reason/Warning hidden by default
- **Improved pagination**: Page size selector (10/25/50), First/Prev/Next/Last buttons, "Page X of Y"
- **Bulk actions** (queue view only): Select items via checkboxes → Approve All / Reject All with `confirmAction()` dialogs
- **Human-readable categories**: Raw strings like `spam_check:irrelevant_nonsense` displayed as "Irrelevant content", `image_safety:sexual` as "Sexual image", etc. (via `CATEGORY_LABELS` map + `formatCategory()`)
- **Rejection reason flows to author**: when admin types a `reason` in the rejection prompt (`ModerationQueue.svelte:898`), it's POSTed to `/api/admin/moderation/review` → saved as `topic.rejectionReason` via `processReviewAction()` (`src/lib/reviewAction.ts:79`). The kiosk forum's `OwnStatusBanner state="rejected"` reads that field and renders it as an italic blockquote below the generic body. Test with the rejection prompt — the text the admin types lands directly in the author's view.

### Admin Official Announcements (`AdminAnnouncementsPanel.svelte` + `/admin/announcements.astro`)
- **Page**: SSR-fetches all officials (`{ isOfficial: true }`, sorted createdAt desc, limit 50) via `populateAuthors`, passes as `initialItems` to the panel.
- **Composer** (top of panel): single-page form (NOT a multi-step wizard — announcements are simpler than marketplace listings). Fields: title (5–200), body (10–5000), tags (comma-separated, max 5). No image upload in v1 — admins post plain-text officials.
- **List** below: officials with status badge (📌 angeheftet · läuft in N Tagen / abgelaufen) + per-row actions: edit (inline expand), pin (`PATCH { pinnedUntil: now+7d }`), unpin (`PATCH { pinnedUntil: null }`), delete (`DELETE` with `confirmAction`).
- **Refresh strategy**: every successful action calls `refetch()` (a single `GET /api/admin/announcements`) — single source of truth, no optimistic state-syncing for v1.
- **Server invariant**: at most one official has `pinnedUntil > now` at a time. Enforced by atomic `updateMany` displacement on create (and on PATCH when pinnedUntil is being set to a future date) — see `/api/admin/announcements/create.ts` + `[id].ts`.
- **Bypass moderation**: admin officials skip the AI moderation pipeline entirely (admin is trusted). `moderationStatus: 'approved'` set directly. No flagged-content record created.
- **Pinning lifecycle**: 7-day default duration, replace-on-new (latest displaces previous), client-side check `pinnedUntil > now` at render time so no DB-side TTL is needed.
