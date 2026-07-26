# Blog „Die Beilage" Kiosk Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `/blog` (+ `/blog/[slug]`, `/blog/tag/[tag]`) — the last undesigned surface — onto the kiosk design system as „Die Beilage", the Kurier's magazine supplement, with rust accent `#a3552e`, all 6 novel modules (Lesezeit/Lesefaden, Rubrik-Rail, Archiv, Forum-CTA, Druckbogen A4, Aufruf), and zero backend work.

**Architecture:** Chrome swap: blog pages move from the grain-less `BlogBaseLayout` onto `KioskLayout` (`page="blog"` → rust accent via `[data-page="blog"]`). Because chrome must be DE/EN-reactive (kiosk-i18n is a client-side Svelte store), each page's visible chrome renders inside `client:only="svelte"` islands; only the MDX article body stays server-rendered (`<Content />`). All blog routes become SSR (drop `prerender = true`) — this fixes the logged-out-nav-for-logged-in-users pitfall (KioskLayout calls `getSession(Astro.request)` directly and KioskNav has no client session fetch), fixes the existing bug where `draft: true` posts get built as routes, and gives the article route request access for the QR footer. Everything derived (Lesezeit, Archiv, Rubrik-Rail, № n/N) is computed in `.astro` frontmatter from the content collection via a new pure lib `src/lib/blog/beilage.ts`.

**Tech Stack:** Astro 5 SSR (Vercel adapter), Svelte 5 runes islands, Astro content collections (6 MDX posts — untouched), kiosk-i18n store, `qrcode` (already a dependency), Tailwind + kiosk `--k-*` tokens.

## Global Constraints

- **One visible accent: rust `#a3552e`.** Wine (`--k-wine`) appears ONLY on the Forum-CTA card/button (the bridge to Forum). Teal/moss/ochre only where the design system already uses them. The old blog accent `#4b9aaa` dies — zero occurrences in blog files at the end.
- **Masthead anatomy is non-negotiable:** centered axis + 1px ink rule above the strap + double rule below the title block (2.5px ink, 2px gap, 1px ink) + strap „EINE BEILAGE DES SCHILLERKIEZ KURIER" (mono, 0.22em tracking). Never simplify to a single rule.
- **Article bodies stay exactly as authored (EN).** Never replace repo MDX content with mockup copy — the mockup bodies are approximations. Chrome is DE/EN switched; the meta line carries a small `EN` chip with tooltip.
- **German quotes are curly:** „ (U+201E) opener + " (U+201C) closer. Never ASCII `"` in German copy. EN copy uses " (U+201C) + " (U+201D).
- **Draft filtering:** `draft: true` ⇒ no route (404 in prod), no search hit, no archive count, no rubric count. Visible in dev mode only (`import.meta.env.PROD` gate). No admin preview.
- **Nothing auto-posts.** Forum-CTA and Aufruf only pre-fill `/topics/create`; the resulting post counts against the existing 5/day quota and runs normal AI moderation (user-confirmed 2026-07-16, no special-casing).
- **Lesefaden progress is scroll-bound** — no animation loop; `prefers-reduced-motion` leaves it unchanged (position, not motion). The only keyframes are `blReadDone` (stamp at 100 %) and `blSettleIn` (index reveal, stagger caps at 3 steps) — both `animation: none` under reduced motion.
- **Mobile hit targets ≥ 44px** on the article-end CTA rows.
- **Zero backend:** no new collections, no new endpoints, no schema/frontmatter changes, no DB writes anywhere in this plan.
- **Kiosk conventions:** `font-dmmono` (NOT `font-mono`), Bricolage display / Instrument Serif italic / DM Mono labels, paper grain comes free from `KioskLayout`'s `k-paper-bg`, dashed rules use `--k-rule`.
- **Type-check baseline is 29 errors** (`pnpm type-check`) — no new errors over baseline.
- **PROCESS RULE: every `.svelte` change needs a live browser verification gate** — tsc is blind to `.svelte` internals (no svelte-check in repo). `pnpm build` compiles Svelte and is the minimum compile gate; visual/behavioral claims need playwright-cli or curl against a live server.
- **NEVER touch the user's dev server on :3000.** Implementers run their own (`pnpm dev --port 4399`) and kill it when done. Blog pages are public — no auth cookie needed for verification.
- **Commits:** simple concise messages, NO "Generated with Claude Code" signature, NO "Co-Authored-By" footer. Never `git commit --no-verify` (gitleaks pre-commit hook must run).
- **Design source of truth:** `design/handoffs/design_handoff_blog/jsx/*.jsx` (read `kiosk-blog-explore.jsx` first for seeds, then `kiosk-blog.jsx` atoms, `kiosk-blog-article.jsx`, `kiosk-blog-mobile.jsx`, `kiosk-blog-states.jsx`) + `tokens-blog.css` + `motion-blog.css` (spec values — wire through `--k-*`, don't import verbatim). `BLOG_SCOPING.md` is the written spec.

## Decisions (adjudicated during planning — implementers follow these)

1. **SSR conversion.** `src/pages/blog/[...slug].astro` and `src/pages/blog/tag/[tag].astro` drop `export const prerender = true` and become SSR like every other kiosk surface. Why: (a) KioskLayout's `getSession(Astro.request)` bakes `user=null` into prerendered HTML and KioskNav never self-corrects → logged-in users would see a logged-out nav; (b) prerendered `getStaticPaths` currently builds routes for `draft: true` posts (existing bug) — SSR lets us 404 drafts in prod cleanly; (c) the Druckbogen QR needs `getTrustedBaseUrl(Astro.request)`. Six posts make SSR cost negligible.
2. **No mobile bottom-nav tab for Blog.** Per design §07: Blog has no own tab; entry via direct link + the desktop nav tab (which already exists in `KioskNav.svelte:32`). Do NOT add a `nav.short.blog` key or a 6th bottom-nav entry.
3. **One orchestrator island per page.** Chrome must react to the DE/EN toggle, so the index content below the nav is one `client:only="svelte"` island (`BeilageIndex.svelte`), the tag page one (`BeilageTagPage.svelte`), and article chrome is split into small islands (`BlogReadBar`, `BlogArticleHeader`, `BlogArticleFooter`, `BlogRelatedRail`, `BlogGalleryGrid`) around the server-rendered `<Content />`.
4. **Covers in islands use plain `<img src={cover.src}>`** (the processed asset URL from the `image()` schema field). This loses `srcset` optimization; acceptable — 6 local images, and the deleted `BlogSearch.svelte` already did exactly this. `loading="lazy"` on non-lead images.
5. **`prefill_tags` param (additive) on `/topics/create`.** The Aufruf CTA needs the pre-filled topic tagged `#blogidee`; `ComposePageInner.svelte` today reads only `prefill_title`/`prefill_body`. Add `prefill_tags` (CSV), normalized exactly like manually-typed tags. Small forum touch, nothing auto-posts.
6. **`ImageGallery.svelte` (lightbox) is deleted.** The design's gallery layout is a numbered grid with mono captions (`BILD nn / NN`), no lightbox. The only gallery post has zero `galleryImages` today, so the grid is dormant-but-built; the MDX body (which contains the actual content) renders as usual.
7. **Pull quotes = prose blockquote styling.** Real MDX bodies contain standard markdown blockquotes (`community-spotlight.mdx:43`). Style `blockquote` inside the article body as the design's pull-quote block (2px ink rules top+bottom, Instrument Serif italic 21px, `--k-rust-deep`, `break-inside: avoid`). No content edits.
8. **Druckbogen uses the visibility-isolation print pattern** from `src/pages/steckbrief.astro` / `src/pages/schillerkiez/druck.astro` (`body * { visibility: hidden }` + `.bl-sheet, .bl-sheet * { visibility: visible }` + `position: fixed !important` pin, global style block). Battle-tested against KioskLayout chrome; avoids display:none whack-a-mole on shared components.
9. **Lead card renders only in the unfiltered view on page 1** (no search, no tag, no month filter, page 0). Filtered/paginated views render all matches as plain column cards. Rationale: „NEU IN DER BEILAGE" is a claim about the whole Beilage, not about a filtered subset.
10. **№ n/N** = 1-based rank of the post in ascending `pubDate` order among non-draft posts; N = total non-draft count. Derived, never hardcoded.
11. **Date formats** (Europe/Berlin, `Intl.DateTimeFormat` + formatToParts, dots stripped from month abbreviations, per-locale):
    - meta line: DE `8. Apr 2025` · EN `8 Apr 2025`
    - card kickers / masthead ZULETZT: uppercased variant (`8. APR 2025` / `8 APR 2025`)
    - archive rows: `APR 2025` (both locales, month short uppercased + year)
12. **Search/filter composition:** search query, active rubric, and active archive month combine with AND. Any active filter switches the list to plain-card mode (Decision 9). Rubric chips and archive rows toggle (click active again → clears).
13. **ReadBar stickiness:** the KioskNav header is `sticky top-0 z-40`. The ReadBar measures the header's `offsetHeight` on mount (+ on resize) and sets its own `position: sticky; top: <that>px; z-index: 30` so it docks directly beneath the nav at any viewport.
14. **CD's open questions answered:** (1) QR = reuse `qrcode` lib, `QRCode.toString(url, { type: 'svg', margin: 0, color: { dark: '#1b1a17', light: '#0000' } })` — same as both existing print surfaces; (2) scroll-reveal kept but retuned to `blSettleIn` (380ms, stagger caps at 3, `animation: none` under reduced motion); (3) `TagBarMobile` is rebuilt (not reskinned) as the rubric chip row inside the index island, using the existing `scrollFade` action + `.kiosk-scroll-fade`.

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/styles/tokens.css` | Modify | `--k-rust` ramp + `[data-page="blog"]` accent line |
| `src/styles/blog.css` | Create | Beilage page CSS: masthead rules, prose/pull-quote, motion keyframes, Druckbogen print block |
| `src/lib/kiosk-i18n.ts` | Modify | ~50 `blog.*` keys, DE + EN (Dict parity enforced by tsc) |
| `src/lib/blog/beilage.ts` | Create | Pure helpers: `BeilagePost` type, readingMinutes, date formatters, monthGroups, relatedFor, tagCounts, rankOf |
| `src/components/forum/kiosk/compose/ComposePageInner.svelte` | Modify | additive `prefill_tags` param |
| `src/components/blog/kiosk/BeilageIndex.svelte` | Create | index orchestrator island (masthead, rubric row, search, lead, columns, pagination, sidebar, states 01+02) |
| `src/components/blog/kiosk/BlMasthead.svelte` | Create | full + compact masthead (shared index/tag) |
| `src/components/blog/kiosk/BlRubrikChip.svelte` | Create | tag chip atom (idle ink / active rust-filled) |
| `src/components/blog/kiosk/BlPostMeta.svelte` | Create | meta line atom (date · team · N Min · EN chip) |
| `src/components/blog/kiosk/BlLayoutBadge.svelte` | Create | ◼ AUFMACHER / ▤ BILDSTRECKE badge atom |
| `src/components/blog/kiosk/BeilageTagPage.svelte` | Create | tag page island (title row, 3-col grid, other-rubrics, empty state 03) |
| `src/components/blog/kiosk/BlogReadBar.svelte` | Create | novel §01 sticky Lesefaden |
| `src/components/blog/kiosk/BlogArticleHeader.svelte` | Create | article header island, `variant: 'standard' \| 'hero' \| 'gallery'` |
| `src/components/blog/kiosk/BlogArticleFooter.svelte` | Create | tags + teilen + Druckbogen-CTA + Forum-CTA (novel §04, §05 trigger) |
| `src/components/blog/kiosk/BlogRelatedRail.svelte` | Create | novel §02 Rubrik-Rail |
| `src/components/blog/kiosk/BlogGalleryGrid.svelte` | Create | numbered image grid for gallery layout |
| `src/components/blog/kiosk/ArticleShell.astro` | Create | shared article scaffold: ReadBar + slots + footer + rail + print sheet wrapper + QR + blog.css |
| `src/pages/blog/index.astro` | Rewrite | KioskLayout + serialize posts + mount BeilageIndex |
| `src/pages/blog/[...slug].astro` | Rewrite | SSR, draft-404, layout dispatch |
| `src/pages/blog/tag/[tag].astro` | Rewrite | SSR, BeilageTagPage |
| `src/layouts/blog/StandardLayout.astro` | Rewrite | Zeitungsseite via ArticleShell |
| `src/layouts/blog/HeroLayout.astro` | Rewrite | Aufmacherseite via ArticleShell |
| `src/layouts/blog/GalleryLayout.astro` | Rewrite | Bildstrecke via ArticleShell |
| `src/layouts/BlogBaseLayout.astro` | Delete | superseded by KioskLayout |
| `src/components/blog/BlogSearch.svelte` | Delete | superseded by BeilageIndex |
| `src/components/blog/ImageGallery.svelte` | Delete | superseded by BlogGalleryGrid (Decision 6) |
| `src/components/blog/TagCloud.astro` | Delete | superseded by Rubriken-Cloud in BeilageIndex |
| `src/components/blog/TagBarMobile.astro` | Delete | superseded by rubric chip row |
| `src/components/blog/BlogCard.astro` | Delete | superseded by island cards |
| `src/components/SplashScreen.astro` | Modify | remove `'/blog'` from splashPages (kiosk pages have no splash) |
| `src/components/blog/CLAUDE.md` | Rewrite | kiosk Beilage architecture notes |
| root `CLAUDE.md`, `README.md` | Modify | accent table, kiosk status, stale sections |

Reuse (do not rebuild): `scrollFade` action (`src/lib/scrollFade.ts`) + `.kiosk-scroll-fade`, `showToast` (`src/utils/toast.ts`), `getTrustedBaseUrl` (`src/lib/auth/baseUrl.ts`), `qrcode` package, `KioskLayout`/`KioskNav`/`KioskFooter`, kiosk-i18n `t`/`tStr`/`locale` stores.

---

### Task 1: Foundations — rust tokens, blog.css, i18n keys, beilage lib, compose prefill_tags

**Files:**
- Modify: `src/styles/tokens.css` (accents block ~lines 18-28; page-accent block ~lines 101-119)
- Create: `src/styles/blog.css`
- Modify: `src/lib/kiosk-i18n.ts` (both `de` and `en` dicts)
- Create: `src/lib/blog/beilage.ts`
- Modify: `src/components/forum/kiosk/compose/ComposePageInner.svelte` (~lines 60-95)

**Interfaces:**
- Produces: `--k-rust`, `--k-rust-deep`, `--k-rust-on-ink`, `--k-rust-tint` CSS vars; `[data-page="blog"] { --k-accent: var(--k-rust) }`; all `blog.*` i18n keys; `src/lib/blog/beilage.ts` exports `BeilagePost`, `readingMinutes(body)`, `fmtDate(iso, locale)`, `fmtDateKicker(iso, locale)`, `fmtMonthLabel(iso, locale)`, `monthKey(iso)`, `monthGroups(posts)`, `relatedFor(currentId, posts, max?)`, `tagCounts(posts)`, `rankOf(id, posts)`; `/topics/create?prefill_tags=blogidee` seeds the tag field.
- Consumes: nothing from other tasks.

- [ ] **Step 1: tokens.css — rust ramp + page accent**

In the accents block (after `--k-ochre`), add:

```css
  --k-rust: #a3552e;          /* Blog „Die Beilage" — carved accent, straps, progress fill */
  --k-rust-deep: #7e401f;     /* hover, GEMEINSAM lines, back links */
  --k-rust-on-ink: #e0966b;   /* rust legible on ink (hero title band strap) */
  --k-rust-tint: rgba(163, 85, 46, 0.09); /* Aufruf card bg, archiv active row */
