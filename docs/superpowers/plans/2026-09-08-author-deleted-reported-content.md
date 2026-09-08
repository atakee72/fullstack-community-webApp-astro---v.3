# Author-Deleted Reported Content — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a member self-deletes content that has an open moderation/report record, keep that record in the active admin queue, flag it as "author deleted", and keep it strikeable from the stored snapshot — instead of silently orphaning it.

**Architecture:** `flaggedContent` already stores a full content snapshot (`title`/`body`/`tags`/`imageUrls`/`sourceUrl`) plus `authorId`, and `processReviewAction()` strikes via the author doc (which survives content deletion) — so **no moderation-logic change is needed**. The fix is: (1) each of the 6 self-delete handlers stamps `contentDeleted: true` on matching `flaggedContent` records instead of leaving them untouched; (2) the admin queue card renders a "author deleted" badge when that flag is set. The record stays `reviewStatus: 'pending'`, so it remains in the active queue and fully actionable.

**Tech Stack:** Astro 5 API routes (MongoDB direct driver), Svelte 5 kiosk admin components, `kiosk-i18n.ts` DE/EN dictionaries. Verification via fetch-based e2e scripts against the dev server (repo idiom — no unit framework), `pnpm type-check`, `npx -y svelte-check@4`, and a playwright-cli browser gate.

**Spec:** This plan is self-contained (design settled in-session: "keep it in the active queue, mark author-deleted, still strikeable, keep snapshot as proof"). No separate spec doc.

## Global Constraints

- `flaggedContent.contentId` is stored as a **string** everywhere (`insertedId.toString()` at create sites, raw string at report sites) — cascade filters match the **string** id, never `new ObjectId(id)`.
- `contentType` values are the FlaggedContent discriminators: `'topic' | 'announcement' | 'recommendation' | 'comment' | 'event' | 'marketplace'` — note marketplace listings use **`'marketplace'`**, not `'listing'`.
- Never delete the `flaggedContent` record on self-delete; only `$set` the new flag. The snapshot is the evidence.
- Do NOT modify `src/lib/reviewAction.ts` — strike + review already work with a deleted original (the content `updateOne` becomes a harmless no-op; the author strike targets the surviving user doc).
- Commit messages: simple/concise, no AI signature, no Co-Authored-By footer. `git add` specific files only, never `git add .`.
- News is out of scope: there is no self-delete route under `src/pages/api/news/`, so flagged user-submitted news cannot be orphaned this way.
- The `aria-label="View"` i18n fix is a separate trivial change, NOT part of this plan.

---

### Task 1: Data model + self-delete cascade (all 6 handlers)

Add the two fields to the type, then stamp them from every self-delete handler. This is one batch of same-shape edits with a single e2e gate.

**Files:**
- Modify: `src/types/index.ts` (FlaggedContent interface, ~line 284)
- Modify: `src/pages/api/events/delete/[id].ts` (after the event `deleteOne`, ~line 67)
- Modify: `src/pages/api/topics/delete/[id].ts` (after the topic `deleteOne`, ~line 68)
- Modify: `src/pages/api/comments/delete/[commentId].ts` (after the comment `deleteOne`, ~line 63)
- Modify: `src/pages/api/announcements/delete/[id].ts` (after the announcement `deleteOne`, ~line 67)
- Modify: `src/pages/api/recommendations/delete/[id].ts` (after the recommendation `deleteOne`, ~line 67)
- Modify: `src/pages/api/listings/delete/[id].ts` (after the `listingContacts` cascade, ~line 63)
- Test: `scratchpad/e2e-author-deleted-report.mts` (gitignored)

**Interfaces:**
- Produces: `FlaggedContent.contentDeleted?: boolean` and `FlaggedContent.contentDeletedAt?: Date` — Task 2 reads `item.contentDeleted` in the admin card.

- [ ] **Step 1: Write the failing e2e test**

Create `scratchpad/e2e-author-deleted-report.mts` (reuse the fetch-login helper shape from `scratchpad/setup-full-event.mts`). It must, against `http://localhost:3000`:
1. Log in as `ayse@mahalle-dev.test`, create an event.
2. Log in as `jonas@mahalle-dev.test`, POST `/api/reports/submit` `{ contentId: <eventId>, contentType: 'event', reason: 'inappropriate', details: 'e2e' }`.
3. Log in as `ayse@...` (author), DELETE `/api/events/delete/<eventId>`.
4. Assert (via a direct MongoDB driver read — `import { MongoClient } from 'mongodb'`, `MONGODB_URI` from `.env`, db `mahalle-dev`; the mongodb MCP is down this session) that the `flaggedContent` record for that `contentId` (string match) still exists, has `reviewStatus === 'pending'`, and now has `contentDeleted === true`.

