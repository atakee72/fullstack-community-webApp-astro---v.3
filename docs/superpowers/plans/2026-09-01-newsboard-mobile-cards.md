# Newsboard Mobile Card Responsiveness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the kiosk Newsboard feed cards (`NewsCard`, `NewsCardLead`) stack correctly on mobile — today they use fixed desktop-only grid columns, so images overflow the card edge and the lead image collapses to a thumbnail.

**Architecture:** Move the hard-coded `grid-template-columns` / `padding` out of inline styles into Tailwind responsive classes (`grid-cols-1 sm:grid-cols-[…]`), following the established kiosk precedent (`ForumIndexInner.svelte:463`, `MarketplaceBrowseInner.svelte:460`). Image aspect-ratio becomes overridable per-breakpoint via a CSS custom property (`--news-img-ratio`) with the existing `ratio` prop as fallback. On mobile, images move above the text (`order-first`).

**Tech Stack:** Svelte 5 + Tailwind 3.4 (kiosk design system). No new dependencies.

**Spec:** No separate spec — the defect + intent are captured in this plan's Background section.

## Background (the defect)

- `NewsCard.svelte:28` — inline `grid-template-columns: 1fr 220px` (fixed image column). On a ~375px phone the 220px column doesn't fit → image overflows off the right card edge.
- `NewsCardLead.svelte:23` — inline `grid-template-columns: 1.1fr 1fr` + fixed 42px headline. On mobile both columns squeeze → tiny thumbnail image, one-word-per-line headline.
- `NewsboardIndexInner.svelte:206` — feed wrapper has inline `padding: 20px 36px 40px`; 36px side padding is too much on mobile.
- No `@media`/responsive classes exist anywhere in these components. The June 2026 kiosk migration shipped them desktop-first; mobile was never done.

## Global Constraints

- **Budgets (ratchet-only, never raise):** `pnpm type-check` errors ≤ 27, `npx -y svelte-check@4` errors ≤ 94.
- **NO `<style>` blocks** in these `.svelte` files: they are imported only through the `NewsboardIndexInner` island, so scoped styles would be orphaned in prod builds (root CLAUDE.md "Nested-island Svelte `<style>` blocks"). Use Tailwind classes / inline styles / `global.css` only. Tailwind classes are safe (global stylesheet).
- **Tailwind scanner:** arbitrary-value classes must appear as complete literal strings in the source (no string concatenation building class names).
- **Verification is browser-based** (CSS change — no unit tests): dev server on **port 3001** in this worktree (`pnpm dev --port 3001`, background). The user's own server on 3000 serves the main checkout — never use it. Every task ends with a playwright-cli check at mobile (375×812) AND desktop (1280×900) widths.
- **Auth for `/newsboard` (gated route):** redirect-bounce login — open `http://localhost:3001/newsboard` → redirected to `/login?redirect=%2Fnewsboard` → fill email + password from `/home/atakee/.claude/projects/-home-atakee-projects-fullstack-community-webApp-astro---v-3/memory/scratchpad/devpw.txt` → click login. **NEVER capture a snapshot while the password field is filled.** Session persists across playwright-cli commands until `close`.
- Commits: simple concise messages, no Claude signature, no Co-Authored-By footer.
- Don't touch semantic accents (wine CTAs etc.) — this is layout-only.
- Working dir: `.claude/worktrees/ui-polish` (branch `fix/ui-polish`). All paths below relative to it.

---

### Task 1: ArticleImage — breakpoint-overridable aspect ratio

**Files:**
- Modify: `src/components/newsboard/kiosk/primitives/ArticleImage.svelte`

**Interfaces:**
- Consumes: nothing new.
- Produces: both render branches read `aspect-ratio: var(--news-img-ratio, {ratio})`. Parents (Tasks 2–3) set `--news-img-ratio` per breakpoint via Tailwind arbitrary properties; when unset, behavior is byte-identical to today (prop fallback) — so the detail page and any other consumer are unaffected.

- [ ] **Step 1: Start the dev server (once for the whole plan)**

```bash
cd /home/atakee/projects/fullstack-community-webApp-astro---v.3/.claude/worktrees/ui-polish
pnpm dev --port 3001   # run in background
```

Confirm `curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/` returns 200.

- [ ] **Step 2: Edit the two aspect-ratio declarations**

In `ArticleImage.svelte`, image branch — change:

```svelte
    style="aspect-ratio:{ratio}; border:var(--k-border-ink); border-radius:var(--k-radius-md);"
```

to:

```svelte
    style="aspect-ratio:var(--news-img-ratio, {ratio}); border:var(--k-border-ink); border-radius:var(--k-radius-md);"
```

Placeholder branch — change:

