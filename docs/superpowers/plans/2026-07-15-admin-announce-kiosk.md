# Admin · Amtliche Mitteilungen — Kiosk Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `/admin/announcements` (official-announcements publishing dashboard) from the legacy dark-glass `BaseLayout` + `AdminAnnouncementsPanel.svelte` to the kiosk design system, per the design handoff in `design/handoffs/design_handoff_announce/`.

**Architecture:** One Svelte 5 island (`AnnounceApp.svelte`) mounted in the existing `AdminLayout.astro` (parameterized wordmark), talking to the **unchanged** admin CRUD API (`/api/admin/announcements/*`). Single additive server change: `$inc editCount` on content edits. Optimistic create with visible pin displacement + toast undo.

**Tech Stack:** Astro 5 (SSR), Svelte 5 runes, kiosk-i18n (`t`/`tStr` store), sonner toast via `app:toast` bridge, existing `AdmModalShell.svelte`, Tailwind + `--k-*` tokens.

## Global Constraints

- **Design source of truth:** `design/handoffs/design_handoff_announce/jsx/kiosk-admin-announce.jsx` (desktop DE/EN, mobile, 5 states). Transcribe faithfully; ALL seed figures in `ANN_SEED` are invented — never hardcode them.
- **Spec companions:** `READMEFIRST.md` + `ANNOUNCE_SCOPING.md` in the same folder; `tokens-announce.css` / `motion-announce.css` are SPECS, not drop-ins — wire through existing `--k-*` tokens.
- **Backend contract (verified, do not change except Task 1's `editCount`):** `POST /api/admin/announcements` hard-pins 7 days server-side and strips client `isOfficial`/`pinnedUntil`; `PATCH /api/admin/announcements/{id}` accepts `{title?, body?, tags?, images?, pinnedUntil?: ISOstring(future)|null}` — pinning displaces any other pinned official (server invariant); `DELETE` is a hard `deleteOne`; `GET` returns `{ items }` (author-populated, createdAt desc, cap 50). All behind `requireAdminSession()`.
- **Single-pin invariant made legible (non-negotiable):** only ONE 📌 ever visible; composer note names the currently pinned title; re-pin buttons carry displacement microcopy; the displacement toast names the displaced title.
- **No duration picker.** Pin = 7 days, stated as text. Re-pin = `PATCH pinnedUntil: now+7d`.
- **Card anatomy:** pinned = ink card + teal strap „OFFIZIELLE ANKÜNDIGUNG · MAHALLE-TEAM" + ochre chip; archive = paper, dashed expired chip, `opacity: 0.92` — exactly the forum Ankündigung treatment.
- **Optimistic save:** new card appears immediately with pulsing „📌 WIRD ANGEPINNT…" chip; displaced card visibly moves to archive; on error full rollback, inputs preserved (no ghost pin).
- **Mobile is mandatory:** card stack (no table), all actions ≥ 44px, full-width 48px CTA.
- **German quotes:** „ (U+201E) opening, " (U+201C) closing in ALL DE strings. Never ASCII `"`.
- **Fonts:** `font-dmmono` for mono (NOT `font-mono`), `font-bricolage` display, `font-instrument` serif-italic.
- **Accent:** plum via existing `[data-page="admin"] { --k-accent: var(--k-plum) }` (tokens.css:107). NO new `data-page` value. Semantic accents (danger, teal strap, ochre pin chip, success) stay their own colors.
- **i18n:** every string via `src/lib/kiosk-i18n.ts` (`Dict = Record<keyof typeof de, string>` — EN must mirror DE keys exactly or tsc fails). Interpolation via `tStr`.
- **Type-check baseline: 29 errors** (`pnpm type-check 2>&1 | grep -c "error ts"` — must not exceed 29).
- **Dev servers:** NEVER touch the user's server on :3000. If you need a server, run `pnpm dev --port 4399` and KILL it before finishing.
- **Shared prod DB (`CommunityWebApp-test`):** E2E-created officials are visible on the LIVE forum and displace any real pinned official. Prefix E2E titles with `[TEST] `, keep the window short, delete via the UI before finishing, and restore any real pin you displaced (snapshot its `pinnedUntil` first). Residual scan must return 0.
- **Commits:** simple concise messages, NO "Generated with Claude Code" signature, NO Co-Authored-By footer. Never `--no-verify`.
- **Reduced motion:** every new keyframe/transition gated behind `prefers-reduced-motion: reduce` → end state, no loop.
- **Security escalation rule:** if you hit anything security-relevant not covered by your brief, STOP and report NEEDS_CONTEXT/BLOCKED — never improvise a security decision.

## Decisions already adjudicated (do not re-open)

1. **DELETE is hard** (`deleteOne`) — modal copy „…und aus dem Forum · nicht rückgängig" is accurate as-is.
2. **Undo = one PATCH:** restore the displaced pin's ORIGINAL `pinnedUntil` (snapshot before optimistic apply); the server displacement branch auto-unpins the new one. Only offer undo while that original date is still in the future (Zod rejects past dates).
3. **Edit UI:** composer dual-mode (create/edit). ✎ loads title+body into the composer; CTA becomes „Änderungen speichern" + „abbrechen"; `PATCH {title, body}` only (pin untouched). No inline row editing.
4. **Tags UI dropped** (legacy panel had it; design doesn't). API still accepts/defaults tags.
5. **`pinnedUntil: null` archive cards** get a dateless „PIN GELÖST" chip; past-date pins get „PIN ABGELAUFEN AM {date}".
6. **Mobile CTA** expands/collapses the composer inline above the board list.
7. **Non-admin access:** keep the existing redirect to `/` (page-level), unlike moderation's in-page §09 state — the design has no no-access artboard and README says "nur Layout + Panel tauschen".
8. **Empty-board composer note:** when nothing is pinned, the bold „Ersetzt…" sentence is omitted (nothing to displace).

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/pages/api/admin/announcements/[id].ts` | modify | `$inc: { editCount: 1 }` when title/body change |
| `src/types/index.ts` | modify | `editCount?: number` on `Announcement` |
| `src/layouts/AdminLayout.astro` | modify | props `wordmark`, `backHref`, `backLabel`, `ribbonEcho` (defaults = current hardcoded values) |
| `src/pages/admin/announcements.astro` | rewrite | AdminLayout shell + SSR initialItems + mount AnnounceApp |
| `src/components/admin/kiosk/announce/AnnounceApp.svelte` | create | orchestrator: state, fetch, actions, optimistic save, undo, modal |
| `src/components/admin/kiosk/announce/AnnCard.svelte` | create | pinned/archive/pending card (desktop + compact) |
| `src/components/admin/kiosk/announce/AnnComposer.svelte` | create | create/edit composer + pin note + error state |
| `src/components/admin/kiosk/announce/annFormat.ts` | create | Berlin-timezone date formatters |
| `src/lib/kiosk-i18n.ts` | modify | `admin.ann.*` keys, DE + EN |
| `src/styles/admin.css` | modify | `annSweep`/`annPending`/displacement/toast keyframes |
| `src/utils/toast.ts` + `src/components/ToastProvider.tsx` + `src/styles/global.css` | modify | additive `action` button support in the toast bridge |
| `src/components/admin/AdminAnnouncementsPanel.svelte` | delete (Task 5) | superseded legacy panel |
| `src/components/admin/CLAUDE.md`, root `CLAUDE.md`, `README.md` | modify (Task 5) | docs |

**No test framework exists in this repo.** Verification = `pnpm type-check` against baseline + live browser verification via playwright-cli (auth-state workflow in memory `reference_playwright_auth.md`, cookie state on disk) against a self-started `:4399` server.

---

### Task 1: Server — `editCount` on content edits

**Files:**
- Modify: `src/pages/api/admin/announcements/[id].ts:64-74`
- Modify: `src/types/index.ts` (the `Announcement` interface, around line 120)

**Interfaces:**
- Consumes: existing `AdminAnnouncementUpdateSchema` (unchanged).
- Produces: PATCH increments `editCount` by 1 **only when** `title` or `body` is present in the payload. Pin/unpin-only PATCHes must NOT increment. Docs without the field read as `undefined` (renderers treat falsy as "never edited"). Task 3's card renders `editCount`.

- [ ] **Step 1: Add the field to the type**

In `src/types/index.ts`, inside the `Announcement` interface (the one that already has `isOfficial?: boolean; pinnedUntil?: Date | null;` at lines 120-121), add:

```typescript
  editCount?: number; // incremented by admin PATCH when title/body change
```

- [ ] **Step 2: Increment in PATCH**

In `src/pages/api/admin/announcements/[id].ts`, replace the single `updateOne` call (line 74):

```typescript
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: update });
```

with:

```typescript
    // Content edit (title/body) bumps the visible edit counter; pin/unpin
    // and tag/image-only PATCHes don't count as "edited".
    const contentEdited = data.title !== undefined || data.body !== undefined;
    await collection.updateOne(
      { _id: new ObjectId(id) },
      contentEdited
        ? { $set: update, $inc: { editCount: 1 } }
        : { $set: update }
    );
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check 2>&1 | grep -c "error ts"`
Expected: `29` (baseline, no new errors)

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/admin/announcements/[id].ts src/types/index.ts
git commit -m "feat(admin): count content edits on official announcements"
```

(Behavioral E2E for this lands in Task 5's matrix — edit an official twice, card shows „2× bearbeitet"; unpin does not increment.)

---

### Task 2: AdminLayout parameterization + page shell swap

**Files:**
- Modify: `src/layouts/AdminLayout.astro`
- Rewrite: `src/pages/admin/announcements.astro`
- Create: `src/components/admin/kiosk/announce/AnnounceApp.svelte` (scaffold only)

**Interfaces:**
- Consumes: existing `AdminLayout` chrome (`[data-page="admin"]` → plum), existing SSR officials fetch.
- Produces: `AdminLayout` accepts optional `wordmark` (default `'moderation'`), `backHref` (default `'/'`), `backLabel` (default `'← zurück zum Forum'`), `ribbonEcho` (default `'user.role === "admin"'`). The announcements page passes `wordmark="amtliches"`, `backHref="/admin/moderation"`, `backLabel="← zur Moderation"`, `ribbonEcho="requireAdminSession()"`. `AnnounceApp.svelte` scaffold with props `{ initialItems: any[]; adminName: string }` that Tasks 3–4 fill.

**Design source:** `jsx/kiosk-admin-announce.jsx:61-88` (AnnMasthead — identical to moderation chrome except wordmark „amtliches", back-link „← zur Moderation", ribbon echo `requireAdminSession()`), `:225-232` (mobile header: wordmark „amtliches", right side counter — the counter itself is Task 3's; layout just shows the wordmark).

- [ ] **Step 1: Parameterize AdminLayout**

In `src/layouts/AdminLayout.astro`, extend Props (keep every default equal to today's hardcoded value so `/admin/moderation` renders byte-identically):

```astro
export interface Props {
  title: string;
  adminName?: string;
  wordmark?: string;   // masthead italic word — 'moderation' | 'amtliches' | …
  backHref?: string;   // desktop back-link target
  backLabel?: string;  // desktop back-link label
  ribbonEcho?: string; // mono echo on the right of the internal-area ribbon
}

const {
  title,
  adminName = '',
  wordmark = 'moderation',
  backHref = '/',
  backLabel = '← zurück zum Forum',
  ribbonEcho = 'user.role === "admin"',
} = Astro.props;
```

Then swap the four hardcoded spots:
1. Desktop ribbon right span: `<span>user.role === "admin"</span>` → `<span>{ribbonEcho}</span>`
2. Desktop wordmark span: `…>moderation</span>` → `…>{wordmark}</span>`
3. Desktop back-link: `<a href="/" …>← zurück zum Forum</a>` → `<a href={backHref} …>{backLabel}</a>`
4. Mobile wordmark div (`…>moderation</div>`, ~line 100) → `…>{wordmark}</div>`

- [ ] **Step 2: Scaffold AnnounceApp**

Create `src/components/admin/kiosk/announce/AnnounceApp.svelte`:

```svelte
<script lang="ts">
  // Admin · Amtliche Mitteilungen — kiosk orchestrator.
  // Design: design/handoffs/design_handoff_announce/jsx/kiosk-admin-announce.jsx
  let { initialItems = [], adminName = '' }: { initialItems?: any[]; adminName?: string } = $props();
</script>

<div class="mx-auto" style="max-width:1280px;">
  <!-- Tasks 3-4 build title block, composer, board + archive here -->
</div>
```

- [ ] **Step 3: Rewrite the page**

Replace `src/pages/admin/announcements.astro` entirely:

```astro
---
// Admin · Amtliche Mitteilungen — kiosk publishing dashboard for official
// announcements. Auth-gated to admin role (redirect, unlike moderation's
// in-page no-access state — locked decision, plan §Decisions 7).
// SSR-fetches the officials list so the island hydrates without a
// follow-up roundtrip; actions refetch via GET /api/admin/announcements.
import AdminLayout from '../../layouts/AdminLayout.astro';
import AnnounceApp from '../../components/admin/kiosk/announce/AnnounceApp.svelte';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../lib/mongodb';
import { populateAuthors } from '../../lib/topicsQuery';

const session = await getSession(Astro.request);
if (!session?.user) {
  return Astro.redirect('/login?redirect=/admin/announcements');
}
if (session.user.role !== 'admin') {
  return Astro.redirect('/');
}
const adminName = session.user.name ?? '';

let initialItems: any[] = [];
try {
  const db = await connectDB();
  const docs = await db
    .collection('announcements')
    .find({ isOfficial: true })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  const populated = await populateAuthors(docs as any[]);
  initialItems = JSON.parse(JSON.stringify(populated));
} catch (err) {
  console.error('[admin/announcements.astro] SSR officials fetch failed:', err);
}
---

<AdminLayout
  title="Mahalle · Amtliche Mitteilungen"
  adminName={adminName}
  wordmark="amtliches"
  backHref="/admin/moderation"
  backLabel="← zur Moderation"
  ribbonEcho="requireAdminSession()"
>
  <AnnounceApp client:only="svelte" initialItems={initialItems} adminName={adminName} />
</AdminLayout>
```

- [ ] **Step 4: Verify both admin pages live**

Start `pnpm dev --port 4399`. With the playwright-cli auth state (memory `reference_playwright_auth.md`):
- `/admin/moderation` — masthead still reads „mahalle *moderation*", ribbon right `user.role === "admin"`, back-link „← zurück zum Forum". Zero visual change.
- `/admin/announcements` — plum chrome, wordmark „mahalle *amtliches*", ribbon right `requireAdminSession()`, back-link „← zur Moderation", empty main (scaffold).
- Mobile 390px: announcements mobile header shows „amtliches".

Kill the :4399 server.

- [ ] **Step 5: Type-check + commit**

Run: `pnpm type-check 2>&1 | grep -c "error ts"` → `29`

```bash
git add src/layouts/AdminLayout.astro src/pages/admin/announcements.astro src/components/admin/kiosk/announce/AnnounceApp.svelte
git commit -m "feat(admin): announce page on AdminLayout with amtliches wordmark"
```

---

### Task 3: Read side — title block, board/archive cards, skeleton + empty states

**Files:**
- Create: `src/components/admin/kiosk/announce/AnnCard.svelte`
- Create: `src/components/admin/kiosk/announce/annFormat.ts`
- Modify: `src/components/admin/kiosk/announce/AnnounceApp.svelte`
- Modify: `src/lib/kiosk-i18n.ts` (read-side `admin.ann.*` keys, BOTH dicts)
- Modify: `src/styles/admin.css` (`annSweep` keyframe + `.ann-skel`)

**Interfaces:**
- Consumes: `initialItems` prop (Task 2); `t`, `tStr` from kiosk-i18n — same store usage as `ModerationApp.svelte:16`; from the `announce/` folder the import is `../../../../lib/kiosk-i18n`.
- Produces: `AnnCard` props: `{ item: any; compact?: boolean; pending?: boolean; onEdit: (item: any) => void; onUnpin: (item: any) => void; onRepin: (item: any) => void; onDelete: (item: any) => void }` (buttons render now, wired to no-op callbacks until Task 4). `annFormat.ts` exports `isPinned(item): boolean`, `fmtPinDate(iso: string, lang: 'DE'|'EN'): string`, `fmtCreated(iso: string, lang: 'DE'|'EN'): string`, `fmtKickerDate(lang: 'DE'|'EN'): string`, `truncate(s: string, n: number): string`. AnnounceApp state shape: `status: 'loading'|'ready'`, `items: any[]`, `$derived pinnedItem` / `archiveItems`.

**Design source:** `jsx/kiosk-admin-announce.jsx:36-58` (chips + ghost button), `:122-163` (AnnCard full anatomy — ink vs paper, strap, footer actions, mono echo), `:170-214` (desktop layout: kicker with live date, H1 „Was hängt am *Brett*?", counter line, grid `460px 1fr`, section labels), `:279-290` (states 01 laden + 02 leer). Keyframes: `motion-announce.css` (annSweep 1.4s, reduced-motion gate).

**Behaviors (exact):**
- `isPinned(item)` = `item.pinnedUntil && new Date(item.pinnedUntil).getTime() > Date.now()`. At most one item satisfies this (server invariant) — render it under „AM BRETT — ANGEPINNT"; all others under „ARCHIV — NICHT MEHR ANGEPINNT" (createdAt desc, as delivered).
- **Date formatters — build from `formatToParts`, not raw `format()`** (raw output has commas/periods the design doesn't). Shared helper inside `annFormat.ts`:

```typescript
const BERLIN = { timeZone: 'Europe/Berlin' } as const;
function parts(iso: string, lang: 'DE' | 'EN', opts: Intl.DateTimeFormatOptions) {
  const p = new Intl.DateTimeFormat(lang === 'DE' ? 'de-DE' : 'en-GB', { ...BERLIN, ...opts })
    .formatToParts(new Date(iso));
  const get = (t: string) => p.find((x) => x.type === t)?.value.replace(/\./g, '') ?? '';
  return get;
}
// design: DE „MI 22. JUL" — weekday day. month; EN "WED JUL 22" — weekday month day
export function fmtPinDate(iso: string, lang: 'DE' | 'EN'): string {
  const get = parts(iso, lang, { weekday: 'short', day: 'numeric', month: 'short' });
  const s = lang === 'DE'
    ? `${get('weekday')} ${get('day')}. ${get('month')}`
    : `${get('weekday')} ${get('month')} ${get('day')}`;
  return s.toUpperCase();
}
// design: DE „Di 15. Jul · 08:10"; EN "Tue Jul 15 · 08:10" — NOT uppercased
export function fmtCreated(iso: string, lang: 'DE' | 'EN'): string {
  const get = parts(iso, lang, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const date = lang === 'DE'
    ? `${get('weekday')} ${get('day')}. ${get('month')}`
    : `${get('weekday')} ${get('month')} ${get('day')}`;
  return `${date} · ${get('hour')}:${get('minute')}`;
}
export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}
```
- Archive chip logic: `item.pinnedUntil` is a past date → `admin.ann.chip.expired` with `fmtPinDate`; `pinnedUntil == null` → dateless `admin.ann.chip.unpinned` („PIN GELÖST"). Both dashed-border mono chips per JSX:44-51.
- Edited meta: render `· {tStr($t['admin.ann.meta.edited'], { n: item.editCount })}` only when `item.editCount` ≥ 1 (JSX:140).
- Kicker line includes the live date: `{$t['admin.ann.kicker']} · {fmtKickerDate(lang)}` (JSX:179 „AMTLICHE MITTEILUNGEN · DIENSTAG 15. JULI · 09:15"). `fmtKickerDate` = same `formatToParts` technique with `{ weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }`, composed DE `WEEKDAY DAY. MONTH · HH:MM` / EN `WEEKDAY MONTH DAY · HH:MM`, uppercased, using the current time (`new Date().toISOString()`).
- Counter line: `tStr($t['admin.ann.counter'], { n: items.length, p: pinnedItem ? 1 : 0 })`.
- State handling: `status = 'ready'` immediately when `initialItems.length > 0`; if SSR delivered an empty array, fetch `GET /api/admin/announcements` on mount with `status='loading'` (skeleton mirrors composer block + 1 board card + archive rows, `annSweep` 1.4s per JSX:279-283). Empty result → state 02 („Das Brett ist leer." serif-italic + hint + accent ghost CTA per JSX:284-290). Fetch failure → `showError($t['admin.ann.toast.loadError'])` + empty state fallback.
- Mono echo strings (`PATCH pinnedUntil: null`, `POST /api/admin/announcements`) are literal code — NOT i18n keys (identical both languages, JSX:115/150).
- Pending variant (`pending` prop): ochre chip text `admin.ann.chip.pending` with `.ann-pending-chip` pulse — markup lands now, first used by Task 4.

**i18n keys (add to BOTH dicts — DE values verbatim, EN mirrors):**

```typescript
// ── admin · amtliche mitteilungen (announce) ──
'admin.ann.kicker': 'AMTLICHE MITTEILUNGEN',                     // EN: 'OFFICIAL ANNOUNCEMENTS'
'admin.ann.title.a': 'Was hängt am ',                            // EN: 'What’s on the '
'admin.ann.title.accent': 'Brett',                               // EN: 'board'
'admin.ann.title.b': '?',                                        // EN: '?'
'admin.ann.counter': '{n} Mitteilungen · {p} angepinnt — es kann immer nur eine am Brett hängen.',
                                  // EN: '{n} announcements · {p} pinned — only one can ever hang on the board.'
'admin.ann.section.board': 'AM BRETT — ANGEPINNT',               // EN: 'ON THE BOARD — PINNED'
'admin.ann.section.archive': 'ARCHIV — NICHT MEHR ANGEPINNT',    // EN: 'ARCHIVE — NO LONGER PINNED'
'admin.ann.strap.left': 'OFFIZIELLE ANKÜNDIGUNG · MAHALLE-TEAM', // EN: 'OFFICIAL ANNOUNCEMENT · MAHALLE TEAM'
'admin.ann.strap.right': 'AM BRETT',                             // EN: 'ON THE BOARD'
'admin.ann.chip.pinned': '📌 ANGEPINNT BIS {date}',              // EN: '📌 PINNED UNTIL {date}'
'admin.ann.chip.expired': 'PIN ABGELAUFEN AM {date}',            // EN: 'PIN EXPIRED {date}'
'admin.ann.chip.unpinned': 'PIN GELÖST',                         // EN: 'UNPINNED'
'admin.ann.chip.pending': '📌 WIRD ANGEPINNT…',                  // EN: '📌 PINNING…'
'admin.ann.meta.edited': '{n}× bearbeitet',                      // EN: 'edited {n}×'
'admin.ann.action.edit': '✎ bearbeiten',                         // EN: '✎ edit'
'admin.ann.action.unpin': '⤓ lösen (unpin)',                     // EN: '⤓ unpin'
'admin.ann.action.repin': '⤒ erneut anpinnen (7 Tage)',          // EN: '⤒ re-pin (7 days)'
'admin.ann.action.delete': '✕ löschen…',                         // EN: '✕ delete…'
'admin.ann.micro.displace': 'anpinnen löst die aktuelle Anheftung', // EN: 're-pin displaces the current pin'
'admin.ann.empty.title': 'Das Brett ist leer.',                  // EN: 'The board is empty.'
'admin.ann.empty.hint': 'Noch keine amtliche Mitteilung. Die erste wird automatisch 7 Tage angepinnt.',
                                  // EN: 'No official announcement yet. The first one is pinned for 7 days automatically.'
'admin.ann.empty.cta': '📌 erste Mitteilung anschlagen',         // EN: '📌 post the first announcement'
'admin.ann.toast.loadError': 'Mitteilungen konnten nicht geladen werden.', // EN: 'Couldn’t load announcements.'
```

**Steps:**

- [ ] **Step 1:** `annFormat.ts` with `isPinned`, `fmtPinDate`, `fmtCreated`, `fmtKickerDate`, `truncate` as specced above (pure module, no server imports — it's client-bundled).
- [ ] **Step 2:** i18n keys in both dicts. Run `pnpm type-check` — key parity is compiler-enforced.
- [ ] **Step 3:** `AnnCard.svelte` transcribed from JSX:122-163 (ink/paper variants, strap, chips, footer, mono echo, `compact` prop for mobile sizes, `pending` variant).
- [ ] **Step 4:** AnnounceApp: kicker/H1/counter (JSX:177-189), grid `460px 1fr` with a placeholder left column (`<!-- composer: Task 4 -->`), board + archive lists, skeleton (state 01) + empty (state 02; its CTA scrolls to + focuses the composer title field once Task 4 mounts it — render the button now, wire in Task 4). `annSweep` + `.ann-skel` + reduced-motion gate into `src/styles/admin.css` (append below `admToastIn`, follow the file's comment style).
- [ ] **Step 5:** Live verify on :4399 (auth state): real officials render; board/archive split correct against DB reality; dates Berlin-formatted; DE↔EN toggle flips every string; skeleton visible when throttling (`playwright-cli route "**/api/admin/announcements" --delay`… only if SSR items suppressed — acceptable to verify skeleton by temporarily passing `initialItems={[]}`... do NOT commit that). Kill server.
- [ ] **Step 6:** Type-check → 29. Commit:

```bash
git add src/components/admin/kiosk/announce/ src/lib/kiosk-i18n.ts src/styles/admin.css
git commit -m "feat(admin): announce board/archive cards, skeleton + empty states"
```

---

### Task 4: Write side — composer, actions, optimistic displacement + undo, delete modal

**Files:**
- Create: `src/components/admin/kiosk/announce/AnnComposer.svelte`
- Modify: `src/components/admin/kiosk/announce/AnnounceApp.svelte`
- Modify: `src/lib/kiosk-i18n.ts` (write-side keys)
- Modify: `src/utils/toast.ts`, `src/components/ToastProvider.tsx`, `src/styles/global.css` (toast action support)
- Modify: `src/styles/admin.css` (`annPending` keyframe, `.ann-pending-chip`)

**Interfaces:**
- Consumes: Task 3's `AnnCard` callbacks + `pending` variant; `AdmModalShell.svelte` (props `{ accent, width, onClose, children }`); `showToast`/`showError` from `src/utils/toast.ts`.
- Produces: fully-wired dashboard. Toast bridge gains optional `action?: { label: string; onClick: () => void }` on `ToastDetail`, passed to sonner's `action` option, styled via new `actionButton: 'kiosk-toast__action'` className.

**Design source:** `jsx/kiosk-admin-announce.jsx:91-119` (composer anatomy: plum top-rule paperWarm card, Titel max 120 + Mitteilung fields, teal pin-note box, ink CTA with teal print-shadow, mono POST echo), `:291-317` (states 03 speichert·Verdrängung, 04 Fehler, 05 löschen bestätigen). Motion: `motion-announce.css` (annPending 1.2s; displacement = the card visibly MOVING board→archive, 220ms `cubic-bezier(.2,.7,.3,1)` — "die Bewegung IST die Lesbarkeit der Invariante", no fade-out/in elsewhere; the spec itself names "FLIP oder view transition" as the mechanism — see the displacement-motion behavior below; toast stamp-in exists already as kiosk toast).

**Displacement motion (board ↔ archive crosses containers — a CSS transition class CANNOT animate this):** use the same-document View Transitions API. Every `AnnCard` wrapper gets a stable `style:view-transition-name={'ann-' + item._id}` (ObjectId hex / `tmp-…` uuid are CSS-ident-safe). Wrap each optimistic list mutation (create-displacement, unpin, re-pin, undo refetch-apply) as:

```typescript
import { tick } from 'svelte';
async function withMove(apply: () => void) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !document.startViewTransition) { apply(); return; }
  // @ts-ignore — startViewTransition typing may lag
  document.startViewTransition(async () => { apply(); await tick(); });
}
```

Add to `admin.css`: `::view-transition-group(*) { animation-duration: 220ms; animation-timing-function: cubic-bezier(.2,.7,.3,1); }` scoped with a comment that it serves the announce displacement (and is a no-op elsewhere until other pages adopt names). Unsupported browsers/reduced-motion → instant move (graceful, per global constraint).

**Behaviors (exact):**

*Composer (`AnnComposer.svelte`):* props `{ mode: 'create'|'edit', initialTitle?: string, initialBody?: string, currentPinTitle: string | null, saving: boolean, errorState: boolean, onSubmit: (title: string, body: string) => void, onCancel?: () => void, onRetry: () => void }`.
- Fields: title `<input maxlength="120">` (design cap; server allows 200 — client is stricter, fine) + body `<textarea>`; labels/placeholders per keys below.
- Pin note (create mode only): teal box `⏱ {admin.ann.note.fixed}` + when `currentPinTitle` non-null append bold `tStr($t['admin.ann.note.replaces'], { title: truncate(currentPinTitle, 40) })`. Edit mode: no pin note.
- CTA: create → `admin.ann.cta.create` (ink pill, teal print-shadow `box-shadow: 2px 2px 0 var(--k-teal)`), edit → `admin.ann.cta.save` + ghost `admin.ann.cta.cancel`. Disabled while `saving` or below the SERVER minimums — `title.trim().length < 5 || body.trim().length < 10` (Zod rejects shorter with a 400 the UI would misreport as state 04; the client guard prevents that). Mono echo under CTA: literal `POST /api/admin/announcements` (create) / `PATCH /api/admin/announcements/{id}` (edit). Any input change while `composeError` is set clears it back to the normal CTA row.
- Error state 04 (JSX:301-307): danger-bordered box replacing the CTA row — `admin.ann.error.title` + `admin.ann.error.hint` + ghost `admin.ann.error.retry` → `onRetry`. Inputs stay bound (never cleared on error).

*AnnounceApp orchestration:*

```typescript
// core state
let items = $state<any[]>(structuredClone-ish initialItems);
let status = $state<'loading'|'ready'>(initialItems.length ? 'ready' : 'loading');
let editing = $state<any | null>(null);        // item loaded into composer
let saving = $state(false);
let composeError = $state(false);
let confirmDelete = $state<any | null>(null);  // item pending delete modal
let composerTitle = $state(''); let composerBody = $state('');
let pendingTempId = $state<string | null>(null);