```

In the page-accent block (after the `[data-page="admin"]` line), add:

```css
[data-page="blog"]         { --k-accent: var(--k-rust); }
```

Do NOT add `--k-accent-italic` (marketplace-only, per the comment above that block).

- [ ] **Step 2: Create `src/styles/blog.css`**

```css
/* ══════════════════════════════════════════════════════════
   blog.css — „Die Beilage" (kiosk blog surface)
   Imported per-page (index, tag, ArticleShell) via
   <style is:global>@import '../styles/blog.css';</style>
   Scope: [data-page="blog"] where the rule could leak.
   ══════════════════════════════════════════════════════════ */

/* ─ Masthead double rule (Kurier-family signal — never simplify) ─
   Standalone element placed AFTER the title block:
   heavy 2.5px rule on top, 2px gap (the element's height), 1px below. */
.bl-mast-rules {
  border-top: 2.5px solid var(--k-ink);
  height: 2px;
  border-bottom: 1px solid var(--k-ink);
}

/* ─ Article body prose (standard: 2 columns; hero: single set inline) ─ */
[data-page="blog"] .bl-prose {
  font-size: 14.5px;
  line-height: 1.62;
  color: var(--k-ink-soft);
}
[data-page="blog"] .bl-prose--cols {
  columns: 2;
  column-gap: 30px;
}
@media (max-width: 768px) {
  [data-page="blog"] .bl-prose--cols { columns: 1; }
}
[data-page="blog"] .bl-prose > p:first-child {
  font-size: 16px;
  color: var(--k-ink);
}
[data-page="blog"] .bl-prose p { margin: 0 0 14px; }
[data-page="blog"] .bl-prose h2,
[data-page="blog"] .bl-prose h3 {
  font-family: var(--k-font-display);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--k-ink);
  break-after: avoid;
}
[data-page="blog"] .bl-prose h2 { font-size: 21px; margin: 22px 0 10px; }
[data-page="blog"] .bl-prose h3 { font-size: 16.5px; margin: 16px 0 8px; }
[data-page="blog"] .bl-prose a {
  color: var(--k-rust-deep);
  text-decoration: underline;
  text-underline-offset: 2px;
}
[data-page="blog"] .bl-prose img {
  max-width: 100%;
  border: 1.5px solid var(--k-ink);
  border-radius: 10px;
}
/* Pull quote = markdown blockquote (Decision 7) */
[data-page="blog"] .bl-prose blockquote {
  break-inside: avoid;
  border-top: 2px solid var(--k-ink);
  border-bottom: 2px solid var(--k-ink);
  border-left: none;
  padding: 14px 4px;
  margin: 6px 0 16px;
  font-family: var(--k-font-serif);
  font-style: italic;
  font-size: 21px;
  line-height: 1.3;
  color: var(--k-rust-deep);
}
[data-page="blog"] .bl-prose blockquote p { margin: 0; font-size: inherit; color: inherit; }

/* ─ Motion (per motion-blog.css spec) ─ */
@keyframes blReadDone {
  0%   { opacity: 0; transform: scale(1.15); }
  60%  { opacity: 1; transform: scale(0.98); }
  100% { opacity: 1; transform: scale(1); }
}
.bl-read-done { animation: blReadDone 220ms cubic-bezier(.2,.8,.2,1.2) both; }

@keyframes blSettleIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.bl-card-in { animation: blSettleIn 380ms cubic-bezier(.2,.7,.3,1) both; }
.bl-card-in:nth-child(2) { animation-delay: 60ms; }
.bl-card-in:nth-child(3) { animation-delay: 120ms; }
/* stagger caps at 3 steps — a paper, not a cascade */

@media (prefers-reduced-motion: reduce) {
  .bl-read-done, .bl-card-in { animation: none; opacity: 1; transform: none; }
  /* Lesefaden stays — it is position, not motion. */
}