```svelte
    style="aspect-ratio:{ratio}; border-radius:var(--k-radius-md);
           border:var(--news-noimage-border); background:var(--news-noimage-bg);"
```

to:

```svelte
    style="aspect-ratio:var(--news-img-ratio, {ratio}); border-radius:var(--k-radius-md);
           border:var(--news-noimage-border); background:var(--news-noimage-bg);"
```

- [ ] **Step 3: Verify no regression in the browser (fallback path)**

Log in per Global Constraints, then:

```bash
playwright-cli open http://localhost:3001/newsboard
playwright-cli resize 1280 900
```

Re-snapshot after hydration (island is `client:load`; wait for feed headlines). Expected: feed renders exactly as before (images still 4/3 in cards, 4/5 in lead — var unset everywhere yet). Also spot-check a detail page (`/newsboard/<id>` from any card link): hero image unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/components/newsboard/kiosk/primitives/ArticleImage.svelte
git commit -m "refactor: ArticleImage aspect-ratio overridable via --news-img-ratio"
```

---

### Task 2: NewsCard mobile stack + feed wrapper padding

**Files:**
- Modify: `src/components/newsboard/kiosk/browse/NewsCard.svelte`
- Modify: `src/components/newsboard/kiosk/NewsboardIndexInner.svelte:206`

**Interfaces:**
- Consumes: `--news-img-ratio` support from Task 1.
- Produces: nothing downstream.

- [ ] **Step 1: Make the card grid responsive**

In `NewsCard.svelte`, change the `<article>` open tag from:

```svelte
<article
  class="news-card grid items-start"
  data-read-state={article.archived ? 'archived' : article.read ? 'seen' : 'fresh'}
  style="background:var(--k-paper); border:var(--k-border-hair); border-radius:var(--k-radius-md);
         padding:18px; gap:22px; opacity:{decay};
         grid-template-columns:{noImage ? '1fr' : '1fr 220px'};"
>
```

to:

```svelte
<article
  class={`news-card grid items-start grid-cols-1 [--news-img-ratio:16/9] sm:[--news-img-ratio:4/3] ${noImage ? '' : 'sm:grid-cols-[1fr_220px]'}`}
  data-read-state={article.archived ? 'archived' : article.read ? 'seen' : 'fresh'}
  style="background:var(--k-paper); border:var(--k-border-hair); border-radius:var(--k-radius-md);
         padding:18px; gap:22px; opacity:{decay};"