const pinnedItem = $derived(items.find((i) => isPinned(i)) ?? null);
const archiveItems = $derived(items.filter((i) => !isPinned(i)));
```

- **Create (optimistic, state 03):** on submit — clear `composeError`, snapshot `prevItems = [...items]` and `displaced = pinnedItem` (+ `displacedUntilISO = displaced ? new Date(displaced.pinnedUntil).toISOString() : null`). Inside `withMove()`: insert temp item `{ _id: 'tmp-' + crypto.randomUUID(), title, body, pinnedUntil: new Date(Date.now() + 7*864e5).toISOString(), createdAt: new Date().toISOString(), _pending: true }` at the head; if `displaced`, set its local `pinnedUntil = null` (it visibly moves to archive via the view transition; chip flips 📌→PIN GELÖST). `saving = true`. Then `POST /api/admin/announcements` `{ title, body, tags: [], images: [] }`.
  - Success: replace temp with `res.announcement`, clear composer, `saving = false`, toast: `displaced ? tStr($t['admin.ann.toast.posted.replaced'], { title: truncate(displaced.title, 28) }) : $t['admin.ann.toast.posted']`, type success — **with undo action when `displaced && displacedUntilISO` is still future**: `{ label: $t['admin.ann.toast.undo'], onClick: undoDisplacement }` and `duration: 8000` (undo needs reading + reaction time; default 4s is too short).
  - Failure: `withMove(() => { items = prevItems })` (full rollback — no ghost pin, displaced card returns to board), `saving = false`, `composeError = true`, inputs untouched. NO toast (the inline error box is the surface, state 04).
- **`undoDisplacement()`:** `PATCH /api/admin/announcements/{displaced._id}` body `{ pinnedUntil: displacedUntilISO }` — server auto-unpins the new post (displacement branch). On success `refetch()` + toast `admin.ann.toast.undone` (success). On failure `showError($t['admin.ann.toast.actionError'])`.
- **Unpin:** optimistic `pinnedUntil = null` on the item, `PATCH { pinnedUntil: null }`; success toast `admin.ann.toast.unpinned` (info); failure → rollback to snapshot + `showError`.
- **Re-pin:** guard: if another item is currently pinned, its local `pinnedUntil` → null (visible displacement, same snapshot+rollback discipline); target's `pinnedUntil = now+7d ISO`; `PATCH { pinnedUntil: thatISO }`; success toast `admin.ann.toast.repinned`; failure rollback + `showError`.
- **Edit:** ✎ → `editing = item`, composer prefilled (`composerTitle/Body`), scroll composer into view. Submit → `PATCH { title, body }`; success: merge `res.announcement` into `items`, exit edit mode, toast `admin.ann.toast.saved`; failure: `composeError = true`, stay in edit mode.
- **Delete (state 05):** ✕ → `confirmDelete = item` → `AdmModalShell` (`accent="var(--k-danger)"`, width 560): title `admin.ann.modal.delete.title`, body `tStr(admin.ann.modal.delete.body, { title: truncate(item.title, 40) })` (the „und aus dem Forum" consequence is IN the string), danger-filled confirm `admin.ann.modal.delete.confirm` + ghost cancel. Confirm → `DELETE /api/admin/announcements/{id}`; success: remove from `items` + toast `admin.ann.toast.deleted`; failure `showError`. Modal closes either way.
- **`refetch()`:** seq-guarded (`let seq = 0` counter, ignore stale responses — same pattern as `MarketplaceBrowseInner`) GET → `items = res.items`.
- After ANY successful mutation, also `refetch()` in the background to reconcile server truth (author population, displacement side-effects).

*Toast action bridge (additive):*
- `src/utils/toast.ts`: extend `ToastDetail` with `action?: { label: string; onClick: () => void };` (the CustomEvent already carries functions fine — same-document dispatch). `showToast`'s options type (`Partial<Omit<ToastDetail, 'message'>>`) picks it up automatically.
- `ToastProvider.tsx:8-9` (verified current code): change the two lines to

```typescript
      const { type, message, description, duration, action } = (e as CustomEvent).detail;
      const opts = { description, duration, action };
