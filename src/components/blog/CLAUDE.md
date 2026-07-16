# Blog (kiosk) notes — „Die Beilage"

Loaded lazily when Claude reads/edits files in `src/components/blog/` (or any
subtree). The root `CLAUDE.md` keeps a pointer here so it can be pulled in when
working on related files outside this dir (`src/pages/blog/*`,
`src/layouts/blog/*`, `src/lib/blog/beilage.ts`, `src/styles/blog.css`).

„Die Beilage" ("the supplement") is the kiosk (paper/ink) presentation of the
`blog` content collection — the Schillerkiez Kurier's magazine supplement.
Legacy dark-glass blog (`BlogBaseLayout.astro`, `BlogSearch.svelte`,
`ImageGallery.svelte`, `TagCloud.astro`, `TagBarMobile.astro`, `BlogCard.astro`)
was torn down in the kiosk migration's final task (July 2026) — no trace of it
remains, don't resurrect the pattern.

## Pages

- `src/pages/blog/index.astro` — index. `KioskLayout` `page="blog"`, mounts
  `BeilageIndex.svelte` `client:only="svelte"`. Filters `!data.draft`
  unconditionally over `getCollection('blog')`.
- `src/pages/blog/[...slug].astro` — article detail. Resolves entry with
  `!data.draft || !import.meta.env.PROD` (drafts 404 in prod, visible in dev —
  see "Draft gating" below), picks one of `StandardLayout` / `HeroLayout` /
  `GalleryLayout` by `postLayout`, renders MDX body server-side via
  `await render(entry)` → `<Content />`.
- `src/pages/blog/tag/[tag].astro` — rubric page. `KioskLayout` `page="blog"`,
  mounts `BeilageTagPage.svelte` `client:only="svelte"`. Unknown/empty tags
  render the "Leere Rubrik" empty state at HTTP 200 (catches stale links)
  rather than 404ing.

There is no separate Druckbogen route — print is a `@media print` layer on the
article route itself (see below), triggered by `window.print()` from
`BlogArticleFooter`.

## Decision 1 — SSR everywhere, not prerendered

Every blog route runs SSR (no `prerender` export anywhere under
`src/pages/blog`). Three independent reasons converge on the same answer:

1. **`KioskNav` has no client-side session fetch.** `KioskLayout.astro` calls
   `getSession(Astro.request)` server-side and passes
   `user={session?.user ?? null}` straight into `<KioskNav client:load>`.
   Unlike the legacy `Navbar.tsx` (which re-fetches `/api/auth/session`
   client-side specifically to correct a prerendered `user={undefined}`),
   `KioskNav` has no such fallback — a prerendered blog page would show every
   visitor as logged out forever, even after a real login.
2. **Draft-404 is a per-request decision.** `[...slug].astro`'s
   `!data.draft || !import.meta.env.PROD` check needs to run per request (dev
   vs. prod), which only works on-demand.
3. **QR generation needs a real `Astro.request`.** `ArticleShell.astro` builds
   the article URL via `getTrustedBaseUrl(Astro.request)` and encodes it into a
   QR SVG at render time (`QRCode.toString`) — there is no request object to
   read at build time for a prerendered/static page.

## Island split: server-rendered MDX body, client-reactive chrome

Article pages mix both rendering modes deliberately, not by accident:

- **Body**: `<Content />` from `await render(entry)` is server-rendered HTML,
  dropped into a plain `<slot />` in each layout (`StandardLayout` /
  `HeroLayout` / `GalleryLayout`). Good for SEO/crawlability, and it's
  authored content — never needs to react to locale toggles.
- **Chrome**: masthead, read-bar, article header, footer (CTAs), related rail,
  and gallery grid are all `client:only="svelte"` islands
  (`BlogReadBar`, `BlogArticleHeader`, `BlogArticleFooter`, `BlogRelatedRail`,
  `BlogGalleryGrid`, `BeilageIndex`, `BeilageTagPage`). These read
  `src/lib/kiosk-i18n.ts`'s reactive `$t`/`$locale` stores so the DE/EN toggle
  flips every chrome string instantly without a page reload. Post titles,
  descriptions, and MDX body text are authored content and never localized —
  they stay as written regardless of locale.