>
```

Notes: the `noImage` conditional is required — an unconditional `sm:grid-cols-[1fr_220px]` would leave a dead 220px column on imageless cards. The full class literals stay intact for the Tailwind scanner.

- [ ] **Step 2: Image above text on mobile**

Change the image wrapper at the bottom of `NewsCard.svelte` from:

```svelte
  {#if !noImage}
    <div><ArticleImage imageUrl={article.imageUrl} quelle={article.quelle} sektion={article.sektion} ratio="4/3" alt={title} /></div>
  {/if}
```

to:

```svelte
  {#if !noImage}
    <div class="order-first sm:order-none"><ArticleImage imageUrl={article.imageUrl} quelle={article.quelle} sektion={article.sektion} ratio="4/3" alt={title} /></div>
  {/if}
```

- [ ] **Step 3: Responsive feed wrapper padding**

In `NewsboardIndexInner.svelte` line ~206, change:

```svelte
  <div style="padding:20px 36px 40px; display:flex; flex-direction:column; gap:16px;">
```

to:

```svelte
  <div class="px-4 pt-5 pb-10 md:px-9" style="display:flex; flex-direction:column; gap:16px;">
```

(`px-9` = 36px, `pt-5` = 20px, `pb-10` = 40px — desktop values unchanged. **`md:` is deliberate**: `NewsTitleBlock.svelte:7` and `NewsFilterRail.svelte:31` already use `px-4 md:px-9`, so the feed gutter must switch at the same breakpoint to stay edge-aligned with them.)

- [ ] **Step 4: Browser check, both widths**

```bash
playwright-cli resize 375 812
```

Reload `/newsboard`, snapshot after hydration. Expected at 375px: regular cards single-column, full-width 16:9 image ON TOP, no horizontal overflow (no horizontal scrollbar; card right edge visible). Verify an imageless card ("kein bild" placeholder is only for the no-`imageUrl` case — imageless cards render text full-width, no dead column). Then:

```bash
playwright-cli resize 1280 900
```

Expected: identical to pre-change desktop layout (text left, 220px 4/3 image right). If the `[--news-img-ratio:16/9]` arbitrary property fails to compile (ratio still 4/3 at 375px — check with devtools/computed style if suspicious), fall back to the underscore form `[--news-img-ratio:16_/_9]` / `[--news-img-ratio:4_/_3]` (underscores become spaces; `16 / 9` is valid CSS).

- [ ] **Step 5: Commit**

```bash
git add src/components/newsboard/kiosk/browse/NewsCard.svelte src/components/newsboard/kiosk/NewsboardIndexInner.svelte
git commit -m "fix: newsboard cards stack on mobile (responsive grid + feed padding)"
```

---

### Task 3: NewsCardLead mobile stack + headline clamp

**Files:**
- Modify: `src/components/newsboard/kiosk/browse/NewsCardLead.svelte`

**Interfaces:**
- Consumes: `--news-img-ratio` support from Task 1.
- Produces: nothing downstream.

- [ ] **Step 1: Make the lead grid responsive**

Change the `<article>` open tag from:

```svelte
<article
  class="news-card grid relative"
  style="background:var(--k-paper-warm); border:var(--k-border-ink); border-radius:var(--k-radius-lg);
         padding:28px; box-shadow:var(--k-shadow-md); grid-template-columns:1.1fr 1fr; gap:28px;"
>
```

to:

```svelte
<article
  class="news-card grid relative grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-5 md:gap-7 p-5 md:p-7 [--news-img-ratio:3/2] md:[--news-img-ratio:4/5]"
  style="background:var(--k-paper-warm); border:var(--k-border-ink); border-radius:var(--k-radius-lg);
         box-shadow:var(--k-shadow-md);"
>
```

(`p-7`/`gap-7` = 28px — desktop unchanged; mobile gets 20px. Lead image: 3/2 landscape full-width on mobile instead of a towering 4/5 portrait; `md:` restores 4/5.)

- [ ] **Step 2: Clamp the headline**

Change the `<h2>` style from:

```svelte
        style="font-weight:800; font-size:42px; line-height:1.02; letter-spacing:-0.035em;
               margin:0 0 12px; color:var(--k-ink);"
```

to:

```svelte
        style="font-weight:800; font-size:clamp(28px, 7.5vw, 42px); line-height:1.02; letter-spacing:-0.035em;
               margin:0 0 12px; color:var(--k-ink);"
```

- [ ] **Step 3: Lead image above the headline on mobile**

Change the image wrapper (last child) from:

```svelte
  <div>
    <ArticleImage imageUrl={article.imageUrl} quelle={article.quelle} sektion={article.sektion} ratio="4/5" lead alt={title} />
  </div>
```

to:

```svelte
  <div class="order-first md:order-none">
    <ArticleImage imageUrl={article.imageUrl} quelle={article.quelle} sektion={article.sektion} ratio="4/5" lead alt={title} />
  </div>
```

- [ ] **Step 4: Browser check, both widths**

At 375×812: lead card single-column — full-width 3/2 image on top, headline ~28px filling the width (several words per line), dek/summary/meta below, nothing overflowing. At 1280×900: identical to pre-change desktop lead (1.1fr text / 1fr portrait image, 42px headline, 28px padding). Also check a mid width (`playwright-cli resize 768 900`): `md:` two-column layout should be active and sane.

- [ ] **Step 5: Commit**

```bash
git add src/components/newsboard/kiosk/browse/NewsCardLead.svelte
git commit -m "fix: newsboard lead card stacks on mobile, clamped headline"
```

---

### Task 4: Budgets, cleanup, push

**Files:** none (verification only)

- [ ] **Step 1: Budget checks**

```bash
pnpm type-check    # error count must be ≤ 27
npx -y svelte-check@4   # error count must be ≤ 94
```

Expected: counts unchanged (this plan adds no TS surface). If lower, note it — CI budgets can be lowered by the main session.

- [ ] **Step 2: Close browser + kill dev server**

```bash
playwright-cli close
```

Kill the background `pnpm dev --port 3001` process.

- [ ] **Step 3: Commit the plan doc and push the branch**

```bash
git add docs/superpowers/plans/2026-09-01-newsboard-mobile-cards.md
git commit -m "docs: newsboard mobile cards plan"
git push -u origin fix/ui-polish
```

(Preview deploy triggers — expected. Do NOT merge; main session reviews.)

---

## Self-Review

- **Coverage:** overflow bug (Task 2 Step 1), tiny lead image (Task 3 Steps 1+3), one-word-per-line headline (Task 3 Step 2), mobile edge padding (Task 2 Step 3), placeholder-image parity (ratio var applies to both `ArticleImage` branches, Task 1). ✔
- **Type consistency:** `--news-img-ratio` name identical in Tasks 1/2/3; `noImage`, `decay`, `title` all pre-existing deriveds, untouched. ✔
- **No placeholders:** every step carries exact before/after code. ✔
- **Prod-build gotcha:** no `<style>` blocks introduced; all styling via Tailwind classes + inline styles. ✔