```

  and add `actionButton: 'kiosk-toast__action'` to the `classNames` map (after `closeButton`, line 43).
- `src/styles/global.css`: next to the existing `.kiosk-toast*` block add `.kiosk-toast__action` — ink-bordered paper pill, `font-dmmono`, 11px, underlined label feel per JSX:298 (`✓ angeschlagen … · rückgängig`): `background: var(--k-paper); border: 1.5px solid var(--k-ink); border-radius: 999px; padding: 4px 12px; font-weight: 700; cursor: pointer;`.

**i18n keys (both dicts):**

```typescript
'admin.ann.composer.kicker': 'NEUE AMTLICHE MITTEILUNG',        // EN: 'NEW OFFICIAL ANNOUNCEMENT'
'admin.ann.composer.kickerEdit': 'MITTEILUNG BEARBEITEN',       // EN: 'EDIT ANNOUNCEMENT'
'admin.ann.field.title': 'Titel',                               // EN: 'Title'
'admin.ann.field.titleMax': '· max 120',                        // EN: '· max 120'
'admin.ann.field.body': 'Mitteilung',                           // EN: 'Message'
'admin.ann.field.titlePh': 'Worum geht es?',                    // EN: 'What is it about?'
'admin.ann.field.bodyPh': 'Sachlich, kurz, mit Datum und Ort. Erscheint mit „Mahalle-Team“-Marke im Forum.',
                    // EN: 'Factual, short, with date and place. Appears in the forum with the “Mahalle team” badge.'
