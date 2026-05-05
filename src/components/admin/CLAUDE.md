# Admin notes

Loaded lazily when Claude reads/edits files in `src/components/admin/`.

### Admin Moderation Table (`ModerationQueue.svelte`)
- **Sortable columns**: Date (`createdAt`), Flagged For (`maxScore`), Decision (`reviewStatus`) — click header to toggle asc/desc
- **Column visibility**: "Columns" dropdown to show/hide columns; Reason/Warning hidden by default
- **Improved pagination**: Page size selector (10/25/50), First/Prev/Next/Last buttons, "Page X of Y"
- **Bulk actions** (queue view only): Select items via checkboxes → Approve All / Reject All with `confirmAction()` dialogs
- **Human-readable categories**: Raw strings like `spam_check:irrelevant_nonsense` displayed as "Irrelevant content", `image_safety:sexual` as "Sexual image", etc. (via `CATEGORY_LABELS` map + `formatCategory()`)