```ts
// scratchpad/e2e-author-deleted-report.mts — PASS/FAIL summary at end.
// Login helper: copy loginAs()/store()/ch() from scratchpad/setup-full-event.mts.
// Reads the flagged record via the dev DB (mahalle-dev). Prints PASS/FAIL lines.
```

- [ ] **Step 2: Run it to verify it fails**

Run: `PW_FILE=scratchpad/devpw.txt npx tsx scratchpad/e2e-author-deleted-report.mts`
Expected: FAIL at step 4 — the record exists and is pending, but `contentDeleted` is `undefined` (current behavior leaves it untouched).

- [ ] **Step 3: Add the type fields**

In `src/types/index.ts`, inside `interface FlaggedContent`, in the "Review status" block (near `reviewStatus`), add:

```ts
  // Set when the author self-deletes the content while a report/flag is open.
  // The record STAYS in the queue (reviewStatus unchanged) and stays strikeable
  // from the stored snapshot; the admin card renders a "deleted" badge.
  contentDeleted?: boolean;
  contentDeletedAt?: Date;
```

- [ ] **Step 4: Wire the cascade into all 6 handlers**

In each handler, immediately after the successful content `deleteOne` (and after any existing comment/listingContacts cascade), insert the stamp. Use the string id already in scope and the correct `contentType`:

`events/delete/[id].ts` — after the `commentsCollection.deleteMany` at ~line 67:
```ts
    // A pending report/flag on now-deleted content stays in the moderation
    // queue, marked deleted (still strikeable from the stored snapshot).
    await db.collection('flaggedContent').updateMany(
      { contentId: id, contentType: 'event' },
      { $set: { contentDeleted: true, contentDeletedAt: new Date() } }
    );
```
`topics/delete/[id].ts` — after the comments `deleteMany`: same block, `contentType: 'topic'`, id `id`.
`announcements/delete/[id].ts` — after the comments `deleteMany`: same block, `contentType: 'announcement'`, id `id`.
`recommendations/delete/[id].ts` — after the comments `deleteMany`: same block, `contentType: 'recommendation'`, id `id`.
`comments/delete/[commentId].ts` — after the parent `$pull` loop: same block, `contentType: 'comment'`, id `commentId`.
`listings/delete/[id].ts` — after `listingContacts` `deleteMany` at ~line 63: same block, `contentType: 'marketplace'`, id `id`.

(Each handler already has `db` in scope from `connectDB()`.)

- [ ] **Step 5: Run the e2e to verify it passes**

Run: `PW_FILE=scratchpad/devpw.txt npx tsx scratchpad/e2e-author-deleted-report.mts`
Expected: PASS — record present, `reviewStatus === 'pending'`, `contentDeleted === true`.

- [ ] **Step 6: Type-check**