'admin.ann.note.fixed': 'Wird 7 Tage oben angepinnt — serverseitig fest. ', // EN: 'Pinned on top for 7 days — fixed server-side. '
'admin.ann.note.replaces': 'Ersetzt die aktuelle Anheftung („{title}“).',   // EN: 'Replaces the current pin (“{title}”).'
'admin.ann.cta.create': '📌 anschlagen & anpinnen',             // EN: '📌 post & pin'
'admin.ann.cta.save': 'Änderungen speichern',                   // EN: 'save changes'
'admin.ann.cta.cancel': 'abbrechen',                            // EN: 'cancel'
'admin.ann.error.title': 'Die Mitteilung ließ sich nicht anschlagen.', // EN: 'The announcement couldn’t be posted.'
'admin.ann.error.hint': 'Titel und Text sind noch da — nichts verloren.', // EN: 'Title and text are still here — nothing lost.'
'admin.ann.error.retry': '⟳ erneut versuchen',                  // EN: '⟳ try again'
'admin.ann.toast.posted': '✓ angeschlagen',                     // EN: '✓ posted'
'admin.ann.toast.posted.replaced': '✓ angeschlagen · ersetzt: „{title}“', // EN: '✓ posted · replaced: “{title}”'
'admin.ann.toast.undo': 'rückgängig',                           // EN: 'undo'
'admin.ann.toast.undone': 'Anheftung wiederhergestellt.',       // EN: 'Pin restored.'
'admin.ann.toast.unpinned': 'Pin gelöst — das Brett ist leer.', // EN: 'Unpinned — the board is empty.'
'admin.ann.toast.repinned': '📌 wieder angepinnt (7 Tage).',    // EN: '📌 Re-pinned (7 days).'
'admin.ann.toast.saved': 'Änderungen gespeichert.',             // EN: 'Changes saved.'
'admin.ann.toast.deleted': 'Mitteilung gelöscht.',              // EN: 'Announcement deleted.'
'admin.ann.toast.actionError': 'Aktion fehlgeschlagen — nichts geändert.', // EN: 'Action failed — nothing changed.'
'admin.ann.modal.delete.title': 'Mitteilung löschen?',          // EN: 'Delete announcement?'
'admin.ann.modal.delete.body': '„{title}“ verschwindet vom Brett und aus dem Forum. Das lässt sich nicht rückgängig machen.',
                    // EN: '“{title}” disappears from the board and from the forum. This cannot be undone.'
