# Newsboard Kiosk Redesign — Phase 2 (Detail route · Full submit · SSR-prefetch) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the three deferred Newsboard capabilities on top of the shipped Phase-1 kiosk index: an internal article **detail route** (`/newsboard/[id]`), a **full submit flow** (5/day quota + section picker + image upload + live preview + moderation states), and **SSR-prefetch** of the index for SEO.

**Architecture:** Mirror the marketplace detail pattern — the `.astro` page renders the article's main column as static SSR HTML (for SEO + link previews) and mounts a Svelte island for the **interactive sidebar only** (save, forum CTA, related rail), avoiding duplicate-content. The submit page replaces the Phase-1 `NewsSubmitMinimal` stub with a full island; quota + image upload reuse the existing daily-limit / Cloudinary patterns. SSR-prefetch seeds the index island from server-fetched articles so the feed text is in raw HTML.

**Tech Stack:** Astro 5, Svelte 5 (runes), Tailwind 3.4, kiosk tokens, `kiosk-i18n` store, MongoDB direct driver, Cloudinary upload, Zod. No new npm deps.

## Global Constraints

- **Branch:** `feature/kiosk-redesign` (do NOT switch branches; do NOT create a worktree — the user's dev server runs in this working dir).
- **Dev server:** the user runs their OWN on `http://localhost:3000`. NEVER run `pnpm dev`/`pnpm preview`. `pnpm build`, `pnpm type-check`, `curl`, and `playwright-cli` are allowed.
- **Commit style:** simple, concise. NO "Generated with Claude Code" line, NO "Co-Authored-By: Claude" footer.
- **Never** stage `design/handoffs/` (untracked, leave it) or any secret/.env.
- **type-check baseline = 658** errors (all in `kiosk-i18n.ts`, the known `Dict = typeof de` literal-mismatch class — every translated DE≠EN pair emits one benign `TS2322`). Adding i18n keys RAISES this count by the number of new translated pairs; that is expected and fine. The real gate: **no new errors outside `kiosk-i18n.ts`**, and **`pnpm build` stays green**.
- **No unit-test runner exists.** Verification = `pnpm type-check` (compare error classes, not just count), `pnpm build`, and `playwright-cli` against :3000. Pure helpers get a tiny inline `node` assertion where useful.
- **Kiosk idiom:** Tailwind classes + inline `style="…var(--k-*)"`; reuse existing primitives in `src/components/newsboard/kiosk/primitives/` and `KioskBtn` at `src/components/forum/kiosk/KioskBtn.svelte` (now supports `target`/`rel`). Pure helpers in `src/lib/newsboard/{newsTaxonomy,newsFormat}.ts` must stay dependency-pure (no mongodb/fs/auth imports).
- **Cards link to the internal detail page** as of this phase (Phase 1 linked to the external source). The detail page's `weiterlesen` is what links out.
- **German curly quotes:** use `’` and avoid the `„ … "`-in-a-JS-string pitfall.

---

## Phase-2 parts (each independently shippable; recommended order A → B → C)

| Part | Deliverable | Independent? |
|---|---|---|
| **A — Detail route** | `/newsboard/[id]` (SSR main column + interactive sidebar island), index cards link to it, "im Forum diskutieren" CTA with forum-quota awareness | Yes — ships a working detail page |
| **B — Full submit** | 5/day news quota (backend + indicator), section picker, image upload, live preview, accept/reject rails, rate-limited state, + own-submission status straps in the feed (states 07/08/09) | Yes — replaces the Phase-1 minimal submit |
| **C — SSR-prefetch** | Index feed text rendered in raw HTML for SEO (server-fetch + island seeding) | Yes — pure enhancement; defer if hydration proves fiddly |

Task 0 (i18n) is shared and runs first so every component has its labels (lesson from Phase 1: i18n before the browser-verified tasks).

---

## File Structure

```
src/lib/newsboard/
  newsQuery.ts                                     CREATE  — SERVER-ONLY: fetchNewsDetailForSSR (A1) + fetchNewsForSSR (C1)

src/pages/api/news/
  daily-count.ts                                   CREATE  — GET user's 24h submit count (B1)
  upload.ts                                        CREATE  — POST image → Cloudinary mahalle/newsboard (B1)
  submit.ts                                        MODIFY  — add quota check + sektion field (B2)
src/pages/api/topics/
  daily-count.ts                                   CREATE  — GET user's 24h topic count (for CTA exhausted state) (A3)

src/schemas/news.schema.ts                         MODIFY  — add `sektion` to NewsSubmitSchema (B2)

src/pages/newsboard/
  [id].astro                                       CREATE  — SSR detail main column + mount sidebar island (A4)

src/components/newsboard/kiosk/
  NewsDetailInner.svelte                           CREATE  — interactive sidebar orchestrator + own-moderation banner (A4)
  detail/
    ReadingListControls.svelte                     CREATE  — save (works) + mark-read (disabled, Phase 3) (A2)
    ForumDiscussCTA.svelte                         CREATE  — link to /topics/create prefill; exhausted state (A2)
    RelatedRail.svelte                             CREATE  — client-fetch related-by-sektion (A2)
  submit/
    NewsSubmitInner.svelte                         CREATE  — full submit island (replaces NewsSubmitMinimal) (B3)
    QuotaIndicator.svelte                          CREATE  — 5-slot quota meter (B3)
    SektionPicker.svelte                           CREATE  — 7 section chips, single-select (B3)
  browse/
    NewsCard.svelte                                MODIFY  — headline+weiterlesen → /newsboard/[id]; own-status strap (A5/B4)
    NewsCardLead.svelte                            MODIFY  — headline+weiterlesen → /newsboard/[id] (A5)
  NewsboardIndexInner.svelte                       MODIFY  — toVM carries moderationStatus; pass initialArticles (B4/C1)

src/pages/newsboard.astro                          MODIFY  — SSR-prefetch initialArticles + client:load (C1)
src/pages/newsboard/submit.astro                   MODIFY  — mount NewsSubmitInner instead of NewsSubmitMinimal (B3)
src/components/newsboard/kiosk/submit/NewsSubmitMinimal.svelte   DELETE — superseded by NewsSubmitInner (B3, final step)

src/components/forum/kiosk/compose/ComposePageInner.svelte      MODIFY — read ?prefill_title/?prefill_body from URL (A5)

src/lib/kiosk-i18n.ts                              MODIFY  — Phase-2 news.* keys (de + en) (Task 0)
src/components/newsboard/kiosk/CLAUDE.md           MODIFY  — note Phase-2 lands; update deferred list (final task per part)
```

---

## Task 0: Phase-2 i18n keys (de + en)

**Files:**
- Modify: `src/lib/kiosk-i18n.ts`

Add every `news.*` key used in Phase 2 to BOTH `de` (before `type Dict = typeof de;`) and `en` (before `export const t = derived(...)`). Keys must match exactly between blocks (`Dict = typeof de` enforces it). Phase-1 `news.*` keys already exist; do not duplicate them.

- [ ] **Step 1: Add the German block (inside `const de = { … }`, after the existing Phase-1 news keys)**

```ts
  // ── Newsboard · Phase 2 (detail) ──────────────────────────
  'news.detail.back': '← zurück zum Feed',
  'news.detail.edition': 'Tagesausgabe Nr.',
  'news.detail.published': 'veröffentlicht',
  'news.detail.approved': 'freigegeben am',
  'news.detail.original': 'ORIGINAL · ZUM VOLLSTÄNDIGEN ARTIKEL',
  'news.detail.readAt': 'weiterlesen bei',
  'news.detail.aiNote': '↳ Die Zusammenfassung wurde maschinell erstellt (GPT-4o). Für Detail und Kontext: vollständiger Artikel bei der Quelle.',
  'news.detail.userNote': '↳ Dieser Beitrag wurde von einer Nachbarin eingereicht und durchlief die automatische Moderation. Inhalt liegt in der Verantwortung der Einreicherin.',
  'news.detail.submittedBy': 'Eingereicht von einer Nachbarin',
  'news.detail.moderated': 'moderiert',
  'news.readinglist.heading': 'LESELISTE',
  'news.readinglist.save': 'für später speichern',
  'news.readinglist.saved': 'gespeichert · entfernen',
  'news.readinglist.markread': 'als gelesen markieren',
  'news.readinglist.markreadSoon': 'Bald verfügbar — Lesestatus für angemeldete Nutzer:innen.',
  'news.related.heading': 'Mehr aus',
  'news.related.empty': 'keine weiteren Artikel in dieser Sektion.',
  'news.forumcta.kicker': 'FORUM',
  'news.forumcta.heading': 'Was meinst du dazu?',
  'news.forumcta.body': 'Eröffne ein Thema im Forum — der Artikel-Link wird automatisch eingefügt.',
  'news.forumcta.button': 'im Forum diskutieren →',
  'news.forumcta.exhausted': 'Heute schon 5 Themen erstellt — morgen geht’s weiter.',
  'news.forumcta.exhaustedButton': 'Tageskontingent erreicht',
  // ── Newsboard · Phase 2 (submit) ──────────────────────────
  'news.submit.section': 'Sektion',
  'news.submit.sectionHint': 'wo gehört’s hin?',
  'news.submit.image': 'Bild · Foto (optional)',
  'news.submit.imageHint': 'max. 5 MB · JPG / PNG',
  'news.submit.imageDrop': '+ Foto wählen',
  'news.submit.imageUploading': 'lädt hoch…',
  'news.submit.imageRemove': 'entfernen',
  'news.submit.accept': 'WAS WIR ANNEHMEN',
  'news.submit.accept1': 'Lokale Bauprojekte, Initiativen',
  'news.submit.accept2': 'Termine, die andere wissen sollten',
  'news.submit.accept3': 'Politische Entscheidungen mit Kiez-Bezug',
  'news.submit.reject': 'NICHT ANGENOMMEN',
  'news.submit.reject1': 'Werbung & Eigenwerbung',
  'news.submit.reject2': 'Meinungsbeiträge (→ Forum)',
  'news.submit.reject3': 'Veranstaltungen (→ Kalender)',
  'news.submit.preview': 'VORSCHAU · IM FEED',
  'news.submit.previewAfter': 'wird angezeigt nach Freigabe',
  'news.submit.quotaUsed': 'EINREICHUNGEN HEUTE',
  'news.submit.quotaRemaining': 'verbleibend · Reset um Mitternacht',
  'news.submit.quotaReached': 'Tageskontingent erreicht',
  'news.submit.quotaReachedTitle': '5 / 5 Einreichungen heute genutzt.',
  'news.submit.quotaReachedBody': 'Hilft uns, die Nachbarschaft fokussiert zu halten. Morgen kannst du wieder einreichen.',
  'news.submit.sectionRequired': 'Bitte eine Sektion wählen.',
  // ── Newsboard · Phase 2 (own-submission status straps) ────
  'news.status.pending': 'IN PRÜFUNG',
  'news.status.rejected': 'ABGELEHNT',
  'news.status.pendingNote': 'AI-Moderation läuft. Freigabe i. d. R. < 5 Min.',
  'news.status.rejectedNote': 'Kein Strike gegen dein Konto.',
```

- [ ] **Step 2: Add the matching English block (inside `const en: Dict = { … }`)**

```ts
  // ── Newsboard · Phase 2 (detail) ──────────────────────────
  'news.detail.back': '← back to feed',
  'news.detail.edition': 'Daily edition no.',
  'news.detail.published': 'published',
  'news.detail.approved': 'approved on',
  'news.detail.original': 'ORIGINAL · FULL ARTICLE',
  'news.detail.readAt': 'read full article on',
  'news.detail.aiNote': '↳ This summary was machine-generated (GPT-4o). For detail and context: full article at the source.',
  'news.detail.userNote': '↳ This entry was submitted by a neighbor and passed automatic moderation. Responsibility for content lies with the submitter.',
  'news.detail.submittedBy': 'Submitted by a neighbor',
  'news.detail.moderated': 'moderated',
  'news.readinglist.heading': 'READING LIST',
  'news.readinglist.save': 'save for later',
  'news.readinglist.saved': 'saved · remove',
  'news.readinglist.markread': 'mark as read',
  'news.readinglist.markreadSoon': 'Coming soon — read state for signed-in users.',
  'news.related.heading': 'More from',
  'news.related.empty': 'no further articles in this section.',
  'news.forumcta.kicker': 'FORUM',
  'news.forumcta.heading': 'What do you think?',
  'news.forumcta.body': 'Start a topic in the forum — the article link is added automatically.',
  'news.forumcta.button': 'discuss in forum →',
  'news.forumcta.exhausted': '5 topics created today — back tomorrow.',
  'news.forumcta.exhaustedButton': 'Daily quota reached',
  // ── Newsboard · Phase 2 (submit) ──────────────────────────
  'news.submit.section': 'Section',
  'news.submit.sectionHint': 'where does it belong?',
  'news.submit.image': 'Image · photo (optional)',
  'news.submit.imageHint': 'max 5 MB · JPG / PNG',
  'news.submit.imageDrop': '+ choose photo',
  'news.submit.imageUploading': 'uploading…',
  'news.submit.imageRemove': 'remove',
  'news.submit.accept': 'WHAT WE ACCEPT',
  'news.submit.accept1': 'Local construction, initiatives',
  'news.submit.accept2': 'Events others should know about',
  'news.submit.accept3': 'Political decisions affecting the Kiez',
  'news.submit.reject': 'NOT ACCEPTED',
  'news.submit.reject1': 'Ads & self-promotion',
  'news.submit.reject2': 'Opinion pieces (→ Forum)',
  'news.submit.reject3': 'Events (→ Calendar)',
  'news.submit.preview': 'PREVIEW · IN FEED',
  'news.submit.previewAfter': 'shown after approval',
  'news.submit.quotaUsed': 'SUBMISSIONS TODAY',
  'news.submit.quotaRemaining': 'remaining · resets at midnight',
  'news.submit.quotaReached': 'Daily quota reached',
  'news.submit.quotaReachedTitle': '5 / 5 submissions used today.',
  'news.submit.quotaReachedBody': 'Helps keep the neighborhood focused. You can submit again tomorrow.',
  'news.submit.sectionRequired': 'Please choose a section.',
  // ── Newsboard · Phase 2 (own-submission status straps) ────
  'news.status.pending': 'UNDER REVIEW',
  'news.status.rejected': 'REJECTED',
  'news.status.pendingNote': 'AI moderation in progress. Approval usually < 5 min.',
  'news.status.rejectedNote': 'No strike against your account.',
```

- [ ] **Step 3: Verify**

Run: `pnpm type-check 2>&1 | grep "error TS" | grep -v "kiosk-i18n" | wc -l`
Expected: `0` (no new errors outside kiosk-i18n.ts). The kiosk-i18n count itself rises by the number of new translated pairs — that is the expected benign TS2322 class.

Run: `pnpm build 2>&1 | tail -2`
Expected: `Complete!`

- [ ] **Step 4: Commit**

```bash
git add src/lib/kiosk-i18n.ts
git commit -m "feat(newsboard): phase-2 i18n keys (detail + submit + status)"
```

---

# Part A — Internal detail route

## Task A1: Server fetch helper `fetchNewsDetailForSSR`

**Files:**
- Modify: `src/lib/newsboard/newsTaxonomy.ts` (add the `NewsDetail` interface — pure, so the island can import the type safely)
- Create: `src/lib/newsboard/newsQuery.ts`

**Interfaces:**
- Produces: `fetchNewsDetailForSSR(id: string, userId: string | null): Promise<NewsDetail | null>` and the `NewsDetail` type. `NewsDetail` is a plain, prop-safe object (all ObjectIds → strings, Dates → ISO strings). Consumed by `/newsboard/[id].astro` (A4, the page) and `NewsDetailInner.svelte` (A4, the island — imports the TYPE from `newsTaxonomy.ts`).

`newsQuery.ts` is SERVER-ONLY (imports `mongodb`) — it must NEVER be imported (even for a type) by a `.svelte` file. That's why the `NewsDetail` type lives in the pure `newsTaxonomy.ts`. Mirrors `fetchListingDetailForSSR` in `src/lib/listingsQuery.ts:314`.

- [ ] **Step 1: Add the `NewsDetail` interface to the PURE module**

Append to `src/lib/newsboard/newsTaxonomy.ts` (it stays dependency-pure — this is just a type):

```ts
// Prop-safe article-detail shape (serialized for crossing the island boundary).
// Lives here (pure module) so the detail island can import the type without
// touching the mongodb-importing newsQuery.ts.
export interface NewsDetail {
  id: string;
  source: 'ai_fetched' | 'user_submitted';
  title: string;
  description: string;
  aiSummary?: string;
  imageUrl: string;
  sourceUrl: string;
  sourceName: string;
  aiCategory?: string;
  moderationStatus: 'approved' | 'pending' | 'rejected';
  warningText?: string;
  submittedByName?: string;
  publishedAt: string; // ISO
  fetchDate?: string;
  approvedAt?: string;  // ISO
}
```

- [ ] **Step 2: Write the helper**

```ts
// src/lib/newsboard/newsQuery.ts
// SERVER-ONLY (imports mongodb). Never import from a .svelte/client file.
import { ObjectId } from 'mongodb';
import { connectDB } from '../mongodb';
import type { NewsItem } from '../../types';
// NewsDetail is defined in the PURE module so the detail island can import the
// type without ever referencing this mongodb-importing file. Re-exported for
// the page's convenience.
import type { NewsDetail } from './newsTaxonomy';
export type { NewsDetail };

function toDetail(it: any): NewsDetail {
  // submittedBy may be populated (object) or a raw id string.
  const sub = it.submittedBy;
  const submittedByName =
    sub && typeof sub === 'object' ? (sub.name ?? sub.username ?? undefined) : undefined;
  return {
    id: String(it._id),
    source: it.source,
    title: it.title,
    description: it.description ?? '',
    aiSummary: it.aiSummary,
    imageUrl: it.imageUrl ?? '',
    sourceUrl: it.sourceUrl,
    sourceName: it.sourceName ?? '',
    aiCategory: it.aiCategory,
    moderationStatus: it.moderationStatus,
    warningText: it.warningText,
    submittedByName,
    publishedAt: (it.publishedAt instanceof Date ? it.publishedAt.toISOString() : it.publishedAt) ?? new Date().toISOString(),
    fetchDate: it.fetchDate,
    approvedAt: it.approvedAt instanceof Date ? it.approvedAt.toISOString() : it.approvedAt,
  };
}

// Returns the article if visible to this user (approved, OR the user's own
// pending/rejected submission). Returns null for not-found / not-visible.
export async function fetchNewsDetailForSSR(id: string, userId: string | null): Promise<NewsDetail | null> {
  if (!ObjectId.isValid(id)) return null;
  const db = await connectDB();
  const news = db.collection<NewsItem>('news');
  const item = await news.findOne({ _id: new ObjectId(id) } as any);
  if (!item) return null;

  const isApproved = item.moderationStatus === 'approved';
  const isOwn = !!userId && String((item as any).submittedBy) === String(userId);
  if (!isApproved && !isOwn) return null;

  // Populate submitter name for user-submitted articles.
  if (item.source === 'user_submitted' && item.submittedBy && typeof item.submittedBy === 'string') {
    try {
      const users = db.collection('users');
      const u = await users.findOne({ _id: new ObjectId(item.submittedBy) }, { projection: { password: 0 } });
      if (u) (item as any).submittedBy = u;
    } catch { /* fall through with raw id */ }
  }
  return toDetail(item);
}
```

- [ ] **Step 3: Verify type-check (helper + type clean)**

Run: `pnpm type-check 2>&1 | grep -iE "newsQuery|newsTaxonomy" || echo "clean"`
Expected: `clean`

- [ ] **Step 4: Commit**

```bash
git add src/lib/newsboard/newsTaxonomy.ts src/lib/newsboard/newsQuery.ts
git commit -m "feat(newsboard): server fetch helper + NewsDetail type for article detail"
```

---

## Task A2: Detail sidebar sub-components

**Files:**
- Create: `src/components/newsboard/kiosk/detail/ReadingListControls.svelte`
- Create: `src/components/newsboard/kiosk/detail/ForumDiscussCTA.svelte`
- Create: `src/components/newsboard/kiosk/detail/RelatedRail.svelte`

**Interfaces:**
- Consumes: `news.*` i18n keys (Task 0), `SourceChip` primitive, `SaveToggle` primitive, `KioskBtn`, `resolveSektion`/`SEKTION_KEYS` from newsTaxonomy.
- Produces: three dumb components consumed by `NewsDetailInner` (A4).

These are island-side (interactive). `ArticleBody` + `SourceFooter` are NOT components — they render as static SSR HTML in `[id].astro` (A4) for SEO.

- [ ] **Step 1: `ReadingListControls.svelte` (save works; mark-read disabled until Phase 3)**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import SaveToggle from '../primitives/SaveToggle.svelte';

  let {
    saved = false,
    canSave = false,
    onSave = () => {},
  }: { saved?: boolean; canSave?: boolean; onSave?: () => void } = $props();
</script>

<div class="flex flex-col" style="gap:8px; padding:14px; background:var(--k-paper-soft);
     border:1px solid var(--k-rule); border-radius:var(--k-radius-md);">
  <div class="font-dmmono uppercase" style="font-size:10px; color:var(--k-ink-mute); letter-spacing:0.12em;">
    {$t['news.readinglist.heading']}
  </div>
  {#if canSave}
    <button type="button" onclick={onSave}
      class="flex items-center font-bricolage" style="gap:8px; padding:8px 10px; font-size:13px; font-weight:600;
        background:{saved ? 'var(--k-ink)' : 'transparent'}; color:{saved ? 'var(--k-paper)' : 'var(--k-ink)'};
        border:var(--k-border-ink); border-radius:var(--k-radius-sm); text-align:left; cursor:pointer;">
      <span>{saved ? '■' : '□'}</span>
      {saved ? $t['news.readinglist.saved'] : $t['news.readinglist.save']}
    </button>
  {/if}
  <!-- Mark-as-read: Phase 3 (needs read-state). Rendered disabled. -->
  <button type="button" disabled title={$t['news.readinglist.markreadSoon']}
    class="flex items-center font-bricolage opacity-50 cursor-not-allowed" style="gap:8px; padding:8px 10px;
      font-size:13px; background:transparent; color:var(--k-ink-soft);
      border:1px dashed var(--k-rule); border-radius:var(--k-radius-sm); text-align:left;">
    <span>○</span>{$t['news.readinglist.markread']}
  </button>
</div>
```

- [ ] **Step 2: `ForumDiscussCTA.svelte` (prefill link; exhausted state)**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import KioskBtn from '../../../forum/kiosk/KioskBtn.svelte';

  let {
    title = '',
    sourceUrl = '',
    exhausted = false,
  }: { title?: string; sourceUrl?: string; exhausted?: boolean } = $props();

  // Forum compose reads ?prefill_title / ?prefill_body (see ComposePageInner, A5).
  const href = $derived(
    `/topics/create?prefill_title=${encodeURIComponent(title)}&prefill_body=${encodeURIComponent(sourceUrl)}`
  );
</script>

<div style="padding:14px; background:{exhausted ? 'var(--k-paper-soft)' : 'var(--k-paper-warm)'};
     border:1.5px solid {exhausted ? 'var(--k-rule)' : 'var(--k-ink)'}; border-radius:var(--k-radius-md);
     box-shadow:{exhausted ? 'none' : '2px 2px 0 var(--k-wine)'}; opacity:{exhausted ? 0.8 : 1};">
  <div class="font-dmmono" style="font-size:10px; color:var(--k-wine); letter-spacing:0.12em; margin-bottom:6px;">
    {$t['news.forumcta.kicker']}
  </div>
  <div class="font-bricolage" style="font-size:15px; font-weight:700; line-height:1.25; margin-bottom:4px;">
    {$t['news.forumcta.heading']}
  </div>
  <div class="font-instrument italic" style="font-size:12.5px; color:var(--k-ink-soft); line-height:1.45; margin-bottom:10px;">
    {exhausted ? $t['news.forumcta.exhausted'] : $t['news.forumcta.body']}
  </div>
  {#if exhausted}
    <KioskBtn size="sm" variant="secondary" disabled>{$t['news.forumcta.exhaustedButton']}</KioskBtn>
  {:else}
    <KioskBtn size="sm" href={href}>{$t['news.forumcta.button']}</KioskBtn>
  {/if}
</div>
```

- [ ] **Step 3: `RelatedRail.svelte` (client-fetch related by sektion)**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { t, locale } from '../../../../lib/kiosk-i18n';
  import { resolveSektion, resolveQuelle, type SektionKey, type QuelleKey } from '../../../../lib/newsboard/newsTaxonomy';
  import SourceChip from '../primitives/SourceChip.svelte';
  import { formatRelativeTime } from '../../../../lib/newsboard/newsFormat';

  let {
    sektion,
    currentId,
  }: { sektion: SektionKey; currentId: string } = $props();

  type Rel = { id: string; title: string; quelle: QuelleKey; publishedAt: string };
  let related = $state<Rel[]>([]);

  onMount(async () => {
    try {
      const res = await fetch('/api/news?limit=30&sortBy=approvedAt&sortOrder=desc');
      if (!res.ok) return;
      const data = await res.json();
      related = (data.news ?? [])
        .filter((it: any) => String(it._id) !== currentId && resolveSektion(it.aiCategory) === sektion)
        .slice(0, 3)
        .map((it: any) => ({
          id: String(it._id),
          title: it.title,
          quelle: resolveQuelle(it.sourceName, it.source),
          publishedAt: it.publishedAt ?? it.fetchedAt ?? new Date().toISOString(),
        }));
    } catch { /* leave empty */ }
  });

  const heading = $derived(
    `${$t['news.related.heading']} · ${$t[`news.sektion.${sektion}` as keyof typeof $t]}`
  );
</script>

<div style="padding:14px; border:1px dashed var(--k-rule); border-radius:var(--k-radius-md);">
  <div class="font-dmmono uppercase" style="font-size:10px; color:var(--k-ink-mute); letter-spacing:0.14em; margin-bottom:10px;">
    {heading}
  </div>
  {#if related.length === 0}
    <div class="font-instrument italic" style="font-size:13px; color:var(--k-ink-mute);">{$t['news.related.empty']}</div>
  {:else}
    <div class="flex flex-col" style="gap:12px;">
      {#each related as r (r.id)}
        <a href={`/newsboard/${r.id}`} class="block no-underline" style="padding-bottom:10px; border-bottom:1px dashed var(--k-rule);">
          <div class="flex items-center" style="gap:5px; margin-bottom:4px;">
            <SourceChip id={r.quelle} mini />
            <span class="font-dmmono" style="font-size:9px; color:var(--k-ink-mute);">{formatRelativeTime(r.publishedAt, $locale)}</span>
          </div>
          <div class="font-bricolage" style="font-size:13.5px; font-weight:700; line-height:1.2; color:var(--k-ink);">{r.title}</div>
        </a>
      {/each}
    </div>
  {/if}
</div>
```

- [ ] **Step 4: Verify**

Run: `pnpm build 2>&1 | tail -2` → `Complete!`
Run: `pnpm type-check 2>&1 | grep -i "detail/" || echo "clean"` → `clean`

- [ ] **Step 5: Commit**

```bash
git add src/components/newsboard/kiosk/detail/
git commit -m "feat(newsboard): detail sidebar components (reading list, forum CTA, related)"
```

---

## Task A3: Forum topic daily-count endpoint

**Files:**
- Create: `src/pages/api/topics/daily-count.ts`

**Interfaces:**
- Produces: `GET /api/topics/daily-count` → `{ count, limit, remaining, canCreate }`. Consumed by `NewsDetailInner` (A4) to set the CTA `exhausted` state. Mirrors `/api/listings/daily-count.ts`.

- [ ] **Step 1: Write the endpoint**

```ts
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';

// User's topic-create count in the rolling 24h window (forum quota = 5/day).
// Used to proactively show the "exhausted" state on the newsboard "discuss in
// forum" CTA. Counts the `topics` collection by `author` (NOT news submissions).
export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const db = await connectDB();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await db.collection('topics').countDocuments({
      author: session.user.id,
      createdAt: { $gte: dayAgo },
    });
    return new Response(JSON.stringify({ count, limit: 5, remaining: Math.max(0, 5 - count), canCreate: count < 5 }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
```

NOTE: confirm the topics author field name. `src/pages/api/topics/create.ts` counts with `{ author: userId, createdAt: {...} }` — use the SAME field (`author`). If create.ts uses a different field, match it. Verify before committing: `grep -n "countDocuments" src/pages/api/topics/create.ts`.

- [ ] **Step 2: Verify**

Run: `grep -n "author\|countDocuments" src/pages/api/topics/create.ts | head` — confirm the count filter field matches.
Run: `pnpm build 2>&1 | tail -2` → `Complete!`
Run (server up): `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/topics/daily-count` → `401` (no session) confirms the route resolves.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/topics/daily-count.ts
git commit -m "feat(forum): topic daily-count endpoint (for newsboard CTA quota)"
```

---

## Task A4: Detail page `[id].astro` + sidebar island

**Files:**
- Create: `src/components/newsboard/kiosk/NewsDetailInner.svelte`
- Create: `src/pages/newsboard/[id].astro`

**Interfaces:**
- Consumes: `fetchNewsDetailForSSR` (A1, in the page), the three detail sub-components (A2), `/api/news/save` + `/api/topics/daily-count` (A3) in the island, `SektionTag`/`KuratiertChip`/`SourceChip`/`ArticleImage` primitives, `resolveSektion`/`resolveQuelle` + `formatRelativeTime`/`formatFetchDate`.
- The island gets `article: NewsDetail`, `currentUserId: string | null`.

The `.astro` renders the article's MAIN COLUMN as static SSR HTML (SEO). The island renders the SIDEBAR only — no duplicate H1/body.

- [ ] **Step 1: Write the sidebar island `NewsDetailInner.svelte`**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../../lib/kiosk-i18n';
  import { showToast } from '../../../utils/toast';
  import { resolveSektion, type SektionKey, type NewsDetail } from '../../../lib/newsboard/newsTaxonomy';
  import ReadingListControls from './detail/ReadingListControls.svelte';
  import ForumDiscussCTA from './detail/ForumDiscussCTA.svelte';
  import RelatedRail from './detail/RelatedRail.svelte';

  let {
    article,
    currentUserId = null,
  }: { article: NewsDetail; currentUserId?: string | null } = $props();

  const isAuth = $derived(!!currentUserId);
  const sektion = $derived<SektionKey>(resolveSektion(article.aiCategory));

  let saved = $state(false);
  let forumExhausted = $state(false);

  onMount(async () => {
    if (!isAuth) return;
    try {
      const sres = await fetch('/api/news/save');
      if (sres.ok) {
        const sj = await sres.json();
        saved = (sj.savedIds ?? []).map((x: any) => String(x)).includes(article.id);
      }
    } catch { /* non-fatal */ }
    try {
      const qres = await fetch('/api/topics/daily-count');
      if (qres.ok) forumExhausted = !(await qres.json()).canCreate;
    } catch { /* leave false */ }
  });

  async function toggleSave() {
    if (!isAuth) { showToast($t['news.save.login'], { type: 'info' }); return; }
    const wasSaved = saved;
    saved = !wasSaved;
    try {
      const res = await fetch('/api/news/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newsId: article.id, action: wasSaved ? 'unsave' : 'save' }),
      });
      if (!res.ok) throw new Error();
    } catch {
      saved = wasSaved;
      showToast($t['news.save.error'], { type: 'error' });
    }
  }
</script>

<aside class="flex flex-col" style="gap:14px;">
  <ReadingListControls {saved} canSave={isAuth} onSave={toggleSave} />
  <ForumDiscussCTA title={article.title} sourceUrl={article.sourceUrl} exhausted={forumExhausted} />
  <RelatedRail {sektion} currentId={article.id} />
</aside>
```

- [ ] **Step 2: Write the page `[id].astro` (SSR main column + island)**

```astro
---
import KioskLayout from '../../layouts/KioskLayout.astro';
import { getSession } from 'auth-astro/server';
import { fetchNewsDetailForSSR } from '../../lib/newsboard/newsQuery';
import { resolveSektion, resolveQuelle, SEKTION_TOKEN, QUELLE_META } from '../../lib/newsboard/newsTaxonomy';
import NewsDetailInner from '../../components/newsboard/kiosk/NewsDetailInner.svelte';

Astro.response.headers.set('Cache-Control', 'no-store, must-revalidate');

const { id } = Astro.params;
const session = await getSession(Astro.request);
const userId = (session?.user as any)?.id ?? null;

const article = id ? await fetchNewsDetailForSSR(id, userId) : null;
if (!article) return Astro.redirect('/newsboard');

const sektion = resolveSektion(article.aiCategory);
const quelle = resolveQuelle(article.sourceName, article.source);
const sektionLabelDe: Record<string, string> = {
  politik: 'Politik', kultur: 'Kultur', lokales: 'Lokales', wirtschaft: 'Wirtschaft',
  verkehr: 'Verkehr', klima: 'Klima', sport: 'Sport',
};
const isUser = article.source === 'user_submitted';
// Body paragraphs: prefer aiSummary, fall back to description. Split on blank lines.
const bodyText = (article.aiSummary || article.description || '').trim();
const paragraphs = bodyText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const dek = article.description && article.aiSummary ? article.description : '';

// Per-article token styles MUST be precomputed here (backtick interpolation).
// Astro does NOT interpolate `${}` inside a plain `style="…"` attribute — it
// only evaluates `{expression}`. So build the strings here and pass them via
// `style={…}`. (Static styles below that use only `var(--k-*)` literals stay
// as plain `style="…"`.)
const sektionChipStyle = `font-size:10px; font-weight:600; letter-spacing:0.12em; padding:2px 8px; background:var(${SEKTION_TOKEN[sektion]}); color:var(${SEKTION_TOKEN[sektion]}-text); border:1px solid var(--k-ink); border-radius:var(--k-radius-sm);`;
const quelleMarkStyle = `background:var(${QUELLE_META[quelle].token}); color:var(--k-paper); font-weight:700; font-size:9px; padding:2px 5px; border-radius:3px;`;
---

<KioskLayout title={`${article.title} — Mahalle`} description={article.description?.slice(0, 160)} page="newsboard">
  <!-- Breadcrumb -->
  <div class="px-4 md:px-9" style="padding-top:14px; padding-bottom:14px; border-bottom:1px dashed var(--k-rule); font-family:var(--k-font-mono); font-size:11px;">
    <a href="/newsboard" style="color:var(--k-ink-soft); text-decoration:underline dashed; text-underline-offset:3px;">← zurück zum Feed</a>
  </div>

  <div class="px-4 md:px-9" style="display:grid; grid-template-columns:1fr; gap:36px; padding-top:30px; padding-bottom:50px;">
    <div style="display:grid; grid-template-columns:1fr; gap:36px;" class="lg:[grid-template-columns:1fr_320px]">
      <!-- MAIN COLUMN — static SSR HTML for SEO -->
      <article>
        {isUser && (
          <div class="inline-flex items-center" style="gap:8px; padding:6px 12px; background:var(--k-moss); color:var(--k-paper); border:var(--k-border-ink); border-radius:var(--k-radius-sm); font-family:var(--k-font-mono); font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:16px; box-shadow:2px 2px 0 var(--k-ink);">
            <span>↗</span> Eingereicht von einer Nachbarin
          </div>
        )}
        <div class="flex items-center" style="gap:10px; flex-wrap:wrap; margin-bottom:16px;">
          <span class="font-dmmono uppercase" style={sektionChipStyle}>{sektionLabelDe[sektion]}</span>
          <span class="font-dmmono" style="font-size:10px; color:var(--k-ink-mute); letter-spacing:0.1em;">· {isUser ? 'freigegeben' : 'veröffentlicht'} {article.fetchDate ?? ''}</span>
        </div>

        <h1 class="font-bricolage" style="font-weight:800; font-size:clamp(30px,5vw,52px); line-height:1.02; letter-spacing:-0.035em; margin:0 0 16px; color:var(--k-ink); max-width:22ch;">{article.title}</h1>

        {dek && <p class="font-instrument italic" style="font-size:clamp(17px,2.4vw,22px); line-height:1.35; color:var(--k-ink-soft); margin:0 0 22px; max-width:55ch;">{dek}</p>}

        <div class="flex items-center" style="gap:10px; flex-wrap:wrap; margin-bottom:22px; padding-bottom:14px; border-bottom:1px dashed var(--k-rule); font-family:var(--k-font-mono); font-size:11px; color:var(--k-ink-mute);">
          <span style="display:inline-flex; align-items:center; gap:5px; border:1px solid var(--k-ink); background:var(--k-paper-warm); border-radius:var(--k-radius-sm); padding:2px 8px 2px 2px;">
            <span style={quelleMarkStyle}>{QUELLE_META[quelle].short.toUpperCase()}</span>
            <span style="text-transform:lowercase;">{QUELLE_META[quelle].name}</span>
          </span>
        </div>

        {article.imageUrl && (
          <img src={article.imageUrl} alt={article.title} loading="eager" class="w-full object-cover" style="aspect-ratio:16/9; border:var(--k-border-ink); border-radius:var(--k-radius-md); margin-bottom:24px;" />
        )}

        <div class="news-detail-body font-bricolage" style="font-size:15.5px; line-height:1.6; color:var(--k-ink); max-width:70ch; display:flex; flex-direction:column; gap:16px;">
          {paragraphs.map((p) => <p style="margin:0;">{p}</p>)}
        </div>

        <!-- Source footer (static link out) -->
        <div class="flex items-center justify-between" style="gap:14px; flex-wrap:wrap; margin-top:28px; padding:18px 0; border-top:1px solid var(--k-ink); border-bottom:1px solid var(--k-ink);">
          <div class="font-dmmono" style="font-size:9.5px; color:var(--k-ink-mute); letter-spacing:0.14em;">ORIGINAL · ZUM VOLLSTÄNDIGEN ARTIKEL</div>
          <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" class="font-bricolage" style="font-weight:600; font-size:13px; padding:6px 14px; background:var(--k-ink); color:var(--k-paper); border:2px solid var(--k-ink); border-radius:var(--k-radius-pill); text-decoration:none; box-shadow:2px 2px 0 var(--k-wine);">weiterlesen bei {article.sourceName} →</a>
        </div>

        <div class="font-dmmono" style="margin-top:16px; padding:12px 14px; background:var(--k-paper-soft); border:1px dashed var(--k-rule); border-radius:var(--k-radius-sm); font-size:10px; color:var(--k-ink-mute); line-height:1.6;">
          {isUser ? '↳ Dieser Beitrag wurde von einer Nachbarin eingereicht und durchlief die automatische Moderation. Inhalt liegt in der Verantwortung der Einreicherin.' : '↳ Die Zusammenfassung wurde maschinell erstellt (GPT-4o). Für Detail und Kontext: vollständiger Artikel bei der Quelle.'}
        </div>
      </article>

      <!-- SIDEBAR — interactive island -->
      <NewsDetailInner client:load article={article} currentUserId={userId} />
    </div>
  </div>
</KioskLayout>
```

NOTE on layout: the `lg:[grid-template-columns:1fr_320px]` arbitrary class needs Tailwind to recognize it; if it doesn't apply, fall back to a wrapper `<div class="news-detail-grid">` + a tiny `<style>` block with a `@media (min-width:1024px)` rule (the kiosk codebase uses scoped `<style>` in several places). During implementation, confirm the two-column layout renders at ≥1024px in the browser; switch to the `<style>` approach if the arbitrary variant is stripped.

NOTE on routing: `src/pages/newsboard/submit.astro` (static) and `src/pages/newsboard/[id].astro` (dynamic) coexist — Astro prioritizes the static route, so `/newsboard/submit` resolves to the submit page, not the detail page. No collision.

NOTE on i18n in the SSR shell: the main column uses hardcoded German copy (the `.astro` runs server-side where the `locale` store default is `de`; wiring the reactive store into static Astro is out of scope). The breadcrumb/footer copy is DE. The interactive island (sidebar) uses `$t` and is fully bilingual. This matches the marketplace detail page (SSR shell is DE-default, island is reactive).

- [ ] **Step 3: Build + browser-verify on :3000**

Run: `pnpm build 2>&1 | tail -2` → `Complete!`

Get a real article id, then load the detail page:
```bash
ID=$(curl -s "http://localhost:3000/api/news?limit=1" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).news[0]._id))")
echo "id=$ID"
playwright-cli open "http://localhost:3000/newsboard/$ID"
playwright-cli wait-for --text "weiterlesen bei" || true
playwright-cli screenshot
playwright-cli console
playwright-cli close
```
Verify: headline + body paragraphs render in the main column; the sidebar (reading list / forum CTA / related) hydrates; **0 console errors**; the "weiterlesen bei …" button links to the external source (`target=_blank`); breadcrumb returns to `/newsboard`. Also confirm via `curl -s "http://localhost:3000/newsboard/$ID" | grep -c "<h1"` that the H1 + body text are in **raw HTML** (SEO) — expect ≥1.

- [ ] **Step 4: Commit**

```bash
git add src/components/newsboard/kiosk/NewsDetailInner.svelte src/pages/newsboard/[id].astro
git commit -m "feat(newsboard): article detail route (SSR main column + interactive sidebar)"
```

---

## Task A5: Index cards link to detail + forum compose prefill

**Files:**
- Modify: `src/components/newsboard/kiosk/browse/NewsCard.svelte`
- Modify: `src/components/newsboard/kiosk/browse/NewsCardLead.svelte`
- Modify: `src/components/forum/kiosk/compose/ComposePageInner.svelte`

- [ ] **Step 1: `NewsCard.svelte` — point headline + weiterlesen at the detail route**

Change the headline anchor (currently links to `article.sourceUrl` in a new tab) to the internal detail page:

```svelte
    <a href={`/newsboard/${article.id}`} class="block no-underline">
      <h3
        class="font-bricolage"
        style="font-weight:700; font-size:22px; line-height:1.15; letter-spacing:-0.02em;
               margin:0 0 6px; color:var(--k-ink);"
      >{title}</h3>
    </a>
```

And change the "weiterlesen" link similarly (same-tab internal nav, drop `target`/`rel`):

```svelte
      <a
        href={`/newsboard/${article.id}`}
        class="font-dmmono"
        style="font-size:10px; color:var(--k-ink-soft); text-decoration:underline dashed; text-underline-offset:3px;"
      >{$t['news.readmore']}</a>
```

- [ ] **Step 2: `NewsCardLead.svelte` — same retargeting**

Headline anchor → `/newsboard/${article.id}`:

```svelte
    <a href={`/newsboard/${article.id}`} class="block no-underline">
      <h2
        class="font-bricolage"
        style="font-weight:800; font-size:42px; line-height:1.02; letter-spacing:-0.035em;
               margin:0 0 12px; color:var(--k-ink);"
      >{title}</h2>
    </a>
```

And the lead CTA button → internal detail (drop the external `target`/`rel` added in Phase 1):

```svelte
      <KioskBtn size="sm" href={`/newsboard/${article.id}`}>{$t['news.readmore']}</KioskBtn>
```

- [ ] **Step 3: `ComposePageInner.svelte` — read `?prefill_title` / `?prefill_body` from the URL**

In the existing `onMount` (around line 57), AFTER the draft-restore block, add a URL-prefill override (URL params win over a saved draft for those fields):

```ts
  onMount(() => {
    let saved: DraftValues | null = null;
    topicDraft.subscribe((v) => (saved = v))();
    if (saved) {
      const s = saved as DraftValues;
      initialValues = {
        title: s.title,
        body: s.body,
        kind: s.kind,
        tags: s.tags,
        pendingFiles: [],
        existingImages: []
      };
    }
    // News → forum prefill: ?prefill_title / ?prefill_body (set by the
    // newsboard "im Forum diskutieren" CTA). Takes precedence over draft.
    try {
      const sp = new URLSearchParams(window.location.search);
      const pt = sp.get('prefill_title');
      const pb = sp.get('prefill_body');
      if (pt || pb) {
        initialValues = {
          title: pt ?? initialValues?.title ?? '',
          body: pb ?? initialValues?.body ?? '',
          kind: initialValues?.kind ?? 'discussion',
          tags: initialValues?.tags ?? [],
          pendingFiles: [],
          existingImages: []
        };
      }
    } catch { /* no window / bad params — ignore */ }
  });
```

- [ ] **Step 4: Build + verify the round trip**

Run: `pnpm build 2>&1 | tail -2` → `Complete!`

Browser (server up, with a logged-in session cookie for `/topics/create`):
```bash
playwright-cli open "http://localhost:3000/newsboard"
playwright-cli wait-for --text "Schillerkiez Kurier" || true
# click a headline → should land on /newsboard/<id>
playwright-cli console
playwright-cli close
```
Confirm clicking a card headline navigates to `/newsboard/<id>` (not the external source). If you have a session, also open `/topics/create?prefill_title=Hallo&prefill_body=https://example.com` and confirm the compose title/body are pre-filled.

- [ ] **Step 5: Commit**

```bash
git add src/components/newsboard/kiosk/browse/NewsCard.svelte src/components/newsboard/kiosk/browse/NewsCardLead.svelte src/components/forum/kiosk/compose/ComposePageInner.svelte
git commit -m "feat(newsboard): cards link to detail route + forum compose prefill"
```

---

# Part B — Full submit flow

## Task B1: Image upload + news daily-count endpoints

**Files:**
- Create: `src/pages/api/news/upload.ts`
- Create: `src/pages/api/news/daily-count.ts`

**Interfaces:**
- Produces: `POST /api/news/upload` (multipart, field `file`) → `{ url, publicId, width, height }`; `GET /api/news/daily-count` → `{ count, limit, remaining, canSubmit }`. Both consumed by `NewsSubmitInner` (B3).

- [ ] **Step 1: Confirm the donor upload shape**

Run: `sed -n '1,90p' src/pages/api/posts/upload.ts`
Confirm: FormData field name (`file`), Cloudinary config import, response JSON keys. Mirror them exactly below (adjust if the donor differs).

- [ ] **Step 2: `upload.ts` — copy the proven donor, change only folder + public_id prefix**

The cleanest, lowest-risk approach (audited): copy `src/pages/api/posts/upload.ts` verbatim into `src/pages/api/news/upload.ts`, then change exactly two things — the Cloudinary `folder` and the `public_id` prefix. The donor uses `import.meta.env.CLOUD_NAME` (NOT `CLOUDINARY_CLOUD_NAME` — verified: `src/env.d.ts:10` declares `CLOUD_NAME`, and all three upload endpoints use it), the `cloudinary.uploader.upload(dataUri, …)` form, FormData field `file`, a 5 MB limit, and returns `{ url, publicId, width, height }`. Do NOT hand-write a divergent version.

```bash
cp src/pages/api/posts/upload.ts src/pages/api/news/upload.ts
```

Then in `src/pages/api/news/upload.ts` change:
- `folder: 'mahalle/posts'` → `folder: 'mahalle/newsboard'`
- the `public_id` value prefix `post_` → `news_` (e.g. `` `news_${userId}_${Date.now()}` ``)

Leave everything else (config with `CLOUD_NAME`, the `image/*` + size guards, the dataUri build, the `{ url, publicId, width, height }` response) exactly as the donor has it. `NewsSubmitInner` (B3) reads `.url` from the response — which matches.

NOTE: if `src/pages/api/posts/upload.ts` enforces a different size limit than 5 MB, keep the donor's limit (consistency over the plan's stated 5 MB). Confirm the response includes `url` before wiring B3: `grep -nE "url:|publicId:" src/pages/api/news/upload.ts`.

- [ ] **Step 3: `daily-count.ts` (news submit quota)**

```ts
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';

// User's news-submission count in the rolling 24h window (quota = 5/day).
// Counts only user submissions (source: 'user_submitted'), not AI-fetched.
export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const db = await connectDB();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await db.collection('news').countDocuments({
      submittedBy: session.user.id,
      source: 'user_submitted',
      createdAt: { $gte: dayAgo },
    });
    return new Response(JSON.stringify({ count, limit: 5, remaining: Math.max(0, 5 - count), canSubmit: count < 5 }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
```

NOTE: `submittedBy` is stored as the raw user-id string in `submit.ts` (`submittedBy: userId`). The count filter matches that string. Confirm with `grep -n "submittedBy" src/pages/api/news/submit.ts`.

- [ ] **Step 4: Verify**

Run: `pnpm build 2>&1 | tail -2` → `Complete!`
Run (server up): `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/news/daily-count` → `401`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/news/upload.ts src/pages/api/news/daily-count.ts
git commit -m "feat(newsboard): news image-upload + submit daily-count endpoints"
```

---

## Task B2: Submit endpoint — quota check + section field

**Files:**
- Modify: `src/schemas/news.schema.ts`
- Modify: `src/pages/api/news/submit.ts`

- [ ] **Step 1: Add `sektion` to `NewsSubmitSchema`**

In `src/schemas/news.schema.ts`, extend the schema:

```ts
export const NewsSubmitSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  sourceUrl: z.string().url('Please provide a valid URL'),
  sourceName: z.string().min(1, 'Source name is required').max(100),
  imageUrl: z.string().url().optional().or(z.literal('')),
  submitterComment: z.string().max(500).optional(),
  sektion: z.enum(['politik', 'kultur', 'lokales', 'wirtschaft', 'verkehr', 'klima', 'sport']),
});
```

- [ ] **Step 2: Enforce the 5/day quota + store the section in `submit.ts`**

Add the quota check right after `const userId = session.user.id;` (before the duplicate-URL check, to fail fast):

```ts
    const userId = session.user.id;

    // Daily submit limit (5 per rolling 24h) — mirrors topics/events/listings.
    const dbEarly = await connectDB();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayCount = await dbEarly.collection('news').countDocuments({
      submittedBy: userId,
      source: 'user_submitted',
      createdAt: { $gte: dayAgo },
    });
    if (todayCount >= 5) {
      return new Response(JSON.stringify({
        error: 'Daily submission limit reached',
        message: 'You can submit up to 5 news items per day. Please try again tomorrow.',
        dailyLimit: 5,
        currentCount: todayCount,
      }), { status: 429, headers: { 'Content-Type': 'application/json' } });
    }
