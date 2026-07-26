# Newsboard Kiosk Redesign — Phase 1 (Visual: index, masthead, feed, filters, states) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark-glass React Newsboard at `/newsboard` with a kiosk-skinned Svelte index — daily masthead, editorial feed (lead + standard cards), filter rail, and load/empty/error/degraded states — reading from the existing `/api/news`, with no feature regression.

**Architecture:** Mirror the marketplace migration: an Astro page (`newsboard.astro`) on `KioskLayout` mounts one Svelte orchestrator island (`NewsboardIndexInner.svelte`) that fetches `/api/news` client-side (seq-guarded), composed from small dumb primitives + browse components + state components, all under `src/components/newsboard/kiosk/`. The DB has no `sektion`/`quelle` enums yet, so pure resolver helpers map the real free-string `aiCategory`/`sourceName`/`source` fields onto the design's 7-section / 9-source taxonomy at render time.

**Tech Stack:** Astro 5, Svelte 5 (runes: `$props`/`$state`/`$derived`/`$effect`), Tailwind 3.4, kiosk CSS tokens (`tokens.css` + `tokens-newsboard.css`), `kiosk-i18n` store, `scrollFade` action. No new npm deps.

---

## Phase roadmap (the user chose to phase this; see decision log below)

| Plan | Scope | Ships |
|---|---|---|
| **Phase 1 — this doc** | Route + `KioskLayout` + masthead + redesigned feed (lead/standard cards) + filter rail + display/fetch states. Save/unsave kept (works today). Cards' `weiterlesen` → external source. A **minimal** kiosk submit route to avoid regressing submit. | A complete, visually-migrated Newsboard index. |
| **Phase 2** | Internal article detail route `/newsboard/[id]` (SSR shell + island, related rail, source footer, "im Forum diskutieren" CTA). Submit page enriched: 5/day **quota indicator**, accept/reject sidebars, section picker, image upload, live preview, states 07–09. SSR-prefetch of the index for SEO. | Detail pages + full submit flow. |
| **Phase 3** | Net-new backend: auth-gated **read-state** (`news_read_state` collection + opacity decay UI), **heat indicator** (`heatCount` on articles + forum-link counter job + ♨ chip wiring), **news submit quota** enforcement (`users.newsboardSubmitQuota`), real `sektion` emitted by `fetch-daily`. Offline/cached state (05). | The three novel features fully live. |

**Phase-1 carries forward, inert, for later phases:** `HeatChip` and `ReadDot` components are built now but fed neutral values (`forumLinks: 0` → chip hidden; every article renders `fresh`/unread). Phase 3 flips on their real data sources without re-touching the components.

---

## Decision log (locked with the user, 2026-06-19)

- **Svelte rewrite** (not restyled React) — matches every other kiosk page; reuses `KioskNav`/`KioskBtn`/`scrollFade`.
- **Real routes** (not modals) — `/newsboard/[id]` (Phase 2) + `/newsboard/submit`.
- **Phased** — three plans, each shippable.
- **Path = `/newsboard`** — keep the existing index path; nav already matches it. Children are `/newsboard/submit` (this phase) and `/newsboard/[id]` (Phase 2).

## No-regression sequencing (read before starting)

Today `src/components/ui/NewsCards.tsx` (React, ~854 lines) holds the feed **and** the submit + detail modals. Phase 1 replaces the feed island. To avoid silently dropping working features during the phase gap:

1. **Detail**: today, opening an article shows a modal whose primary action links to the external source. The design says *"Newsboard never renders the full article inline; `weiterlesen` opens the source."* So Phase-1 cards link `weiterlesen` + card-click straight to `article.sourceUrl` (`target="_blank" rel="noopener"`). This is **not** a regression — it matches design intent. The internal detail page is a Phase-2 *addition*.
2. **Submit**: submitting news is a live feature. Phase 1 ships a **minimal kiosk submit page** at `/newsboard/submit` wired to the existing `POST /api/news/submit` (current 5-field schema, no quota UI yet). Phase 2 enriches it. The index's "+ news einreichen" button links there.
3. **Delete the legacy React Newsboard** (`NewsCards.tsx`, `NewsCardsWrapper.tsx`) only in the **final task** of this plan, after the Svelte index + minimal submit are verified working — never before.

The existing `/api/news/*` endpoints, `savedNews` collection, `useSavedNewsQuery` semantics, and the `news` schema are **unchanged** in Phase 1.

---

## Data-model gap → resolver strategy (critical context)

The design taxonomy does not exist in the database yet:

| Design field | DB reality today | Phase-1 resolution |
|---|---|---|
| `sektion` ∈ {politik, kultur, lokales, wirtschaft, verkehr, klima, sport} | `aiCategory?: string` (free text: "local"/"city"/"culture"/…) | `resolveSektion(aiCategory)` → best-effort map, default `'lokales'` |
| `quelle` ∈ {rbb, tsp, taz, bzb, bmp, nwk, nkn, nd, newsdata, user} | `sourceName: string` + `source: 'ai_fetched' \| 'user_submitted'` | `resolveQuelle(sourceName, source)` → match by substring, `user_submitted` → `'user'`, unknown RSS → `'newsdata'` styling |
| `forumLinks` (heat count) | *(none)* | always `0` in Phase 1 → `HeatChip` hidden |
| read/seen/archived | *(none)* | always `fresh` in Phase 1 |
| `ts` ("vor 2 Std.") | `publishedAt: Date` | `formatRelativeTime(publishedAt, locale)` |
| `fetchDate` ("24. Mai 2026 · 09:14") | `fetchDate?: string` (YYYY-MM-DD) + `approvedAt`/`fetchedAt` | `formatFetchDate(item, locale)` |

Resolvers live in **one pure, dependency-free module** (`src/lib/newsboard/newsTaxonomy.ts`) so both server (`.astro`) and client (`.svelte`) can import it without dragging `mongodb` into the browser bundle (see root `CLAUDE.md` → "Server-only modules bleeding into client bundles"). A Phase-3 follow-up will have `fetch-daily.ts` emit a real `sektion` enum so the resolver becomes a fallback rather than the primary path.

---

## File Structure

```
src/pages/
  newsboard.astro                                  MODIFY  — KioskLayout + island + server props (issue#, degraded)
  newsboard/
    submit.astro                                   CREATE  — minimal kiosk submit route (no-regression)

src/components/newsboard/kiosk/
  CLAUDE.md                                         CREATE  — subtree notes
  NewsboardIndexInner.svelte                       CREATE  — orchestrator island (fetch + state machine + filters)
  submit/
    NewsSubmitMinimal.svelte                       CREATE  — minimal submit form island
  browse/
    NewsMasthead.svelte                            CREATE  — daily masthead (desktop + mobile responsive)
    NewsTitleBlock.svelte                          CREATE  — kicker + carved title + submit CTA
    NewsFilterRail.svelte                          CREATE  — sektion/quelle/zeitraum/saved/unread, scrollFade peek
    NewsCard.svelte                                CREATE  — standard feed card
    NewsCardLead.svelte                            CREATE  — lead editorial card
    DateDivider.svelte                             CREATE  — "HEUTE · 24. MAI" chrono divider
  primitives/
    SourceChip.svelte                              CREATE
    SektionTag.svelte                              CREATE
    KuratiertChip.svelte                           CREATE
    HeatChip.svelte                                CREATE  (inert in P1)
    ReadDot.svelte                                 CREATE  (always unread in P1)
    SaveToggle.svelte                              CREATE
    ArticleImage.svelte                            CREATE  (incl. no-image placeholder)
    ArticleMeta.svelte                             CREATE
  states/
    NewsSkeleton.svelte                            CREATE  — state 01
    NewsEmptyToday.svelte                          CREATE  — state 02
    NewsEmptySaved.svelte                          CREATE  — state 03
    NewsError.svelte                               CREATE  — state 04
    NewsDegradedBanner.svelte                      CREATE  — state 06 (banner, not full state)

src/lib/newsboard/
  newsTaxonomy.ts                                  CREATE  — PURE: sektion/quelle tables + resolvers + decay/heat consts
  newsFormat.ts                                    CREATE  — PURE: relative-time + fetchDate formatters + issue number

src/lib/kiosk-i18n.ts                              MODIFY  — add `news.*` keys (de + en)
src/styles/tokens-newsboard.css                    CREATE  — copy handoff token extension; import after tokens.css

DELETE (final task only):
  src/components/NewsCardsWrapper.tsx
  src/components/ui/NewsCards.tsx
```

`tokens.css` is imported via `global.css`; this plan adds `tokens-newsboard.css` next to it. `KioskLayout` already accepts `page="newsboard"`. `KioskNav` already registers `/newsboard` as active (no nav change needed).

---

## Testing approach (this project has NO unit-test runner)

`package.json` exposes only `dev`/`build`/`preview`/`type-check`. There is no Vitest/Jest. The real, established gates in this repo are:

- **`pnpm type-check`** (`tsc --noEmit`) — must not add new errors over baseline. NOTE: `kiosk-i18n.ts` already emits ~561 pre-existing errors from its `as const`/`typeof de` pattern; those are the **baseline** and are not introduced by this work. Compare counts, don't expect zero.
- **`pnpm build`** — must stay green (catches Svelte compile errors + import issues). NOTE per root `CLAUDE.md`: a green build is necessary but **not sufficient** for client islands (server-only-import bleed produces a broken-but-green bundle). So every UI task that touches the island also gets a browser check.
- **`playwright-cli`** visual verification against the user's dev server on **:3000** (the user runs their own dev server — do NOT spawn `pnpm dev`; per project memory, curl/playwright their server). Always `playwright-cli close` at the end.

So each component task's "verify" step is **type-check + (for islands) a browser snapshot**, and TDD's "write failing test first" is replaced by "render in isolation / in the page and confirm the snapshot shows it." Where a pure helper is involved (`newsTaxonomy.ts`, `newsFormat.ts`), the task includes a tiny **inline Node assertion script** run with `node` as the executable check, then deleted — this is the closest thing to a unit test the repo supports.

Commit after every task (project convention: simple message, **no** Claude signature/co-author footer — see `~/.claude/CLAUDE.md`).

---

## Task 0: Token extension + verify foundation wiring

**Files:**
- Create: `src/styles/tokens-newsboard.css`
- Modify: `src/styles/global.css` (add one `@import`)

- [ ] **Step 1: Copy the handoff token extension into the styles dir**

Copy the file verbatim from the handoff — it is already correct and complete:

```bash
cp design/handoffs/design_handoff_newsboard/tokens-newsboard.css src/styles/tokens-newsboard.css
```

- [ ] **Step 2: Import it after `tokens.css` in `global.css`**

Find the existing `@import './tokens.css';` line in `src/styles/global.css` and add immediately after it:

```css
@import './tokens-newsboard.css';
```

- [ ] **Step 3: Resolve the carved-accent conflict**

`tokens.css:103` currently sets `[data-page="newsboard"] { --k-accent: var(--k-ochre); }`, but the handoff is explicit (READMEFIRST + scoping §2): **Newsboard carved accent = INK**. `tokens-newsboard.css` already sets `--carved-accent: var(--k-ink)` via `[data-page="newsboard"]`. These are two different variables (`--k-accent` general vs `--carved-accent` carved title). Per READMEFIRST side-note ("If you find a stale entry mapping Newsboard to another color, fix it from the table"), change `tokens.css:103` so the general accent is also ink-restrained:

```css
[data-page="newsboard"]    { --k-accent: var(--k-ink); }
```

