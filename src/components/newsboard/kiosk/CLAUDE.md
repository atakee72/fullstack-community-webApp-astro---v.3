# Newsboard (kiosk) notes

Loaded lazily when Claude reads/edits files in `src/components/newsboard/kiosk/`
(or any subtree). The root `CLAUDE.md` keeps a pointer here so it can be pulled in
when working on related files outside this dir (`src/pages/newsboard.astro`,
`src/pages/newsboard/submit.astro`, `src/lib/newsboard/*`).

This is the kiosk (paper/ink) Newsboard UI, shipped June 2026. It is the
"Schillerkiez Kurier" — a daily-newspaper presentation of the existing `news`
collection. The pre-kiosk React UI (`NewsCardsWrapper.tsx`, `ui/NewsCards.tsx`)
still exists; see `src/pages/api/news/CLAUDE.md` for the data/API side.

Phased plan: `docs/superpowers/plans/2026-06-19-newsboard-kiosk-redesign-phase1.md`.
This dir is **Phase 1** (index browse + minimal submit). Phases 2/3 listed at the
bottom.

## Pages

- **Index** = `src/pages/newsboard.astro` — `KioskLayout` with `page="newsboard"`,
  mounts `NewsboardIndexInner.svelte` with `client:only="svelte"`. Frontmatter
  computes server-fixed props (`issue`, `degraded`, `currentUserId`) and sets
  `Cache-Control: no-store` (per-user save state makes caching unsafe — mirrors
  marketplace).
- **Submit** = `src/pages/newsboard/submit.astro` → `submit/NewsSubmitInner.svelte`.
  Auth-gated: frontmatter redirects to `/login` when no session.

## Folder layout

- `NewsboardIndexInner.svelte` — orchestrator (fetch, filters, save, bucketing).
- `browse/` — `NewsMasthead`, `NewsTitleBlock`, `NewsFilterRail`, `NewsCard`,
  `NewsCardLead`, `DateDivider`.
- `primitives/` — `SourceChip`, `SektionTag`, `KuratiertChip`, `HeatChip`,
  `ReadDot`, `SaveToggle`, `ArticleImage`, `ArticleMeta`.
- `states/` — `NewsSkeleton`, `NewsEmptyToday`, `NewsEmptySaved`, `NewsError`,
  `NewsDegradedBanner`.
- `submit/` — `NewsSubmitInner`, `QuotaIndicator`, `SektionPicker`.

## Pure helpers — keep them dependency-pure

`src/lib/newsboard/newsTaxonomy.ts` and `newsFormat.ts` are **DEPENDENCY-PURE**
(no `mongodb`/`fs`/`auth` imports). Both the Astro page (server) and the Svelte
island (client) import them. **NEVER add a server-only import to these** — it would
bleed mongodb into the client bundle and silently break hydration (see root
CLAUDE.md "Server-only modules bleeding into client bundles"). They hold: the
taxonomy types/maps + resolvers, `computeIssueNumber`, `chronoBucket`,
`formatRelativeTime`, `formatFetchDate`, and the read-decay/heat constants.

## Taxonomy resolver strategy

The DB has **no** `sektion`/`quelle` enum fields. The design wants a fixed
7-section / 10-source taxonomy (`SektionKey` × `QuelleKey`). The resolvers map the
real free-string DB fields onto it at render time:

- `resolveSektion(aiCategory)` — substring-matches `aiCategory` → one of 7
  sektions; defaults to `'lokales'` (catch-all for neighborhood news).
- `resolveQuelle(sourceName, source)` — `source === 'user_submitted'` → `'user'`;
  otherwise matches `sourceName` → a known source key; defaults to `'newsdata'`
  (neutral styling for unknown RSS/API sources).

**Phase-3 follow-up:** have `src/pages/api/news/fetch-daily.ts` emit a real
`sektion` field so the resolver degrades to a fallback rather than the primary
classifier.

## Issue number — computed server-side

`computeIssueNumber(now)` = days since notional launch `2026-01-03`, **+1**. Seed
cross-check: `2026-05-24` = Nr. 142. Computed **server-side** in `newsboard.astro`
frontmatter and passed as the `issue` prop — never derived client-side per render
(handoff rule; keeps the number stable across re-renders/locales).

## Phase-1 inert components (pre-wired for Phase 3)

These render but are deliberately neutered now; Phase 3 flips them on without
re-touching the components:

- `HeatChip` is fed `forumLinks: 0` → `count < HEAT_THRESHOLD` (=2) → never shows.
- `ReadDot` always renders unread (wine dot).
- The FilterRail "Ungelesen" toggle is disabled.
- The orchestrator's `toVM()` hardcodes `forumLinks: 0, read: false, archived: false`.

## Cards link to the detail route; the detail page links OUT

As of Phase 2, the feed cards' headline + `weiterlesen` link to the **internal**
detail page `/newsboard/${id}` (same tab). The detail page's `weiterlesen bei …`
button is what links to the external `sourceUrl` (`target="_blank"`) — the
Newsboard never renders the full article inline.

## No-image placeholder is first-class

