# Admin Moderation Kiosk Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin/moderation` in the Editorial Kiosk design system per the handoff in `design/handoffs/design_handoff_admin/` — card-based Prüfstapel + Protokoll table + kiosk decision modals (incl. the Ban-Bremse and bulk Folgen-Vorschau guards) + mobile triage + the 9-state matrix, on a dedicated plum-accented AdminLayout.

**Architecture:** A new `AdminLayout.astro` (plum ribbon + internal masthead, no app nav — mirrors AuthLayout) hosts one `ModerationApp.svelte` island (`client:only="svelte"`) that owns all state (view, filters, selection, pagination, actions) and composes presentational `Adm*` components. The existing 3 admin APIs are kept and extended minimally: an author-strikes join + urgent-first sort on the index, and one new author-strikes endpoint for the Ban-Bremse ledger. The legacy `ModerationQueue.svelte` is deleted at the end.

**Tech Stack:** Astro 5, Svelte 5 runes, kiosk `--k-*` tokens + `kiosk-i18n` store, existing sonner kiosk toasts (`src/utils/toast.ts`), MongoDB direct driver.

## Global Constraints

- **Design source of truth**: the JSX in `design/handoffs/design_handoff_admin/jsx/` — `kiosk-admin.jsx` (atoms, masthead, stat row, filter rail, bulk bar, queue card, mobile triage), `kiosk-admin-history.jsx` (Protokoll), `kiosk-admin-flows.jsx` (4 modals), `kiosk-admin-states.jsx` (9 states). Implementers transcribe layout/spacing/copy from the referenced line ranges — this is the project's established handoff pattern (5 prior surfaces). This plan defines behavior, contracts, and exact strings; the JSX defines pixels.
- **Token mapping (JSX → CSS vars)**: `k.color.paper→var(--k-paper)`, `paperWarm→--k-paper-warm`, `paperSoft→--k-paper-soft`, `ink→--k-ink`, `inkSoft→--k-ink-soft`, `inkMute→--k-ink-mute`, `rule→--k-rule`, `danger→--k-danger`, `warn→--k-warn`, `success→--k-success`, `ochre→--k-ochre`, `info→--k-info`, `moss→--k-moss`, `ADM_ACCENT/plum→var(--k-accent)` (scoped by `[data-page="admin"]`). Fonts: `k.font.display→.font-bricolage`, `mono→.font-dmmono`, `serif→.font-instrument` (italic). Shadows: `k.shadow.print(c)→3px 3px 0 <c>`, `printSm(c)→2px 2px 0 <c>` (default c = ink). Severity `high` `#a05a28` is admin-only → `--adm-sev-high` in `src/styles/admin.css`.
- **Plum accent**: `[data-page="admin"] { --k-accent: var(--k-plum); }` in `tokens.css`. Plum stays admin's page accent; existing semantic plum uses (RESERVIERT strap etc.) are untouched.
- **Language rule (handoff §11)**: queue + history = full DE/EN parity via `kiosk-i18n` (`admin.*` keys). Modals + state copy = DE is the contract; the EN dict receives the IDENTICAL German string for those keys (locked decision — internal tool, don't invent EN copy).
- **German curly quotes** `„` (U+201E) / `“` (U+201C) in DE strings exactly as the JSX has them.
- **Non-negotiables (handoff)**: Sperren passiert nie beiläufig — no ban without the Ban-Bremse checkbox (single) or acknowledged Folgen-Vorschau (bulk); strike dots ●●○ on every queue card; 2-strike authors get the inline „Ablehnung = Sperre (3/3)" flag; Protokoll „Alle" = `reviewStatus: 'reviewed'` (approved+rejected, NEVER pending); urgent (= `decision === 'urgent_review'`, set at flag time by `src/lib/moderation.ts:509/686` with its own per-category thresholds — do NOT recompute the handoff's "≥ 0.85" rule client-side; the existing decision field is the source of truth) always sorts to top with its own stat counter; mobile = triage only (no history, no bulk, no column menu); flagged images blur by default, hover reveals; rejected content stays in the DB.
- **API contracts (existing, do not break)**: `GET /api/admin/moderation` params `reviewStatus/contentType/source/sortBy(createdAt|maxScore|reviewStatus)/sortOrder/limit(≤100)/offset` → `{ items, pagination:{total,limit,offset,hasMore}, counts:{pending,approved,approvedWithWarning,rejected,urgent} }` (counts are global). `POST review` `{ flaggedContentId, action:'approve'|'reject'|'approve_with_warning', notes?≤1000, rejectionReason?≤500, warningText?≤200 }` → `{ success, message, reviewStatus, strikeCount?, userBanned? }`. `POST bulk-review` `{ flaggedContentIds(1..50), action:'approve'|'reject', notes?, rejectionReason? }` → `{ success, message, results:[{id,status:'approved'|'rejected'|'already_processed'|'failed',strikeCount?,error?}], bansTriggered }`. All behind `requireAdminSession()`.
- **`reviewNotes` (`notes`) is the Interne Notiz** — protocol-only, never shown to authors. `rejectionReason` IS shown to the author (renders in their OwnStatusBanner).
- **Type-check gate**: baseline 824 pre-existing errors. Task 3 changes `Dict = typeof de` → `Record<keyof typeof de, string>`, which REMOVES the literal-parity error class — measure the new (lower) baseline there and gate all later tasks on it. New keys then add ZERO type errors.
- **Prod DB == local dev DB.** E2E needs a temp admin user + temp flagged docs — all `tmp-*@example.invalid` / clearly marked, created by scratchpad scripts, deleted rigorously in Task 10.
- Commit style: simple/concise, no AI signatures, no Co-Authored-By, never `--no-verify`.
- Out of scope (handoff): reporter notifications, un-ban UI (§08 toast only points at it), tiered roles, appeal flow, `/admin/announcements` reskin (separate surface, stays legacy for now).

---

### Task 1: AdminLayout + plum accent + admin.css + role-gated moderation.astro with §09 403 card

**Files:**
- Create: `src/layouts/AdminLayout.astro`
- Create: `src/styles/admin.css`
- Modify: `src/styles/tokens.css:106` (add admin accent line)
- Modify: `src/pages/admin/moderation.astro` (full rewrite)
- Create: `src/components/admin/kiosk/ModerationApp.svelte` (shell only)

**Interfaces:**
- Produces: `AdminLayout.astro` props `{ title: string }`, emits `data-page="admin"`, renders plum ribbon + masthead + `<slot />`; `ModerationApp.svelte` island mounted `client:only="svelte"` with prop `adminName: string`.

- [ ] **Step 1: tokens.css** — after line 106 (`[data-page="auth"]`), add:

```css
[data-page="admin"]        { --k-accent: var(--k-plum); }
```

- [ ] **Step 2: Create `src/styles/admin.css`** — transcribe `design/handoffs/design_handoff_admin/motion-admin.css` (all 7 keyframes/classes + the reduced-motion block, verbatim behavior) with token names swapped to `--k-*` (e.g. `var(--paper-soft)` → `var(--k-paper-soft)`, `var(--admin-accent)` → `var(--k-accent)`, `var(--adm-sev-critical)` → `var(--k-danger)`), and add:

```css
:root { --adm-sev-high: #a05a28; } /* admin-only aux severity tone */
```

- [ ] **Step 3: Create `src/layouts/AdminLayout.astro`** — mirror `src/layouts/AuthLayout.astro`'s shell (same `k-paper-bg` body, grain, font classes) but with the admin masthead from `kiosk-admin.jsx:201-232`: plum ribbon (`INTERNER BEREICH — NUR FÜR ADMINS SICHTBAR` left, `user.role === "admin"` right — static DE, mono 10px, letter-spacing 0.14em, `background: var(--k-accent)`), then header row: plum monogram roundel `m` (serif italic) + wordmark `mahalle` + serif-italic plum `moderation` + mono sub `SCHILLERKIEZ · NEUKÖLLN · ADMIN`; right side: `← zurück zum Forum` link → `/forum` (mono 11, ink-mute), reuse `AuthLangToggle` (`src/components/auth/kiosk/AuthLangToggle.svelte`, `client:load`), and the session user's initial in a plum roundel. Import `../styles/admin.css`. Props: `{ title }`; `<body ... data-page="admin">`; `<slot />` after the masthead. No KioskNav, no footer.

- [ ] **Step 4: Rewrite `src/pages/admin/moderation.astro`**:

```astro
---
import AdminLayout from '../../layouts/AdminLayout.astro';
import ModerationApp from '../../components/admin/kiosk/ModerationApp.svelte';
import { getSession } from 'auth-astro/server';

const session = await getSession(Astro.request);
if (!session?.user) {
  return Astro.redirect('/login?redirect=/admin/moderation', 302);
}
const isAdmin = session.user.role === 'admin';
const adminName = session.user.name ?? '';
---

<AdminLayout title="Mahalle · Moderation">
  {/* HTML comments are invalid inside Astro expressions — use JSX comments here */}
  {isAdmin ? (
    <ModerationApp client:only="svelte" adminName={adminName} />
  ) : (
    /* §09 Kein Zugriff — kiosk-admin-states.jsx §09, DE-only */
    <div class="mx-auto text-center" style="max-width:420px; padding:80px 24px;">
      <div style="width:44px; height:44px; margin:0 auto 14px; background:var(--k-accent); border:1.5px solid var(--k-ink); border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--k-paper); font-size:17px;">⚑</div>
      <h1 class="font-bricolage" style="font-size:22px; font-weight:800; letter-spacing:-0.02em; margin:0;">Dieser Bereich gehört der Moderation.</h1>
      <p class="font-bricolage" style="font-size:13px; color:var(--k-ink-soft); margin:8px 0 18px;">Dein Konto hat keine Admin-Rechte.</p>
      <a href="/forum" class="font-bricolage no-underline" style="display:inline-block; border:1.5px solid var(--k-ink); border-radius:999px; padding:7px 16px; font-size:12.5px; font-weight:700; color:var(--k-ink);">← zurück zum Forum</a>
    </div>
  )}
</AdminLayout>
```

This closes the pre-existing page-level gate TODO (only APIs were role-gated until now).

- [ ] **Step 5: `ModerationApp.svelte` shell** — minimal Svelte 5 component: `let { adminName } = $props();` rendering a placeholder `<div class="font-dmmono" style="padding:36px; color:var(--k-ink-mute);">wird geladen…</div>`. Tasks 3–9 replace this file's body incrementally.

- [ ] **Step 6: Verify** — `pnpm type-check` (824, no new). Dev server: as an admin session → masthead + ribbon + placeholder render, plum accent active (`getComputedStyle` `--k-accent` = `#6f2f59`); as a non-admin logged-in user → §09 card; anonymous → `/login?redirect=/admin/moderation`.

- [ ] **Step 7: Commit**

```bash
git add src/layouts/AdminLayout.astro src/styles/admin.css src/styles/tokens.css src/pages/admin/moderation.astro src/components/admin/kiosk/ModerationApp.svelte
git commit -m "feat(admin): kiosk AdminLayout + plum accent + role-gated moderation page (403 state)"
```

---

### Task 2: API extensions — authorStrikes join, urgentFirst sort, author-strikes ledger endpoint

**Files:**
- Modify: `src/pages/api/admin/moderation/index.ts`
- Modify: `src/schemas/moderation.schema.ts:116` (`FlaggedContentQuerySchema`)
- Create: `src/pages/api/admin/moderation/author-strikes.ts`

**Interfaces:**
- Consumes: `requireAdminSession` (`src/lib/auth.ts`), `FlaggedContentQuerySchema` (extend in place where it lives).
- Produces: index items gain `authorStrikes: number` and `authorIsBanned: boolean` (0/false when authorId isn't a valid user, e.g. `'system'`); new query param `urgentFirst=true`; `GET /api/admin/moderation/author-strikes?authorId=<id>` → 200 `{ strikes: number, isBanned: boolean, history: Array<{ date: string, contentType: string, reason: string, title: string | null }> }` (max 10, newest first), 400 on missing/invalid authorId.

- [ ] **Step 1: `urgentFirst` param** — add to `FlaggedContentQuerySchema` (`src/schemas/moderation.schema.ts:116`):

```typescript
  // NOT z.coerce.boolean() — that coerces the string "false" to true.
  urgentFirst: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
```

In the sort construction in `index.ts`, when `urgentFirst` is true prepend `decision: -1`:

```typescript
    // urgentFirst: 'urgent_review' > 'pending_review' > 'approved'
    // lexicographically, so a descending sort on `decision` floats urgent
    // items above everything on every page (design: urgent always on top).
    const sort: Record<string, 1 | -1> = query.urgentFirst
      ? { decision: -1, [query.sortBy]: sortDir }
      : { [query.sortBy]: sortDir };
```

- [ ] **Step 2: authorStrikes join** — after fetching `items`, before building the response:

```typescript
    // Join author strike counts for the queue cards (strike dots ●●○ +
    // the 2-strike "Ablehnung = Sperre (3/3)" flag). authorId may be
    // 'system' (AI-fetched news) or stale — those get 0/false.
    const authorIds = [...new Set(items.map((i: any) => i.authorId).filter((id: string) => id && ObjectId.isValid(id)))];
    const authors = authorIds.length
      ? await db.collection('users')
          .find({ _id: { $in: authorIds.map((id) => new ObjectId(id)) } },
                { projection: { moderationStrikes: 1, isBanned: 1 } })
          .toArray()
      : [];
    const byId = new Map(authors.map((a) => [a._id.toString(), a]));
    const enriched = items.map((i: any) => ({
      ...i,
      authorStrikes: byId.get(i.authorId)?.moderationStrikes ?? 0,
      authorIsBanned: byId.get(i.authorId)?.isBanned === true,
    }));
```

Return `enriched` as `items`. Keep everything else (counts, pagination) unchanged.

- [ ] **Step 3: Create `src/pages/api/admin/moderation/author-strikes.ts`**:

```typescript
import type { APIRoute } from 'astro';
import { ObjectId } from 'mongodb';
import { requireAdminSession } from '../../../../lib/auth';
import { connectDB } from '../../../../lib/mongodb';

// Ban-Bremse ledger: the reject modal escalates on a would-be 3rd strike
// and shows the author's full strike history (date · surface · content ·
// reason). strikeHistory lives on the user doc; content titles are
// resolved from the flaggedContent records referenced by contentId.
export const GET: APIRoute = async ({ request, url }) => {
  const guard = await requireAdminSession(request);
  if (!guard.ok) return guard.response;

  const authorId = url.searchParams.get('authorId') ?? '';
  if (!ObjectId.isValid(authorId)) {
    return new Response(JSON.stringify({ error: 'Invalid authorId' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const db = await connectDB();
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(authorId) },
    { projection: { moderationStrikes: 1, isBanned: 1, strikeHistory: 1 } }
  );
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    });
  }

  const rawHistory: any[] = (user.strikeHistory ?? []).slice(-10).reverse();
  const contentIds = rawHistory
    .map((s) => s.contentId)
    .filter((id) => id && ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  const flagged = contentIds.length
    ? await db.collection('flaggedContent')
        .find({ contentId: { $in: contentIds.map(String) } }, { projection: { contentId: 1, title: 1 } })
        .toArray()
    : [];
  const titleByContentId = new Map(flagged.map((f) => [String(f.contentId), f.title ?? null]));

  return new Response(JSON.stringify({
    strikes: user.moderationStrikes ?? 0,
    isBanned: user.isBanned === true,
    history: rawHistory.map((s) => ({
      date: s.date,
      contentType: s.contentType ?? 'topic',
      reason: s.reason ?? '',
      title: titleByContentId.get(String(s.contentId)) ?? null,
    })),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
```

- [ ] **Step 4: Verify** — `pnpm type-check` (824). With an admin session cookie: `curl '.../api/admin/moderation?reviewStatus=pending&urgentFirst=true&limit=5'` → items carry `authorStrikes`/`authorIsBanned`, urgent items first; `curl '.../api/admin/moderation/author-strikes?authorId=<some real userId>'` → `{ strikes, isBanned, history }`; non-admin cookie → 403; bad authorId → 400. (If no admin session exists yet, create the temp admin per Task 10 Step 1's script early and note it in the report — it is cleaned in Task 10.)

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/admin/moderation/index.ts src/pages/api/admin/moderation/author-strikes.ts
git commit -m "feat(admin): author strikes join + urgent-first sort + strike-ledger endpoint"
```

---

### Task 3: Taxonomy lib + i18n Dict fix + admin.* keys (queue scope) + 6 atoms

**Files:**
- Create: `src/lib/adminModeration.ts` (PURE — no mongodb/server imports; imported by islands)
- Modify: `src/lib/kiosk-i18n.ts` (Dict type fix + `admin.*` keys)
- Create: `src/components/admin/kiosk/AdmCheckbox.svelte`, `AdmSourceStrap.svelte`, `AdmTypeChip.svelte`, `AdmCatChip.svelte`, `AdmStrikeDots.svelte`, `AdmActionBtn.svelte`

**Interfaces:**
- Produces: from `adminModeration.ts` —

```typescript
export type AdmSeverity = 'critical' | 'high' | 'mid' | 'info';
export const ADM_CATS: Record<string, { sev: AdmSeverity }>;      // 11 keys from kiosk-admin.jsx:16-28
export const ADM_SEV_COLOR: Record<AdmSeverity, string>;          // critical: 'var(--k-danger)', high: 'var(--adm-sev-high)', mid: 'var(--k-warn)', info: 'var(--k-info)'
export const ADM_TYPES: readonly string[];                        // ['topic','comment','announcement','recommendation','event','news','marketplace']
export const ADM_REPORT_REASONS: readonly string[];               // ['spam','harassment','hate_speech','violence','misinformation','inappropriate','other'] (the schema's 7 — JSX shows 5, hate_speech + violence added from the real schema)
export interface FlaggedItem { /* mirror of API item incl. authorStrikes: number, authorIsBanned: boolean — port field list from src/types/index.ts FlaggedContent with string dates */ }
export function isUrgent(item: FlaggedItem): boolean;             // item.decision === 'urgent_review'
```

- Atom props: `AdmCheckbox { checked: boolean, onclick?: () => void }` · `AdmSourceStrap { item: FlaggedItem }` (derives strap from `isUrgent` > `source === 'user_report'` (+`×N` if reportCount>1) > news `authorId !== 'system'` submitted > default AI; label text via `$t`) · `AdmTypeChip { type: string }` · `AdmCatChip { catKey: string, score: number }` (label `$t['admin.cat.'+catKey]` fallback raw key, severity color; news `relevance` renders `N/100` not `%`) · `AdmStrikeDots { n: number, size?: number }` (default 8) · `AdmActionBtn { variant: 'approve'|'warn'|'danger'|'outline', small?: boolean, disabled?: boolean, onclick: () => void }` — markup/styling per `kiosk-admin.jsx:107-196`.

- [ ] **Step 1: Dict type fix in `kiosk-i18n.ts`** — change `type Dict = typeof de;` to:

```typescript
// Key parity between de/en stays type-enforced; literal-VALUE parity does
// not (it produced one spurious TS2322 per differing translation).
type Dict = Record<keyof typeof de, string>;
```

Measure `pnpm type-check 2>&1 | grep -c "error TS"` before and after — record the new baseline (expected: well below 824; all removed errors were at kiosk-i18n EN-dict lines). Every later task gates on the NEW baseline.

- [ ] **Step 2: Add `admin.*` keys (DE + EN)** — full queue-scope table (EN from the JSX; keys used by Tasks 3–7 and 9):

| key | DE | EN |
|---|---|---|
| `admin.stat.urgent` | `dringend` | `urgent` |
| `admin.stat.pending` | `offen` | `pending` |
| `admin.stat.approved` | `freigegeben` | `approved` |
| `admin.stat.warning` | `mit hinweis` | `with warning` |
| `admin.stat.rejected` | `abgelehnt` | `rejected` |
| `admin.title.kicker` | `MODERATION` | `MODERATION` |
| `admin.title.a` | `Was liegt auf dem ` | `What’s on the ` |
| `admin.title.accent` | `Prüftisch` | `review desk` |
| `admin.title.b` | `?` | `?` |
| `admin.view.queue` | `Prüfstapel` | `Review queue` |
| `admin.view.history` | `Protokoll` | `History` |
| `admin.sortNote` | `sortieren: neueste ↓ · aktualisieren ⟳` | `sort: newest ↓ · refresh ⟳` |
| `admin.filter.all` | `Alle` | `All` |
| `admin.filter.reported` | `⚑ Gemeldet` | `⚑ Reported` |
| `admin.type.topic` | `Diskussion` | `Discussion` |
| `admin.type.comment` | `Kommentar` | `Comment` |
| `admin.type.announcement` | `Ankündigung` | `Announcement` |
| `admin.type.recommendation` | `Empfehlung` | `Recommendation` |
| `admin.type.event` | `Termin` | `Event` |
| `admin.type.news` | `News` | `News` |
| `admin.type.marketplace` | `Markt` | `Market` |
| `admin.strap.ai` | `KI-GEPRÜFT` | `AI-FLAGGED` |
| `admin.strap.urgent` | `DRINGEND` | `URGENT` |
| `admin.strap.reported` | `⚑ GEMELDET` | `⚑ REPORTED` |
| `admin.strap.news` | `EINGEREICHT` | `SUBMITTED` |
| `admin.card.by` | `von` | `by` |
| `admin.card.flaggedAs` | `MARKIERT ALS` | `FLAGGED AS` |
| `admin.card.reportedFor` | `GEMELDET WEGEN` | `REPORTED FOR` |
| `admin.card.relevance` | `KI-Relevanz` | `AI relevance` |
| `admin.card.more` | `weitere` | `more` |
| `admin.card.banFlag` | `Ablehnung = Sperre (3/3)` | `rejection = ban (3/3)` |
| `admin.card.imgBlur` | `unscharf — hover zeigt` | `blurred — hover reveals` |
| `admin.cat.hate` | `Hassrede` | `Hate speech` |
| `admin.cat.hate/threatening` | `Hass-Drohung` | `Hate threat` |
| `admin.cat.violence` | `Gewalt` | `Violence` |
| `admin.cat.harassment` | `Belästigung` | `Harassment` |
| `admin.cat.harassment/threatening` | `Drohung` | `Threat` |
| `admin.cat.turkish_profanity` | `Beleidigung` | `Profanity` |
| `admin.cat.spam_check:spam` | `Spam` | `Spam` |
| `admin.cat.spam_check:ad_promotional` | `Werbung` | `Ad / promo` |
| `admin.cat.spam_check:scam` | `Betrugsverdacht` | `Scam` |
| `admin.cat.image_safety:other_violation` | `Bild-Verstoß` | `Image violation` |
| `admin.cat.relevance` | `Relevanz` | `Relevance` |
| `admin.report.spam` | `Spam / Werbung` | `Spam / advertising` |
| `admin.report.harassment` | `Belästigung` | `Harassment` |
| `admin.report.hate_speech` | `Hassrede` | `Hate speech` |
| `admin.report.violence` | `Gewalt` | `Violence` |
| `admin.report.misinformation` | `Falschinformation` | `Misinformation` |
| `admin.report.inappropriate` | `Unangemessen` | `Inappropriate` |
| `admin.report.other` | `Sonstiges` | `Other` |
| `admin.act.approve` | `freigeben` | `approve` |
| `admin.act.warn` | `mit hinweis…` | `with warning…` |
| `admin.act.reject` | `ablehnen…` | `reject…` |
| `admin.act.dismiss` | `meldung verwerfen` | `dismiss report` |
| `admin.act.addWarn` | `hinweis ergänzen…` | `add warning…` |
| `admin.act.remove` | `inhalt entfernen…` | `remove content…` |
| `admin.bulk.selected` | `ausgewählt` | `selected` |
| `admin.bulk.approveAll` | `alle freigeben` | `approve all` |
| `admin.bulk.rejectAll` | `alle ablehnen…` | `reject all…` |
| `admin.bulk.clear` | `auswahl aufheben` | `clear` |
| `admin.bulk.hint` | `ablehnen vergibt Verwarnungen — Vorschau folgt` | `rejecting adds strikes — preview follows` |
| `admin.page.prev` | `← zurück` | `← prev` |
| `admin.page.next` | `weiter →` | `next →` |
| `admin.page.of` | `Seite {p} von {t} · {n} {what} · zeige` | `page {p} of {t} · {n} {what} · show` |
| `admin.page.pending` | `offen` | `pending` |
| `admin.state.loading.rm` | `reduced-motion: statisches paperSoft` | *(same DE string)* |
| `admin.state.empty.title` | `Nichts zu prüfen.` | *(same DE string)* |
| `admin.state.empty.sub` | `Der Kiez benimmt sich.` | *(same DE string)* |
| `admin.state.empty.last` | `letzter Entscheid: {when}` | *(same DE string)* |
| `admin.state.error.title` | `Stapel nicht erreichbar.` | *(same DE string)* |
| `admin.state.error.body` | `Der Server antwortet nicht. Nichts ist verloren — der Stapel wartet.` | *(same DE string)* |
| `admin.state.error.retry` | `⟳ erneut versuchen` | *(same DE string)* |

("*(same DE string)*" = copy the DE value into the EN dict verbatim — locked decision from Global Constraints.)

- [ ] **Step 3: `adminModeration.ts` + the 6 atoms** — per the Interfaces block; markup transcribed from `kiosk-admin.jsx:107-196` with the token mapping. `AdmSourceStrap`'s urgent variant carries class `adm-strap-urgent` (pulse from `admin.css`).

- [ ] **Step 4: Verify** — `pnpm type-check` → record new baseline (Step 1) + zero non-i18n changes; `pnpm build` still green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminModeration.ts src/lib/kiosk-i18n.ts src/components/admin/kiosk/
git commit -m "feat(admin): kiosk taxonomy lib, admin i18n keys, atom components (+Dict type fix)"
```

---

### Task 4: Queue view — stat row, title, filter rail, cards, states §01/§02/§06, pagination, approve/dismiss with optimistic §04

**Files:**
- Create: `src/components/admin/kiosk/AdmStatRow.svelte`, `AdmTitleBlock.svelte`, `AdmFilterRail.svelte`, `AdmQueueCard.svelte`
- Modify: `src/components/admin/kiosk/ModerationApp.svelte` (replace shell)

**Interfaces:**
- Consumes: `GET /api/admin/moderation` (+`urgentFirst=true`, `reviewStatus=pending`), atoms + lib + i18n from Task 3, `showToast` from `src/utils/toast.ts`.
- Produces: `ModerationApp` state contract used by Tasks 5–9:

```typescript
let view = $state<'queue' | 'history'>('queue');
let filterType = $state<'all' | (typeof ADM_TYPES)[number] | 'reported'>('all');
let items = $state<FlaggedItem[]>([]);
let counts = $state<{ pending: number; approved: number; approvedWithWarning: number; rejected: number; urgent: number } | null>(null);
let total = $state(0);
let page = $state(0);          // 0-indexed
let pageSize = $state(10);     // 10 | 25 | 50
let loading = $state(true);
let loadError = $state(false);
let actioning = $state<Map<string, string>>(new Map());  // id → pending pill label
let settling = $state<Set<string>>(new Set());            // id → settle-out animation
async function fetchQueue(): Promise<void>;               // seq-guarded (marketplace pattern)
async function runSingleAction(id: string, action: 'approve'|'reject'|'approve_with_warning', opts?: { rejectionReason?: string; warningText?: string; notes?: string }): Promise<{ ok: boolean; userBanned?: boolean; strikeCount?: number }>;
```

Card component: `AdmQueueCard { item, selected, onToggleSelect, onApprove, onWarn, onReject, actioningLabel: string | null, settling: boolean }`.

- [ ] **Step 1: Presentational components** — `AdmStatRow` (5 cards, top-rule colors danger/ochre/success/warn/ink-mute, maps `counts` → urgent/pending/approved/approvedWithWarning/rejected; `kiosk-admin.jsx:237-260`), `AdmTitleBlock` (kicker `admin.title.kicker` + live localized date via `new Date().toLocaleDateString($locale==='de'?'de-DE':'en-GB',{weekday:'long',day:'numeric',month:'long'})` uppercased + time; H1 with serif-italic accent span; queue/history pill toggle emitting `onViewChange`; `kiosk-admin.jsx:265-298`), `AdmFilterRail` (Alle + 7 types + ⚑ Gemeldet ochre-outline pill, emits `onFilterChange`; `kiosk-admin.jsx:300-320`).

- [ ] **Step 2: `AdmQueueCard`** — full anatomy per `kiosk-admin.jsx:349-433`: header (checkbox · strap · type chip · `von <b>author</b>` + `AdmStrikeDots n={item.authorStrikes}` · time via `formatDate` de-DE/en-GB), body (comment context line; title; body — comments serif-italic in „…"; images row: each `imageUrls` entry rendered blurred (`filter: blur(6px)` + overlay label `admin.card.imgBlur`), `:hover` removes blur), flags block (report block with reason chip + reporter + quoted `reportDetails` for `source==='user_report'`; relevance chip for news; else `MARKIERT ALS` + `AdmCatChip` per `flaggedCategories` with `scores[cat]`), action row on paper-soft (report items get dismiss/addWarn/remove per §7.4; others approve/warn/reject), 2-strike inline flag `admin.card.banFlag` right-aligned when `item.authorStrikes === 2`. Urgent treatment: 2px danger border + paper-warm + `3px 3px 0 var(--k-danger)` + pulsing strap. Optimistic overlay: when `actioningLabel` set → card `opacity:0.55`, buttons disabled, centered pill with class `adm-action-pending`; when `settling` → class `adm-card-settle`.

- [ ] **Step 3: `ModerationApp` orchestration** — fetch on mount + on filter/page changes (`reviewStatus=pending&urgentFirst=true&sortBy=createdAt&sortOrder=desc&limit=&offset=` + `source=user_report` when filterType==='reported' else `contentType=` when not 'all'); seq-guard stale responses (marketplace `refetch` pattern). States: `loading` → 3 `adm-skeleton-bar` cards (§01); `loadError` → §06 box (`admin.state.error.*`, retry button re-fetches); empty (`!items.length && counts` ) → §02 (success roundel ✓, `admin.state.empty.title/sub`); else card list. Pagination footer (prev/next pills + `admin.page.of` via `tStr` + pageSize select 10/25/50). `runSingleAction`: sets `actioning` label (`wird freigegeben…`/`wird abgelehnt…`/`wird markiert…` — add these 3 DE-only keys `admin.act.pendingApprove/pendingReject/pendingWarn`), POSTs review, on success → `settling` 220ms → remove item locally + refetch counts; on failure → clear actioning + error toast with server message. Wire card `onApprove` (and report-dismiss, same `approve` action) directly; `onWarn`/`onReject` are stubs that no-op with an info toast until Tasks 5–6 (note in code: `// Task 5/6 wires the modal`).

- [ ] **Step 4: Verify** — type-check (Task 3 baseline); playwright as temp admin: stat row shows real counts, cards render with strike dots, filter pills refetch, skeleton visible on slow reload, approve on a temp flagged item dims → settles → disappears and pending count drops. (Temp flagged docs per Task 10 Step 1 script; note usage in report.)

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/kiosk/ src/lib/kiosk-i18n.ts
git commit -m "feat(admin): kiosk queue view — stat row, cards, states, approve flow"
```

---

### Task 5: Reject modal + Ban-Bremse escalation + §08 ban toast

**Files:**
- Create: `src/components/admin/kiosk/AdmModalShell.svelte`, `AdmRejectModal.svelte`
- Modify: `src/components/admin/kiosk/ModerationApp.svelte` (wire `onReject`/report-`remove`)

**Interfaces:**
- Consumes: `runSingleAction` (Task 4), `GET /api/admin/moderation/author-strikes` (Task 2), flows design `kiosk-admin-flows.jsx:100-182` (copy contract, DE-only — EN dict gets identical strings).
- Produces: `AdmModalShell { accent: string, onClose: () => void, children }` — fixed inset-0 backdrop `rgba(27,26,23,0.28)`, centered paper-warm card, `border-top: 5px solid accent`, print shadow, class `adm-modal-card` (stamp-in), Escape/backdrop-click closes, body scroll locked while open (reuse the scroll-lock approach from `src/components/forum/kiosk/KioskReportModal.svelte`); `AdmRejectModal { item: FlaggedItem, onCancel, onConfirm: (reason: string, notes: string) => void }`.

- [ ] **Step 1: `AdmModalShell`** per the scaffold in `kiosk-admin-flows.jsx:36-58` (modal card, kicker + title with serif-italic accent, case-summary block: strap + type chip + time + title/body excerpt + `von <b>author</b>` + strike dots).

- [ ] **Step 2: `AdmRejectModal`** — normal mode (`item.authorStrikes < 2`, flows `:100-130`): required textarea „Grund der Ablehnung" (hint „wird der Autorin angezeigt", max 500), optional „Interne Notiz" (hint „nur fürs Protokoll · optional", max 1000), warn-tinted consequence box: `AdmStrikeDots n={item.authorStrikes + 1}` + `<b>{n}. Verwarnung für {author}.</b>` + (bei n=2) „Noch eine Ablehnung, dann wird das Konto gesperrt (3/3)."; new-strike dot wears class `adm-strike-new`. CTA `✕ ablehnen & verwarnen` (danger fill) disabled until reason non-empty; `abbrechen` cancels.

  Ban-Bremse mode (`item.authorStrikes >= 2`, flows `:135-182`): floating danger badge `BAN-BREMSE · 3. VERWARNUNG`; title „Diese Ablehnung *sperrt das Konto*"; on open fetch `author-strikes?authorId=` → inline ledger card `STRIKE-KONTO · {AUTHOR}` with one row per history entry (numbered roundel, title (fallback `contentType` label), `date · reason`, date formatted dd.MM.yyyy) + final row = the CURRENT case on danger tint with `← DIESE`; required Grund; danger-tinted checkbox row `<b>Ja, {author} sperren.</b> Kein Login, kein Posten mehr — bis ein Admin die Sperre aufhebt. Bestehende Beiträge bleiben (Nachweis der Moderation).`; CTA `✕ ablehnen & sperren` disabled until reason non-empty AND checkbox ticked (opacity 0.4 / not-allowed while disabled). Ledger fetch failure → keep the modal usable: show `Strike-Historie nicht verfügbar` in the ledger slot (checkbox still required).

- [ ] **Step 3: Wire in `ModerationApp`** — `onReject` (and report `remove`) opens the modal for that item; confirm → `runSingleAction(id, 'reject', { rejectionReason, notes })`; on `userBanned: true` in the response → ink toast (§08, 6s): `{author} wurde gesperrt — 3/3 Verwarnungen.` via `showToast(..., 'error')`. Otherwise standard success toast with the strike count.

- [ ] **Step 4: Verify** — type-check; playwright: temp flagged item by a 0-strike temp author → normal modal, empty-reason CTA disabled, submit → item settles out, author gains strike (check via author-strikes curl); temp author with `moderationStrikes: 2` → Ban-Bremse renders ledger + checkbox gating, confirm → §08 toast + `users.isBanned` true (verify + reset via scratchpad script; temp users only).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/kiosk/ src/lib/kiosk-i18n.ts
git commit -m "feat(admin): kiosk reject modal with Ban-Bremse third-strike guard"
```

---

### Task 6: Warning modal with live label preview

**Files:**
- Create: `src/components/admin/kiosk/AdmWarningModal.svelte`
- Modify: `src/components/admin/kiosk/ModerationApp.svelte` (wire `onWarn`/report-`addWarn`)

**Interfaces:**
- Consumes: `AdmModalShell` (Task 5), `runSingleAction`; design `kiosk-admin-flows.jsx:187-215` (DE-only copy).
- Produces: `AdmWarningModal { item, onCancel, onConfirm: (warningText: string) => void }`.

- [ ] **Step 1: Component** — warn accent shell; kicker `FREIGEBEN · MIT HINWEIS`, title „Hinweis *ergänzen*"; case summary; required field „Hinweistext" (hint „öffentlich sichtbar · max. 200 Zeichen", `maxlength=200`, live char count); live preview block labeled `VORSCHAU AUF DEM BEITRAG`: paper card with ochre strap `⚠ HINWEIS DER MODERATION` (ink text, mono 10), the typed text in serif-italic ink-soft updating on input, then the item title at `opacity:0.55`. CTA `⚠ freigeben mit hinweis` (warn outline) disabled while empty; `abbrechen`.

- [ ] **Step 2: Wire** — `onWarn`/`addWarn` open it; confirm → `runSingleAction(id, 'approve_with_warning', { warningText })` → settle-out + success toast.

- [ ] **Step 3: Verify** — type-check; playwright: preview updates as you type, 200-char cap enforced, submit → flaggedContent gets `hasWarningLabel: true, warningText` (curl check), item leaves queue, `approvedWithWarning` count bumps.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/kiosk/ src/lib/kiosk-i18n.ts
git commit -m "feat(admin): kiosk warning modal with live label preview"
```

---

### Task 7: Selection + bulk bar + bulk approve + Folgen-Vorschau bulk reject + §05 result toast

**Files:**
- Create: `src/components/admin/kiosk/AdmBulkBar.svelte`, `AdmBulkRejectModal.svelte`
- Modify: `src/components/admin/kiosk/ModerationApp.svelte`

**Interfaces:**
- Consumes: `POST /api/admin/moderation/bulk-review` (existing contract in Global Constraints), design `kiosk-admin.jsx:325-344` (bar) + `kiosk-admin-flows.jsx:220-269` (preview modal, DE-only).
- Produces: `selected = $state<Set<string>>(new Set())` in ModerationApp; pure helper in `adminModeration.ts`:

```typescript
export interface BulkDeltaRow { id: string; title: string; author: string; from: number; to: number; ban: boolean; note: string | null; }
export function computeBulkDeltas(items: FlaggedItem[]): BulkDeltaRow[];
// Sequential per-author summation (mirrors the API's sequential processing):
// iterate selection in order; per item, from = author's running count
// (seeded with authorStrikes), to = min(from + 1, 3); ban = (from + 1 >= 3)
// AND this is the FIRST item that pushes that author to >= 3;
// note = '2. Treffer in dieser Auswahl' (nth Treffer) for repeat authors.
```

- [ ] **Step 1: Selection + `AdmBulkBar`** — card checkbox toggles membership; bar renders when `selected.size > 0 && view === 'queue'`: `{n} ausgewählt` + `✓ alle freigeben` + `✕ alle ablehnen…` + `auswahl aufheben` + right-aligned `admin.bulk.hint`. Selection clears on filter/page change. Cap: the API takes ≤50 — with pageSize ≤ 50 the selection cannot exceed it; assert anyway (`selected.size <= 50`, else slice + info toast).

- [ ] **Step 2: Bulk approve** — direct: all selected → `actioning` pills, POST `{ flaggedContentIds, action: 'approve' }`, then §05 toast (Step 4) + refetch.

- [ ] **Step 3: `AdmBulkRejectModal` (NOVEL §02)** — danger shell; kicker `BULK · {n} AUSGEWÄHLT`, title „Alle ablehnen — *mit Folgen*"; required shared reason „Gemeinsamer Grund" (hint „gilt für alle {n} · wird den Autor:innen angezeigt"); `FOLGEN FÜR DIE STRIKE-KONTEN` table from `computeBulkDeltas`: per row title + author (+ note), `AdmStrikeDots from → AdmStrikeDots to`, danger-tinted rows with `WIRD GESPERRT` badge when `ban`; when ≥1 ban → acknowledgment checkbox `<b>Mir ist klar: {b} Konto/Konten werden dabei gesperrt.</b> Ohne Häkchen bleibt „alle ablehnen“ deaktiviert.` gating the CTA (`✕ {n} ablehnen`, opacity 0.4/not-allowed while gated); footnote `bereits geprüfte Fälle werden übersprungen`. Confirm → POST `{ flaggedContentIds, action: 'reject', rejectionReason }`.

- [ ] **Step 4: §05 result toast** — build from the response: `Bulk abgeschlossen: {approved+rejected} {abgelehnt|freigegeben}` + ` · {n} bereits bearbeitet` + ` · {n} fehlgeschlagen` (only non-zero parts, from `results[]` statuses) + bansTriggered → append per §08 (`{n} Konto/Konten gesperrt`). Failed/already-processed items STAY in the queue (refetch keeps them); toast duration 6s.

- [ ] **Step 5: Verify** — type-check; playwright with 3 temp flagged items (two by the same temp author, one by a 2-strike author): deltas show sequential summation + `2. Treffer` note + `WIRD GESPERRT` row, CTA gated until ack, confirm → per-item results toast, strikes/ban in DB match (verify + reset via scratchpad). Bulk approve path: select 2 → toast + queue refresh.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/kiosk/ src/lib/adminModeration.ts src/lib/kiosk-i18n.ts
git commit -m "feat(admin): bulk bar + Folgen-Vorschau bulk reject with ban acknowledgment"
```

---

### Task 8: Protokoll (history) view — table, column menu, decision filter, sortable headers, §03

**Files:**
- Create: `src/components/admin/kiosk/AdmHistoryTable.svelte`, `AdmDecisionChip.svelte`, `AdmColumnMenu.svelte`
- Modify: `src/components/admin/kiosk/ModerationApp.svelte`

**Interfaces:**
- Consumes: `GET /api/admin/moderation` with `reviewStatus=reviewed|approved|rejected`, `sortBy=createdAt|maxScore|reviewStatus`; design `kiosk-admin-history.jsx` (whole file).
- Produces: history state in ModerationApp: `histFilter = $state<'all'|'approved'|'rejected'>('all')`, `sortBy`, `sortOrder`, `hiddenCols = $state<Set<string>>(new Set(['reason']))`; column ids `['date','source','type','content','author','flagged','decision','reason']`.

- [ ] **Step 1: i18n (DE + EN parity)** — keys: `admin.hist.col.date` Datum/Date · `col.source` Quelle/Source · `col.type` Typ/Type · `col.content` Inhalt/Content · `col.author` Autor:in/Author · `col.flagged` Markiert als/Flagged as · `col.decision` Entscheid/Decision · `col.reason` Grund / Hinweis/Reason / warning · `admin.hist.reviewed` geprüft/rev · `admin.hist.filter.approved` Freigegeben/Approved · `admin.hist.filter.rejected` Abgelehnt/Rejected · `admin.hist.allNote` `„Alle“ = freigegeben + abgelehnt — nie offen`/`“All” = approved + rejected — never pending` · `admin.hist.columns` ▦ Spalten/▦ Columns · `admin.hist.minCol` mind. 1 Spalte bleibt sichtbar/at least 1 column stays visible · `admin.dec.approved` ✓ freigegeben/✓ approved · `admin.dec.warning` ⚠ mit hinweis/⚠ with warning · `admin.dec.rejected` ✕ abgelehnt/✕ rejected · `admin.page.decisions` Entscheide/decisions · `admin.state.histEmpty.title` `Noch keine Entscheide.` (EN = DE) · `admin.state.histEmpty.body` `Sobald du frei gibst oder ablehnst, entsteht hier das Protokoll.` (EN = DE) · `admin.state.histEmpty.cta` `→ zum Prüfstapel` (EN = DE).

- [ ] **Step 2: Components** — `AdmDecisionChip { decision: 'approved'|'warning'|'rejected' }` (derive `warning` when `reviewStatus==='approved' && hasWarningLabel`); `AdmColumnMenu { hidden: Set<string>, onToggle }` (floating paper-warm panel, checkbox rows, refuses to hide the last visible column, footer `admin.hist.minCol`); `AdmHistoryTable { items, hiddenCols, sortBy, sortOrder, onSort }` — 8 columns per the history JSX: date cell (flag date + `geprüft {reviewedAt}` second line), source strap, type chip, content (title/body excerpt, maxWidth 260), author, flagged chips (report-reason chip or first cats — table shows ≤2 + `+{n}`), decision chip **plus the reason/warning/note sub-text under it** (danger/normal for `rejectionReason`, warn for `warningText`, ink-mute serif-italic for `reviewNotes`; priority reason > warning > note), and the hidden-by-default `reason` column (raw `rejectionReason || warningText || reviewNotes`). Sortable headers: Datum (`createdAt`), Score (`maxScore`, lives on the flagged column header), Entscheid (`reviewStatus`) — click toggles asc/desc, active header shows `↓/↑` in plum.

- [ ] **Step 3: Wire in ModerationApp** — view toggle (Task 4's `AdmTitleBlock`) switches to history: fetch with `reviewStatus = histFilter === 'all' ? 'reviewed' : histFilter` (never pending — non-negotiable), no `urgentFirst`; decision filter pills row (Alle/Freigegeben/Abgelehnt + inline `admin.hist.allNote`) + right-aligned column-menu toggle; §03 empty state when total 0; pagination reuses Task 4 footer with `admin.page.decisions`. History has NO checkboxes/bulk bar. Preserve queue state when toggling back.

- [ ] **Step 4: Verify** — type-check; playwright: history shows only reviewed items (a pending temp item must NOT appear under „Alle"), decision sub-text color-coded, hide/show columns works and last column can't be hidden, sort by score flips order, DE↔EN swaps all labels.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/kiosk/ src/lib/kiosk-i18n.ts
git commit -m "feat(admin): kiosk Protokoll table with column menu + decision filter"
```

---

### Task 9: Mobile triage + desktop-only gating

**Files:**
- Create: `src/components/admin/kiosk/AdmTriageCard.svelte`
- Modify: `src/components/admin/kiosk/ModerationApp.svelte`, `src/layouts/AdminLayout.astro`

**Interfaces:**
- Consumes: queue state + `runSingleAction` + modals (Tasks 4–6); design `kiosk-admin.jsx:474-531`.
- Produces: responsive contract — `< md` (768px): triage stack only; `≥ md`: full desktop app.

- [ ] **Step 1: `AdmTriageCard`** — per JSX: compact header (strap + type chip + time), title + 3-line-clamped body (comments italic quoted), chips row (report-reason chip or cat chips) + author + `AdmStrikeDots size={6}`, then the 48px 3-button grid `✓ frei / ⚠ hinweis / ✕ ablehnen` (`admin.mobile.act.ok` frei/ok · `.warn` hinweis/warn · `.reject` ablehnen/reject) with dashed separators; urgent = danger border + paper-warm. Buttons call the SAME handlers (approve direct; warn/reject open the Task 5/6 modals — modals must be usable at 390px: `AdmModalShell` gets `max-width: min(560px, calc(100vw - 24px))` + internal scroll).

- [ ] **Step 2: Responsive wiring** — in `ModerationApp`: mobile block (`md:hidden`) renders `TRIAGE — EIN FALL NACH DEM ANDEREN` label (`admin.mobile.triage`, EN `TRIAGE — ONE CASE AT A TIME`), the triage stack, and footer note `admin.mobile.note` (`Protokoll + Bulk-Aktionen nur am Desktop — mobil wird triagiert, nicht verwaltet.` / `History + bulk actions are desktop-only — mobile triages, doesn't manage.`); desktop block (`hidden md:block`) keeps Tasks 4–8 UI. View toggle, stat row, filter rail, bulk bar, history: desktop-only. Mobile header count `{urgent} dringend · {pending} offen` (keys `admin.mobile.urgent`/`admin.mobile.open` dringend·offen / urgent·open) — rendered inside ModerationApp under the masthead area. In `AdminLayout.astro`: full masthead `hidden md:block`; add the compact mobile masthead (`md:hidden`) per JSX:482-491 (slim ribbon `INTERN · NUR ADMIN` static DE + small monogram + `moderation`).

- [ ] **Step 3: Verify** — type-check; playwright at 390×844: triage stack + 48px action rows, NO checkboxes/bulk/history/column menu anywhere, reject opens the required-reason modal sheet and works; at 1280: unchanged desktop.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/kiosk/ src/layouts/AdminLayout.astro src/lib/kiosk-i18n.ts
git commit -m "feat(admin): mobile triage stack, desktop-only bulk/history gating"
```

---

### Task 10: Delete legacy component, docs, full E2E, test-data cleanup

**Files:**
- Delete: `src/components/admin/ModerationQueue.svelte`
- Modify: `src/components/admin/CLAUDE.md` (rewrite for the kiosk app), root `CLAUDE.md` (admin-queue pointer + Pagination section's ModerationQueue mention)

**Interfaces:** consumes everything above.

- [ ] **Step 1: Temp fixtures (scratchpad scripts, shared prod DB — surgical!)** — if not created during earlier tasks: temp admin `tmp-admin-mod@example.invalid` (bcrypt password, `role: 'admin'`), temp authors `tmp-author-{0,1,2}@example.invalid` (0/1/2 strikes), ~6 temp `flaggedContent` docs marked `title: '[TMP-E2E] …'` covering: urgent AI (critical cat, score 0.91), user report (reason+details+reporter), AI multi-cat on the 2-strike author, comment case, news relevance case, one pre-reviewed rejected doc for history. Record all inserted `_id`s to a manifest JSON in the scratchpad for cleanup.

- [ ] **Step 2: Delete `ModerationQueue.svelte`** — then `grep -rn "ModerationQueue" src/` must return nothing (moderation.astro was rewritten in Task 1).

- [ ] **Step 3: Full E2E matrix (playwright as temp admin, DE + EN where parity applies)** — ① stat counts accurate vs DB; ② urgent card on top w/ pulsing strap; ③ filter rail incl. ⚑ Gemeldet; ④ approve → settle-out; ⑤ reject modal (reason required) → author strike +1; ⑥ Ban-Bremse on 2-strike author (ledger + checkbox) → §08 toast + isBanned; ⑦ warning modal live preview → warning label fields set; ⑧ bulk reject Folgen-Vorschau (summed deltas + ack gate) → §05 toast; ⑨ history: disjoint from queue, column menu, sort, decision sub-text; ⑩ mobile 390px triage; ⑪ non-admin → §09; ⑫ `pnpm build` green + prior kiosk pages unaffected (spot-check /forum).

- [ ] **Step 4: Docs** — rewrite `src/components/admin/CLAUDE.md`: kiosk app architecture (AdminLayout, ModerationApp orchestrator + Adm* components, API contracts incl. `authorStrikes`/`urgentFirst`/`author-strikes`, the two novel guards, i18n rule DE/EN vs DE-only, mobile-triage rule, AdminAnnouncementsPanel still legacy). Root `CLAUDE.md`: update the admin-queue bullet (ModerationQueue.svelte → `admin/kiosk/ModerationApp.svelte`), the Pagination section's Svelte-inline list, and the kiosk page-accent table (add Admin | plum | `--k-plum` row).

- [ ] **Step 5: Cleanup (manifest-driven)** — delete every temp user, every `[TMP-E2E]` flaggedContent doc, any strike/ban side effects on temp users only, temp rateLimits (`login:tmp-*`), and the scratchpad scripts + manifest. Print per-collection deleted counts; broad-scan for `tmp-` / `[TMP-E2E]` residuals.

- [ ] **Step 6: Final type-check + commit**

```bash
git add -A src/components/admin/ CLAUDE.md
git commit -m "feat(admin): complete kiosk moderation migration — remove legacy queue, update docs"
```

---

## Deferred / follow-ups (explicitly NOT in this plan)

- `/admin/announcements` kiosk reskin (still BaseLayout dark-glass) — next admin surface.
- Un-ban UI (§08 toast points to a future Protokoll popover; manual DB flip interim).
- Banned-admin gap (documented in auth kiosk CLAUDE.md) — candidate to close when touching admin APIs next.
- EN copy for modals/states (DE-contract duplicates for now).
- Reporter-outcome notifications, tiered roles, appeal flow, audit-log export (handoff §14).