(Ochre stays reserved for the heat chip + "neu" semantics, not the page accent.)

- [ ] **Step 4: Verify build is green**

Run: `pnpm build`
Expected: PASS (CSS import resolves; no Svelte/TS changes yet).

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens-newsboard.css src/styles/global.css
git commit -m "feat(newsboard): add kiosk token extension + ink page accent"
```

---

## Task 1: Pure taxonomy module (`newsTaxonomy.ts`)

**Files:**
- Create: `src/lib/newsboard/newsTaxonomy.ts`

This module is **dependency-pure** (no `mongodb`, no `fs`, no `auth-astro`) so both `.astro` (server) and `.svelte` (client) import it safely.

- [ ] **Step 1: Write the module**

```ts
// src/lib/newsboard/newsTaxonomy.ts
//
// PURE module — no server-only imports. Imported by both Astro pages (server)
// and Svelte islands (client). Maps the real DB free-string fields
// (aiCategory / sourceName / source) onto the design's fixed taxonomy.
//
// Source of truth for the taxonomy values: design handoff
// jsx/kiosk-newsboard.jsx (`news.sektion` + `news.quelle`).

export type SektionKey =
  | 'politik' | 'kultur' | 'lokales' | 'wirtschaft'
  | 'verkehr' | 'klima' | 'sport';

export type QuelleKey =
  | 'rbb' | 'tsp' | 'taz' | 'bzb' | 'bmp'
  | 'nwk' | 'nkn' | 'nd' | 'newsdata' | 'user';

export const SEKTION_KEYS: SektionKey[] = [
  'politik', 'kultur', 'lokales', 'wirtschaft', 'verkehr', 'klima', 'sport',
];

// CSS-var token name per sektion (defined in tokens-newsboard.css).
export const SEKTION_TOKEN: Record<SektionKey, string> = {
  politik: '--sektion-politik',
  kultur: '--sektion-kultur',
  lokales: '--sektion-lokales',
  wirtschaft: '--sektion-wirtschaft',
  verkehr: '--sektion-verkehr',
  klima: '--sektion-klima',
  sport: '--sektion-sport',
};

// Quelle display: short letter-mark + full name + accent token.
export const QUELLE_META: Record<QuelleKey, { name: string; short: string; token: string }> = {
  rbb:      { name: 'rbb24',                   short: 'rbb', token: '--quelle-rbb' },
  tsp:      { name: 'Tagesspiegel',            short: 'TS',  token: '--quelle-tsp' },
  taz:      { name: 'taz',                     short: 'taz', token: '--quelle-taz' },
  bzb:      { name: 'BZ Berlin',               short: 'BZ',  token: '--quelle-bzb' },
  bmp:      { name: 'Berliner Morgenpost',     short: 'BM',  token: '--quelle-bmp' },
  nwk:      { name: 'Neuköllner Wochenkurier', short: 'NWK', token: '--quelle-nwk' },
  nkn:      { name: 'neukoellner.net',         short: 'n.n', token: '--quelle-nkn' },
  nd:       { name: 'Neues Deutschland',       short: 'ND',  token: '--quelle-nd' },
  newsdata: { name: 'NewsData',                short: 'ND·', token: '--quelle-newsdata' },
  user:     { name: 'eingereicht',             short: 'u·',  token: '--quelle-user' },
};

// Read-decay opacity scale (mirrors tokens-newsboard.css). Phase 1 always
// renders 'fresh'; Phase 3 wires the others.
export const READ_DECAY: Record<'fresh' | 'seen' | 'archived', number> = {
  fresh: 1,
  seen: 0.55,
  archived: 0.32,
};

// Heat threshold — chip appears at >= this many linking forum posts.
export const HEAT_THRESHOLD = 2;

// ── Resolvers ──────────────────────────────────────────────────────────────

// Map free-string aiCategory → one of the 7 sektions. Best-effort substring
// match; defaults to 'lokales' (the catch-all for neighborhood news).
export function resolveSektion(aiCategory?: string | null): SektionKey {
  const c = (aiCategory ?? '').toLowerCase();
  if (/(polit|senat|wahl|bvv|bezirksverordnet)/.test(c)) return 'politik';
  if (/(kultur|kunst|musik|festival|karneval|kino|theater|culture)/.test(c)) return 'kultur';
  if (/(verkehr|transit|u-?bahn|fahrrad|stra(ss|ß)e|mobilit)/.test(c)) return 'verkehr';
  if (/(wirtschaft|economy|gewerbe|markt|handel|business)/.test(c)) return 'wirtschaft';
  if (/(klima|umwelt|climate|feinstaub|luft|energie)/.test(c)) return 'klima';
  if (/(sport|fu(ss|ß)ball|verein|liga)/.test(c)) return 'sport';
  return 'lokales';
}

// Map (sourceName, source) → quelle key. user_submitted always wins.
export function resolveQuelle(sourceName?: string | null, source?: string | null): QuelleKey {
  if (source === 'user_submitted') return 'user';
  const s = (sourceName ?? '').toLowerCase();
  if (s.includes('rbb')) return 'rbb';
  if (s.includes('tagesspiegel')) return 'tsp';
  if (s.includes('taz')) return 'taz';
  if (s.includes('bz') && s.includes('berlin')) return 'bzb';
  if (s.includes('morgenpost')) return 'bmp';
  if (s.includes('wochenkurier')) return 'nwk';
  if (s.includes('neukoellner') || s.includes('neuköllner.net')) return 'nkn';
  if (s.includes('neues deutschland') || s === 'nd' || s.includes('nd-aktuell')) return 'nd';
  // Unknown RSS / API source → render with the neutral NewsData styling.
  return 'newsdata';
}
```

- [ ] **Step 2: Sanity-check the resolvers with an inline Node script**

Create `/tmp/news-tax-check.mjs`:

```js
import { resolveSektion, resolveQuelle, SEKTION_KEYS } from '../src/lib/newsboard/newsTaxonomy.ts';
```

That won't run directly (TS). Instead verify by type-check only (the logic is plain regex; trust + type-check). Run:

Run: `pnpm type-check 2>&1 | grep -i "newsTaxonomy" || echo "no newsTaxonomy errors"`
Expected: `no newsTaxonomy errors`

- [ ] **Step 3: Commit**

```bash
git add src/lib/newsboard/newsTaxonomy.ts
git commit -m "feat(newsboard): pure sektion/quelle taxonomy + resolvers"
```

---

## Task 2: Pure formatting module (`newsFormat.ts`)

**Files:**
- Create: `src/lib/newsboard/newsFormat.ts`

- [ ] **Step 1: Write the module**

```ts
// src/lib/newsboard/newsFormat.ts
// PURE — relative-time + fetchDate formatting + masthead issue number.
// No server-only imports.

import type { Locale } from '../kiosk-i18n';

// Notional launch date for the issue counter. Seed cross-check:
// 24 May 2026 = Nr. 142 → issue = (days since 2026-01-03) + 1.
const LAUNCH = Date.UTC(2026, 0, 3); // 2026-01-03
const DAY_MS = 86_400_000;

// Compute the daily issue number. Pass `now` from server-side (Astro
// frontmatter) — never derive in the client per render (handoff rule).
export function computeIssueNumber(now: Date): number {
  const days = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - LAUNCH) / DAY_MS);
  return days + 1;
}

// "vor 2 Std." / "2h ago" style relative time from a Date or ISO string.
export function formatRelativeTime(input: Date | string | undefined, locale: Locale, now: Date = new Date()): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  const diffMs = now.getTime() - d.getTime();
  const min = Math.round(diffMs / 60000);
  const isDE = locale === 'de';
  if (min < 1) return isDE ? 'gerade eben' : 'just now';
  if (min < 60) return isDE ? `vor ${min} Min.` : `${min} min ago`;
  const hrs = Math.round(min / 60);
  if (hrs < 24) return isDE ? `vor ${hrs} Std.` : `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return isDE ? 'gestern' : 'yesterday';
  if (days < 7) return isDE ? `vor ${days} Tagen` : `${days} days ago`;
  return d.toLocaleDateString(isDE ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short' });
}

// Long fetch/approval date for detail + meta: "24. Mai 2026".
export function formatFetchDate(input: Date | string | undefined, locale: Locale): string {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return typeof input === 'string' ? input : '';
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// Chrono bucket key for the date dividers (today / yesterday / older).
export function chronoBucket(input: Date | string | undefined, now: Date = new Date()): 'today' | 'yesterday' | 'older' {
  if (!input) return 'older';
  const d = typeof input === 'string' ? new Date(input) : input;
  const startOf = (x: Date) => Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate());
  const diffDays = Math.floor((startOf(now) - startOf(d)) / DAY_MS);
  if (diffDays <= 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  return 'older';
}
```

- [ ] **Step 2: Verify issue-number math against the seed (executable check)**

Create `/tmp/issue-check.mjs`:

```js
const LAUNCH = Date.UTC(2026, 0, 3);
const DAY_MS = 86_400_000;
const iss = (y, m, d) => Math.floor((Date.UTC(y, m, d) - LAUNCH) / DAY_MS) + 1;
console.assert(iss(2026, 4, 24) === 142, `seed: expected 142, got ${iss(2026, 4, 24)}`);
console.log('issue(2026-05-24)=', iss(2026, 4, 24), '(want 142)');
console.log('issue(today 2026-06-19)=', iss(2026, 5, 19));
```

Run: `node /tmp/issue-check.mjs && rm /tmp/issue-check.mjs`
Expected: prints `issue(2026-05-24)= 142 (want 142)` with no assertion error.

- [ ] **Step 3: Type-check + commit**

Run: `pnpm type-check 2>&1 | grep -i "newsFormat" || echo "clean"`
Expected: `clean`

```bash
git add src/lib/newsboard/newsFormat.ts
git commit -m "feat(newsboard): pure time + issue-number formatters"
```

---

## Task 3: Primitive — `SourceChip.svelte`

**Files:**
- Create: `src/components/newsboard/kiosk/primitives/SourceChip.svelte`

Port of `kiosk-newsboard.jsx` `SourceChip`. Inline styles use kiosk vars (matches `MarketFilterRail` idiom).

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
  import { QUELLE_META, type QuelleKey } from '../../../../lib/newsboard/newsTaxonomy';
  let { id, mini = false }: { id: QuelleKey; mini?: boolean } = $props();
  const q = $derived(QUELLE_META[id]);
</script>