`ArticleImage` renders a dashed-border source monogram + "kein bild" when
`imageUrl` is empty (~15-20% of RSS articles ship no image). Don't treat the
empty-image branch as an error/edge — it's an intended visual.

## Degraded flag (NOT an error state)

`degraded = !import.meta.env.NEWSDATA_API_KEY` (server-side, in `newsboard.astro`).
When true it shows the amber RSS-only `NewsDegradedBanner` + a masthead note + a
7-source count (vs 9 normally). This is a normal operating mode, not an error.

## Orchestrator ↔ API contract

`NewsboardIndexInner.svelte` depends on these shapes:

- `GET /api/news` → `{ news: [...] }` (orchestrator passes
  `limit=40&sortBy=approvedAt&sortOrder=desc` + optional `dateFrom`).
- `GET /api/news/save` → `{ savedIds: string[] }`.
- `POST /api/news/save` → body `{ newsId, action: 'save' | 'unsave' }`.

Save is **optimistic with rollback** (mutates `savedIds` + `articles`, reverts on
non-OK). Toast helper is `showToast(message, { type })` from `src/utils/toast.ts`.

## Default time window = `week`

`activeZeitraum` defaults to `'week'` (not `'today'`) so the HEUTE/GESTERN/FRÜHER
dividers have content — RSS `publishedAt` often predates the fetch day. The
masthead "Artikel heute" count uses `todayCount`, which counts **only** today's
chrono bucket even though a wider window is loaded. Zeitraum change re-fetches the
window; sektion + savedOnly are client-side filters (no refetch).

## Tokens

- `tokens.css` `[data-page="newsboard"]` sets `--k-accent: var(--k-ink)` — the
  carved accent is **ink**, not ochre (per handoff). Don't revert to ochre.
- `tokens-newsboard.css` holds the sektion / quelle / read-decay / heat tokens
  (`--sektion-*`, `--quelle-*`, `--news-noimage-*`, `--news-heat-color`, etc.).

## Phase 2 (shipped, 2026-06-20)

Plan: `docs/superpowers/plans/2026-06-20-newsboard-kiosk-redesign-phase2.md`.

- **Detail route** `/newsboard/[id].astro` — SSR main column (kicker, H1, dek,
  source, hero image, body paragraphs, source-footer link-out, AI/mod disclosure)
  for SEO, with the interactive **sidebar** as an island (`NewsDetailInner.svelte`
  → `detail/ReadingListControls` save toggle, `detail/ForumDiscussCTA`,
  `detail/RelatedRail`). Mirrors the marketplace SSR-shell + island split (no
  duplicate H1/body). `NewsDetail` type lives in the PURE `newsTaxonomy.ts` so the
  island never imports the mongodb-importing `newsQuery.ts`. Server fetch:
  `fetchNewsDetailForSSR(id, userId)` in `src/lib/newsboard/newsQuery.ts`
  (visibility = approved OR own pending/rejected).
- **Forum CTA prefill** — `ForumDiscussCTA` links to
  `/topics/create?prefill_title=…&prefill_body=<sourceUrl>`; `ComposePageInner`
  (forum) reads those params in `onMount` and seeds `initialValues`. The CTA's
  exhausted state comes from `GET /api/topics/daily-count` (new endpoint).
- **Full submit** — `submit/NewsSubmitInner.svelte` (replaced the Phase-1
  `NewsSubmitMinimal` stub) with `QuotaIndicator` (5-slot), `SektionPicker`,
  image upload (`POST /api/news/upload` → Cloudinary `mahalle/newsboard`), and the
  rate-limited (quota-reached) state. Backend: `submit.ts` enforces 5/day rolling-24h
  + stores the chosen section as `aiCategory` (the index resolver round-trips it);
  `GET /api/news/daily-count` feeds the indicator; `sektion` added to
  `NewsSubmitSchema`.
- **Own-submission straps** — the feed shows the author's own pending/rejected
  items with an `IN PRÜFUNG`/`ABGELEHNT` strap + reason (states 08/09); `NewsVM`
  carries `moderationStatus` + `warningText`.
- `KioskBtn` gained optional `target`/`rel` props (used by the lead CTA in Phase 1;
  retained).

## Deferred

Not bugs or tech-debt — parked by design. Build when the phase lands:

- **SSR-prefetch of the index for SEO** (Phase 2, Task C1 — NOT yet landed): the
  index is still `client:only`, so the feed text isn't in raw HTML. The plan's C1
  switches to `client:load` + `fetchNewsForSSR` seeding, but the hydration risk
  (server-vs-client relative-time strings like "vor 2 Std.") must be verified
  against a running dev server before landing. Pending live verification.
- Full submit **live preview card** (the design's "VORSCHAU · IM FEED" panel) — the
  form ships without it; add later if wanted.
- Read-state decay + a `news_read_state` store (Phase 3).
- Heat indicator: real `heatCount` + a forum-link counter job (Phase 3).
- Real `sektion` field emitted from `fetch-daily.ts` (Phase 3) — currently the
  resolver maps `aiCategory`, and user submissions store the section as `aiCategory`.
- Offline/cached state (state 05) — needs a service worker.
- Masthead once-per-day intro animation.