## `src/lib/blog/beilage.ts` — pure derivation helpers

Dependency-pure (no `mongodb`/`fs`/etc.) — imported by both `.astro`
frontmatter (server) and Svelte islands (client). Never add a server-only
import here (see root CLAUDE.md, "Server-only modules bleeding into client
bundles").

- `readingMinutes(body)` — word count / 200 wpm, minimum 1.
- `fmtDate` / `fmtDateKicker` / `fmtMonthLabel` / `monthKey` — DE/EN date
  formatting (Europe/Berlin), 3-char month abbreviations (ICU's "März" /
  "Sept." are hand-truncated to "Mär" / "Sep" to match the design).
- `monthGroups(posts)` — Archiv sidebar rows, newest-first, only months WITH
  posts (never an empty row).
- `relatedFor(currentId, posts, max=3)` — Rubrik-Rail ranking: rank by count of
  shared tags (desc), ties/zero-shared broken by newest-first. Zero-shared
  fill items get `shared: []` and render as "ZULETZT ERSCHIENEN" rather than
  being excluded — the rail always tries to fill up to 3 slots.
  `tagCounts(posts)` — `[tag, count]` pairs for rubric chips, count desc then
  alpha.
- `rankOf(id, posts)` — the "№ n/N" badge: 1-based rank in **ascending**
  pubDate order (oldest = № 1), `of` = total published count. This is
  deliberately the opposite sort direction from the index/tag listings (which
  are newest-first) — № counts up chronologically like an issue number, the
  listings read newest-first like a newspaper front page.

## `BlMasthead` double rule

`.bl-mast-rules` in `src/styles/blog.css` is a standalone element (not a
border shorthand): 2.5px heavy rule on top, 2px gap, 1px rule below —
the Kurier-family signal shared with the Newsboard masthead, rust instead of
ink. Never simplify to a single border.

## `BlogReadBar` header-measure docking

`BlogReadBar.svelte` (Lesefaden) docks itself directly under `KioskNav`'s
`<header>` rather than assuming a fixed nav height: on mount it measures
`document.querySelector('header').offsetHeight` and sets its own
`position: sticky; top: {offsetHeight}px`, re-measuring on `resize`. The
scroll-progress fill is a direct style binding (no CSS transition) so it
tracks scroll position 1:1; only the 100% "gelesen ✓" swap animates
(`.bl-read-done` keyframe), and that's exempted under
`prefers-reduced-motion` because it's a state swap, not motion tied to
scrolling.

## Druckbogen (print) — visibility-isolation recipe, with one deviation

`src/styles/blog.css`'s `@media print` block follows the same
visibility-isolation pattern as `steckbrief.astro`/`druck.astro`: `body *` is
hidden, `.bl-sheet` (and its subtree) stays visible. **Deliberate deviation**
from those precedents: they pin their print sheet with `position: fixed`,
which clips content past the first page — fine for their single-sheet cards,
wrong for a multi-page article. The blog's `.bl-sheet` uses `position:
absolute` (anchored to `body`'s top; `body.k-paper-bg` is `position:
relative`) so content flows across as many pages as the article needs, and the
18mm margins live on `@page` (not sheet padding) so every page gets them, not
just page 1. The print rules load via a global style block because `<body>`
belongs to `KioskLayout`, not the page. The STAND (date) + QR footer render
inline after the content (`.bl-print-foot`) rather than pinned to a page edge
— it lands wherever the last page's content ends, which is an accepted
looseness for a multi-page sheet metaphor. QR: `ArticleShell.astro` generates
an inline SVG via `qrcode`'s `QRCode.toString()` server-side (safe `set:html`
— the URL is always self-constructed from `getTrustedBaseUrl()`, never
user input), sized in print via `.bl-print-qr` (18mm × 18mm).

## `prefill_tags` / `prefill_title` / `prefill_body` — two blog consumers of `/topics/create`

Both funnel into `ComposePageInner.svelte`'s `computeInitialValues()`, which
reads `?prefill_title` / `?prefill_body` / `?prefill_tags` synchronously at
script-init (see `src/components/forum/kiosk/CLAUDE.md` for why it must be
synchronous, not `onMount`).

- **Aufruf CTA** (`BeilageIndex.svelte`'s `aufrufCard` snippet, novel §06) —
  `callHref` = `/topics/create?prefill_title=<localized prompt>&prefill_tags=blogidee`.
  No `prefill_body`. Seeds the compose form pre-tagged `#blogidee` so
  community "story ideas" land in a discoverable rubric.
- **Forum-CTA** (`BlogArticleFooter.svelte`, novel §04, the article footer's
  wine card) — `discussHref` = `/topics/create?prefill_title=<prefix + post
  title>&prefill_body=<article URL>`. No `prefill_tags`. This is **the only
  wine element on the entire article page** — everything else is
  ink/rust/paper. Nothing auto-posts; both CTAs only pre-fill the compose
  form, the user still has to submit.

## Draft gating semantics

- **Detail route** (`[...slug].astro`): `!data.draft || !import.meta.env.PROD`
  — a draft entry resolves (200) in dev, 404s in prod. This is the only
  PROD-conditional gate in the blog.
- **Listing routes** (index, tag page): filter is the unconditional
  `!data.draft`, with **no** `PROD` check — a draft is invisible in every
  listing (list, archive counts, rubric counts, related rail, № n/N ranking)
  in both dev and prod. So in dev a draft is reachable directly by URL but
  never discoverable through browsing.

## Gallery grid is dormant in the shipped content

`BlogGalleryGrid.svelte` renders nothing (`{#if images.length > 0}`) when
`galleryImages` is empty — and every shipped post, including
`neighborhood-gallery.mdx` (the `postLayout: 'gallery'` example), ships zero
`galleryImages`; the gallery's actual pictures live in the MDX body like any
other post. Don't treat an empty grid as a bug. When gallery images ARE
present, `GalleryLayout.astro` builds each `alt` from `coverAlt` — captions
are `${post.data.coverAlt} (${i + 1})`, there's no per-image caption field in
the content schema.

## States matrix (novel §09)

| State | Where | Trigger |
|---|---|---|
| 01 — no posts at all | `BeilageIndex.svelte` | `posts.length === 0` (whole collection empty) |
| 02 — filtered to zero | `BeilageIndex.svelte` | `isFiltered && pageItems.length === 0` (search/tag/month AND-combination yields nothing) |
| 03 — Leere Rubrik | `BeilageTagPage.svelte` | unknown or currently-empty tag; renders at HTTP 200 |
| 04 — draft | `[...slug].astro` | see "Draft gating" above |

## Decision 9 — lead card only on unfiltered page 1

`BeilageIndex.svelte`'s `showLead` derived is
`!isFiltered && page === 0 && pageItems.length > 0` — the large lead card only
ever appears on the true front page (no active search/tag/month filter, first
page). Any filter or pagination collapses the layout to the plain newspaper
column grid; there is no "lead" concept once you're inside a filtered/paged
view.

## Content collection schema (`src/content.config.ts`)

`postLayout: 'standard' | 'hero' | 'gallery'` (default `'standard'`),
`draft: boolean` (default `false`), `cover`/`coverAlt`/`galleryImages`
optional, `tags: string[]` (default `[]`). Six posts ship today: `standard` ×
most, `hero` = `community-spotlight.mdx`, `gallery` =
`neighborhood-gallery.mdx`.

## Tokens

`tokens.css`: `[data-page="blog"] { --k-accent: var(--k-rust); }` —
`--k-rust: #a3552e` is the carved-italic accent (straps, progress fill,
kickers), `--k-rust-deep` for hover/back-links, `--k-rust-tint` for the
Aufruf card background. Page-accent rule: rust is Blog's color across the
whole site (see root CLAUDE.md's page-accent table) — same "don't touch
semantic accents" carve-outs apply (wine stays wine on the Forum-CTA, live
indicators etc. stay whatever they were).