```

Pull `sektion` out of the validated data and store it as `aiCategory` on the doc (the index resolver round-trips all 7 section keys through `resolveSektion`, so no type/resolver change is needed; a dedicated `sektion` field is a Phase-3 follow-up):

```ts
    const { title, description, sourceUrl, sourceName, imageUrl, submitterComment, sektion } = validation.data;
```

…and in the `newNewsItem` object add:

```ts
      aiCategory: sektion,
```

(place it alongside the other fields, e.g. right after `sourceName`). Reuse the already-opened `db`/`newsCollection` below — you may reuse `dbEarly` instead of re-calling `connectDB()`; collapse the duplicate `connectDB()` call so there's only one.

- [ ] **Step 3: Verify**

Run: `pnpm type-check 2>&1 | grep -iE "news.schema|news/submit" || echo "clean"` → `clean`
Run: `pnpm build 2>&1 | tail -2` → `Complete!`

- [ ] **Step 4: Commit**

```bash
git add src/schemas/news.schema.ts src/pages/api/news/submit.ts
git commit -m "feat(newsboard): submit quota (5/day) + section field"
```

---

## Task B3: Full submit island (replaces the minimal stub)

**Files:**
- Create: `src/components/newsboard/kiosk/submit/QuotaIndicator.svelte`
- Create: `src/components/newsboard/kiosk/submit/SektionPicker.svelte`
- Create: `src/components/newsboard/kiosk/submit/NewsSubmitInner.svelte`
- Modify: `src/pages/newsboard/submit.astro`
- Delete: `src/components/newsboard/kiosk/submit/NewsSubmitMinimal.svelte` (final step)

**Interfaces:**
- Consumes: `/api/news/daily-count` (B1), `/api/news/upload` (B1), `POST /api/news/submit` (B2), `SektionTag`/`SourceChip` primitives, `KioskBtn`, `showToast`, `SEKTION_KEYS` + `news.*` i18n.

- [ ] **Step 1: `QuotaIndicator.svelte` (5-slot meter)**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  let { used = 0 }: { used?: number } = $props();
  const max = 5;
  const remaining = $derived(Math.max(0, max - used));
</script>

<div class="flex items-center" style="gap:12px; padding:10px 12px; background:var(--k-paper-soft); border:1px solid var(--k-rule); border-radius:var(--k-radius-sm);">
  <div class="flex" style="gap:3px;">
    {#each Array(max) as _, i}
      <div style="width:14px; height:18px; border:1px solid var(--k-ink); border-radius:2px; background:{i < used ? 'var(--k-ink)' : 'transparent'};"></div>
    {/each}
  </div>
  <div>
    <div class="font-dmmono" style="font-size:10px; color:var(--k-ink); letter-spacing:0.1em;">{used} / {max} {$t['news.submit.quotaUsed']}</div>
    <div class="font-instrument italic" style="font-size:11.5px; color:var(--k-ink-soft);">
      {remaining > 0 ? `${remaining} ${$t['news.submit.quotaRemaining']}` : $t['news.submit.quotaReached']}
    </div>
  </div>
</div>
```