'admin.ann.modal.delete.confirm': '✕ endgültig löschen',        // EN: '✕ delete permanently'
```

**Steps:**

- [ ] **Step 1:** Toast bridge extension (toast.ts + ToastProvider.tsx + global.css). Quick live sanity: any existing toast still renders unchanged.
- [ ] **Step 2:** `AnnComposer.svelte` per anatomy above (JSX:91-119 + state 04).
- [ ] **Step 3:** AnnounceApp orchestration (state machine, all five actions wrapped in `withMove`, optimistic create + displacement + undo, delete via `AdmModalShell` imported as `../AdmModalShell.svelte`). Add `annPending` keyframe + `.ann-pending-chip` + the `::view-transition-group(*)` timing rule to `admin.css` (reduced-motion: no animation; `withMove` already skips the view transition).
- [ ] **Step 4:** i18n keys both dicts; type-check enforces parity.
- [ ] **Step 5: Live E2E on :4399 (SHARED PROD DB — follow the Global Constraints protocol).** Before starting: record whether a REAL pinned official exists (`title` + `pinnedUntil` ISO). Then: (a) create `[TEST] Anschlag A` → appears instantly with pulsing chip, real pin (if any) slides to archive, toast names it, undo restores it (verify chip returns 📌 with the ORIGINAL date); (b) create `[TEST] Anschlag B` → displaces A(-or-real); unpin B → board empty toast; re-pin A → 7-day chip; (c) edit A twice → „2× bearbeitet" (Task 1 verified); (d) block `**/api/admin/announcements` POST via playwright route → error state 04, inputs preserved, no ghost pin; (e) delete BOTH test items via the modal (verifies state 05 + hard delete). **Cleanup:** restore the real pin's original `pinnedUntil` if you displaced it and undo didn't already; residual scan `[TEST]`-titled officials = 0. Kill server.
- [ ] **Step 6:** Type-check → 29. Commit:

```bash
git add src/components/admin/kiosk/announce/ src/lib/kiosk-i18n.ts src/utils/toast.ts src/components/ToastProvider.tsx src/styles/global.css src/styles/admin.css
git commit -m "feat(admin): announce composer with optimistic pin displacement, undo + delete modal"
```

---

### Task 5: Mobile stack, legacy deletion, docs, final verification

**Files:**
- Modify: `src/components/admin/kiosk/announce/AnnounceApp.svelte` (responsive)
- Delete: `src/components/admin/AdminAnnouncementsPanel.svelte`
- Modify: `src/lib/kiosk-i18n.ts` (mobile keys)
- Modify: `src/components/admin/CLAUDE.md`, `src/components/forum/kiosk/CLAUDE.md:50`, root `CLAUDE.md`, `README.md`

**Interfaces:**
- Consumes: everything from Tasks 2–4.
- Produces: shippable surface; zero references to the legacy panel.

**Design source:** `jsx/kiosk-admin-announce.jsx:219-248` (mobile 390: full-width 48px ink CTA with teal print-shadow, mono hint line beneath, `AM BRETT` / `ARCHIV` short labels, compact cards, actions ≥ 44px).

**Behaviors (exact):**
- `< md`: hide the desktop grid's composer column; show full-width CTA `admin.ann.mobile.cta` (min-height 48px) + centered mono hint `admin.ann.mobile.hint`; tapping toggles the composer inline directly beneath (same `AnnComposer` instance — render it once, position responsively; a `showMobileComposer` `$state` controls `< md` visibility, always-visible ≥ md via Tailwind `hidden md:block` on the CTA-wrapper inverse). Entering edit mode (✎ on a card) force-opens it and scrolls to it.
- Section labels switch to the short mobile variants below `md`: `admin.ann.mobile.board` „AM BRETT" / `admin.ann.mobile.archive` „ARCHIV" (Tailwind `md:hidden` / `hidden md:block` label pairs — do NOT swap strings in JS).
- Cards use `compact` prop below `md`. Footer action buttons: ensure computed hit target ≥ 44px (`min-height:44px` on `< md` via a `.ann-card-action` class in admin.css).
- Desktop H1 48px → mobile ~28px; kicker/counter shrink per the moderation page's established responsive treatment.

**i18n keys (both dicts):**

```typescript
'admin.ann.mobile.cta': '📌 neue Mitteilung anschlagen',   // EN: '📌 post a new announcement'
'admin.ann.mobile.hint': 'wird 7 Tage angepinnt · ersetzt die aktuelle Anheftung', // EN: 'pinned for 7 days · replaces the current pin'
'admin.ann.mobile.board': 'AM BRETT',                      // EN: 'ON THE BOARD'
'admin.ann.mobile.archive': 'ARCHIV',                      // EN: 'ARCHIVE'
```

**Steps:**

- [ ] **Step 1:** Responsive pass per behaviors above.
- [ ] **Step 2:** Delete the legacy panel + verify zero CODE references (docs are cleaned in Step 3 — known remaining doc mentions: `src/components/admin/CLAUDE.md:46`, `src/components/forum/kiosk/CLAUDE.md:50`):

```bash
git rm src/components/admin/AdminAnnouncementsPanel.svelte
grep -rn "AdminAnnouncementsPanel" src/ --include="*.svelte" --include="*.astro" --include="*.ts" --include="*.tsx" || echo "clean"
```
Expected: `clean`.

- [ ] **Step 3:** Docs:
  - `src/components/admin/CLAUDE.md`: replace the „Admin Official Announcements (`AdminAnnouncementsPanel.svelte` …)" section (line 46) with the new architecture — AnnounceApp/AnnCard/AnnComposer/annFormat, optimistic displacement + one-PATCH undo, `editCount` semantics, dual-mode composer, `pinnedUntil:null` vs expired chips, toast action bridge, `withMove` view-transition displacement.
  - `src/components/forum/kiosk/CLAUDE.md:50`: update the admin-dashboard bullet — now `AnnounceApp.svelte` (kiosk, optimistic updates), no longer "refetches on every action, no optimistic updates".
  - After Step 3, `grep -rn "AdminAnnouncementsPanel" src/ README.md CLAUDE.md` must return nothing.
  - Root `CLAUDE.md`: update the admin bullets — moderation line mentions announce is now kiosk; note `editCount` on the announcements collection line; add `wordmark/backHref/backLabel/ribbonEcho` to any AdminLayout mention if present.
  - `README.md`: feature table row for admin announcements → ✅ Kiosk (match the existing table style).
- [ ] **Step 4: Final verification matrix on :4399** (then kill it):
  1. Desktop 1280 DE + EN: full page vs JSX artboards (kicker date live, counter accurate, single 📌 everywhere).
  2. Mobile 390: CTA toggles composer, compact cards, ≥ 44px actions, short labels.
  3. `/admin/moderation` regression: byte-identical chrome (wordmark „moderation", old back-link) desktop + mobile.
  4. Non-admin + logged-out: redirects unchanged (`/` and `/login?redirect=…`).
  5. Reduced-motion emulation: no sweep/pulse loops.
  6. `pnpm build` green AND the page loads in-browser afterward (server-only-import bleed check per root CLAUDE.md).
  7. Residual scan: no `[TEST]` officials in DB.
- [ ] **Step 5:** Type-check → 29. Commit:

```bash
git add -A
git commit -m "feat(admin): announce mobile stack, drop legacy panel, docs"
```

---

## Self-Review Notes

- **Spec coverage:** README steps 1-6 → Tasks 2 (layout swap), 3+4 (panel per JSX), 4 (actions + states 03-05), 3 (states 01-02), 5 (mobile), 3+4+5 (i18n/toasts). README's 2 confirm-points are pre-resolved in §Decisions (1, 2). Scoping §02-§08 all mapped; §09 questions answered.
- **Out of scope (per handoff):** `/blog`, displacement notifications, scheduled publishing, multi-pin, duration options. Also NOT touched: forum-side rendering of officials, comment-orphan cleanup on delete (pre-existing).
- **Type consistency:** `isPinned/fmtPinDate/fmtCreated/fmtKickerDate` defined Task 3, consumed Tasks 3-5; `AnnCard` prop shape defined Task 3, `pending` used Task 4; toast `action` defined Task 4 where first used.