/* ─ Druckbogen (A4) — filled in by Task 6; keep block present ─ */
```

- [ ] **Step 3: kiosk-i18n — add the `blog.*` namespace to BOTH dicts**

Add to the `de` dict (place after the existing newsboard/admin blocks, keep the file's section-comment style) and mirror in `en`. The `Dict` type enforces key parity — `pnpm type-check` fails if one side is missing. Exact values:

| Key | DE | EN |
|---|---|---|
| `blog.mast.strap` | `EINE BEILAGE DES SCHILLERKIEZ KURIER` | `A SUPPLEMENT OF THE SCHILLERKIEZ KURIER` |
| `blog.mast.from` | `AUS DER REDAKTION` | `FROM THE EDITORS` |
| `blog.mast.posts` | `BEITRÄGE` | `POSTS` |
| `blog.mast.latest` | `ZULETZT` | `LATEST` |
| `blog.rubrics` | `RUBRIKEN` | `RUBRICS` |
| `blog.rubric.all` | `alle` | `all` |
| `blog.search.placeholder` | `Suche in Titel, Beschreibung, Tags…` | `Search title, description, tags…` |
| `blog.search.hits` | `{n} TREFFER · LIVE, OHNE NEULADEN` | `{n} MATCHES · LIVE, NO RELOAD` |
| `blog.search.none.pre` | `Nichts gefunden zu „` | `Nothing found for “` |
| `blog.search.none.post` | `“` | `”` |
| `blog.search.none.body` | `0 von {n} Beiträgen — probier eine Rubrik:` | `0 of {n} posts — try a rubric:` |
| `blog.lead.strap` | `NEU IN DER BEILAGE` | `NEW IN THE SUPPLEMENT` |
| `blog.meta.team` | `Mahalle-Team` | `Mahalle team` |
| `blog.meta.min` | `Min` | `min read` |
| `blog.meta.en.tooltip` | `Beitrag auf Englisch verfasst` | `written in English` |
| `blog.badge.hero` | `◼ AUFMACHER` | `◼ FEATURE` |
| `blog.badge.gallery` | `▤ BILDSTRECKE` | `▤ GALLERY` |
| `blog.pag.perPage` | `PRO SEITE` | `PER PAGE` |
| `blog.pag.page` | `SEITE` | `PAGE` |
| `blog.archive.title` | `ARCHIV` | `ARCHIVE` |
| `blog.archive.note` | `nach Monat · aus pubDate abgeleitet` | `by month · derived from pubDate` |
| `blog.archive.entry` | `Eintrag` | `entry` |
| `blog.archive.entries` | `Einträge` | `entries` |
| `blog.about.title` | `ÜBER DIE BEILAGE` | `ABOUT THE SUPPLEMENT` |
| `blog.about.pre` | `Die Beilage ist das Magazin des ` | `Die Beilage is the magazine of the ` |
| `blog.about.bold` | `Schillerkiez Kurier` | `Schillerkiez Kurier` |
| `blog.about.post` | ` — Geschichten, Orte und Menschen aus dem Kiez, geschrieben vom Mahalle-Team. Erscheint unregelmäßig, bleibt für immer.` | ` — stories, places and people from the Kiez, written by the Mahalle team. Published irregularly, kept forever.` |
| `blog.about.since` | `SEIT {month} · {n} BEITRÄGE` | `SINCE {month} · {n} POSTS` |
| `blog.call.kicker` | `✎ AUFRUF` | `✎ OPEN CALL` |
| `blog.call.title` | `Schreib für den Kiez` | `Write for the Kiez` |
| `blog.call.body` | `Du kennst eine Geschichte, einen Ort, einen Menschen, über den die Beilage schreiben sollte? Die Redaktion liest mit.` | `You know a story, a place, a person the supplement should cover? The editors are listening.` |
| `blog.call.cta` | `Idee im Forum vorschlagen` | `Suggest an idea in the forum` |
| `blog.call.note` | `öffnet ein vorbereitetes Thema mit #blogidee — die Redaktion meldet sich` | `opens a pre-filled topic tagged #blogidee — the editors follow up` |
| `blog.call.prefillTitle` | `Blogidee: ` | `Blog idea: ` |
| `blog.readbar.back` | `‹ zur Beilage` | `‹ to the supplement` |
| `blog.readbar.back.short` | `‹ Beilage` | `‹ Beilage` |
| `blog.readbar.read` | `gelesen` | `read` |
| `blog.readbar.done` | `gelesen ✓` | `read ✓` |
| `blog.strap.rubrik` | `RUBRIK` | `RUBRIC` |
| `blog.strap.hero` | `AUFMACHER` | `FEATURE` |
| `blog.photo.credit` | `FOTO: MAHALLE-TEAM` | `PHOTO: MAHALLE TEAM` |
| `blog.foot.share` | `⇗ teilen` | `⇗ share` |
| `blog.foot.share.copied` | `Link kopiert` | `Link copied` |
| `blog.foot.print` | `⏙ Druckbogen (A4)` | `⏙ Print sheet (A4)` |
| `blog.foot.print.note` | `2-Farb-Druck-CSS · Ink + Rost` | `2-color print CSS · ink + rust` |
| `blog.foot.discuss` | `Im Forum besprechen` | `Discuss in the forum` |
| `blog.foot.discuss.pre` | `Und was sagst ` | `And what do ` |
| `blog.foot.discuss.it` | `du` | `you` |
| `blog.foot.discuss.post` | ` dazu?` | ` think?` |
| `blog.foot.discuss.note` | `öffnet ein vorbereitetes Thema mit Titel + Link auf diesen Beitrag — zählt zu deinen 5 Beiträgen/Tag` | `opens a pre-filled topic with title + link to this post — counts toward your 5 posts/day` |
| `blog.foot.discuss.prefix` | `Beilage: ` | `Beilage: ` |
| `blog.rail.title` | `MEHR AUS DER BEILAGE` | `MORE FROM THE SUPPLEMENT` |
| `blog.rail.note` | `sortiert nach geteilten Rubriken · ohne diesen Beitrag · max 3` | `ranked by shared rubrics · excluding this post · max 3` |
| `blog.rail.common` | `GEMEINSAM` | `IN COMMON` |
| `blog.rail.recent` | `ZULETZT ERSCHIENEN` | `MOST RECENT` |
| `blog.caption.image` | `BILD` | `IMAGE` |
| `blog.tag.title` | `Rubrik` | `Rubric` |
| `blog.tag.posts` | `BEITRÄGE` | `POSTS` |
| `blog.tag.clear` | `✕ Rubrik aufheben` | `✕ clear rubric` |
| `blog.tag.others` | `ANDERE RUBRIKEN` | `OTHER RUBRICS` |
| `blog.tag.empty.pre` | `Rubrik ` | `Rubric ` |
| `blog.tag.empty.post` | ` ist (noch) leer.` | ` is (still) empty.` |
| `blog.tag.empty.body` | `Hier hat die Redaktion noch nichts abgelegt.` | `The editors haven't filed anything here yet.` |
| `blog.empty.title` | `Die erste Ausgabe ist noch im Druck.` | `The first issue is still in print.` |
| `blog.empty.body` | `Die Redaktion schreibt — schau bald wieder vorbei.` | `The editors are writing — check back soon.` |

(`{n}` and `{month}` are `tStr` interpolation slots. The `.pre`/`.post` splits exist so the query / tag between them can carry its own styling (serif-italic rust) — `tStr` returns a flat string and can't style an interpolated span. The Druckbogen print furniture (`STAND: …`) is deliberately NOT in this table — print sheets are DE-hardcoded like steckbrief/druck, since the i18n store is client-side and unreachable from SSR frontmatter.)

- [ ] **Step 4: Create `src/lib/blog/beilage.ts`** (pure — NO astro/mongo imports; client-safe)

```ts
// „Die Beilage" — pure derivation helpers for the kiosk blog surface.
// Client-safe: imported by Svelte islands AND .astro frontmatter.
// All derivations run over the serialized BeilagePost shape, never
// over CollectionEntry (keeps this file dependency-pure).

export type BlogLocale = 'de' | 'en';

export interface BeilagePost {
  id: string;
  title: string;
  description: string;
  pubDateISO: string;            // ISO 8601
  tags: string[];
  layout: 'standard' | 'hero' | 'gallery';
  minutes: number;               // Lesezeit, precomputed at serialization
  cover?: string;                // processed asset URL (image().src)
  coverAlt?: string;
}

/** Lesezeit: word count / 200 wpm, minimum 1 (novel §01). */
export function readingMinutes(body: string): number {
  const words = body
    .replace(/^import .*$/gm, '')      // MDX import lines don't count
    .replace(/[#>*_`\[\]()!-]/g, ' ')  // light markdown strip
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

const dateFmt = (locale: BlogLocale) =>
  new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Berlin',
  });

/**
 * DE „8. Apr 2025" · EN „8 Apr 2025".
 * Month abbreviations: dots stripped AND truncated to 3 chars — German
 * ICU yields „März"/„Juni"/„Sept.", the design uses „Mär"/„Jun"/„Sep"
 * (en-GB also yields „Sept" on some ICU builds).
 */
const shortMonth = (raw: string) => raw.replace(/\./g, '').slice(0, 3);

export function fmtDate(iso: string, locale: BlogLocale): string {
  const parts = dateFmt(locale).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const month = shortMonth(get('month'));
  return locale === 'de'
    ? `${get('day')}. ${month} ${get('year')}`
    : `${get('day')} ${month} ${get('year')}`;
}

/** Uppercased kicker variant: „8. APR 2025" / „8 APR 2025". */
export function fmtDateKicker(iso: string, locale: BlogLocale): string {
  return fmtDate(iso, locale).toUpperCase();
}

/** Archive row label: „APR 2025" / „MÄR 2025" (3-char month, both locales). */
export function fmtMonthLabel(iso: string, locale: BlogLocale): string {
  const parts = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    month: 'short', year: 'numeric', timeZone: 'Europe/Berlin',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${shortMonth(get('month')).toUpperCase()} ${get('year')}`;
}

/** Grouping key, e.g. '2025-04' (Europe/Berlin). */
export function monthKey(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric', month: '2-digit', timeZone: 'Europe/Berlin',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}`;
}

export interface MonthGroup { key: string; iso: string; count: number; }