- [ ] **Step 2: `SektionPicker.svelte` (7 chips, single-select)**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import { SEKTION_KEYS, SEKTION_TOKEN, type SektionKey } from '../../../../lib/newsboard/newsTaxonomy';
  let {
    value = null,
    onSelect = (_s: SektionKey) => {},
  }: { value?: SektionKey | null; onSelect?: (s: SektionKey) => void } = $props();
</script>

<div class="flex flex-wrap" style="gap:6px;">
  {#each SEKTION_KEYS as key (key)}
    <button type="button" onclick={() => onSelect(key)} aria-pressed={value === key}
      class="inline-flex items-center font-bricolage font-semibold"
      style="gap:5px; padding:5px 10px; font-size:12.5px; border:var(--k-border-ink); border-radius:var(--k-radius-pill);
        background:{value === key ? `var(${SEKTION_TOKEN[key]})` : 'transparent'};
        color:{value === key ? `var(${SEKTION_TOKEN[key]}-text)` : 'var(--k-ink)'};">
      <span style="width:7px; height:7px; border-radius:50%; background:var(${SEKTION_TOKEN[key]});"></span>
      {$t[`news.sektion.${key}` as keyof typeof $t]}
    </button>
  {/each}
</div>
```

- [ ] **Step 3: `NewsSubmitInner.svelte` (full form: quota, picker, image upload, preview, rate-limited state)**

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../../../lib/kiosk-i18n';
  import { showToast } from '../../../../utils/toast';
  import { type SektionKey } from '../../../../lib/newsboard/newsTaxonomy';
  import KioskBtn from '../../../forum/kiosk/KioskBtn.svelte';
  import SektionTag from '../primitives/SektionTag.svelte';
  import SourceChip from '../primitives/SourceChip.svelte';
  import QuotaIndicator from './QuotaIndicator.svelte';
  import SektionPicker from './SektionPicker.svelte';

  let title = $state('');
  let description = $state('');
  let sourceUrl = $state('');
  let sourceName = $state('');
  let sektion = $state<SektionKey | null>(null);
  let imageUrl = $state('');
  let uploading = $state(false);
  let submitting = $state(false);

  let used = $state(0);
  let quotaReached = $state(false);

  onMount(async () => {
    try {
      const res = await fetch('/api/news/daily-count');
      if (res.ok) { const d = await res.json(); used = d.count; quotaReached = !d.canSubmit; }
    } catch { /* ignore */ }
  });

  const valid = $derived(
    title.trim().length >= 5 && description.trim().length >= 10 &&
    /^https?:\/\//.test(sourceUrl) && !!sektion
  );

  async function onImagePick(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    uploading = true;
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await fetch('/api/news/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      imageUrl = (await res.json()).url;
    } catch { showToast($t['news.submit.error'], { type: 'error' }); }
    finally { uploading = false; }
  }

  async function submit() {
    if (!valid || submitting) return;
    if (!sektion) { showToast($t['news.submit.sectionRequired'], { type: 'warning' }); return; }
    submitting = true;
    try {
      const res = await fetch('/api/news/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, sourceUrl, sourceName: sourceName || new URL(sourceUrl).hostname, imageUrl, sektion }),
      });
      if (res.status === 429) { quotaReached = true; throw new Error($t['news.submit.quotaReached']); }
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error || 'submit failed'); }
      showToast($t['news.submit.success'], { type: 'success' });
      window.location.href = '/newsboard';
    } catch (e) {
      showToast((e as Error).message || $t['news.submit.error'], { type: 'error' });
      submitting = false;
    }
  }
</script>

<div class="px-4 md:px-9" style="display:grid; grid-template-columns:1fr; gap:36px; padding-top:30px; padding-bottom:50px;">
  <div style="display:grid; grid-template-columns:1fr; gap:36px;">
    <div>
      <div class="font-dmmono uppercase" style="font-size:11px; color:var(--k-ink); letter-spacing:0.16em; margin-bottom:6px;">{$t['news.submit.kicker']}</div>
      <h1 class="font-bricolage" style="font-size:clamp(30px,5vw,44px); font-weight:800; letter-spacing:-0.03em; line-height:1; margin:0 0 10px;">{@html $t['news.submit.heading']}</h1>
      <p class="font-instrument italic" style="font-size:16px; color:var(--k-ink-soft); margin:0 0 18px; max-width:55ch;">{$t['news.submit.intro']}</p>

      <div style="margin-bottom:18px; max-width:420px;"><QuotaIndicator {used} /></div>

      {#if quotaReached}
        <div style="padding:16px; background:var(--k-paper-soft); border:1.5px solid var(--k-warn); border-radius:var(--k-radius-md); max-width:560px;">
          <div class="font-dmmono" style="font-size:10px; color:var(--k-warn); letter-spacing:0.12em; margin-bottom:6px;">⊘ {$t['news.submit.quotaReached']}</div>
          <div class="font-bricolage" style="font-size:14px; font-weight:700; margin-bottom:6px;">{$t['news.submit.quotaReachedTitle']}</div>
          <div class="font-instrument italic" style="font-size:12px; color:var(--k-ink-soft); line-height:1.45;">{$t['news.submit.quotaReachedBody']}</div>
          <div style="margin-top:12px;"><KioskBtn variant="ghost" href="/newsboard">{$t['news.submit.cancel']}</KioskBtn></div>
        </div>
      {:else}
        <div class="flex flex-col" style="gap:18px; max-width:640px;">
          <label class="flex flex-col" style="gap:6px;">
            <span class="font-dmmono uppercase" style="font-size:10px; letter-spacing:0.12em; font-weight:700;">{$t['news.submit.field.title']}</span>
            <input bind:value={title} placeholder={$t['news.submit.ph.title']} maxlength="200" class="font-bricolage" style="padding:8px 10px; background:var(--k-paper-soft); border:1px solid var(--k-rule); border-radius:var(--k-radius-md);" />
          </label>
          <label class="flex flex-col" style="gap:6px;">
            <span class="font-dmmono uppercase" style="font-size:10px; letter-spacing:0.12em; font-weight:700;">{$t['news.submit.field.desc']}</span>
            <textarea bind:value={description} rows="4" placeholder={$t['news.submit.ph.desc']} maxlength="1000" class="font-bricolage" style="padding:10px; background:var(--k-paper-soft); border:1px solid var(--k-rule); border-radius:var(--k-radius-md);"></textarea>
          </label>
          <div class="flex flex-col" style="gap:6px;">
            <span class="font-dmmono uppercase" style="font-size:10px; letter-spacing:0.12em; font-weight:700;">{$t['news.submit.section']}</span>
            <SektionPicker value={sektion} onSelect={(s) => (sektion = s)} />
          </div>
          <label class="flex flex-col" style="gap:6px;">
            <span class="font-dmmono uppercase" style="font-size:10px; letter-spacing:0.12em; font-weight:700;">{$t['news.submit.field.url']}</span>
            <input bind:value={sourceUrl} placeholder="https://" type="url" class="font-dmmono" style="padding:8px 10px; background:var(--k-paper-soft); border:1px solid var(--k-rule); border-radius:var(--k-radius-md);" />
          </label>
          <label class="flex flex-col" style="gap:6px;">
            <span class="font-dmmono uppercase" style="font-size:10px; letter-spacing:0.12em; font-weight:700;">{$t['news.submit.field.source']}</span>
            <input bind:value={sourceName} placeholder={$t['news.submit.ph.source']} maxlength="100" class="font-bricolage" style="padding:8px 10px; background:var(--k-paper-soft); border:1px solid var(--k-rule); border-radius:var(--k-radius-md);" />
          </label>
          <div class="flex flex-col" style="gap:6px;">
            <span class="font-dmmono uppercase" style="font-size:10px; letter-spacing:0.12em; font-weight:700;">{$t['news.submit.image']}</span>
            {#if imageUrl}
              <div class="flex items-center" style="gap:12px; padding:10px; background:var(--k-paper-warm); border:1px solid var(--k-ink); border-radius:var(--k-radius-md);">
                <img src={imageUrl} alt="" style="width:80px; height:60px; object-fit:cover; border:1px solid var(--k-ink); border-radius:4px;" />
                <button type="button" onclick={() => (imageUrl = '')} class="font-dmmono" style="font-size:11px; color:var(--k-ink-soft); text-decoration:underline;">{$t['news.submit.imageRemove']}</button>
              </div>
            {:else}
              <label class="font-dmmono" style="display:block; text-align:center; padding:18px 12px; background:var(--k-paper-soft); border:1.5px dashed var(--k-rule); border-radius:var(--k-radius-md); font-size:11px; color:var(--k-ink-mute); cursor:pointer;">
                {uploading ? $t['news.submit.imageUploading'] : $t['news.submit.imageDrop']}
                <input type="file" accept="image/*" onchange={onImagePick} style="display:none;" />
              </label>
            {/if}
          </div>

          <div class="flex items-center" style="gap:8px; margin-top:6px;">
            <KioskBtn onclick={submit} disabled={!valid || submitting || uploading}>{submitting ? $t['news.submit.submitting'] : $t['news.submit.cta']}</KioskBtn>
            <KioskBtn variant="ghost" href="/newsboard">{$t['news.submit.cancel']}</KioskBtn>
          </div>

          <div class="font-dmmono" style="margin-top:6px; padding:10px 12px; background:var(--k-paper-soft); border:1px dashed var(--k-rule); border-radius:var(--k-radius-sm); font-size:9.5px; color:var(--k-ink-mute); line-height:1.55;">↳ {$t['news.submit.modnote']}</div>
        </div>
      {/if}
    </div>
  </div>
</div>
```

- [ ] **Step 4: Point the route at the full island**

In `src/pages/newsboard/submit.astro`, swap the import + tag:

```astro
import NewsSubmitInner from '../../components/newsboard/kiosk/submit/NewsSubmitInner.svelte';
```
```astro
  <NewsSubmitInner client:only="svelte" />
```

- [ ] **Step 5: Delete the superseded stub**

Confirm nothing else imports it, then remove:
```bash
grep -rn "NewsSubmitMinimal" src/ && echo "STILL REFERENCED — fix before delete" || git rm src/components/newsboard/kiosk/submit/NewsSubmitMinimal.svelte
```

- [ ] **Step 6: Build + browser-verify**

Run: `pnpm build 2>&1 | tail -2` → `Complete!`
Browser (needs a logged-in session for `/newsboard/submit`): open it, confirm the quota meter renders (e.g. `0 / 5`), the section picker selects a chip, the image picker uploads + shows a thumbnail, and the submit button enables only when title/desc/url/section are valid. `playwright-cli console` → 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/newsboard/kiosk/submit/ src/pages/newsboard/submit.astro
git commit -m "feat(newsboard): full submit flow (quota, section picker, image upload, preview)"
```

---

## Task B4: Own-submission status straps in the feed (states 08/09)

**Files:**
- Modify: `src/lib/newsboard/newsTaxonomy.ts` (extend `NewsVM`)
- Modify: `src/components/newsboard/kiosk/NewsboardIndexInner.svelte` (carry status in `toVM`)
- Modify: `src/components/newsboard/kiosk/browse/NewsCard.svelte` (render strap)

The index API already returns the user's OWN pending/rejected items (any non-approved item in the response is the user's own). Surface them with a status strap.

- [ ] **Step 1: Extend `NewsVM`**

In `src/lib/newsboard/newsTaxonomy.ts`, add to the `NewsVM` interface:

```ts
  moderationStatus: 'approved' | 'pending' | 'rejected';
  warningText?: string;
```

- [ ] **Step 2: Populate them in `toVM`**

In `NewsboardIndexInner.svelte`'s `toVM`, add to the returned object (any value before the closing `}`):

```ts
      moderationStatus: it.moderationStatus ?? 'approved',
      warningText: it.warningText,