{#if q}
  <span
    class="inline-flex items-center font-dmmono whitespace-nowrap"
    style="gap:5px; font-size:{mini ? 9 : 10}px; font-weight:600; letter-spacing:0.06em;
           color:var(--k-ink); border:1px solid var(--k-ink); background:var(--k-paper-warm);
           padding:{mini ? '1px 5px 1px 1px' : '2px 8px 2px 2px'}; border-radius:var(--k-radius-sm);"
  >
    <span
      style="background:var({q.token}); color:var(--k-paper); font-weight:700;
             font-size:{mini ? 8 : 9}px; padding:{mini ? '1px 4px' : '2px 5px'};
             border-radius:3px; letter-spacing:0.05em;"
    >{q.short.toUpperCase()}</span>
    <span style="text-transform:lowercase;">{q.name}</span>
  </span>
{/if}
```

- [ ] **Step 2: Type-check**

Run: `pnpm type-check 2>&1 | grep -i "SourceChip" || echo "clean"`
Expected: `clean`

- [ ] **Step 3: Commit**

```bash
git add src/components/newsboard/kiosk/primitives/SourceChip.svelte
git commit -m "feat(newsboard): SourceChip primitive"
```

---

## Task 4: Primitive — `SektionTag.svelte`

**Files:**
- Create: `src/components/newsboard/kiosk/primitives/SektionTag.svelte`

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import { SEKTION_TOKEN, type SektionKey } from '../../../../lib/newsboard/newsTaxonomy';
  let { id, mini = false }: { id: SektionKey; mini?: boolean } = $props();
  const token = $derived(SEKTION_TOKEN[id]);
</script>

{#if token}
  <span
    class="inline-flex items-center font-dmmono uppercase whitespace-nowrap"
    style="font-size:{mini ? 9 : 10}px; font-weight:600; letter-spacing:0.12em;
           padding:{mini ? '1px 6px' : '2px 8px'};
           background:var({token}); color:var({token}-text);
           border:1px solid var(--k-ink); border-radius:var(--k-radius-sm);"
  >{$t[`news.sektion.${id}` as keyof typeof $t]}</span>
{/if}
```

NOTE: `var({token}-text)` resolves to e.g. `var(--sektion-politik-text)` — those `-text` tokens exist in `tokens-newsboard.css`. The `news.sektion.*` i18n keys are added in Task 21.

- [ ] **Step 2: Type-check + commit**

Run: `pnpm type-check 2>&1 | grep -i "SektionTag" || echo "clean"`
Expected: `clean`

```bash
git add src/components/newsboard/kiosk/primitives/SektionTag.svelte
git commit -m "feat(newsboard): SektionTag primitive"
```

---

## Task 5: Primitive — `KuratiertChip.svelte`

**Files:**
- Create: `src/components/newsboard/kiosk/primitives/KuratiertChip.svelte`

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
</script>

<span
  class="inline-flex items-center font-dmmono uppercase"
  style="gap:5px; font-size:9.5px; font-weight:500; color:var(--k-ink-mute);
         letter-spacing:0.14em; padding:3px 9px; background:transparent;
         border:1px dashed var(--k-ink-mute); border-radius:var(--k-radius-sm);"
>
  <span style="width:6px; height:6px; border-radius:50%; background:var(--k-ink-mute); opacity:0.7;"></span>
  {$t['news.masthead.curated']}
</span>
```

- [ ] **Step 2: Type-check + commit**

```bash
git add src/components/newsboard/kiosk/primitives/KuratiertChip.svelte
git commit -m "feat(newsboard): KuratiertChip primitive"
```

---

## Task 6: Primitive — `HeatChip.svelte` (inert in Phase 1)

**Files:**
- Create: `src/components/newsboard/kiosk/primitives/HeatChip.svelte`

Built now; callers pass `count=0` in Phase 1 so it never renders. Phase 3 supplies real counts.

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
  import { t, locale } from '../../../../lib/kiosk-i18n';
  import { HEAT_THRESHOLD } from '../../../../lib/newsboard/newsTaxonomy';
  let { count = 0, mini = false }: { count?: number; mini?: boolean } = $props();
  const show = $derived(count >= HEAT_THRESHOLD);
  const label = $derived($locale === 'de' ? `${count}× im Forum` : `${count}× in forum`);
</script>

{#if show}
  <span
    class="inline-flex items-center font-dmmono uppercase whitespace-nowrap"
    style="gap:5px; font-size:{mini ? 9 : 10}px; font-weight:700; letter-spacing:0.08em;
           color:var(--k-ink); background:var(--news-heat-color);
           border:1px solid var(--k-ink); padding:{mini ? '1px 6px' : '2px 8px'};
           border-radius:var(--k-radius-sm); box-shadow:2px 2px 0 var(--k-ink);"
  >
    <span style="font-size:{mini ? 9 : 10}px;">♨</span>{label}
  </span>
{/if}
```

NOTE: uses `$locale` for the interpolated count string (can't be a static i18n key). `news.*` static keys still come from `$t`.

- [ ] **Step 2: Type-check + commit**

```bash
git add src/components/newsboard/kiosk/primitives/HeatChip.svelte
git commit -m "feat(newsboard): HeatChip primitive (inert until phase 3)"
```

---

## Task 7: Primitive — `ReadDot.svelte` (always unread in Phase 1)

**Files:**
- Create: `src/components/newsboard/kiosk/primitives/ReadDot.svelte`

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
  let { read = false }: { read?: boolean } = $props();
</script>

<span
  class="inline-block shrink-0"
  style="width:8px; height:8px; border-radius:50%;
         background:{read ? 'transparent' : 'var(--k-wine)'};
         border:1.5px solid {read ? 'var(--k-ink-mute)' : 'var(--k-wine)'};"
></span>
```

- [ ] **Step 2: Type-check + commit**

```bash
git add src/components/newsboard/kiosk/primitives/ReadDot.svelte
git commit -m "feat(newsboard): ReadDot primitive"
```

---

## Task 8: Primitive — `SaveToggle.svelte`

**Files:**
- Create: `src/components/newsboard/kiosk/primitives/SaveToggle.svelte`

Interactive: emits `onToggle`. Save/unsave wiring (existing `savedNews` API) happens in the orchestrator (Task 18).

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
  let {
    saved = false,
    mini = false,
    disabled = false,
    onToggle = (_e: MouseEvent) => {},
  }: { saved?: boolean; mini?: boolean; disabled?: boolean; onToggle?: (e: MouseEvent) => void } = $props();
  const size = $derived(mini ? 14 : 18);
</script>

<button
  type="button"
  {disabled}
  onclick={(e) => { e.stopPropagation(); onToggle(e); }}
  class="inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
  style="width:{size + 8}px; height:{size + 8}px;
         border:1.2px solid {saved ? 'var(--k-ink)' : 'var(--k-rule)'};
         background:{saved ? 'var(--k-ink)' : 'transparent'};
         color:{saved ? 'var(--k-paper)' : 'var(--k-ink-mute)'};
         border-radius:4px; font-size:{size - 2}px; line-height:1; cursor:pointer;"
  aria-pressed={saved}
  aria-label="save"
>{saved ? '■' : '□'}</button>
```

- [ ] **Step 2: Type-check + commit**

```bash
git add src/components/newsboard/kiosk/primitives/SaveToggle.svelte
git commit -m "feat(newsboard): SaveToggle primitive"
```

---

## Task 9: Primitive — `ArticleImage.svelte` (incl. no-image placeholder)

**Files:**
- Create: `src/components/newsboard/kiosk/primitives/ArticleImage.svelte`

Port of the JSX `ArticleImage`, adapted: when a real `imageUrl` exists, render the actual `<img>` (the JSX only had striped placeholders since it was seed data). The dashed "kein bild" monogram path is first-class (15–20% of articles lack images per handoff gotcha #1).

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import { QUELLE_META, SEKTION_TOKEN, type QuelleKey, type SektionKey } from '../../../../lib/newsboard/newsTaxonomy';
  import { optimizeCloudinary } from '../../../../utils/cloudinary';

  let {
    imageUrl = '',
    quelle,
    sektion,
    ratio = '16/9',
    lead = false,
    alt = '',
  }: {
    imageUrl?: string;
    quelle: QuelleKey;
    sektion: SektionKey;
    ratio?: string;
    lead?: boolean;
    alt?: string;
  } = $props();

  const hasImage = $derived(!!imageUrl);
  const monogram = $derived((QUELLE_META[quelle]?.short ?? '•').toUpperCase().slice(0, 2));
</script>

{#if hasImage}
  <img
    src={optimizeCloudinary(imageUrl)}
    {alt}
    loading="lazy"
    class="w-full object-cover"
    style="aspect-ratio:{ratio}; border:var(--k-border-ink); border-radius:var(--k-radius-md);"
  />
{:else}
  <!-- First-class no-image placeholder: dashed border + source monogram -->
  <div
    class="w-full flex flex-col items-center justify-center"
    style="aspect-ratio:{ratio}; border-radius:var(--k-radius-md);
           border:var(--news-noimage-border); background:var(--news-noimage-bg);"
  >
    <div
      class="font-instrument italic"
      style="font-size:{lead ? 42 : 26}px; color:var(--k-ink-mute); line-height:1; opacity:0.6;"
    >{monogram}</div>
    <div
      class="font-dmmono uppercase"
      style="font-size:{lead ? 10 : 9}px; color:var(--k-ink-mute); letter-spacing:0.18em; margin-top:8px;"
    >{lead ? $t['news.noimage.lead'] : $t['news.noimage.short']}</div>
  </div>
{/if}
```

NOTE: `optimizeCloudinary` is the existing util (`src/utils/cloudinary.ts`) — a no-op for non-Cloudinary URLs, so safe for RSS-hotlinked images. `font-instrument` / `font-dmmono` are existing kiosk font utility classes (used across kiosk components). `news.noimage.*` keys added in Task 21.

- [ ] **Step 2: Type-check + commit**

```bash
git add src/components/newsboard/kiosk/primitives/ArticleImage.svelte
git commit -m "feat(newsboard): ArticleImage with first-class no-image placeholder"
```

---

## Task 10: Primitive — `ArticleMeta.svelte`

**Files:**
- Create: `src/components/newsboard/kiosk/primitives/ArticleMeta.svelte`

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
  import { locale } from '../../../../lib/kiosk-i18n';
  import { formatRelativeTime } from '../../../../lib/newsboard/newsFormat';
  import { type QuelleKey } from '../../../../lib/newsboard/newsTaxonomy';
  import SourceChip from './SourceChip.svelte';

  let {
    quelle,
    publishedAt,
    submitterName = '',
  }: { quelle: QuelleKey; publishedAt?: string | Date; submitterName?: string } = $props();

  const rel = $derived(formatRelativeTime(publishedAt, $locale));
</script>

<div
  class="flex items-center flex-wrap font-dmmono"
  style="gap:10px; font-size:10px; color:var(--k-ink-mute); letter-spacing:0.06em;"
>
  <SourceChip id={quelle} mini />
  <span>·</span>
  <span>{rel}</span>
  {#if submitterName}
    <span>·</span>
    <span class="inline-flex items-center" style="gap:4px;">
      <span
        class="inline-flex items-center justify-center"
        style="width:14px; height:14px; border-radius:50%; background:var(--k-moss);
               color:var(--k-paper); font-size:8px; font-weight:700; border:1px solid var(--k-ink);"
      >{submitterName.slice(0, 2).toUpperCase()}</span>
      {submitterName}
    </span>
  {/if}
</div>
```

- [ ] **Step 2: Type-check + commit**

```bash
git add src/components/newsboard/kiosk/primitives/ArticleMeta.svelte
git commit -m "feat(newsboard): ArticleMeta primitive"
```

---

## Task 11: Browse — `DateDivider.svelte`

**Files:**
- Create: `src/components/newsboard/kiosk/browse/DateDivider.svelte`

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
  let { label }: { label: string } = $props();
</script>

<div class="flex items-center" style="gap:12px; margin:10px 0 4px;">
  <div class="flex-1" style="height:1px; border-top:1px dashed var(--k-rule);"></div>
  <span
    class="font-dmmono uppercase"
    style="font-size:10px; font-weight:700; color:var(--k-ink-mute); letter-spacing:0.18em;"
  >{label}</span>
  <div class="flex-1" style="height:1px; border-top:1px dashed var(--k-rule);"></div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/newsboard/kiosk/browse/DateDivider.svelte
git commit -m "feat(newsboard): DateDivider"
```

---

## Task 12: Browse — `NewsCard.svelte` (standard feed card)

**Files:**
- Create: `src/components/newsboard/kiosk/browse/NewsCard.svelte`

Defines the article view-model shape used by the cards + orchestrator.

- [ ] **Step 1: Define the shared view-model type inside the orchestrator's import path**

Add this type to `src/lib/newsboard/newsTaxonomy.ts` (append at the end — keeps it pure and shared):

```ts
// View-model the cards/orchestrator pass around (resolved from the DB NewsItem).
export interface NewsVM {
  id: string;
  title: string;
  titleEN?: string;
  dek: string;          // from description (or first summary line)
  summary: string;      // aiSummary / description body
  quelle: QuelleKey;
  sektion: SektionKey;
  imageUrl: string;
  sourceUrl: string;
  publishedAt: string;  // ISO
  fetchDate?: string;
  submitterName?: string;
  forumLinks: number;   // always 0 in phase 1
  saved: boolean;
  read: boolean;        // always false in phase 1
  archived: boolean;    // always false in phase 1
}
```

- [ ] **Step 2: Write the card**

```svelte
<script lang="ts">
  import { t, locale } from '../../../../lib/kiosk-i18n';
  import { READ_DECAY, type NewsVM } from '../../../../lib/newsboard/newsTaxonomy';
  import SektionTag from '../primitives/SektionTag.svelte';
  import HeatChip from '../primitives/HeatChip.svelte';
  import ReadDot from '../primitives/ReadDot.svelte';
  import SaveToggle from '../primitives/SaveToggle.svelte';
  import ArticleImage from '../primitives/ArticleImage.svelte';
  import ArticleMeta from '../primitives/ArticleMeta.svelte';

  let {
    article,
    onSave = (_id: string) => {},
    canSave = false,
  }: { article: NewsVM; onSave?: (id: string) => void; canSave?: boolean } = $props();

  const title = $derived($locale === 'de' ? article.title : (article.titleEN || article.title));
  const noImage = $derived(!article.imageUrl);
  const decay = $derived(article.archived ? READ_DECAY.archived : article.read ? READ_DECAY.seen : READ_DECAY.fresh);
</script>

<article
  class="news-card grid items-start"
  data-read-state={article.archived ? 'archived' : article.read ? 'seen' : 'fresh'}
  style="background:var(--k-paper); border:var(--k-border-hair); border-radius:var(--k-radius-md);
         padding:18px; gap:22px; opacity:{decay};
         grid-template-columns:{noImage ? '1fr' : '1fr 220px'};"
>
  <div>
    <div class="flex items-center flex-wrap" style="gap:6px; margin-bottom:8px;">
      <ReadDot read={article.read} />
      <SektionTag id={article.sektion} mini />
      <HeatChip count={article.forumLinks} mini />
    </div>

    <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" class="block no-underline">
      <h3
        class="font-bricolage"
        style="font-weight:700; font-size:22px; line-height:1.15; letter-spacing:-0.02em;
               margin:0 0 6px; color:var(--k-ink);"
      >{title}</h3>
    </a>

    <p
      class="font-instrument italic"
      style="font-size:14px; line-height:1.4; color:var(--k-ink-soft); margin:0 0 10px; max-width:70ch;"
    >{article.dek}</p>

    <p
      class="font-bricolage"
      style="font-size:13.5px; line-height:1.55; color:var(--k-ink); margin:0 0 12px; max-width:70ch;"
    >{article.summary}</p>

    <div class="flex items-center" style="gap:12px;">
      <ArticleMeta quelle={article.quelle} publishedAt={article.publishedAt} submitterName={article.submitterName} />
      <div class="flex-1"></div>
      <a
        href={article.sourceUrl} target="_blank" rel="noopener noreferrer"
        class="font-dmmono"
        style="font-size:10px; color:var(--k-ink-soft); text-decoration:underline dashed; text-underline-offset:3px;"
      >{$t['news.readmore']}</a>
      {#if canSave}
        <SaveToggle saved={article.saved} mini onToggle={() => onSave(article.id)} />
      {/if}
    </div>
  </div>

  {#if !noImage}
    <div><ArticleImage imageUrl={article.imageUrl} quelle={article.quelle} sektion={article.sektion} ratio="4/3" alt={title} /></div>
  {/if}
</article>
```

- [ ] **Step 3: Type-check + commit**

Run: `pnpm type-check 2>&1 | grep -iE "NewsCard|newsTaxonomy" || echo "clean"`
Expected: `clean`

```bash
git add src/lib/newsboard/newsTaxonomy.ts src/components/newsboard/kiosk/browse/NewsCard.svelte
git commit -m "feat(newsboard): NewsCard + shared NewsVM type"
```

---

## Task 13: Browse — `NewsCardLead.svelte` (lead editorial card)

**Files:**
- Create: `src/components/newsboard/kiosk/browse/NewsCardLead.svelte`

- [ ] **Step 1: Write the card**

```svelte
<script lang="ts">
  import { t, locale } from '../../../../lib/kiosk-i18n';
  import { type NewsVM } from '../../../../lib/newsboard/newsTaxonomy';
  import KioskBtn from '../../../forum/kiosk/KioskBtn.svelte';
  import SektionTag from '../primitives/SektionTag.svelte';
  import HeatChip from '../primitives/HeatChip.svelte';
  import SaveToggle from '../primitives/SaveToggle.svelte';
  import ArticleImage from '../primitives/ArticleImage.svelte';
  import ArticleMeta from '../primitives/ArticleMeta.svelte';

  let {
    article,
    onSave = (_id: string) => {},
    canSave = false,
  }: { article: NewsVM; onSave?: (id: string) => void; canSave?: boolean } = $props();

  const title = $derived($locale === 'de' ? article.title : (article.titleEN || article.title));
</script>

<article
  class="news-card grid relative"
  style="background:var(--k-paper-warm); border:var(--k-border-ink); border-radius:var(--k-radius-lg);
         padding:28px; box-shadow:var(--k-shadow-md); grid-template-columns:1.1fr 1fr; gap:28px;"
>
  <div>
    <div class="flex items-center flex-wrap" style="gap:8px; margin-bottom:14px;">
      <SektionTag id={article.sektion} />
      <HeatChip count={article.forumLinks} />
    </div>

    <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" class="block no-underline">
      <h2
        class="font-bricolage"
        style="font-weight:800; font-size:42px; line-height:1.02; letter-spacing:-0.035em;
               margin:0 0 12px; color:var(--k-ink);"
      >{title}</h2>
    </a>

    <p
      class="font-instrument italic"
      style="font-size:19px; line-height:1.4; color:var(--k-ink-soft); margin:0 0 18px; max-width:62ch;"
    >{article.dek}</p>

    <div
      class="font-bricolage"
      style="font-size:14px; line-height:1.55; color:var(--k-ink); max-width:62ch;"
    >{article.summary}</div>

    <div
      class="flex items-center"
      style="gap:14px; margin-top:22px; padding-top:14px; border-top:1px dashed var(--k-rule);"
    >
      <ArticleMeta quelle={article.quelle} publishedAt={article.publishedAt} submitterName={article.submitterName} />
      <div class="flex-1"></div>
      <KioskBtn size="sm" href={article.sourceUrl}>{$t['news.readmore']}</KioskBtn>
      {#if canSave}<SaveToggle saved={article.saved} onToggle={() => onSave(article.id)} />{/if}
    </div>
  </div>

  <div>
    <ArticleImage imageUrl={article.imageUrl} quelle={article.quelle} sektion={article.sektion} ratio="4/5" lead alt={title} />
  </div>
</article>
```

NOTE: `KioskBtn` renders an `<a>` when `href` is set (confirmed in its source). The external link opens in the same tab via KioskBtn's `<a>` — acceptable for the lead CTA; if a new tab is wanted, Phase 2 can extend KioskBtn with a `target` prop (out of scope here).

- [ ] **Step 2: Type-check + commit**

```bash
git add src/components/newsboard/kiosk/browse/NewsCardLead.svelte
git commit -m "feat(newsboard): NewsCardLead editorial card"
```

---

## Task 14: Browse — `NewsMasthead.svelte`

**Files:**
- Create: `src/components/newsboard/kiosk/browse/NewsMasthead.svelte`

Responsive: full masthead at `md+`, compact masthead below. Issue number + degraded flag come from the server (props). The once-per-day intro animation is deferred (cosmetic; scoping §13 q3) — note in CLAUDE.md.

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
  import { t, locale } from '../../../../lib/kiosk-i18n';
  import KuratiertChip from '../primitives/KuratiertChip.svelte';

  let {
    issue,
    articleCount,
    sourceCount,
    degraded = false,
  }: { issue: number; articleCount: number; sourceCount: number; degraded?: boolean } = $props();

  // Server passes issue; the dateline is purely cosmetic and may use the client
  // locale's today (acceptable — the issue NUMBER is the server-fixed value).
  const dateline = $derived(
    new Date().toLocaleDateString($locale === 'de' ? 'de-DE' : 'en-GB',
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  );
</script>

<section class="relative" style="padding:30px 36px 22px; border-bottom:2px solid var(--k-ink);">
  <!-- Top ribbon -->
  <div
    class="flex justify-between items-center font-dmmono uppercase"
    style="font-size:10.5px; font-weight:600; color:var(--k-ink); letter-spacing:0.16em;
           padding-bottom:12px; border-bottom:1px solid var(--k-ink);"
  >
    <span>{$t['news.masthead.edition']}</span>
    <span class="hidden sm:inline">{dateline}</span>
    <span>{$t['news.masthead.issueAbbr']} {issue}</span>
  </div>

  <!-- Name -->
  <h1
    class="font-instrument italic text-center"
    style="font-weight:400; font-size:clamp(36px, 9vw, 88px); line-height:0.92;
           letter-spacing:-0.025em; margin:16px 0 6px; color:var(--k-ink);"
  >Schillerkiez Kurier</h1>

  <!-- Tagline -->
  <div
    class="font-bricolage text-center"
    style="font-size:14px; font-weight:500; color:var(--k-ink-soft); letter-spacing:0.02em; margin:0 0 14px;"
  >{$t['news.masthead.tagline']}</div>

  <!-- Bottom ribbon -->
  <div
    class="flex justify-between items-center font-dmmono"
    style="padding-top:12px; border-top:1px solid var(--k-ink); font-size:10.5px;
           color:var(--k-ink-soft); letter-spacing:0.06em;"
  >
    <span><b style="color:var(--k-ink);">{articleCount}</b> {$t['news.masthead.articles']}</span>
    <span>
      <b style="color:var(--k-ink);">{sourceCount}</b> {$t['news.masthead.sources']}
      {#if degraded}<span style="color:var(--k-warn); margin-left:6px;">· {$t['news.masthead.degraded']}</span>{/if}
    </span>
    <KuratiertChip />
  </div>
</section>
```

- [ ] **Step 2: Type-check + commit**

```bash
git add src/components/newsboard/kiosk/browse/NewsMasthead.svelte
git commit -m "feat(newsboard): daily masthead (responsive)"
```

---

## Task 15: Browse — `NewsTitleBlock.svelte`

**Files:**
- Create: `src/components/newsboard/kiosk/browse/NewsTitleBlock.svelte`

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import KioskBtn from '../../../forum/kiosk/KioskBtn.svelte';
</script>

<section
  class="flex justify-between items-end px-4 md:px-9"
  style="padding-top:20px; padding-bottom:14px; border-bottom:1px dashed var(--k-rule);"
>
  <div>
    <div class="font-dmmono uppercase" style="font-size:11px; color:var(--k-ink); letter-spacing:0.16em;">
      {$t['news.titleblock.kicker']}
    </div>
    <h2 class="font-bricolage" style="font-size:clamp(26px,4vw,38px); font-weight:800; letter-spacing:-0.03em; line-height:1; margin:6px 0 0;">
      {@html $t['news.titleblock.heading']}
    </h2>
  </div>
  <KioskBtn variant="secondary" href="/newsboard/submit">{$t['news.titleblock.submit']}</KioskBtn>
</section>
```

NOTE: `{@html …}` is used so the heading can carry the carved-italic `<span class="font-instrument italic">…</span>` accent word. The i18n value is a hardcoded, non-user string (Task 21), so this is XSS-safe.

- [ ] **Step 2: Type-check + commit**

```bash
git add src/components/newsboard/kiosk/browse/NewsTitleBlock.svelte
git commit -m "feat(newsboard): title block + submit CTA"
```

---

## Task 16: Browse — `NewsFilterRail.svelte`

**Files:**
- Create: `src/components/newsboard/kiosk/browse/NewsFilterRail.svelte`

Dumb component (callback-prop pattern, mirrors `MarketFilterRail`). Phase-1 filters: **Sektion** (7 + Alle), **Zeitraum** (today/week/month), **Saved** + **Unread** toggles. The **Quelle** "+ N mehr" row and the unread toggle's *functional* effect (needs read-state) land in Phase 3; in Phase 1 the unread toggle is rendered **disabled** with a tooltip ("Anmelden / bald verfügbar"). Saved toggle is gated on auth like marketplace.

- [ ] **Step 1: Write the component**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import { scrollFade } from '../../../../lib/scrollFade';
  import { SEKTION_KEYS, type SektionKey } from '../../../../lib/newsboard/newsTaxonomy';

  let {
    activeSektion = null,
    activeZeitraum = 'today',
    savedOnly = false,
    isAuthenticated = false,
    onSektionChange = (_s: SektionKey | null) => {},
    onZeitraumChange = (_z: string) => {},
    onSavedToggle = (_v: boolean) => {},
  }: {
    activeSektion?: SektionKey | null;
    activeZeitraum?: string;
    savedOnly?: boolean;
    isAuthenticated?: boolean;
    onSektionChange?: (s: SektionKey | null) => void;
    onZeitraumChange?: (z: string) => void;
    onSavedToggle?: (v: boolean) => void;
  } = $props();

  const ZEITRAUM: { id: string; key: string }[] = [
    { id: 'today', key: 'news.filter.today' },
    { id: 'week',  key: 'news.filter.week' },
    { id: 'month', key: 'news.filter.month' },
  ];
</script>

<section class="px-4 md:px-9" style="border-bottom:1px dashed var(--k-rule);">
  <!-- Row 1: Sektion (scrollFade peek on mobile) -->
  <div class="py-3 flex items-center gap-2">
    <span class="font-dmmono uppercase shrink-0" style="font-size:9.5px; color:var(--k-ink-mute); letter-spacing:0.12em; width:56px;">
      {$t['news.filter.sektion']}
    </span>
    <div use:scrollFade class="kiosk-scroll-fade no-scrollbar flex items-center gap-2 overflow-x-auto lg:flex-wrap lg:overflow-visible">
      <button type="button" onclick={() => onSektionChange(null)} aria-pressed={activeSektion === null}
        class="shrink-0 font-bricolage font-semibold"
        style="padding:5px 12px; font-size:12.5px; border-radius:var(--k-radius-pill);
               border:{activeSektion === null ? '2px solid var(--k-ink)' : '1.5px solid var(--k-rule)'};
               background:{activeSektion === null ? 'var(--k-ink)' : 'transparent'};
               color:{activeSektion === null ? 'var(--k-paper)' : 'var(--k-ink-mute)'};">
        {$t['news.filter.all']}
      </button>
      {#each SEKTION_KEYS as key (key)}
        <button type="button" onclick={() => onSektionChange(activeSektion === key ? null : key)} aria-pressed={activeSektion === key}
          class="shrink-0 font-bricolage font-semibold"
          style="padding:5px 12px; font-size:12.5px; border-radius:var(--k-radius-pill);
                 border:{activeSektion === key ? '2px solid var(--k-ink)' : '1.5px solid var(--k-rule)'};
                 background:{activeSektion === key ? 'var(--k-ink)' : 'transparent'};
                 color:{activeSektion === key ? 'var(--k-paper)' : 'var(--k-ink)'};">
          {$t[`news.sektion.${key}` as keyof typeof $t]}
        </button>
      {/each}
    </div>
  </div>

  <!-- Row 2: Zeitraum + Saved + Unread -->
  <div class="pb-3 flex items-center gap-3 flex-wrap">
    <span class="font-dmmono uppercase shrink-0" style="font-size:9.5px; color:var(--k-ink-mute); letter-spacing:0.12em;">
      {$t['news.filter.zeitraum']}
    </span>
    {#each ZEITRAUM as z (z.id)}
      <button type="button" onclick={() => onZeitraumChange(z.id)} aria-pressed={activeZeitraum === z.id}
        class="shrink-0 font-bricolage font-semibold"
        style="padding:5px 12px; font-size:12.5px; border-radius:var(--k-radius-pill);
               border:{activeZeitraum === z.id ? '2px solid var(--k-ink)' : '1.5px solid var(--k-rule)'};
               background:{activeZeitraum === z.id ? 'var(--k-ink)' : 'transparent'};
               color:{activeZeitraum === z.id ? 'var(--k-paper)' : 'var(--k-ink)'};">
        {$t[z.key as keyof typeof $t]}
      </button>
    {/each}

    <div class="flex-1"></div>

    <button type="button" onclick={() => onSavedToggle(!savedOnly)} disabled={!isAuthenticated}
      title={!isAuthenticated ? $t['news.filter.saved.gated'] : undefined} aria-pressed={savedOnly}
      class="shrink-0 font-bricolage font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      style="padding:5px 13px; font-size:12.5px; border-radius:var(--k-radius-pill);
             border:{savedOnly ? '2px solid var(--k-ink)' : '2px dashed var(--k-rule)'};
             background:{savedOnly ? 'var(--k-ink)' : 'transparent'};
             color:{savedOnly ? 'var(--k-paper)' : 'var(--k-ink-soft)'};">
      ☆ {$t['news.filter.saved']}
    </button>

    <!-- Unread toggle: rendered but disabled in Phase 1 (needs read-state, Phase 3) -->
    <button type="button" disabled title={$t['news.filter.unread.soon']}
      class="shrink-0 font-bricolage font-semibold opacity-50 cursor-not-allowed"
      style="padding:5px 13px; font-size:12.5px; border-radius:var(--k-radius-pill);
             border:2px dashed var(--k-rule); background:transparent; color:var(--k-ink-soft);">
      ● {$t['news.filter.unread']}
    </button>
  </div>
</section>
```

- [ ] **Step 2: Type-check + commit**

```bash
git add src/components/newsboard/kiosk/browse/NewsFilterRail.svelte
git commit -m "feat(newsboard): filter rail (sektion/zeitraum/saved; unread disabled until phase 3)"
```

---

## Task 17: State components

**Files:**
- Create: `src/components/newsboard/kiosk/states/NewsSkeleton.svelte`
- Create: `src/components/newsboard/kiosk/states/NewsEmptyToday.svelte`
- Create: `src/components/newsboard/kiosk/states/NewsEmptySaved.svelte`
- Create: `src/components/newsboard/kiosk/states/NewsError.svelte`
- Create: `src/components/newsboard/kiosk/states/NewsDegradedBanner.svelte`

(Offline/cached state 05 needs a service worker → deferred to Phase 3; note in CLAUDE.md.)

- [ ] **Step 1: `NewsSkeleton.svelte` (state 01)**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
</script>

<div style="padding:20px 36px 40px;">
  {#each [0, 1, 2] as i (i)}
    <div style="margin-bottom:16px; opacity:{1 - i * 0.18};">
      <div class="flex" style="gap:6px; margin-bottom:6px;">
        <div style="width:40px; height:12px; background:var(--k-paper-soft); border-radius:3px;"></div>
        <div style="width:70px; height:12px; background:var(--k-paper-soft); border-radius:3px;"></div>
      </div>
      <div style="height:20px; background:var(--k-paper-soft); border-radius:3px; margin-bottom:6px; width:85%;"></div>
      <div style="height:20px; background:var(--k-paper-soft); border-radius:3px; margin-bottom:8px; width:60%;"></div>
      <div style="height:11px; background:var(--k-paper-soft); border-radius:3px; margin-bottom:4px; width:95%;"></div>
      <div style="height:11px; background:var(--k-paper-soft); border-radius:3px; width:70%;"></div>
    </div>
  {/each}
  <div class="font-dmmono text-center" style="font-size:10px; color:var(--k-ink-mute); letter-spacing:0.1em; margin-top:8px;">
    ↻ {$t['news.state.loading']}
  </div>
</div>
```

- [ ] **Step 2: `NewsEmptyToday.svelte` (state 02)**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
</script>

<div class="text-center" style="padding:48px 16px;">
  <div class="font-instrument italic" style="font-size:56px; color:var(--k-ink-mute); line-height:1; margin-bottom:14px;">—</div>
  <div class="font-bricolage" style="font-size:15px; font-weight:700; margin-bottom:6px; color:var(--k-ink);">
    {$t['news.state.emptyToday.title']}
  </div>
  <div class="font-instrument italic" style="font-size:12.5px; color:var(--k-ink-soft); line-height:1.45; max-width:30ch; margin:0 auto;">
    {$t['news.state.emptyToday.body']}
  </div>
</div>
```

- [ ] **Step 3: `NewsEmptySaved.svelte` (state 03)**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import KioskBtn from '../../../forum/kiosk/KioskBtn.svelte';
  let { onBack = () => {} }: { onBack?: () => void } = $props();
</script>

<div class="text-center" style="padding:46px 16px;">
  <div class="font-bricolage" style="font-size:56px; line-height:1; color:var(--k-ink-mute); margin-bottom:14px;">☐</div>
  <div class="font-bricolage" style="font-size:15px; font-weight:700; margin-bottom:6px;">{$t['news.state.emptySaved.title']}</div>
  <div class="font-instrument italic" style="font-size:12.5px; color:var(--k-ink-soft); line-height:1.45; max-width:28ch; margin:0 auto 14px;">
    {$t['news.state.emptySaved.body']}
  </div>
  <KioskBtn size="sm" variant="secondary" onclick={onBack}>{$t['news.state.emptySaved.cta']}</KioskBtn>
</div>
```

- [ ] **Step 4: `NewsError.svelte` (state 04)**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import KioskBtn from '../../../forum/kiosk/KioskBtn.svelte';
  let { onRetry = () => {} }: { onRetry?: () => void } = $props();
</script>

<div style="padding:24px 36px;">
  <div style="padding:16px; border:1.5px solid var(--k-danger); background:var(--k-paper-soft); border-radius:var(--k-radius-md);">
    <div class="font-dmmono" style="font-size:10px; color:var(--k-danger); letter-spacing:0.12em; margin-bottom:6px;">
      ⚠ {$t['news.state.error.kicker']}
    </div>
    <div class="font-bricolage" style="font-size:14px; font-weight:700; margin-bottom:6px;">{$t['news.state.error.title']}</div>
    <div class="font-instrument italic" style="font-size:12px; color:var(--k-ink-soft); line-height:1.4; margin-bottom:10px;">
      {$t['news.state.error.body']}
    </div>
    <KioskBtn size="sm" onclick={onRetry}>{$t['news.state.error.retry']}</KioskBtn>
  </div>
</div>
```

- [ ] **Step 5: `NewsDegradedBanner.svelte` (state 06 — banner above feed, NOT a full state)**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
</script>

<div class="mx-4 md:mx-9 font-dmmono" style="margin-top:12px; padding:8px 12px; background:var(--k-warn);
     border:var(--k-border-ink); border-radius:var(--k-radius-sm); font-size:10px; color:var(--k-ink);
     letter-spacing:0.06em; box-shadow:2px 2px 0 var(--k-ink);">
  ⚠ {$t['news.state.degraded']}
</div>
```

- [ ] **Step 6: Type-check + commit**

Run: `pnpm type-check 2>&1 | grep -i "newsboard/kiosk/states" || echo "clean"`
Expected: `clean`

```bash
git add src/components/newsboard/kiosk/states/
git commit -m "feat(newsboard): display/fetch state components (01-04, 06)"
```

---

## Task 18: Orchestrator — `NewsboardIndexInner.svelte`

**Files:**
- Create: `src/components/newsboard/kiosk/NewsboardIndexInner.svelte`

The island: fetches `/api/news` client-side (seq-guarded like marketplace), maps DB items → `NewsVM` via resolvers, runs the state machine, renders masthead + filter rail + lead + chrono-bucketed feed, and wires save/unsave to the existing `POST /api/news/save`.

- [ ] **Step 1: Write the orchestrator**

```svelte
<script lang="ts">
  import { t, locale } from '../../../lib/kiosk-i18n';
  import { showToast } from '../../../utils/toast';
  import {
    resolveSektion, resolveQuelle, type NewsVM, type SektionKey,
  } from '../../../lib/newsboard/newsTaxonomy';
  import { chronoBucket } from '../../../lib/newsboard/newsFormat';

  import NewsMasthead from './browse/NewsMasthead.svelte';
  import NewsTitleBlock from './browse/NewsTitleBlock.svelte';
  import NewsFilterRail from './browse/NewsFilterRail.svelte';
  import NewsCard from './browse/NewsCard.svelte';
  import NewsCardLead from './browse/NewsCardLead.svelte';
  import DateDivider from './browse/DateDivider.svelte';
  import NewsSkeleton from './states/NewsSkeleton.svelte';
  import NewsEmptyToday from './states/NewsEmptyToday.svelte';
  import NewsEmptySaved from './states/NewsEmptySaved.svelte';
  import NewsError from './states/NewsError.svelte';
  import NewsDegradedBanner from './states/NewsDegradedBanner.svelte';

  let {
    issue,
    degraded = false,
    currentUserId = null,
  }: { issue: number; degraded?: boolean; currentUserId?: string | null } = $props();

  const isAuth = $derived(!!currentUserId);

  // Filters
  let activeSektion = $state<SektionKey | null>(null);
  // Default to a 1-week window so the HEUTE/GESTERN/FRÜHER dividers have content
  // (RSS publishedAt often predates the fetch day). The masthead "Artikel heute"
  // still counts only today's bucket. The Zeitraum filter re-fetches the window.
  let activeZeitraum = $state<string>('week');
  let savedOnly = $state(false);

  // Data
  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let articles = $state<NewsVM[]>([]);
  let savedIds = $state<Set<string>>(new Set());
  let seq = 0;

  // DB NewsItem → view-model.
  function toVM(it: any): NewsVM {
    const summary = it.aiSummary || it.description || '';
    return {
      id: String(it._id),
      title: it.title,
      titleEN: it.titleEN,
      dek: (it.description || '').slice(0, 180),
      summary: Array.isArray(summary) ? summary[0] : summary,
      quelle: resolveQuelle(it.sourceName, it.source),
      sektion: resolveSektion(it.aiCategory),
      imageUrl: it.imageUrl || '',
      sourceUrl: it.sourceUrl,
      publishedAt: it.publishedAt ?? it.fetchedAt ?? new Date().toISOString(),
      fetchDate: it.fetchDate,
      submitterName: it.submittedBy?.name,
      forumLinks: 0,        // Phase 3
      saved: savedIds.has(String(it._id)),
      read: false,          // Phase 3
      archived: false,      // Phase 3
    };
  }

  // Map Zeitraum → the API's dateFrom (ISO). today=last 1d, week=7d, month=30d.
  function zeitraumDateFrom(z: string): string | undefined {
    const now = Date.now();
    const days = z === 'today' ? 1 : z === 'week' ? 7 : z === 'month' ? 30 : 0;
    if (!days) return undefined;
    return new Date(now - days * 86_400_000).toISOString().slice(0, 10);
  }

  async function refetch() {
    const mySeq = ++seq;
    status = 'loading';
    try {
      // saved IDs first (so toVM resolves `saved` correctly).
      // GET /api/news/save → { savedIds: string[] }.
      if (isAuth) {
        try {
          const sres = await fetch('/api/news/save');
          if (sres.ok) {
            const sj = await sres.json();
            savedIds = new Set((sj.savedIds ?? []).map((x: any) => String(x)));
          }
        } catch { /* non-fatal */ }
      }
      const params = new URLSearchParams({ limit: '40', sortBy: 'approvedAt', sortOrder: 'desc' });
      const from = zeitraumDateFrom(activeZeitraum);
      if (from) params.set('dateFrom', from);
      const res = await fetch(`/api/news?${params.toString()}`);
      if (!res.ok) throw new Error(`news fetch ${res.status}`);
      const data = await res.json();
      if (mySeq !== seq) return; // stale
      const items = data.news ?? [];   // GET /api/news → { news: [...] }
      articles = items.map(toVM);
      status = 'ready';
    } catch {
      if (mySeq !== seq) return;
      status = 'error';
    }
  }

  // Initial load + re-fetch on time-window change. A Svelte `$effect` runs once
  // after mount and again whenever a tracked read changes — here `activeZeitraum`
  // (and `isAuth`, read synchronously inside refetch before the first await).
  // sektion + saved are client-side filters, so they don't trigger a refetch.
  // No separate onMount needed; the `seq` guard discards any overlapping fetch.
  $effect(() => { activeZeitraum; refetch(); });

  // Derived view list
  const visible = $derived(
    articles
      .filter((a) => (activeSektion ? a.sektion === activeSektion : true))
      .filter((a) => (savedOnly ? a.saved : true))
  );
  const lead = $derived(!activeSektion && !savedOnly ? visible[0] : undefined);
  const rest = $derived(lead ? visible.slice(1) : visible);

  const today = $derived(rest.filter((a) => chronoBucket(a.publishedAt) === 'today'));
  const yesterday = $derived(rest.filter((a) => chronoBucket(a.publishedAt) === 'yesterday'));
  const older = $derived(rest.filter((a) => chronoBucket(a.publishedAt) === 'older'));

  // "X Artikel heute" must reflect only today's bucket, even when a wider
  // Zeitraum window is loaded.
  const todayCount = $derived(articles.filter((a) => chronoBucket(a.publishedAt) === 'today').length);
  const sourceCount = $derived(degraded ? 7 : 9);

  async function handleSave(id: string) {
    if (!isAuth) { showToast($t['news.save.login'], { type: 'info' }); return; }
    const wasSaved = savedIds.has(id);
    // optimistic
    const next = new Set(savedIds);
    wasSaved ? next.delete(id) : next.add(id);
    savedIds = next;
    articles = articles.map((a) => (a.id === id ? { ...a, saved: !wasSaved } : a));
    try {
      const res = await fetch('/api/news/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // POST /api/news/save requires BOTH newsId and action ('save'|'unsave').
        body: JSON.stringify({ newsId: id, action: wasSaved ? 'unsave' : 'save' }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // rollback
      const rb = new Set(savedIds);
      wasSaved ? rb.add(id) : rb.delete(id);
      savedIds = rb;
      articles = articles.map((a) => (a.id === id ? { ...a, saved: wasSaved } : a));
      showToast($t['news.save.error'], { type: 'error' });
    }
  }
</script>

<NewsTitleBlock />
<NewsMasthead {issue} articleCount={todayCount} {sourceCount} {degraded} />
{#if degraded}<NewsDegradedBanner />{/if}
<NewsFilterRail
  {activeSektion} {activeZeitraum} {savedOnly} isAuthenticated={isAuth}
  onSektionChange={(s) => (activeSektion = s)}
  onZeitraumChange={(z) => (activeZeitraum = z)}
  onSavedToggle={(v) => (savedOnly = v)}
/>

{#if status === 'loading'}
  <NewsSkeleton />
{:else if status === 'error'}
  <NewsError onRetry={refetch} />
{:else if visible.length === 0}
  {#if savedOnly}
    <NewsEmptySaved onBack={() => (savedOnly = false)} />
  {:else}
    <NewsEmptyToday />
  {/if}
{:else}
  <div style="padding:20px 36px 40px; display:flex; flex-direction:column; gap:16px;">
    {#if lead}<NewsCardLead article={lead} onSave={handleSave} canSave={isAuth} />{/if}
    {#if today.length}
      <DateDivider label={$t['news.divider.today']} />
      {#each today as a (a.id)}<NewsCard article={a} onSave={handleSave} canSave={isAuth} />{/each}
    {/if}
    {#if yesterday.length}
      <DateDivider label={$t['news.divider.yesterday']} />
      {#each yesterday as a (a.id)}<NewsCard article={a} onSave={handleSave} canSave={isAuth} />{/each}
    {/if}
    {#if older.length}
      <DateDivider label={$t['news.divider.older']} />
      {#each older as a (a.id)}<NewsCard article={a} onSave={handleSave} canSave={isAuth} />{/each}
    {/if}
  </div>
{/if}
```

NOTE — API + helper shapes (locked during the plan audit, 2026-06-19; re-confirm only if drifted):
- `GET /api/news` → `{ news: [...] }` (accessor `data.news`).
- `GET /api/news/save` → `{ savedIds: string[] }`.
- `POST /api/news/save` → body `{ newsId, action: 'save' | 'unsave' }` (both required; missing `action` → 400).
- Toast: `showToast(message, { type })` from `src/utils/toast.ts` (message-first; `type` ∈ success/error/info/warning/message). Helpers `showSuccess`/`showError` also exist.
- The submitter field on populated user articles is `submittedBy?.name` (cosmetic in P1; if absent the meta line just omits the avatar).

- [ ] **Step 2: Re-confirm the locked API shape still holds (sanity, not discovery)**

Run: `curl -s "http://localhost:3000/api/news?limit=1" | head -c 200`
Expected: a `{"news":[...]}` envelope. The shapes were locked during the plan audit (see the NOTE above); this step only catches drift since then. If it has drifted, re-lock before continuing.

- [ ] **Step 3: Type-check**

Run: `pnpm type-check 2>&1 | grep -i "NewsboardIndexInner" || echo "clean"`
Expected: `clean`

- [ ] **Step 4: Commit**

```bash
git add src/components/newsboard/kiosk/NewsboardIndexInner.svelte
git commit -m "feat(newsboard): index orchestrator island (fetch + filters + save + states)"
```

---

## Task 19: Page — rewrite `newsboard.astro`

**Files:**
- Modify: `src/pages/newsboard.astro`

- [ ] **Step 1: Replace the whole file**

```astro
---
import KioskLayout from '../layouts/KioskLayout.astro';
import { getSession } from 'auth-astro/server';
import { computeIssueNumber } from '../lib/newsboard/newsFormat';
import NewsboardIndexInner from '../components/newsboard/kiosk/NewsboardIndexInner.svelte';

// Per-user save state makes caching unsafe (mirrors marketplace).
Astro.response.headers.set('Cache-Control', 'no-store, must-revalidate');

const session = await getSession(Astro.request);
const userId = (session?.user as any)?.id ?? null;

// Server-fixed values (handoff: issue # computed server-side, not per client render).
const issue = computeIssueNumber(new Date());
const degraded = !import.meta.env.NEWSDATA_API_KEY;
---

<KioskLayout title="News — Mahalle" description="Schillerkiez Kurier — die tägliche Zusammenfassung aus dem Kiez." page="newsboard">
  <NewsboardIndexInner
    client:only="svelte"
    issue={issue}
    degraded={degraded}
    currentUserId={userId}
  />
</KioskLayout>
```

NOTE: `client:only="svelte"` (not `client:load`) — the feed is fully interactive with no SEO benefit at the index level; matches `ForumWrapper`'s rationale. SSR-prefetch for SEO is a Phase-2 enhancement.

- [ ] **Step 2: Build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 3: Browser verification (the critical check for islands)**

With the user's dev server on :3000:

```bash
playwright-cli open "http://localhost:3000/newsboard"
# wait for hydration, then re-snapshot:
playwright-cli wait-for --text "Schillerkiez Kurier"
playwright-cli screenshot
playwright-cli console
playwright-cli close
```

Expected: masthead "Schillerkiez Kurier" + issue number renders; filter rail + at least the skeleton→feed transition visible; **no console errors** (especially no "failed to fetch dynamically imported module" — that signals server-only-import bleed). If the `<main>` is empty after hydration, check console for a bleed error and verify `newsTaxonomy.ts`/`newsFormat.ts` import nothing server-only.

- [ ] **Step 4: Commit**

```bash
git add src/pages/newsboard.astro
git commit -m "feat(newsboard): mount kiosk index on KioskLayout"
```

---

## Task 20: Minimal submit route (no-regression)

**Files:**
- Create: `src/pages/newsboard/submit.astro`
- Create: `src/components/newsboard/kiosk/submit/NewsSubmitMinimal.svelte`

A straight kiosk-skinned form over the existing `POST /api/news/submit` (current 5-field schema: title, description, sourceUrl, sourceName, optional submitterComment). **No** quota indicator / section picker / image upload yet — those are Phase 2. Auth-gated (redirect to `/login` if no session, matching the existing submit behaviour).

- [ ] **Step 1: `NewsSubmitMinimal.svelte`**

```svelte
<script lang="ts">
  import { t } from '../../../../lib/kiosk-i18n';
  import { showToast } from '../../../../utils/toast';
  import KioskBtn from '../../../forum/kiosk/KioskBtn.svelte';

  let title = $state('');
  let description = $state('');
  let sourceUrl = $state('');
  let sourceName = $state('');
  let submitting = $state(false);

  const valid = $derived(title.trim().length >= 5 && description.trim().length >= 10 && /^https?:\/\//.test(sourceUrl));

  async function submit() {
    if (!valid || submitting) return;
    submitting = true;
    try {
      const res = await fetch('/api/news/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, sourceUrl, sourceName: sourceName || new URL(sourceUrl).hostname }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'submit failed');
      }
      showToast($t['news.submit.success'], { type: 'success' });
      window.location.href = '/newsboard';
    } catch (e) {
      showToast((e as Error).message || $t['news.submit.error'], { type: 'error' });
      submitting = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto px-4 md:px-9" style="padding-top:30px; padding-bottom:50px;">
  <div class="font-dmmono uppercase" style="font-size:11px; color:var(--k-ink); letter-spacing:0.16em; margin-bottom:6px;">
    {$t['news.submit.kicker']}
  </div>
  <h1 class="font-bricolage" style="font-size:clamp(30px,5vw,44px); font-weight:800; letter-spacing:-0.03em; line-height:1; margin:0 0 10px;">
    {@html $t['news.submit.heading']}
  </h1>
  <p class="font-instrument italic" style="font-size:16px; color:var(--k-ink-soft); margin:0 0 22px; max-width:55ch;">
    {$t['news.submit.intro']}
  </p>

  <div class="flex flex-col" style="gap:18px;">
    <label class="flex flex-col" style="gap:6px;">
      <span class="font-dmmono uppercase" style="font-size:10px; letter-spacing:0.12em; font-weight:700;">{$t['news.submit.field.title']}</span>
      <input bind:value={title} placeholder={$t['news.submit.ph.title']} maxlength="200"
        class="font-bricolage" style="padding:8px 10px; background:var(--k-paper-soft); border:1px solid var(--k-rule); border-radius:var(--k-radius-md);" />
    </label>
    <label class="flex flex-col" style="gap:6px;">
      <span class="font-dmmono uppercase" style="font-size:10px; letter-spacing:0.12em; font-weight:700;">{$t['news.submit.field.desc']}</span>
      <textarea bind:value={description} rows="4" placeholder={$t['news.submit.ph.desc']} maxlength="1000"
        class="font-bricolage" style="padding:10px; background:var(--k-paper-soft); border:1px solid var(--k-rule); border-radius:var(--k-radius-md);"></textarea>
    </label>
    <label class="flex flex-col" style="gap:6px;">
      <span class="font-dmmono uppercase" style="font-size:10px; letter-spacing:0.12em; font-weight:700;">{$t['news.submit.field.url']}</span>
      <input bind:value={sourceUrl} placeholder="https://" type="url"
        class="font-dmmono" style="padding:8px 10px; background:var(--k-paper-soft); border:1px solid var(--k-rule); border-radius:var(--k-radius-md);" />
    </label>
    <label class="flex flex-col" style="gap:6px;">
      <span class="font-dmmono uppercase" style="font-size:10px; letter-spacing:0.12em; font-weight:700;">{$t['news.submit.field.source']}</span>
      <input bind:value={sourceName} placeholder={$t['news.submit.ph.source']} maxlength="100"
        class="font-bricolage" style="padding:8px 10px; background:var(--k-paper-soft); border:1px solid var(--k-rule); border-radius:var(--k-radius-md);" />
    </label>
  </div>

  <div class="flex items-center" style="gap:8px; margin-top:24px;">
    <KioskBtn onclick={submit} disabled={!valid || submitting}>
      {submitting ? $t['news.submit.submitting'] : $t['news.submit.cta']}
    </KioskBtn>
    <KioskBtn variant="ghost" href="/newsboard">{$t['news.submit.cancel']}</KioskBtn>
  </div>

  <div class="font-dmmono" style="margin-top:18px; padding:10px 12px; background:var(--k-paper-soft); border:1px dashed var(--k-rule); border-radius:var(--k-radius-sm); font-size:9.5px; color:var(--k-ink-mute); line-height:1.55;">
    ↳ {$t['news.submit.modnote']}
  </div>
</div>
```

- [ ] **Step 2: `submit.astro` (auth-gated route)**

```astro
---
import KioskLayout from '../../layouts/KioskLayout.astro';
import { getSession } from 'auth-astro/server';
import NewsSubmitMinimal from '../../components/newsboard/kiosk/submit/NewsSubmitMinimal.svelte';

const session = await getSession(Astro.request);
if (!session?.user) return Astro.redirect('/login');
---

<KioskLayout title="News einreichen — Mahalle" description="Eine Nachricht aus dem Kiez einreichen." page="newsboard">
  <NewsSubmitMinimal client:only="svelte" />
</KioskLayout>
```

- [ ] **Step 3: Build + browser verify**

Run: `pnpm build`
Expected: PASS.

```bash
playwright-cli open "http://localhost:3000/newsboard/submit"   # (with an authed session cookie set; else expect /login redirect)
playwright-cli close
```

Expected: the kiosk submit form renders (when authed) or redirects to `/login` (when not).

- [ ] **Step 4: Commit**

```bash
git add src/pages/newsboard/submit.astro src/components/newsboard/kiosk/submit/NewsSubmitMinimal.svelte
git commit -m "feat(newsboard): minimal kiosk submit route (no-regression)"
```

---

## Task 21: i18n keys

**Files:**
- Modify: `src/lib/kiosk-i18n.ts`

Add every `news.*` key referenced above to BOTH the `de` object (before line ~883 `const en`) and the `en` object (before the `export const t` line ~1629). Keys must match exactly in both blocks.

- [ ] **Step 1: Add the German keys (in the `de` object)**

```ts
  // ── Newsboard ─────────────────────────────────────────────
  'news.sektion.politik': 'Politik',
  'news.sektion.kultur': 'Kultur',
  'news.sektion.lokales': 'Lokales',
  'news.sektion.wirtschaft': 'Wirtschaft',
  'news.sektion.verkehr': 'Verkehr',
  'news.sektion.klima': 'Klima',
  'news.sektion.sport': 'Sport',
  'news.masthead.edition': 'Tagesausgabe',
  'news.masthead.issueAbbr': 'Nr.',
  'news.masthead.tagline': 'Schillerkiezs tägliche Zusammenfassung',
  'news.masthead.articles': 'Artikel heute',
  'news.masthead.sources': 'Quellen',
  'news.masthead.curated': 'kuratiert',
  'news.masthead.degraded': 'RSS-only · einige Quellen heute nicht erreichbar',
  'news.titleblock.kicker': 'NEWS · AUS DEM KIEZ',
  'news.titleblock.heading': 'Was <span class="font-instrument italic font-normal">passiert</span> heute im Kiez?',
  'news.titleblock.submit': '+ news einreichen',
  'news.readmore': 'weiterlesen →',
  'news.filter.sektion': 'SEKTION',
  'news.filter.zeitraum': 'ZEITRAUM',
  'news.filter.all': 'Alle',
  'news.filter.today': 'Heute',
  'news.filter.week': 'Diese Woche',
  'news.filter.month': 'Diesen Monat',
  'news.filter.saved': 'Gespeichert',
  'news.filter.saved.gated': 'Anmelden, um gespeicherte Artikel zu sehen.',
  'news.filter.unread': 'Ungelesen',
  'news.filter.unread.soon': 'Bald verfügbar — Lesestatus für angemeldete Nutzer:innen.',
  'news.divider.today': 'HEUTE',
  'news.divider.yesterday': 'GESTERN',
  'news.divider.older': 'FRÜHER',
  'news.noimage.short': 'kein bild',
  'news.noimage.lead': 'kein bild · headline trägt',
  'news.state.loading': 'kuratiere heutige Auswahl…',
  'news.state.emptyToday.title': 'Heute ist nichts Wichtiges passiert.',
  'news.state.emptyToday.body': 'Die Kuration hat keine kiez-relevanten Artikel gefunden. Schau morgen wieder vorbei.',
  'news.state.emptySaved.title': 'Deine Leseliste ist leer.',
  'news.state.emptySaved.body': 'Tippe ☐ auf einem Artikel — er landet hier.',
  'news.state.emptySaved.cta': '← zurück zum Feed',
  'news.state.error.kicker': 'FEHLER',
  'news.state.error.title': 'News konnten nicht geladen werden.',
  'news.state.error.body': 'Die Verbindung zu den Quellen ist gerade gestört.',
  'news.state.error.retry': 'erneut versuchen',
  'news.state.degraded': 'RSS-only · NewsData heute nicht erreichbar',
  'news.save.login': 'Anmelden, um Artikel zu speichern.',
  'news.save.error': 'Konnte nicht gespeichert werden.',
  'news.submit.kicker': 'NEWS EINREICHEN',
  'news.submit.heading': 'Eine Nachricht aus dem <span class="font-instrument italic font-normal">Kiez</span>.',
  'news.submit.intro': 'Etwas, das wir wissen sollten? Eine Initiative, ein Bauprojekt, ein neues Café.',
  'news.submit.field.title': 'Überschrift',
  'news.submit.field.desc': 'Kurzbeschreibung',
  'news.submit.field.url': 'Quelle · Link',
  'news.submit.field.source': 'Quellenname',
  'news.submit.ph.title': 'Worum geht’s?',
  'news.submit.ph.desc': 'Worum geht’s genauer? Ein, zwei Sätze.',
  'news.submit.ph.source': 'z. B. Tagesspiegel',
  'news.submit.cta': 'zur prüfung einreichen →',
  'news.submit.submitting': 'wird eingereicht…',
  'news.submit.cancel': 'abbrechen',
  'news.submit.success': 'Eingereicht — läuft jetzt durch die Moderation.',
  'news.submit.error': 'Einreichen fehlgeschlagen.',
  'news.submit.modnote': 'Nach dem Absenden läuft AI-Moderation (Profanität / Hass / Spam / Werbung). Freigabe i. d. R. < 5 Min.',
```

- [ ] **Step 2: Add the English keys (in the `en` object)**

```ts
  // ── Newsboard ─────────────────────────────────────────────
  'news.sektion.politik': 'Politics',
  'news.sektion.kultur': 'Culture',
  'news.sektion.lokales': 'Local',
  'news.sektion.wirtschaft': 'Economy',
  'news.sektion.verkehr': 'Transit',
  'news.sektion.klima': 'Climate',
  'news.sektion.sport': 'Sport',
  'news.masthead.edition': 'Daily edition',
  'news.masthead.issueAbbr': 'No.',
  'news.masthead.tagline': "Schillerkiez's daily digest",
  'news.masthead.articles': 'articles today',
  'news.masthead.sources': 'sources',
  'news.masthead.curated': 'AI-curated',
  'news.masthead.degraded': 'RSS-only · some sources unreachable today',
  'news.titleblock.kicker': 'NEWS · FROM THE KIEZ',
  'news.titleblock.heading': "What’s <span class=\"font-instrument italic font-normal\">happening</span> in the Kiez today?",
  'news.titleblock.submit': '+ submit news',
  'news.readmore': 'read more →',
  'news.filter.sektion': 'SECTION',
  'news.filter.zeitraum': 'TIMEFRAME',
  'news.filter.all': 'All',
  'news.filter.today': 'Today',
  'news.filter.week': 'This week',
  'news.filter.month': 'This month',
  'news.filter.saved': 'Saved',
  'news.filter.saved.gated': 'Sign in to see saved articles.',
  'news.filter.unread': 'Unread',
  'news.filter.unread.soon': 'Coming soon — read state for signed-in users.',
  'news.divider.today': 'TODAY',
  'news.divider.yesterday': 'YESTERDAY',
  'news.divider.older': 'EARLIER',
  'news.noimage.short': 'no image',
  'news.noimage.lead': 'no image · headline carries',
  'news.state.loading': "curating today’s selection…",
  'news.state.emptyToday.title': 'Nothing notable today.',
  'news.state.emptyToday.body': 'Curation found no Kiez-relevant articles. Check back tomorrow.',
  'news.state.emptySaved.title': 'Your reading list is empty.',
  'news.state.emptySaved.body': "Tap ☐ on an article — it’ll land here.",
  'news.state.emptySaved.cta': '← back to feed',
  'news.state.error.kicker': 'ERROR',
  'news.state.error.title': 'Could not load the news.',
  'news.state.error.body': 'The connection to the sources is disrupted right now.',
  'news.state.error.retry': 'try again',
  'news.state.degraded': 'RSS-only · NewsData unreachable today',
  'news.save.login': 'Sign in to save articles.',
  'news.save.error': 'Could not save.',
  'news.submit.kicker': 'SUBMIT NEWS',
  'news.submit.heading': 'News from the <span class="font-instrument italic font-normal">Kiez</span>.',
  'news.submit.intro': 'Something we should know? An initiative, a construction project, a new café.',
  'news.submit.field.title': 'Headline',
  'news.submit.field.desc': 'Short description',
  'news.submit.field.url': 'Source · link',
  'news.submit.field.source': 'Source name',
  'news.submit.ph.title': "What’s it about?",
  'news.submit.ph.desc': "What’s it about more specifically? A sentence or two.",
  'news.submit.ph.source': 'e.g. Tagesspiegel',
  'news.submit.cta': 'submit for review →',
  'news.submit.submitting': 'submitting…',
  'news.submit.cancel': 'cancel',
  'news.submit.success': 'Submitted — now running through moderation.',
  'news.submit.error': 'Submission failed.',
  'news.submit.modnote': 'After submission, AI moderation runs (profanity / hate / spam / promotion). Approval usually < 5 min.',
```

- [ ] **Step 3: Verify no NEW type errors beyond the i18n baseline**

Run: `pnpm type-check 2>&1 | grep -c "error TS"`
Expected: the count is ≤ the pre-work baseline (record the baseline before Task 0). New `news.*` keys exist in both dicts, so no new "property does not exist" errors should appear for them.

- [ ] **Step 4: Commit**

```bash
git add src/lib/kiosk-i18n.ts
git commit -m "feat(newsboard): i18n keys (de + en)"
```

---

## Task 22: Subtree docs + root pointer

**Files:**
- Create: `src/components/newsboard/kiosk/CLAUDE.md`
- Modify: `CLAUDE.md` (root — add a pointer under the existing Newsboard line)

- [ ] **Step 1: Write `src/components/newsboard/kiosk/CLAUDE.md`**

Document: the folder layout; the resolver strategy (`newsTaxonomy.ts` is pure — never import server-only modules into it); the issue-number formula (server-side only); the Phase-1 inert components (`HeatChip` count=0, `ReadDot` always unread, unread filter disabled); cards link `weiterlesen`→external source (design-correct, not a regression); the no-image placeholder is first-class; degraded = `!NEWSDATA_API_KEY`; offline state (05) deferred (needs SW); the masthead once-per-day intro animation deferred (cosmetic); and the Phase 2/3 roadmap. Also record the `tokens.css` newsboard `--k-accent` → ink fix.

- [ ] **Step 2: Update root `CLAUDE.md`**

Under the existing `### Newsboard` pointer (which currently points to `src/pages/api/news/CLAUDE.md`), add: "Kiosk UI: see `src/components/newsboard/kiosk/CLAUDE.md` — full notes load when working in that subtree. The kiosk index lives at `src/pages/newsboard.astro` + `src/components/newsboard/kiosk/`."

- [ ] **Step 3: Commit**

```bash
git add src/components/newsboard/kiosk/CLAUDE.md CLAUDE.md
git commit -m "docs(newsboard): kiosk subtree notes + root pointer"
```

---

## Task 23: End-to-end verification + delete legacy React Newsboard

**Files:**
- Delete: `src/components/ui/NewsCards.tsx`
- Delete: `src/components/NewsCardsWrapper.tsx`

- [ ] **Step 1: Confirm no remaining imports of the legacy components**

Run: `grep -rn "NewsCardsWrapper\|ui/NewsCards" src/ --include=*.astro --include=*.tsx --include=*.svelte`
Expected: no matches (Task 19 already removed the only importer). If any remain, fix before deleting.

- [ ] **Step 2: Full end-to-end browser pass (desktop + mobile)** on :3000

```bash
playwright-cli open "http://localhost:3000/newsboard"
playwright-cli wait-for --text "Schillerkiez Kurier"
playwright-cli screenshot                 # desktop feed: masthead + lead + dividers + cards
playwright-cli resize 390 844
playwright-cli screenshot                 # mobile: masthead collapses, filter rail peeks, cards stack
playwright-cli console                    # MUST be clean
playwright-cli close
```

Verify against the design intent:
- Masthead renders with correct issue number (today ≈ Nr. 168).
- Lead card + standard cards render; no-image articles show the dashed monogram placeholder (not a broken `<img>`).
- Section filter narrows the feed; Zeitraum refetches; Saved toggle gated when logged out.
- `weiterlesen` opens the source in a new tab.
- Save toggle (when logged in) flips + persists across reload (existing `savedNews`).
- Degraded banner appears iff `NEWSDATA_API_KEY` is unset in the dev env.
- Empty + error states reachable (test error by stopping the dev server mid-fetch, or temporarily pointing the fetch at a bad URL — then revert).

- [ ] **Step 3: Delete the legacy React components**

```bash
git rm src/components/ui/NewsCards.tsx src/components/NewsCardsWrapper.tsx
```

- [ ] **Step 4: Final build + type-check**

Run: `pnpm build && pnpm type-check 2>&1 | grep -c "error TS"`
Expected: build PASS; error count ≤ baseline.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(newsboard): remove legacy dark-glass React newsboard"
```

---

## Self-Review (completed against the handoff)

**Spec coverage (Phase-1 slice):**
- Masthead (issue#, article/source counts, kuratiert chip, degraded variant) → Task 14 ✓
- Carved accent = ink → Task 0 ✓
- 7-section + 9-source taxonomy (via resolvers, since DB lacks the enums) → Task 1, 3, 4 ✓
- Lead + standard feed cards, chrono dividers → Tasks 11–13, 18 ✓
- Filter rail (sektion/zeitraum/saved; unread deferred) → Task 16 ✓
- No-image first-class placeholder → Task 9 ✓
- Display + fetch states 01–04, 06 → Task 17 (05 offline deferred — needs SW; documented) ✓
- Save/unsave kept on existing `savedNews` → Task 18 ✓
- German curly-quote rule respected (used `’`/plain copy; no `„…"` literals in JS) ✓
- **Deferred to Phase 2/3 (out of this plan, by the user's phasing decision):** detail route, full submit (quota/section picker/image/preview), states 05/07/08/09, read-state decay, heat indicator, real `sektion` from `fetch-daily`, SSR-prefetch, masthead intro animation.

**Placeholder scan:** every code step contains complete, paste-ready code. The API/helper shapes that were originally left as "confirm at implementation time" are now **locked from the audit** (Task 18 NOTE): `GET /api/news` → `{news}`, `GET /api/news/save` → `{savedIds}`, `POST /api/news/save` → `{newsId, action}`, `showToast(message, {type})`. The only remaining runtime check is a drift sanity-curl (Task 18 Step 2).

**Audit fixes applied (2026-06-19):** corrected all 5 `showToast` calls to the real message-first signature; fixed the saved-IDs GET parse (`{savedIds}`, not a bare array); added the required `action` field to the save POST; locked the news list accessor to `data.news`; removed the redundant `onMount`+`$effect` double-fetch; made the masthead "Artikel heute" count only today's bucket and defaulted the window to a week so the chrono dividers render. Verified `font-bricolage/instrument/dmmono` are real Tailwind classes, `Dict = typeof de` (so keys go in `de` only), and `optimizeCloudinary` is the correct export.

**Type consistency:** `NewsVM`, `SektionKey`, `QuelleKey` are defined once in `newsTaxonomy.ts` and imported everywhere; resolver names (`resolveSektion`/`resolveQuelle`), helper names (`computeIssueNumber`/`formatRelativeTime`/`chronoBucket`), and i18n key strings are used identically across tasks. `KioskBtn` props (`variant`/`size`/`href`/`onclick`) match its actual source.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-19-newsboard-kiosk-redesign-phase1.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