Run: `pnpm type-check`
Expected: no new errors (budget ≤26).

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/pages/api/events/delete/\[id\].ts src/pages/api/topics/delete/\[id\].ts src/pages/api/comments/delete/\[commentId\].ts src/pages/api/announcements/delete/\[id\].ts src/pages/api/recommendations/delete/\[id\].ts src/pages/api/listings/delete/\[id\].ts
git commit -m "feat(moderation): keep reports in queue when author deletes content"
```

---

### Task 2: Admin queue "author deleted" badge

Render an informational badge on flagged-item cards when `item.contentDeleted` is set, so the admin reviews from the snapshot knowingly. The `GET /api/admin/moderation` response already spreads the full flagged doc (`items.map(i => ({...i, ...}))`), so the field arrives client-side with no API change — verify that one line, don't add a projection.

**Files:**
- Verify (no edit expected): `src/pages/api/admin/moderation/index.ts` (~line 92, `enriched = items.map((i) => ({ ...i, ... }))`)
- Modify: `src/lib/kiosk-i18n.ts` (add badge key to both DE + EN dicts)
- Modify: `src/components/admin/kiosk/AdmQueueCard.svelte`
- Modify: `src/components/admin/kiosk/AdmTriageCard.svelte`
- Test: playwright-cli browser gate + `npx -y svelte-check@4`

**Interfaces:**
- Consumes: `FlaggedContent.contentDeleted` (Task 1) surfaced as `item.contentDeleted` on the card's `item` prop.

- [ ] **Step 1: Confirm the field passes through the API**

Read `src/pages/api/admin/moderation/index.ts` around line 92 and confirm `enriched` spreads `...i` (it does). No change needed. If a restrictive `projection` is ever added to the `.find(filter)` at ~line 64, it must include `contentDeleted: 1` — note this in the commit body only if you touch it.

- [ ] **Step 2: Add the badge copy (DE + EN)**

In `src/lib/kiosk-i18n.ts`, add to both dictionaries (DE value first block, EN second), alongside the other `admin.*`/moderation keys:

```ts
// DE
'mod.badge.contentDeleted': 'Vom Autor gelöscht',
// EN
'mod.badge.contentDeleted': 'Deleted by author',
```

- [ ] **Step 3: Render the badge in AdmQueueCard.svelte**

`AdmQueueCard.svelte` already imports the i18n store (`import { t, locale } from '../../../lib/kiosk-i18n';` at line 23) — `t` is a derived store used as `$t['key']`. No import change needed. In the meta/type-chip row (near `<AdmTypeChip type={item.contentType} />`, ~line 83), add:

```svelte
{#if item.contentDeleted}
  <span
    style="display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; background:var(--k-ochre-tint, #f3e6c8); color:var(--k-ink); border:1px solid var(--k-line, rgba(0,0,0,0.12));"
    title={$t['mod.badge.contentDeleted']}
  >⚑ {$t['mod.badge.contentDeleted']}</span>
{/if}
```

- [ ] **Step 4: Render the same badge in AdmTriageCard.svelte**

`AdmTriageCard.svelte` also already imports `{ t, locale }` (line 28). Mirror Step 3's markup near `<AdmTypeChip type={item.contentType} />` (~line 79). Same markup and key.

- [ ] **Step 5: Svelte diagnostics**

Run: `npx -y svelte-check@4`
Expected: no new errors (budget ≤93).

- [ ] **Step 6: Browser gate the badge**

With the dev server running (user's port 3000), log in as admin (`admin@mahalle-dev.test`, redirect-bounce login) and open `/admin/moderation`. Use the e2e-created deleted-event report from Task 1 (or create one) and confirm the "Vom Autor gelöscht" badge renders on that card and the card still shows the snapshot title/body and the approve/reject actions. Capture at 1280 and 768. `playwright-cli close` when done.

- [ ] **Step 7: Commit**

```bash
git add src/lib/kiosk-i18n.ts src/components/admin/kiosk/AdmQueueCard.svelte src/components/admin/kiosk/AdmTriageCard.svelte
git commit -m "feat(moderation): badge author-deleted items in the review queue"
```

---

### Task 3: Docs + memory sync

Record the new behavior where the next session and the moderation docs will look for it.

**Files:**
- Modify: `CLAUDE.md` (root — the "User reports" / "Status flow" area of Content Moderation)
- Modify: `src/components/calendar/kiosk/CLAUDE.md` (deferral note ~line 162 — mark deferral (1) shipped)
- Modify: memory `project_open_followups.md` + `MEMORY.md` hook (mark the orphaned-report deferral resolved; note it was app-wide, not event-only)

- [ ] **Step 1: Update root CLAUDE.md**

In the Content Moderation section, add one line under "User reports"/"Status flow": self-deleting reported content no longer orphans the report — the 6 self-delete handlers stamp `flaggedContent.contentDeleted`, the record stays `pending` in the active queue, and the admin reviews/strikes from the stored snapshot (badge "Vom Autor gelöscht"). News has no self-delete path so it's unaffected.

- [ ] **Step 2: Update the calendar area file**

In `src/components/calendar/kiosk/CLAUDE.md` at the "Deferred" note (~line 162), mark deferral (1) (orphaned report on event delete) as SHIPPED 2026-09-08, and note the fix was applied app-wide (all 6 self-delete handlers), not just events. Leave deferral (2) (`aria-label="View"`) open.

- [ ] **Step 3: Update memory**

In `project_open_followups.md`, mark the orphaned-report deferral resolved (2026-09-08), noting it was a system-wide gap fixed across all self-delete handlers with the "keep-in-queue + strikeable snapshot" design. Refresh the `MEMORY.md` one-line hook.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md src/components/calendar/kiosk/CLAUDE.md
git commit -m "docs(moderation): record author-deleted-report queue behavior"
```

(Memory files under `~/.claude/.../memory/` are outside the repo — no `git add`.)

---

## Notes for the human at merge

- All work lands on `main` per the human-at-merge rule — hold the push for the user's go.
- The badge is a small visual surface; if the peer (`ui-polish-76`) is preferred for the visual polish, Task 2 Steps 3–4 could be dispatched there instead (minimal brief, `notify_when_idle:true`). Default: do it in-session and browser-gate here.