/** Month groups, newest first. Only months WITH posts (never empty rows). */
export function monthGroups(posts: BeilagePost[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();
  for (const p of posts) {
    const key = monthKey(p.pubDateISO);
    const g = map.get(key);
    if (g) g.count += 1;
    else map.set(key, { key, iso: p.pubDateISO, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
}

export interface RelatedItem { post: BeilagePost; shared: string[]; }

/**
 * Novel §02 Rubrik-Rail: rank = count of shared tags, exclude self, max 3.
 * Ties and zero-shared fill: newest first. Zero-shared items get shared: []
 * (rendered as ZULETZT ERSCHIENEN).
 */
export function relatedFor(currentId: string, posts: BeilagePost[], max = 3): RelatedItem[] {
  const current = posts.find((p) => p.id === currentId);
  if (!current) return [];
  return posts
    .filter((p) => p.id !== currentId)
    .map((post) => ({ post, shared: post.tags.filter((t) => current.tags.includes(t)) }))
    .sort((a, b) =>
      b.shared.length - a.shared.length ||
      b.post.pubDateISO.localeCompare(a.post.pubDateISO))
    .slice(0, max);
}

/** [tag, count] pairs, count desc then alpha. */
export function tagCounts(posts: BeilagePost[]): Array<[string, number]> {
  const map = new Map<string, number>();
  for (const p of posts) for (const t of p.tags) map.set(t, (map.get(t) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** № n/N: 1-based rank in ascending pubDate order (Decision 10). */
export function rankOf(id: string, posts: BeilagePost[]): { no: number; of: number } {
  const asc = [...posts].sort((a, b) => a.pubDateISO.localeCompare(b.pubDateISO));
  return { no: asc.findIndex((p) => p.id === id) + 1, of: asc.length };
}
```

- [ ] **Step 5: Spot-check the lib with a throwaway script**

From the repo root, write `.verify-beilage.tmp.ts`:

```ts
import { readingMinutes, fmtDate, fmtDateKicker, fmtMonthLabel, monthGroups, relatedFor, tagCounts, rankOf, type BeilagePost } from './src/lib/blog/beilage';

async function main() {
  const posts: BeilagePost[] = [
    { id: 'cafe', title: 'Cafe', description: '', pubDateISO: '2025-04-08T00:00:00.000Z', tags: ['cafe','food','local','guide'], layout: 'standard', minutes: 6 },
    { id: 'green', title: 'Green', description: '', pubDateISO: '2025-03-20T00:00:00.000Z', tags: ['nature','neighborhood','parks','outdoor'], layout: 'standard', minutes: 5 },
    { id: 'market', title: 'Market', description: '', pubDateISO: '2025-02-12T00:00:00.000Z', tags: ['market','local','food','guide'], layout: 'standard', minutes: 5 },
    { id: 'welcome', title: 'Welcome', description: '', pubDateISO: '2025-01-15T00:00:00.000Z', tags: ['announcement','community','welcome'], layout: 'standard', minutes: 3 },
    { id: 'spot', title: 'Spot', description: '', pubDateISO: '2025-01-10T00:00:00.000Z', tags: ['spotlight','community','neighbors'], layout: 'hero', minutes: 4 },
    { id: 'gallery', title: 'Gallery', description: '', pubDateISO: '2025-01-05T00:00:00.000Z', tags: ['photos','neighborhood','local'], layout: 'gallery', minutes: 4 },
  ];
  console.log('fmtDate de:', fmtDate('2025-04-08T00:00:00.000Z', 'de'));       // 8. Apr 2025
  console.log('fmtDate en:', fmtDate('2025-04-08T00:00:00.000Z', 'en'));       // 8 Apr 2025
  console.log('kicker:', fmtDateKicker('2025-04-08T00:00:00.000Z', 'de'));     // 8. APR 2025
  console.log('month:', fmtMonthLabel('2025-03-20T00:00:00.000Z', 'de'));      // MÄR 2025 (NOT MÄRZ — 3-char truncation)
  console.log('date märz:', fmtDate('2025-03-20T00:00:00.000Z', 'de'));        // 20. Mär 2025
  console.log('groups:', monthGroups(posts).map((g) => `${g.key}:${g.count}`)); // 2025-04:1 2025-03:1 2025-02:1 2025-01:3
  console.log('related(cafe):', relatedFor('cafe', posts).map((r) => `${r.post.id}[${r.shared.join(',')}]`));
  // market first (local,food,guide = 3 shared), then gallery (local), then green (0 shared, newest fill)
  console.log('tags:', tagCounts(posts).slice(0, 4));                          // local:3 first
  console.log('rank cafe:', rankOf('cafe', posts));                            // { no: 6, of: 6 }
  console.log('minutes:', readingMinutes('word '.repeat(430)));                // 2
}
main();
```

Run: `pnpm exec tsx .verify-beilage.tmp.ts` — verify every expectation in the comments, then `rm .verify-beilage.tmp.ts`.

- [ ] **Step 6: `prefill_tags` in ComposePageInner**

In `computeInitialValues()` (`ComposePageInner.svelte` ~line 77-93), extend the URL-param branch to also read `prefill_tags`:

```ts
const pt = sp.get('prefill_title');
const pb = sp.get('prefill_body');
const ptags = sp.get('prefill_tags');
const tags = ptags
  ? ptags.split(',').map((t) => t.trim().toLowerCase()).filter((t) => /^[a-zäöüß0-9-]{2,24}$/.test(t)).slice(0, 5)
  : null;
if (pt || pb || tags?.length) {
  result = {
    title: pt ?? result?.title ?? '',
    body: pb ?? result?.body ?? '',
    kind: result?.kind ?? 'discussion',
    tags: tags ?? result?.tags ?? [],
    pendingFiles: [],
    existingImages: []
  };
}
```

Before coding, read how `ComposeForm.svelte` normalizes manually-typed tags — if its constraints differ from the regex above (length, charset, count cap), mirror ITS rules exactly so a prefilled tag can never be a value the form itself would reject. Also update the comment block above the function (line ~58) to mention the new param and its consumer (the blog Aufruf CTA).

- [ ] **Step 7: Compile + type gates**

Run: `pnpm type-check` — expected: 29 errors (baseline), zero new.
Run: `pnpm build` — expected: success (compiles the .svelte change).

- [ ] **Step 8: Browser gate for the .svelte change**

Start `pnpm dev --port 4399`. `/topics/create` is auth-gated (redirects to `/login` when logged out), so a full prefill walkthrough needs a session — don't ask for credentials. The compile gate here is: open `http://localhost:4399/` with playwright-cli and confirm the forum index hydrates (the compose island shares the chunk graph, so a ReferenceError-class break in `ComposePageInner` would surface in the build/console). The prefill behavior itself is verified via the Aufruf href in Task 2 Step 5 and the Task 7 E2E matrix. Kill the dev server.

- [ ] **Step 9: Commit**

```bash
git add src/styles/tokens.css src/styles/blog.css src/lib/kiosk-i18n.ts src/lib/blog/beilage.ts src/components/forum/kiosk/compose/ComposePageInner.svelte
git commit -m "feat(blog): kiosk foundations — rust tokens, blog.css, i18n namespace, beilage lib, prefill_tags"
```

---

### Task 2: Index page — „Die Beilage" masthead, columns, sidebar, states

**Files:**
- Create: `src/components/blog/kiosk/BeilageIndex.svelte`
- Create: `src/components/blog/kiosk/BlMasthead.svelte`
- Create: `src/components/blog/kiosk/BlRubrikChip.svelte`
- Create: `src/components/blog/kiosk/BlPostMeta.svelte`
- Create: `src/components/blog/kiosk/BlLayoutBadge.svelte`
- Rewrite: `src/pages/blog/index.astro`

**Interfaces:**
- Consumes: Task 1's `beilage.ts` helpers + `blog.*` keys + `--k-rust*` vars.
- Produces: `BlMasthead` props `{ compact?: boolean, count?: number, latestISO?: string | null }` (stats line renders only when NOT compact and both values provided — the tag page mounts it compact without them); `BlRubrikChip` props `{ tag: string, n?: number, active?: boolean, small?: boolean, href?: string, onclick?: () => void }`; `BlPostMeta` props `{ post: BeilagePost }`; `BlLayoutBadge` props `{ layout: BeilagePost['layout'] }` (renders nothing for `standard`). These four are reused by Tasks 3-5.

**Design contract:** `jsx/kiosk-blog.jsx` (`BlogIndexDesktop`, `BlogMasthead`, `BlogRubrikRow`, `BlogLeadCard`, `BlogColCard`, `BlogPagination`, `BlogRubrikenCloud`, `BlogArchivModule`, `BlogAboutCard`, `BlogContributorCall`) + `jsx/kiosk-blog-mobile.jsx` (`BlogMobileIndex`, `BmMasthead`, `BmTagBar`, `BmSearchRow`, `BmCard`) + states 01/02 in `jsx/kiosk-blog-states.jsx`.

- [ ] **Step 1: Atoms**

`BlRubrikChip.svelte` — DM Mono 10.5px (10px when `small`), `rounded-full`, 1.5px border: idle = ink border / transparent bg / ink text; active = rust border / rust bg / paper text. Renders `#${tag}` plus optional dimmed count. When `href` is given render an `<a>`, else a `<button type="button">`. `whitespace-nowrap shrink-0`.

`BlPostMeta.svelte` — mono 10.5px `--k-ink-mute` row: `{fmtDate(post.pubDateISO, $locale)} · {$t['blog.meta.team']} · {post.minutes} {$t['blog.meta.min']}` + `EN` chip (`1px 6px` padding, 9px, `border: 1px solid currentColor/33`, `rounded`, `title={$t['blog.meta.en.tooltip']}`). Import `locale`/`t` from `../../../lib/kiosk-i18n` and `fmtDate` from `../../../lib/blog/beilage`.

`BlLayoutBadge.svelte` — `{#if layout !== 'standard'}` mono 9px tracking-wide `--k-rust-deep` text, `1px solid` rust-40 border, rounded, `$t['blog.badge.hero']` / `$t['blog.badge.gallery']`.

`BlMasthead.svelte` — centered. Anatomy top→bottom: strap (mono 10px, `tracking-[0.22em]`, `--k-ink-mute`, `border-top: 1px solid var(--k-ink)`, `pt-2`) → `<h1>` `Die <span class="font-instrument italic font-normal" style="color: var(--k-rust)">Beilage</span>` (display 800, 58px desktop / 34px mobile, compact 38px, `tracking-[-0.035em]`, `leading-[0.95]`) → stats line (full variant only, requires `count` + `latestISO`): `{$t['blog.mast.from']} · {count} {$t['blog.mast.posts']} · <span rust>{$t['blog.mast.latest']}: {latestISO ? fmtDateKicker(latestISO, $locale) : '—'}</span>` → the double rule as a standalone `<div class="bl-mast-rules"></div>` AFTER the title/stats block (the blog.css element renders heavy-2.5px / 2px gap / light-1px top-to-bottom — never reorder). The title is the brand — „Die Beilage" stays German in both locales.

- [ ] **Step 2: `BeilageIndex.svelte` — orchestrator island**

Props: `{ posts }: { posts: BeilagePost[] }` (sorted pubDate desc by the page). Svelte 5 runes.

State: `query = $state('')`, `activeTag = $state<string | null>(null)`, `activeMonth = $state<string | null>(null)` (monthKey), `page = $state(0)`, `pageSize = $state(12)`, `showAllTags = $state(false)`.

Derived:
```ts
const filtered = $derived(posts.filter((p) => {
  if (activeTag && !p.tags.includes(activeTag)) return false;
  if (activeMonth && monthKey(p.pubDateISO) !== activeMonth) return false;
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    return p.title.toLowerCase().includes(q)
      || p.description.toLowerCase().includes(q)
      || p.tags.some((t) => t.toLowerCase().includes(q));
  }
  return true;
}));
const isFiltered = $derived(!!query.trim() || !!activeTag || !!activeMonth);
const totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
const pageItems = $derived(filtered.slice(page * pageSize, (page + 1) * pageSize));
const showLead = $derived(!isFiltered && page === 0 && pageItems.length > 0); // Decision 9
const lead = $derived(showLead ? pageItems[0] : null);
const columnItems = $derived(showLead ? pageItems.slice(1) : pageItems);
const counts = $derived(tagCounts(posts));
const months = $derived(monthGroups(posts));
```
`$effect`: reset `page = 0` whenever `query`/`activeTag`/`activeMonth`/`pageSize` changes (guard against loops by tracking previous values, or reset inside the input handlers instead of an effect — handler-reset is simpler and rune-safe: do it in the handlers).

Layout (desktop ≥ lg): `BlMasthead` (full, `count={posts.length}`, `latestISO={posts[0]?.pubDateISO ?? null}`) → **rubric row** (`px-6 lg:px-12 py-3`, dashed bottom border `--k-rule`): mono `RUBRIKEN` label + `#alle` chip (active when `!activeTag`, click clears) + top-6 tags from `counts` as chips (click toggles) + `+{counts.length - 6}` rust mono button when more exist (click sets `showAllTags = true` → row wraps and shows all; hidden when ≤ 6) + search input right (`w-[300px]`, paperSoft bg, `--k-rule` border → 1.5px ink border when `query`, `⌕` glyph, ✕ clear button when active, live hit-count line under it in rust mono via `tStr($t['blog.search.hits'], { n: filtered.length })` when `query`). On mobile the chip row is horizontal-scroll: `use:scrollFade` + `class="kiosk-scroll-fade no-scrollbar flex overflow-x-auto"`, chips `shrink-0`; search row full-width below.
→ **main grid** `lg:grid lg:grid-cols-[1fr_300px] gap-8 px-6 lg:px-12 py-6`:
  - Left: `{#if lead}` lead card (grid `1.05fr 1fr` desktop / stacked mobile: rust strap chip `NEU IN DER BEILAGE` (rust bg, paper text, 1px ink border, rounded), title 33px/21px 800, serif-italic standfirst (description), `BlPostMeta`, tag chips small; right: cover `<img>` in 1.5px-ink rounded frame with print shadow, whole card links to `/blog/${lead.id}`) → double rule (2px ink + 1px ink, 2px gap) → **two newspaper columns** `grid grid-cols-1 md:grid-cols-[1fr_1px_1fr] gap-[22px]` with a `bg-[var(--k-rule)]` divider div; distribute `columnItems` alternating (even indexes → col 1, odd → col 2 — the JSX seeds happen to park the 5th item in column 2; either distribution is acceptable, alternation is the rule); each entry = column card: dashed bottom border, optional thumb (first card of each column when it has a cover, `h-[110px]` framed img), kicker row (`fmtDateKicker` rust + `BlLayoutBadge`), title 18px/700, description 12.5px `--k-ink-soft`, `BlPostMeta`; card links to `/blog/${p.id}`. Cards get `class="bl-card-in"`. → **pagination row** (always rendered): mono `PRO SEITE` + 12/24/48 pills (active = rust-filled) + spacer + `«` `‹` buttons + `{$t['blog.pag.page']} {page + 1} / {totalPages}` + `›` `»`; bound buttons disabled at range ends with `--k-rule` border/text (visible but inactive, per mockup `Seite 1/1`); `goToPage` scrolls to top.
  - Right sidebar (`hidden lg:flex flex-col gap-[18px]` — on mobile the modules render AFTER the pagination in this order: Archiv, About, Aufruf; Rubriken-Cloud is desktop-only, the chip row serves mobile):
    - **Rubriken-Cloud**: paperWarm card, 1.5px ink border, rounded-xl, print shadow; header mono rust `{$t['blog.rubrics']} · {counts.length}` with 1px ink bottom border; all tags as small chips (click = same toggle as rubric row).
    - **Archiv (novel §03)**: paperWarm card, header row mono rust `ARCHIV` + note 8.5px; one row per `months` entry: month label (`fmtMonthLabel(g.iso, $locale)`, mono 11px, `--k-rust-deep` when active) + rust unit blocks (`{#each Array(g.count)}` 14×7px rust rounded-sm, opacity .75) + `{g.count} {g.count === 1 ? $t['blog.archive.entry'] : $t['blog.archive.entries']}`; row is a `<button>` toggling `activeMonth = activeMonth === g.key ? null : g.key`, active row bg `var(--k-rust-tint)`, dashed separators. No empty months (monthGroups guarantees).
    - **About**: paper card; header mono rust `ÜBER DIE BEILAGE`; body 12.5px: `{$t['blog.about.pre']}<b>{$t['blog.about.bold']}</b>{$t['blog.about.post']}`; footer mono 9.5px `tStr($t['blog.about.since'], { month: fmtMonthLabel(oldestISO, $locale), n: posts.length })` where `oldestISO` = last item of `posts` (desc-sorted).
    - **Aufruf (novel §06)**: 2px ink border, `bg-[var(--k-rust-tint)]`, print shadow in `--k-rust-deep`; kicker mono `✎ AUFRUF` rust-deep; title 21px 800 `Schreib für den Kiez` + rust dot; body; CTA `<a>` ink-filled pill (`bg-ink text-paper`, print shadow rust, `min-h-[44px] inline-flex items-center`) with `href={callHref}` where
      ```ts
      const callHref = $derived(`/topics/create?prefill_title=${encodeURIComponent($t['blog.call.prefillTitle'])}&prefill_tags=blogidee`);
      ```
      note line mono 9px below.

States: `{#if posts.length === 0}` → state 01 LEER (masthead stays; dashed-border card centered: ⏳, `blog.empty.title` 800, `blog.empty.body`); `{:else if filtered.length === 0}` → state 02 (headline composed as `{$t['blog.search.none.pre']}<span class="font-instrument italic" style="color: var(--k-rust)">{query}</span>{$t['blog.search.none.post']}` — the curly quotes live in the pre/post values; body `tStr($t['blog.search.none.body'], { n: posts.length })`; the top-4 rubric chips as the exit; ✕ resets query). When a tag/month filter yields zero, same empty pattern applies with the chips as exit.

- [ ] **Step 3: Rewrite `src/pages/blog/index.astro`**

```astro
---
// /blog — „Die Beilage" (kiosk). SSR like every kiosk surface.
import { getCollection } from 'astro:content';
import KioskLayout from '../../layouts/KioskLayout.astro';
import BeilageIndex from '../../components/blog/kiosk/BeilageIndex.svelte';
import { readingMinutes, type BeilagePost } from '../../lib/blog/beilage';

const entries = await getCollection('blog', ({ data }) => !data.draft);
const posts: BeilagePost[] = entries
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
  .map((e) => ({
    id: e.id,
    title: e.data.title,
    description: e.data.description,
    pubDateISO: e.data.pubDate.toISOString(),
    tags: e.data.tags ?? [],
    layout: e.data.postLayout,
    minutes: readingMinutes(e.body ?? ''),
    cover: e.data.cover?.src,
    coverAlt: e.data.coverAlt,
  }));
---

<KioskLayout title="Die Beilage" description="Die Beilage — das Magazin des Schillerkiez Kurier. Geschichten, Orte und Menschen aus dem Kiez." page="blog">
  <BeilageIndex client:only="svelte" posts={posts} />
</KioskLayout>

<style is:global>
  @import '../../styles/blog.css';
</style>
```

- [ ] **Step 4: Compile gates** — `pnpm type-check` (29 baseline) + `pnpm build` (success).

- [ ] **Step 5: Browser gate (desktop)** — `pnpm dev --port 4399`; playwright-cli open `http://localhost:4399/blog`, wait for a post-hydration selector (e.g. text „NEU IN DER BEILAGE"). Verify: masthead strap + „Die Beilage" + stats `6 BEITRÄGE · ZULETZT: 8. APR 2025` + double rule; rubric row with `#alle` active + 6 chips + `+4`; lead = Cafe Guide; two columns with 5 remaining posts, dashed separators, hero/gallery badges on the two special posts; pagination `SEITE 1 / 1` with inactive arrows; sidebar shows Cloud (10 tags), Archiv rows `APR 1 · MÄR 1 · FEB 1 · JAN 3`, About, Aufruf. Click `#local` → 3 posts, no lead treatment; click JAN 2025 archive row → 3 posts; type `ubahn` in search → state 02 with „Nichts gefunden zu „ubahn““ (both quote pairs curly — U+201E/U+201C); clear all. Toggle EN via the nav pill → chrome flips (strap, labels), post titles/descriptions stay EN as authored. Verify the Aufruf CTA href contains `prefill_tags=blogidee`.

- [ ] **Step 6: Browser gate (mobile 390×667)** — resize; verify: compact-ish masthead, chip row horizontally scrollable with scroll-fade, search full-width, stacked cards (lead has strap + cover), pagination, then Archiv/About/Aufruf below, bottom nav has NO blog tab (expected — Decision 2). Kill the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/components/blog/kiosk/ src/pages/blog/index.astro
git commit -m "feat(blog): kiosk index — Beilage masthead, newspaper columns, rubric/archive filters, sidebar modules"
```

---

### Task 3: Article shell + Standard layout + SSR slug route

**Files:**
- Create: `src/components/blog/kiosk/ArticleShell.astro`
- Create: `src/components/blog/kiosk/BlogReadBar.svelte`
- Create: `src/components/blog/kiosk/BlogArticleHeader.svelte`
- Create: `src/components/blog/kiosk/BlogArticleFooter.svelte`
- Create: `src/components/blog/kiosk/BlogRelatedRail.svelte`
- Rewrite: `src/layouts/blog/StandardLayout.astro`
- Rewrite: `src/pages/blog/[...slug].astro`

**Interfaces:**
- Consumes: Task 1 lib + i18n; Task 2 atoms (`BlRubrikChip`, `BlPostMeta`).
- Produces: `ArticleShell.astro` props `{ post: BeilagePost, related: RelatedItem[], rank: { no: number; of: number } }` with named slot `header` and default slot (body). Tasks 4 uses it identically. `BlogArticleHeader` props `{ post, rank, variant }`.

**Design contract:** `jsx/kiosk-blog-article.jsx` (`BlogReadBar`, `BlogArticleFooter`, `BlogRelatedRail`, `BaStrap`, `BlogArticleStandard`) + mobile screens in `jsx/kiosk-blog-mobile.jsx` (`BlogMobileArticle`, `BlogMobileArticleEnd`).

- [ ] **Step 1: `BlogReadBar.svelte` (novel §01 Lesefaden)**

Props: `{ title, minutes }: { title: string; minutes: number }`.

- Sticky bar: paperWarm bg, 1.5px ink bottom border. Docking per Decision 13:
  ```ts
  let topOffset = $state(0);
  let progress = $state(0);   // 0..1
  onMount(() => {
    const header = document.querySelector('header');
    const measure = () => { topOffset = header?.offsetHeight ?? 0; };
    measure();
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', measure); if (raf) cancelAnimationFrame(raf); };
  });
  ```
  Element: `style="position: sticky; top: {topOffset}px; z-index: 30"`.
- Row (desktop): `‹ zur Beilage` link (mono 10.5px rust-deep, `href="/blog"`) · center `Die <i>Beilage</i> · {title}` (13px 700, truncate, serif-italic rust „Beilage") · right mono 10px `{Math.round(progress * 100)} % {$t['blog.readbar.read']} · {minutes} {$t['blog.meta.min']}`; at `progress >= 1` swap right text to `<span class="bl-read-done">{$t['blog.readbar.done']}</span>` (display only — nothing stored). Mobile (`lg:hidden` variant of the row): `{$t['blog.readbar.back.short']}` + `{pct} % · {minutes} Min`.
- Progress track: 4px, `bg-[var(--k-paper-soft)]`; fill `width: {progress * 100}%`, rust, `border-right: 1.5px solid var(--k-ink)` (the leading edge; drop the border at 100 %). Direct style binding — NO transition/animation (scroll-bound; reduced-motion unchanged).

- [ ] **Step 2: `BlogArticleHeader.svelte`**

Props: `{ post, rank, variant }: { post: BeilagePost; rank: { no: number; of: number }; variant: 'standard' | 'hero' | 'gallery' }`.

- `standard` / `gallery`: max-w-[940px] centered: **strap** `RUBRIK · {post.tags[0]?.toUpperCase()} · № {rank.no} / {rank.of}` (mono 10px tracking, rust, `border-left: 3px solid var(--k-rust)` pl-2.5; № part `--k-ink-mute`) → title 46px (gallery 44px) / mobile 27px, 800, `tracking-[-0.03em] leading-none` → standfirst = description (serif italic 20px/19px, `--k-ink-soft`, max-w-[780px]) → `BlPostMeta` → (standard only) full-width cover `<img>` framed (1.5px ink, rounded-xl, print shadow, `h-[330px] object-cover` desktop / `h-[170px]` mobile) + photo-credit line mono 9.5px `--k-ink-mute`: `{$t['blog.photo.credit']}{post.coverAlt ? ' · ' + post.coverAlt.toUpperCase() : ''}`.
- `hero`: full-bleed cover band `h-[420px]` (mobile `h-[260px]`) `<img>` `object-cover w-full`, 2px ink bottom border → overlapping centered **ink title band** (`-mt-[74px]` wrapper, `class="bl-hero-band"` — Task 6's print CSS targets it — ink bg, paper text, 2px ink border, rounded-xl, print shadow `3px 3px 0 var(--k-rust)`, `px-8 py-5`, max-w-[760px]): strap mono 9.5px `tracking-[0.2em]` in `--k-rust-on-ink`: `{$t['blog.strap.hero']} · {$t['blog.strap.rubrik']} {post.tags[0]?.toUpperCase()} · № {rank.no} / {rank.of}` + title 38px/26px 800 → below (back in flow, centered, pt matches the overlap): standfirst serif italic 19px, `BlPostMeta` centered, 56×3px rust rule.

- [ ] **Step 3: `BlogArticleFooter.svelte` (novel §04 + §05 trigger)**

Props: `{ post }: { post: BeilagePost }`.

- Top rule 2px ink, pt-4. Row 1 (flex-wrap, gap-2, every control `min-h-[44px]` on mobile): mono label `RUBRIKEN` + `BlRubrikChip` per tag with `href={`/blog/tag/${tag}`}` + spacer + **teilen** pill (mono 11px, 1.5px ink border, rounded-full):
  ```ts
  async function share() {
    const url = window.location.origin + window.location.pathname;
    if (navigator.share) { try { await navigator.share({ title: post.title, url }); } catch { /* user cancelled */ } }
    else { await navigator.clipboard.writeText(url); showToast($t['blog.foot.share.copied'], { type: 'success' }); }
  }
  ```
  + **Druckbogen** pill (`title={$t['blog.foot.print.note']}`, `onclick={() => window.print()}`).
- Row 2 — **Forum-CTA card** (the ONLY wine on the page): paperWarm, 2px ink border, rounded-xl, print shadow; left: 16.5px 800 `{$t['blog.foot.discuss.pre']}<i class="font-instrument italic font-normal" style="color: var(--k-wine)">{$t['blog.foot.discuss.it']}</i>{$t['blog.foot.discuss.post']}` + mono 9.5px note (`blog.foot.discuss.note`); right: `<a>` wine-filled pill (`bg-[var(--k-wine)] text-paper`, 1.5px ink border, print shadow, `min-h-[44px] inline-flex items-center px-5`, 700) `{$t['blog.foot.discuss']} →` with
  ```ts
  const discussHref = $derived(
    `/topics/create?prefill_title=${encodeURIComponent($t['blog.foot.discuss.prefix'] + post.title)}` +
    `&prefill_body=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + window.location.pathname : `/blog/${post.id}`)}`
  );
  ```
  (island is `client:only` → `window` exists at init; the ternary is a type-safety belt). Nothing auto-posts — the link opens the compose form pre-filled.

- [ ] **Step 4: `BlogRelatedRail.svelte` (novel §02)**

Props: `{ items }: { items: RelatedItem[] }`. Header row (1px ink bottom border): mono 10.5px tracking rust `MEHR AUS DER BEILAGE` + mono 9px `--k-ink-mute` note (`blog.rail.note`). Grid `md:grid-cols-3 gap-[18px]` (mobile stacked): each card an `<a href={`/blog/${item.post.id}`}>` — 1.5px ink border, paperWarm, rounded-lg, print shadow, p-4: kicker `fmtDateKicker` rust mono 9px → title 14.5px 700 → mono 8.5px: `{item.shared.length ? `${$t['blog.rail.common']}: ${item.shared.map(t => '#' + t).join(' ')}` : $t['blog.rail.recent']}` in `--k-rust-deep` (shared) / `--k-ink-mute` (recent).

- [ ] **Step 5: `ArticleShell.astro`**

```astro
---
// Shared article scaffold for all 3 postLayouts. The wrapping div
// `.bl-sheet` is the Druckbogen print-isolation root (Task 6).
import KioskLayout from '../../../layouts/KioskLayout.astro';
import BlogReadBar from './BlogReadBar.svelte';
import BlogArticleFooter from './BlogArticleFooter.svelte';
import BlogRelatedRail from './BlogRelatedRail.svelte';
import type { BeilagePost, RelatedItem } from '../../../lib/blog/beilage';

interface Props {
  post: BeilagePost;
  related: RelatedItem[];
}
const { post, related } = Astro.props;
---

<KioskLayout title={post.title} description={post.description} page="blog">
  <BlogReadBar client:only="svelte" title={post.title} minutes={post.minutes} />
  <div class="bl-sheet">
    <slot name="header" />
    <div class="max-w-[940px] mx-auto px-5 lg:px-0">
      <slot />
      <BlogArticleFooter client:only="svelte" post={post} />
      <BlogRelatedRail client:only="svelte" items={related} />
    </div>
  </div>
</KioskLayout>

<style is:global>
  @import '../../../styles/blog.css';
</style>
```

(The print header/footer + QR land in Task 6 — the shell just establishes `.bl-sheet` now. Note `rank` is NOT a shell prop: the layouts pass it straight to `BlogArticleHeader` in their `header` slot.)

- [ ] **Step 6: Rewrite `src/layouts/blog/StandardLayout.astro`**

```astro
---
// postLayout „standard" = Zeitungsseite: Rubrik-Strap, Standfirst,
// zweispaltiger Satz, Pull-Quote via blockquote-Styling.
import type { CollectionEntry } from 'astro:content';
import ArticleShell from '../../components/blog/kiosk/ArticleShell.astro';
import BlogArticleHeader from '../../components/blog/kiosk/BlogArticleHeader.svelte';
import type { BeilagePost, RelatedItem } from '../../lib/blog/beilage';

interface Props {
  post: CollectionEntry<'blog'>;      // kept for compatibility; unused directly
  meta: BeilagePost;
  related: RelatedItem[];
  rank: { no: number; of: number };
}
const { meta, related, rank } = Astro.props;
---

<ArticleShell post={meta} related={related}>
  <div slot="header" class="max-w-[940px] mx-auto px-5 lg:px-0 pt-8">
    <BlogArticleHeader client:only="svelte" post={meta} rank={rank} variant="standard" />
  </div>
  <div class="bl-prose bl-prose--cols pt-2 pb-4">
    <slot />
  </div>
</ArticleShell>
```

- [ ] **Step 7: Rewrite `src/pages/blog/[...slug].astro` (SSR + draft-404 + layout dispatch)**

```astro
---
// /blog/[slug] — SSR (Decision 1). Drafts 404 in prod, visible in dev.
import { getCollection, render } from 'astro:content';
import StandardLayout from '../../layouts/blog/StandardLayout.astro';
import HeroLayout from '../../layouts/blog/HeroLayout.astro';
import GalleryLayout from '../../layouts/blog/GalleryLayout.astro';
import { readingMinutes, relatedFor, rankOf, type BeilagePost } from '../../lib/blog/beilage';

const { slug } = Astro.params;

const entries = await getCollection('blog', ({ data }) => !data.draft || !import.meta.env.PROD);
const entry = entries.find((e) => e.id === slug);
if (!entry) return new Response(null, { status: 404 });

const published = entries.filter((e) => !e.data.draft);
const toMeta = (e: typeof entry): BeilagePost => ({
  id: e.id,
  title: e.data.title,
  description: e.data.description,
  pubDateISO: e.data.pubDate.toISOString(),
  tags: e.data.tags ?? [],
  layout: e.data.postLayout,
  minutes: readingMinutes(e.body ?? ''),
  cover: e.data.cover?.src,
  coverAlt: e.data.coverAlt,
});
const all = published.map(toMeta);
const meta = toMeta(entry);
const related = relatedFor(meta.id, all);
const rank = rankOf(meta.id, all);

const { Content } = await render(entry);
const layouts = { standard: StandardLayout, hero: HeroLayout, gallery: GalleryLayout } as const;
const Layout = layouts[entry.data.postLayout] ?? StandardLayout;
---

<Layout post={entry} meta={meta} related={related} rank={rank}>
  <Content />
</Layout>
```

Note: until Task 4 rewrites Hero/Gallery, the OLD layout files have incompatible props. To keep every commit green, in THIS task comment out the `HeroLayout`/`GalleryLayout` imports AND point `hero`/`gallery` at `StandardLayout` (`const layouts = { standard: StandardLayout, hero: StandardLayout, gallery: StandardLayout }`), both with a `// TODO(Task 4)` comment; Task 4 restores the real imports + map. Delete `export const prerender = true` and `getStaticPaths` entirely.

- [ ] **Step 8: Compile gates** — `pnpm type-check` (29 baseline) + `pnpm build`.

- [ ] **Step 9: Browser gate** — dev server :4399, playwright-cli:
  - `/blog/neighborhood-cafe-guide`: ReadBar docks under the nav, shows `0 % gelesen · N Min` at top; scroll → fill grows with ink leading edge, no easing lag; at bottom `100 %` → „gelesen ✓" stamp. Header: strap `RUBRIK · CAFE · № 6 / 6`, 46px title, serif standfirst, meta with EN chip tooltip, framed cover + FOTO credit. Body: 2 columns desktop / 1 mobile, first paragraph larger+ink, h2/h3 kiosk display. Footer: tag chips link to `/blog/tag/cafe` etc.; teilen (clipboard toast on non-share browsers); Druckbogen pill present; Forum-CTA card with wine button whose href contains `prefill_title=Beilage%3A%20The%20Cafe%20Guide` and `prefill_body=http%3A%2F%2Flocalhost%3A4399%2Fblog%2Fneighborhood-cafe-guide`. Rail: 3 cards, first shows `GEMEINSAM: #local #food #guide` (market guide).
  - `/blog/community-spotlight` has a markdown blockquote → verify pull-quote styling (double rules, serif italic, rust-deep).
  - `/blog/nonexistent` → 404. DE/EN toggle flips all chrome labels.
  - Mobile 390: compact ReadBar `‹ Beilage · nn % · N Min`, CTA row ≥ 44px targets.
  Kill server.

- [ ] **Step 10: Commit**

```bash
git add src/components/blog/kiosk/ src/layouts/blog/StandardLayout.astro src/pages/blog/[...slug].astro
git commit -m "feat(blog): article shell — Lesefaden, standard Zeitungsseite, footer CTAs, Rubrik-Rail, SSR slug route"
```

---

### Task 4: Hero (Aufmacherseite) + Gallery (Bildstrecke) layouts

**Files:**
- Rewrite: `src/layouts/blog/HeroLayout.astro`
- Rewrite: `src/layouts/blog/GalleryLayout.astro`
- Create: `src/components/blog/kiosk/BlogGalleryGrid.svelte`
- Modify: `src/pages/blog/[...slug].astro` (restore the real layout map from Task 3's TODO)

**Interfaces:**
- Consumes: `ArticleShell` (props `{ post: BeilagePost, related }`, slots `header` + default), `BlogArticleHeader` (`variant="hero"` / `"gallery"`), Task 1 lib.
- Produces: nothing consumed later.

**Design contract:** `jsx/kiosk-blog-article.jsx` (`BlogArticleHero`, `BlogArticleGallery`).

- [ ] **Step 1: `HeroLayout.astro`**

```astro
---
// postLayout „hero" = Aufmacherseite: Vollbild-Cover, Ink-Titelband
// mit Rost-Druckschatten, einspaltiger ruhiger Lesefluss.
import type { CollectionEntry } from 'astro:content';
import ArticleShell from '../../components/blog/kiosk/ArticleShell.astro';
import BlogArticleHeader from '../../components/blog/kiosk/BlogArticleHeader.svelte';
import type { BeilagePost, RelatedItem } from '../../lib/blog/beilage';

interface Props {
  post: CollectionEntry<'blog'>;
  meta: BeilagePost;
  related: RelatedItem[];
  rank: { no: number; of: number };
}
const { meta, related, rank } = Astro.props;
---

<ArticleShell post={meta} related={related}>
  <div slot="header">
    <BlogArticleHeader client:only="svelte" post={meta} rank={rank} variant="hero" />
  </div>
  <div class="bl-prose bl-prose--hero max-w-[720px] mx-auto pt-2 pb-4">
    <slot />
  </div>
</ArticleShell>
```

Add to `blog.css`: `.bl-prose--hero { font-size: 15.5px; line-height: 1.68; } .bl-prose--hero > p:first-child { font-size: 17px; }` (single column — no `--cols`).

- [ ] **Step 2: `BlogGalleryGrid.svelte`**

Props: `{ images }: { images: Array<{ src: string; alt?: string }> }`. Grid `md:grid-cols-2 gap-[26px_24px]` — image 01 spans full width (`md:col-span-2`, `h-[300px]`), rest `h-[190px]`; each: framed `<img>` (1.5px ink border, rounded-xl, print shadow, `object-cover w-full`, `loading="lazy"` except first) + caption row: mono 9.5px tracking rust `{$t['blog.caption.image']} {String(i + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}` + 12px `--k-ink-soft` alt text when present. Renders nothing for an empty array.

- [ ] **Step 3: `GalleryLayout.astro`**

Same scaffold as HeroLayout but `variant="gallery"`, body `bl-prose` single column (`max-w-[940px]`, no `--cols` — the gallery post's body is short prose between images), and between header and body:

```astro
<BlogGalleryGrid
  client:only="svelte"
  images={(post.data.galleryImages ?? []).map((img, i) => ({ src: img.src, alt: post.data.coverAlt ? `${post.data.coverAlt} (${i + 1})` : undefined }))}
/>
```

(`galleryImages` is `image()[]` — each item has `.src`. The real gallery post currently has zero entries, so the grid is dormant; the MDX body carries the actual content and renders via `<slot />` as usual. Do NOT add images to the MDX — content stays as authored.)

- [ ] **Step 4: Restore the real layout map** in `[...slug].astro` (`{ standard: StandardLayout, hero: HeroLayout, gallery: GalleryLayout }`), remove the TODO.

- [ ] **Step 5: Compile gates** — `pnpm type-check` + `pnpm build`.

- [ ] **Step 6: Browser gate** — dev :4399:
  - `/blog/community-spotlight` (hero): full-bleed cover, ink title band overlapping the cover's bottom edge with rust print shadow + `--k-rust-on-ink` strap, centered standfirst/meta/rust rule, single 720px column, larger leading; blockquote pull-quote inside.
  - `/blog/neighborhood-gallery` (gallery): standard-style header with `▤`-family strap, body renders (grid dormant with 0 images — no empty frame artifacts), footer + rail present.
  - Both at 390px mobile. Kill server.

- [ ] **Step 7: Commit**

```bash
git add src/layouts/blog/HeroLayout.astro src/layouts/blog/GalleryLayout.astro src/components/blog/kiosk/BlogGalleryGrid.svelte src/pages/blog/[...slug].astro src/styles/blog.css
git commit -m "feat(blog): hero Aufmacherseite + gallery Bildstrecke layouts"
```

---

### Task 5: Tag pages (Rubrik-Seiten)

**Files:**
- Create: `src/components/blog/kiosk/BeilageTagPage.svelte`
- Rewrite: `src/pages/blog/tag/[tag].astro`

**Interfaces:**
- Consumes: `BlMasthead` (compact), `BlRubrikChip`, `BlPostMeta`, `BlLayoutBadge`, Task 1 lib.
- Produces: nothing consumed later.

**Design contract:** `jsx/kiosk-blog-states.jsx` (`BlogTagDesktop`) + `jsx/kiosk-blog-mobile.jsx` (`BlogMobileTag`) + state 03.

- [ ] **Step 1: `BeilageTagPage.svelte`**

Props: `{ tag, posts, allTags }: { tag: string; posts: BeilagePost[]; allTags: Array<[string, number]> }` (posts already filtered+sorted by the page; `allTags` from the full collection).

- `BlMasthead` compact (`count` not shown in compact mode).
- Title row (dashed bottom border): h1 40px/24px 800 `{$t['blog.tag.title']} <span class="font-instrument italic font-normal" style="color: var(--k-rust)">#{tag}</span>` + mono count `{posts.length} {$t['blog.tag.posts']}` + right `✕`-pill `<a href="/blog">` (`{$t['blog.tag.clear']}`, 1.5px rust border, rust-deep text, rounded-full, `min-h-[44px]` on mobile).
- `{#if posts.length > 0}` card grid `md:grid-cols-2 lg:grid-cols-3 gap-6`: each card `<a href={`/blog/${p.id}`}>` with `bl-card-in` — framed cover img `h-[130px]` (or paperSoft placeholder block when no cover), kicker row (`fmtDateKicker` rust + `BlLayoutBadge`), title 18px 700, description 12.5px, `BlPostMeta`.
- `{:else}` state 03 LEERE RUBRIK: centered dashed card — headline 17px 800 composed as `{$t['blog.tag.empty.pre']}<span class="font-instrument italic" style="color: var(--k-rust)">#{tag}</span>{$t['blog.tag.empty.post']}`, body `blog.tag.empty.body`, `{$t['blog.readbar.back']}` pill → `/blog`.
- Bottom: dashed top rule + mono `ANDERE RUBRIKEN` + small chips for `allTags` minus current, `href="/blog/tag/{t}"`.

- [ ] **Step 2: Rewrite `src/pages/blog/tag/[tag].astro`**

```astro
---
// /blog/tag/[tag] — SSR (Decision 1). Unknown/empty tags render the
// „Leere Rubrik" state (catches stale links) instead of 404ing.
import { getCollection } from 'astro:content';
import KioskLayout from '../../../layouts/KioskLayout.astro';
import BeilageTagPage from '../../../components/blog/kiosk/BeilageTagPage.svelte';
import { readingMinutes, tagCounts, type BeilagePost } from '../../../lib/blog/beilage';

const { tag = '' } = Astro.params;

const entries = await getCollection('blog', ({ data }) => !data.draft);
const all: BeilagePost[] = entries
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
  .map((e) => ({
    id: e.id,
    title: e.data.title,
    description: e.data.description,
    pubDateISO: e.data.pubDate.toISOString(),
    tags: e.data.tags ?? [],
    layout: e.data.postLayout,
    minutes: readingMinutes(e.body ?? ''),
    cover: e.data.cover?.src,
    coverAlt: e.data.coverAlt,
  }));
const posts = all.filter((p) => p.tags.includes(tag));
---

<KioskLayout title={`Rubrik #${tag} — Die Beilage`} description={`Beiträge der Rubrik #${tag} in der Beilage.`} page="blog">
  <BeilageTagPage client:only="svelte" tag={tag} posts={posts} allTags={tagCounts(all)} />
</KioskLayout>

<style is:global>
  @import '../../../styles/blog.css';
</style>
```

Delete `export const prerender = true` and `getStaticPaths`.

(The index page and tag page duplicate the ~14-line serialization block; that is deliberate — extracting it would need a server-side helper importing `astro:content`, and `beilage.ts` must stay dependency-pure for the islands. Two inline copies in page frontmatter is the smaller evil; do NOT move it into `beilage.ts`.)

- [ ] **Step 3: Compile gates** — `pnpm type-check` + `pnpm build`.

- [ ] **Step 4: Browser gate** — dev :4399: `/blog/tag/local` → compact masthead (no stats line, double rule intact), `Rubrik #local · 3 BEITRÄGE`, 3 cards with badges on none (all standard… verify gallery post appears with ▤ badge — it has tag `local`), ANDERE RUBRIKEN row without `#local`; `✕ Rubrik aufheben` → `/blog`. `/blog/tag/verkehr` (nonexistent) → state 03 „Rubrik #verkehr ist (noch) leer." + back pill, HTTP 200. Mobile 390 pass. DE/EN flip. Kill server.

- [ ] **Step 5: Commit**

```bash
git add src/components/blog/kiosk/BeilageTagPage.svelte src/pages/blog/tag/
git commit -m "feat(blog): kiosk Rubrik pages with empty-rubric state, SSR"
```

---

### Task 6: Druckbogen (A4) — novel §05

**Files:**
- Modify: `src/components/blog/kiosk/ArticleShell.astro` (print header/footer + QR)
- Modify: `src/styles/blog.css` (the `@media print` block)

**Interfaces:**
- Consumes: `.bl-sheet` wrapper from Task 3; `qrcode` package; `getTrustedBaseUrl`.
- Produces: nothing consumed later.

**Design contract:** `jsx/kiosk-blog-states.jsx` §05 module + `tokens-blog.css` print block + the two existing print surfaces (`src/pages/steckbrief.astro`, `src/pages/schillerkiez/druck.astro`) as the repo precedent (READ BOTH before writing CSS — reuse their comments' hard-won rules: visibility-isolation, `position: fixed !important` pin, global-style-block requirement, injected-SVG global rule).

- [ ] **Step 1: QR + print furniture in `ArticleShell.astro`**

Frontmatter additions:

```astro
import QRCode from 'qrcode';
import { getTrustedBaseUrl } from '../../../lib/auth/baseUrl';
import { fmtDate } from '../../../lib/blog/beilage';

// getTrustedBaseUrl fails closed to '' in prod when NEXTAUTH_URL is unset —
// that protects EMAILED links; this route only prints a public URL into a
// QR. Fall back to the canonical domain (same literal + rationale as
// steckbrief.astro:41 — the Kiez final review marked mahalle.berlin the
// forward-looking preference over druck's vercel.app literal).
const baseUrl = getTrustedBaseUrl(Astro.request) || 'https://mahalle.berlin';
const articleUrl = `${baseUrl}/blog/${post.id}`;
// SAFE to set:html — QRCode.toString output for a same-origin URL we
// construct ourselves; never user-supplied. Same pattern as steckbrief/druck.
const qrSvg = await QRCode.toString(articleUrl, {
  type: 'svg',
  margin: 0,
  color: { dark: '#1b1a17', light: '#0000' },
});
const standDate = fmtDate(post.pubDateISO, 'de'); // print sheet is DE-only, like both existing print surfaces
```

Inside `.bl-sheet`, add print-only furniture (hidden on screen via `hidden` + shown in print CSS):

```astro
<div class="bl-print-head hidden">
  <div class="bl-print-strap">DIE BEILAGE · SCHILLERKIEZ KURIER</div>
</div>
...existing slots...
<div class="bl-print-foot hidden">
  <div class="bl-print-stand">STAND: {standDate}<br />{articleUrl.replace(/^https?:\/\//, '')}</div>
  <div class="bl-print-qr"><Fragment set:html={qrSvg} /></div>
</div>
```

(Mandatory per handoff: STAND date + QR → `/blog/[slug]`. `Fragment` needs no import in Astro.)

- [ ] **Step 2: Print CSS in `blog.css`** (replace the Task-1 placeholder comment)

```css
/* ─ Druckbogen (A4) · novel §05 — @media print on the article route ─
   Visibility-isolation pattern from steckbrief.astro / druck.astro:
   body* hidden, .bl-sheet subtree visible. DELIBERATE DEVIATION from
   those precedents: they pin their sheet with position: FIXED, which
   clips everything past the first page — fine for their single-sheet
   cards, WRONG for a multi-page article. Here the sheet is ABSOLUTE
   (anchored to body's top — body.k-paper-bg is position: relative) so
   content flows across pages, and the 18mm margins live on @page so
   EVERY page gets them (padding on the sheet would only pad page 1).
   The !important still outranks Astro's [data-astro-cid-*] selectors.
   These rules MUST load via a global style block — <body> belongs to
   KioskLayout, not the page. 2-riso-color rule: ink + rust only. */
@media print {
  @page { size: A4; margin: 18mm; }

  body * { visibility: hidden; }
  .bl-sheet, .bl-sheet * { visibility: visible; }

  .bl-sheet {
    position: absolute !important;
    top: 0; left: 0;
    width: 100%;
    box-sizing: border-box;
  }

  /* Hero ink title band: ink backgrounds don't print — without this the
     band's paper-colored text vanishes on white. Flip to outlined ink. */
  .bl-sheet .bl-hero-band {
    background: transparent !important;
    color: var(--k-ink) !important;
    border: 1pt solid var(--k-ink) !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  .bl-sheet .bl-hero-band * { color: var(--k-ink) !important; }

  /* Chrome hidden even inside the sheet: CTAs, rail, interactive rows */
  .bl-sheet .bl-print-hide { display: none !important; }

  /* Print furniture on */
  .bl-print-head, .bl-print-foot { display: block !important; }
  .bl-print-head {
    font-family: var(--k-font-mono);
    font-size: 7pt;
    letter-spacing: 0.16em;
    color: var(--k-ink-mute);
    border-bottom: 1pt solid var(--k-ink);
    padding-bottom: 3mm;
    margin-bottom: 5mm;
  }
  .bl-print-foot {
    display: flex !important;
    justify-content: space-between;
    align-items: flex-end;
    border-top: 0.5pt solid var(--k-ink);
    padding-top: 3mm;
    margin-top: 8mm;
  }
  .bl-print-stand {
    font-family: var(--k-font-mono);
    font-size: 7pt;
    line-height: 1.6;
    color: var(--k-ink-mute);
  }
  .bl-print-qr { width: 18mm; height: 18mm; }

  /* Single serif column, 11pt, ink + rust only */
  .bl-sheet .bl-prose,
  .bl-sheet .bl-prose--cols,
  .bl-sheet .bl-prose--hero {
    columns: 1 !important;
    font-family: var(--k-font-serif) !important;
    font-size: 11pt !important;
    line-height: 1.55 !important;
    color: var(--k-ink) !important;
    max-width: none !important;
  }
  .bl-sheet .bl-prose blockquote { color: var(--k-rust-deep) !important; }
  .bl-sheet h1 { font-size: 20pt !important; }
  .bl-sheet img {
    max-width: 100% !important;
    height: auto !important;
    border: 1pt solid var(--k-ink) !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    break-inside: avoid;
  }
  .bl-sheet * { box-shadow: none !important; text-shadow: none !important; }
  /* The STAND+QR footer flows after the content — on a multi-page
     article it lands at the end of the last page, not pinned to a
     page edge. Acceptable: the sheet metaphor loosens across pages. */
}
/* Injected QR SVG sizing — global on purpose (set:html output carries
   no Astro scope hash), harmless outside print (parent is hidden). */
.bl-print-qr svg { width: 100%; height: 100%; display: block; }
```

- [ ] **Step 3: Mark chrome for hiding** — add `class="bl-print-hide"` to: the `BlogArticleFooter` wrapper and `BlogRelatedRail` wrapper in `ArticleShell.astro` (wrap each island in a div with the class), and inside `BlogArticleHeader` the hero ink band keeps (it's the title!) but interactive bits none exist. `BlogReadBar` sits OUTSIDE `.bl-sheet` → auto-hidden by visibility isolation, as are KioskNav/Footer/banners.

- [ ] **Step 4: Compile gates** — `pnpm type-check` + `pnpm build`.

- [ ] **Step 5: Print verification** — dev :4399. With playwright-cli, emulate print media (`emulate-media --media print` if available in this CLI version; otherwise capture a PDF via the `pdf` command — prefer the PDF: it proves MULTI-PAGE flow) on `/blog/neighborhood-cafe-guide`. Verify: only the sheet content renders (no nav/footer/readbar/CTAs/rail), single serif column at 11pt, framed cover, head strap `DIE BEILAGE · SCHILLERKIEZ KURIER`, footer `STAND: 8. Apr 2025` + URL + QR square, AND — critical — the full article spans multiple pages with 18mm margins on every page, nothing clipped after page 1 (this is why the sheet is `absolute`, not the steckbrief `fixed`). Verify the hero article (`/blog/community-spotlight`): the `.bl-hero-band` prints as outlined ink text (not invisible paper-on-white). Also screen-check: no `.bl-print-*` element visible on screen, article unchanged. Kill server.

- [ ] **Step 6: Commit**

```bash
git add src/components/blog/kiosk/ArticleShell.astro src/styles/blog.css
git commit -m "feat(blog): Druckbogen A4 print CSS with STAND + QR footer"
```

---

### Task 7: Legacy teardown, docs, final E2E matrix

**Files:**
- Delete: `src/layouts/BlogBaseLayout.astro`, `src/components/blog/BlogSearch.svelte`, `src/components/blog/ImageGallery.svelte`, `src/components/blog/TagCloud.astro`, `src/components/blog/TagBarMobile.astro`, `src/components/blog/BlogCard.astro`
- Modify: `src/components/SplashScreen.astro:20` (remove `'/blog'` from `splashPages`)
- Rewrite: `src/components/blog/CLAUDE.md`
- Modify: root `CLAUDE.md`, `README.md`
- Memory/ledger updates happen at controller level, not in this task.

- [ ] **Step 1: Pre-delete reference sweep** — prove zero live consumers before deleting:

```bash
grep -rn "BlogBaseLayout\|BlogSearch\|ImageGallery\|TagCloud\|TagBarMobile\|BlogCard" src --include="*.astro" --include="*.svelte" --include="*.ts" --include="*.tsx" | grep -v "components/blog/kiosk" | grep -v "^src/components/blog/CLAUDE.md"
```

Expected: only the six files themselves (self-references / mutual imports). If anything else shows up, STOP and report (status: BLOCKED) — do not delete a file with a live consumer.

- [ ] **Step 2: Delete the six files**, remove the empty imports they leave nowhere (verified by Step 1), and edit `SplashScreen.astro` line 20:

```js
var splashPages = ['/', '/newsboard', '/calendar', '/marketplace', '/profile', '/schillerkiez'];
```

- [ ] **Step 3: Old-accent + legacy-pattern sweep** — all must return zero:

```bash
grep -rn "4b9aaa" src/pages/blog src/layouts/blog src/components/blog
grep -rn "carved-title\|carved-accent" src/pages/blog src/layouts/blog src/components/blog
grep -rn "PageHeader" src/pages/blog
grep -rn "prerender" src/pages/blog
```

- [ ] **Step 4: Rewrite `src/components/blog/CLAUDE.md`** — document: „Die Beilage" architecture (KioskLayout `page="blog"` → rust; SSR everywhere per Decision 1 incl. the why: KioskNav has no client session fetch + draft-404 + QR request access); the island split and why (DE/EN-reactive chrome vs server-rendered MDX body); `beilage.ts` responsibilities incl. № n/N and related-ranking rules; Decision 9 (lead only unfiltered page 1); the ReadBar header-measure docking; the Druckbogen visibility-isolation recipe + QR; `prefill_tags` on `/topics/create` and its two blog consumers (Aufruf `#blogidee`, Forum-CTA title+body); draft gating semantics; states matrix; the fact that gallery grid is dormant (0 `galleryImages` in the real post) and captions come from `coverAlt`.

- [ ] **Step 5: Root `CLAUDE.md` updates**
  - Page-accent table: add `| Blog | rust | `#a3552e` via `--k-rust` |` and drop Blog from the TBD row.
  - `### Blog Tag Bar (Mobile)` section: replace body with a pointer to `src/components/blog/CLAUDE.md` (kiosk notes).
  - Splash allowlist bullet: remove `/blog` from the listed pages.
  - `### Page Header` bullet: remove `/blog` from the users list.
  - Project Structure / Component Patterns: note `/blog` is on the kiosk system (mirror the newsboard/kiez wording), and that `BlogBaseLayout` no longer exists (check the `### Prerendered pages + auth` bullet that references BlogBaseLayout — rewrite it to reflect the blog's SSR conversion).
  - Kiosk status wording wherever "only /blog pending" appears.
  - `README.md`: update the blog row/mention if it lists surfaces (grep `README.md` for `blog`).

- [ ] **Step 6: Full gates** — `pnpm type-check` (29 baseline) + `pnpm build` (proves no dangling imports).

- [ ] **Step 7: Final E2E matrix** — dev :4399, playwright-cli. All READMEFIRST non-negotiables:
  1. `/blog` desktop + 390 mobile: masthead double rule (2.5/2/1), rust-only accents, no splash overlay on load.
  2. `/blog/neighborhood-cafe-guide`: Lesefaden scroll-bound, 100 % stamp, footer CTAs, rail; wine appears ONLY on the Forum-CTA.
  3. `/blog/community-spotlight` (hero) + `/blog/neighborhood-gallery` (gallery) render their variants.
  4. `/blog/tag/local` + `/blog/tag/verkehr` (empty state).
  5. Forum-CTA + Aufruf hrefs correct (`prefill_title`/`prefill_body`/`prefill_tags`); following one lands on `/login` redirect when logged out (auth gate intact) — do NOT create any forum post.
  6. Print emulation on one article: sheet-only output, STAND + QR footer.
  7. DE/EN toggle on all three page types: every chrome string flips; body text and post titles/descriptions stay as authored.
  8. `curl -s -o /dev/null -w "%{http_code}"` for: `/blog` → 200, `/blog/neighborhood-cafe-guide` → 200, `/blog/nonexistent` → 404, `/blog/tag/verkehr` → 200.
  9. Old routes/artifacts: view-source of `/blog` contains no `4b9aaa`, no `animated-gradient-bg`.
  10. Draft gating: create a temporary `src/content/blog/zz-draft-test.mdx` with `draft: true` (+ minimal valid frontmatter, no cover). Verify in dev: `/blog` still shows 6 posts (draft absent from list, archive counts, rubric counts — the listing filters are unconditional `!data.draft`), while `/blog/zz-draft-test` returns 200 (dev-only visibility; in prod the `import.meta.env.PROD` gate 404s it — verified by code inspection since `pnpm preview` is unavailable on the Vercel adapter). DELETE the temp file afterwards and confirm `git status` is clean of it.
  Kill server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(blog): remove legacy dark-glass blog components, update docs"
```

---

## Self-Review Notes (done at plan time)

- **Spec coverage:** §02 masthead → T2; §03 index anatomy → T2; §04 all 3 layouts → T3+T4; §05 tag pages → T5; §06 search+pagination → T2; §07 mobile parity → each task's mobile gate; §08 novels: §01 ReadBar → T3, §02 rail → T3, §03 Archiv → T2, §04 Forum-CTA → T3 (+`prefill_tags` T1), §05 Druckbogen → T6, §06 Aufruf → T2; §09 states: 01+02 → T2, 03 → T5, 04 (draft) → T3 route + T7 matrix; §10 zero backend → no API/schema tasks exist; §11 open questions → Decision 14.
- **Type consistency:** `BeilagePost` / `RelatedItem` / `rankOf` signatures defined once in T1 Step 4 and consumed verbatim in T2 Step 3, T3 Steps 5-7, T5 Step 2. ArticleShell final Props are `{ post, related }` (rank goes to the header via the layouts — T3 Step 5 note governs).
- **Known intentional deviations from mockups:** none. Deviations discovered during implementation follow the SDD adjudication loop.