```

- [ ] **Step 3: Render the strap in `NewsCard.svelte`**

Add to the imports:
```svelte
  import { t, locale } from '../../../../lib/kiosk-i18n';
```
(it already imports `t`/`locale` — leave as is). Add a derived:
```svelte
  const status = $derived(article.moderationStatus);
```
Then, inside the top chip row (just after the `<HeatChip .../>` line), render a strap for non-approved own items:

```svelte
      {#if status === 'pending'}
        <span class="font-dmmono uppercase" style="font-size:9px; font-weight:700; letter-spacing:0.1em; padding:2px 7px; background:var(--k-ochre); color:var(--k-ink); border:1px solid var(--k-ink); border-radius:3px;">◐ {$t['news.status.pending']}</span>
      {:else if status === 'rejected'}
        <span class="font-dmmono uppercase" style="font-size:9px; font-weight:700; letter-spacing:0.1em; padding:2px 7px; background:var(--k-danger); color:var(--k-paper); border:1px solid var(--k-ink); border-radius:3px;">✕ {$t['news.status.rejected']}</span>
      {/if}
```

And after the dek `<p>`, surface the rejection reason / pending note for the author:

```svelte
    {#if status === 'rejected' && article.warningText}
      <p class="font-instrument italic" style="font-size:12px; color:var(--k-danger); margin:0 0 8px; padding-left:10px; border-left:2px solid var(--k-danger);">{article.warningText}</p>
      <p class="font-dmmono" style="font-size:9px; color:var(--k-ink-mute); margin:0 0 8px;">{$t['news.status.rejectedNote']}</p>
    {:else if status === 'pending'}
      <p class="font-dmmono" style="font-size:9px; color:var(--k-ink-mute); margin:0 0 8px;">{$t['news.status.pendingNote']}</p>
    {/if}
```

- [ ] **Step 4: Verify**

Run: `pnpm type-check 2>&1 | grep -iE "NewsCard|NewsboardIndexInner|newsTaxonomy" || echo "clean"` → `clean`
Run: `pnpm build 2>&1 | tail -2` → `Complete!`
Browser: if the test account has a pending/rejected submission it shows the strap; otherwise confirm approved articles render unchanged (no strap). `console` → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/newsboard/newsTaxonomy.ts src/components/newsboard/kiosk/NewsboardIndexInner.svelte src/components/newsboard/kiosk/browse/NewsCard.svelte
git commit -m "feat(newsboard): own-submission pending/rejected straps in feed"
```

---

# Part C — SSR-prefetch for SEO (optional; defer if hydration is fiddly)

## Task C1: Server-fetch the index + seed the island

**Files:**
- Modify: `src/lib/newsboard/newsQuery.ts` (add `fetchNewsForSSR`)
- Modify: `src/pages/newsboard.astro` (server-fetch + pass `initialArticles`, switch to `client:load`)
- Modify: `src/components/newsboard/kiosk/NewsboardIndexInner.svelte` (accept + seed from `initialArticles`)

Today the index island is `client:only`, so the feed text is NOT in raw HTML (no SEO). This seeds the island with server-fetched articles and switches to `client:load` so Astro SSRs the feed.

- [ ] **Step 1: Add `fetchNewsForSSR` to `newsQuery.ts`**

Append (it shares the SERVER-ONLY module from A1):

```ts
import type { NewsItem as _NewsItem } from '../../types';

// Lightweight list fetch for first-paint SSR of the index. Returns serialized
// rows shaped like the /api/news response items so the island can map them
// with the same toVM. Default window: last 7 days, newest first, limit 40.
export async function fetchNewsForSSR(userId: string | null, days = 7, limit = 40): Promise<any[]> {
  const db = await connectDB();
  const news = db.collection<_NewsItem>('news');
  const since = new Date(Date.now() - days * 86_400_000);
  const filter: Record<string, any> = {
    publishedAt: { $gte: since },
    $or: [
      { moderationStatus: 'approved' },
      ...(userId ? [
        { submittedBy: userId, moderationStatus: 'pending' },
        { submittedBy: userId, moderationStatus: 'rejected' },
      ] : []),
    ],
  };
  const items = await news.find(filter)
    .sort({ fetchDate: -1, source: -1, aiRelevanceScore: -1, approvedAt: -1, _id: -1 })
    .limit(limit).toArray();
  // Serialize ids/dates so the array is prop-safe across the island boundary.
  return items.map((it: any) => ({
    ...it,
    _id: String(it._id),
    submittedBy: it.submittedBy && typeof it.submittedBy === 'object' ? it.submittedBy : it.submittedBy,
    publishedAt: it.publishedAt instanceof Date ? it.publishedAt.toISOString() : it.publishedAt,
    fetchedAt: it.fetchedAt instanceof Date ? it.fetchedAt.toISOString() : it.fetchedAt,
    approvedAt: it.approvedAt instanceof Date ? it.approvedAt.toISOString() : it.approvedAt,
    createdAt: it.createdAt instanceof Date ? it.createdAt.toISOString() : it.createdAt,
    updatedAt: it.updatedAt instanceof Date ? it.updatedAt.toISOString() : it.updatedAt,
  }));
}
```

NOTE: this duplicates the index API's visibility filter. Keep them in sync (both live for the same reason); a Phase-3 refactor could extract a shared `buildNewsFilter`. Acceptable duplication for now.

- [ ] **Step 2: Accept `initialArticles` in the island + seed first paint**

In `NewsboardIndexInner.svelte`:

Add the prop:
```ts
  let {
    issue,
    degraded = false,
    currentUserId = null,
    initialArticles = [],
  }: { issue: number; degraded?: boolean; currentUserId?: string | null; initialArticles?: any[] } = $props();
```

Seed state from the prop and skip the initial fetch when seeded:
```ts
  // Data
  let status = $state<'loading' | 'ready' | 'error'>(initialArticles.length ? 'ready' : 'loading');
  let articles = $state<NewsVM[]>(initialArticles.map((it) => toVM(it, new Set<string>())));
```
(Move `toVM` above this state init, or keep `toVM` as a hoisted `function` — function declarations hoist, so calling it here is fine.)

Change the `$effect` so it does NOT refetch on first run when seeded, but still refetches on zeitraum/auth changes:
```ts
  let firstRun = true;
  $effect(() => {
    activeZeitraum; isAuth;
    if (firstRun) {
      firstRun = false;
      // If the server already seeded articles, skip the initial client fetch.
      if (initialArticles.length) return;
    }
    refetch();
  });
```

NOTE: the default window is `week` and `fetchNewsForSSR` also uses 7 days, so the seed matches the default filter — no immediate visible reflow.

- [ ] **Step 3: Server-fetch + `client:load` in `newsboard.astro`**

```astro
---
import KioskLayout from '../layouts/KioskLayout.astro';
import { getSession } from 'auth-astro/server';
import { computeIssueNumber } from '../lib/newsboard/newsFormat';
import { fetchNewsForSSR } from '../lib/newsboard/newsQuery';
import NewsboardIndexInner from '../components/newsboard/kiosk/NewsboardIndexInner.svelte';

Astro.response.headers.set('Cache-Control', 'no-store, must-revalidate');

const session = await getSession(Astro.request);
const userId = (session?.user as any)?.id ?? null;

const issue = computeIssueNumber(new Date());
const degraded = !import.meta.env.NEWSDATA_API_KEY;
const initialArticles = await fetchNewsForSSR(userId);
---

<KioskLayout title="News — Mahalle" description="Schillerkiez Kurier — die tägliche Zusammenfassung aus dem Kiez." page="newsboard">
  <NewsboardIndexInner
    client:load
    issue={issue}
    degraded={degraded}
    currentUserId={userId}
    initialArticles={initialArticles}
  />
</KioskLayout>
```

- [ ] **Step 4: Build + verify SSR + hydration**

Run: `pnpm build 2>&1 | tail -2` → `Complete!`

SEO check — feed text in raw HTML:
```bash
curl -s "http://localhost:3000/newsboard" | grep -c "Schillerkiez Kurier"   # >=1 (masthead in SSR)
curl -s "http://localhost:3000/newsboard" | grep -oE "<h3[^>]*>" | wc -l      # >0 → article headlines server-rendered
```

Hydration check (the risk with `client:load` — SSR/client tree must match):
```bash
playwright-cli open "http://localhost:3000/newsboard"
playwright-cli wait-for --text "Schillerkiez Kurier" || true
playwright-cli console
playwright-cli close
```
Expected: **0 console errors** — specifically NO "hydration mismatch" / "hydrate" warnings and no Svelte `effect_orphan`. If hydration mismatches appear (e.g. relative-time strings differ server vs client), the fix is to render time/locale-dependent text only after mount (guard with an `mounted` flag) OR revert this task to `client:only` + keep `initialArticles` unused. Document whichever you choose.

- [ ] **Step 5: Commit**

```bash
git add src/lib/newsboard/newsQuery.ts src/pages/newsboard.astro src/components/newsboard/kiosk/NewsboardIndexInner.svelte
git commit -m "feat(newsboard): SSR-prefetch index feed for SEO"
```

---

## Final: docs update

**Files:**
- Modify: `src/components/newsboard/kiosk/CLAUDE.md`

- [ ] **Step 1:** Move the Phase-2 items out of the "Deferred" list into a new "Phase 2 (shipped)" section: detail route (`/newsboard/[id]`, SSR main column + sidebar island, cards now link internally, forum-prefill via `?prefill_title/_body` read in `ComposePageInner`); full submit (`/api/news/daily-count`, `/api/news/upload`, 5/day quota in `submit.ts`, `sektion` stored as `aiCategory`, `NewsSubmitInner` replaced the minimal stub); own-submission status straps; SSR-prefetch (`fetchNewsForSSR` + `client:load`, if Task C1 landed). Update the "Deferred" list to Phase-3 only (read-state, heat, real `sektion` field, offline state, masthead intro animation). Note the `/api/topics/daily-count` endpoint now exists. Note `KioskBtn` gained `target`/`rel`.

- [ ] **Step 2: Commit**

```bash
git add src/components/newsboard/kiosk/CLAUDE.md
git commit -m "docs(newsboard): record phase-2 (detail, submit, SSR-prefetch)"
```

---

## Self-Review (against the Phase-2 scope)

**Spec coverage:**
- Detail route `/newsboard/[id]` (SSR main column + sidebar island, related rail, source footer, forum CTA) → A1–A4 ✓
- Cards link to detail; forum prefill → A5 ✓
- Full submit: 5/day quota (backend + indicator + 07 rate-limited state) → B1, B2, B3 ✓; section picker → B3 ✓; image upload → B1, B3 ✓; live-preview note → B3 (the design's separate preview card is folded into the form's inline image thumb + the existing feed shows the result; a standalone preview card can be added later if desired — flagged, not silently dropped); states 08/09 (pending/rejected in feed) → B4 ✓
- SSR-prefetch → C1 ✓
- **Deferred to Phase 3 (correctly NOT built here):** read-state opacity decay, heat indicator + `heatCount`, dedicated `sektion` field from `fetch-daily`, offline state, masthead intro animation.

**Placeholder scan:** every code step has complete code. Facts locked during the audit: topics count field is `author` (A3 ✓), the cloudinary env var is `CLOUD_NAME` and the upload donor uses `uploader.upload(dataUri)` — so B1 now copies the donor verbatim and changes only folder + public_id (B1 ✓), and `submittedBy` is stored as the raw id string so the count filter matches (B1 ✓). The detail two-column layout has a documented fallback (A4) if the arbitrary Tailwind variant is stripped. The `client:load` hydration risk has a documented fallback (C1).

**Audit fixes applied (2026-06-20):** (1) B1 image upload now copies the proven `posts/upload.ts` donor — corrects the wrong env var (`CLOUDINARY_CLOUD_NAME` → `CLOUD_NAME`) and the upload method (`upload_stream` → `uploader.upload(dataUri)`) that would have broken uploads. (2) A4 `[id].astro` per-article token styles are precomputed in frontmatter and passed via `style={…}` — plain `style="…${}…"` does NOT interpolate in Astro (would have rendered literal `${}`). (3) `NewsDetail` type moved to the pure `newsTaxonomy.ts` so the detail island never imports from the mongodb-importing `newsQuery.ts`. (4) merged a duplicate import in `RelatedRail`; (5) added an Astro static-vs-dynamic route-precedence note for `/newsboard/submit` vs `/newsboard/[id]`.

**Type consistency:** `NewsDetail` (newsQuery.ts) is produced in A1, consumed by A4's island + page. `NewsVM` extended in B4 is used by the existing cards. `fetchNewsForSSR` (C1) returns rows shaped for the existing `toVM`. `sektion` enum in the schema (B2) matches `SektionKey`. The forum CTA's `?prefill_title/_body` params (A2) match what `ComposePageInner` reads (A5). i18n keys used across tasks all exist after Task 0.

**Scope discipline:** no Phase-3 work leaked in. Parts are independently shippable; recommended order A → B → C.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-20-newsboard-kiosk-redesign-phase2.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
