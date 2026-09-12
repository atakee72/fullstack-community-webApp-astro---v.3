# Forum Back-Nav URL State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Browser back from a forum post returns the member to the forum index with the same kind filter, tag, revealed page count and scroll position they left.

**Architecture:** The forum index island (`ForumIndexInner.svelte`, `client:only`) keeps its filter/tag/page state in the URL query (`?kind=discussion&tag=garten&more=2`) via `history.replaceState`, initialises from that query on mount, and restores its scroll position from a sessionStorage snapshot it writes when the page is left. A dependency-pure helper (`src/lib/forum/indexUrlState.ts`) owns the parse/serialize rules so they are unit-testable without a DOM. Astro's `<ViewTransitions />` client router (used by `KioskLayout`) keeps `{ index, scrollX, scrollY }` in `history.state`; every `replaceState` here MUST pass `history.state` through unchanged or the router loses its place.

**Tech Stack:** Astro 5.15 (`astro:transitions` ClientRouter), Svelte 5 runes, `node:test` via `npx tsx` for the pure helper, Playwright (the `@playwright/cli` bundle) for the headless back-nav probe.

**Spec:** This document's "Behaviour" section is the spec (no separate design doc — bounded change, parked since the 2026-09-09 mobile-behaviour audit as "forum back-nav resets scroll+filter (needs URL-synced state)").

## Behaviour (spec)

1. The forum index URL reflects its view state: `kind` (one of `discussion | announcement | recommendation | mine`; absent = all), `tag` (the active tag without `#`; absent = none), `more` (number of revealed pages, `2`, `3`, …; absent = 1). Params are omitted when they hold the default. Existing unrelated params (e.g. `just_posted`) are left alone by the serializer.
2. Changing a filter, a tag, clearing filters, or pressing "Mehr laden" rewrites the URL with `history.replaceState` (NOT `pushState` — the back button leaves the forum, it does not step through filter clicks). `history.state` is passed through unchanged.
3. Opening `/forum?kind=discussion&tag=garten&more=2` shows the discussion filter pressed, the `#garten` tag pressed and two pages revealed. Invalid `kind` values fall back to `all`; `more` below 2 or non-numeric falls back to 1; `tag` is trimmed, a leading `#` stripped, empty → none.
4. Leaving the index (card click, any navigation, tab hide) stores `{ index: history.state?.index ?? null, href: location.href, y: window.scrollY }` in `sessionStorage['forum-index-scroll']`. On mount, if the stored `index` equals the current `history.state?.index` AND the stored `href` has the same pathname as `location.pathname` (query normalisation by our own mirror effect must not defeat the match), the island scrolls to `y` after its first render and deletes the entry. Any other mount deletes the entry without scrolling.
5. The `?just_posted=1` toast strip keeps working and no longer wipes `history.state`.
6. "Gespeichert" (`saved`) still navigates to `/bookmarks` and never appears in the URL.

## Global Constraints

- Gates: `npx tsc --noEmit -p .` error count ≤ 26; `npx -y svelte-check@4` error count ≤ 92 (both currently AT budget — a single new error fails CI).
- No `<style>` blocks in nested-island Svelte components.
- Commit messages: one line, imperative, no "Generated with" signature, no `Co-Authored-By` footer. `git add` only the named files, never `git add .`.
- Never stage secrets. `scratchpad/` is gitignored; the dev password lives in `scratchpad/devpw.txt` and must be read straight into a `fill()` argument, never echoed, sliced or written elsewhere.
- Dev server for probes runs on port 4655 (`pnpm dev --port 4655`); kill it with `fuser -k 4655/tcp` when done. Never start one on 3000.
- Headless scripts: standalone `.cjs` under `scratchpad/`, run from the repo root with `NODE_PATH="$(npm root -g)/@playwright/cli/node_modules" node scratchpad/<file>.cjs`.
- All `history.replaceState` calls in `ForumIndexInner.svelte` pass `history.state` as the first argument.
- Docs: the forum area notes live in `src/components/forum/kiosk/CLAUDE.md`; update them in the task that changes behaviour.

---

### Task 1: Pure URL-state helper + unit tests

**Files:**
- Create: `src/lib/forum/indexUrlState.ts`
- Create: `src/lib/forum/indexUrlState.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export type IndexKind = 'all' | 'discussion' | 'announcement' | 'recommendation' | 'mine';
  export interface IndexUrlState { kind: IndexKind; tag: string | null; pages: number }
  export function parseIndexState(search: string): IndexUrlState;
  export function serializeIndexState(state: IndexUrlState, currentHref: string): string; // full href
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/forum/indexUrlState.test.ts`:

```ts
// Unit tests for the forum index URL-state helper. Run directly:
//   npx tsx src/lib/forum/indexUrlState.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIndexState, serializeIndexState } from './indexUrlState';

const BASE = 'http://localhost:4655/forum';

test('empty query is the default state', () => {
  assert.deepEqual(parseIndexState(''), { kind: 'all', tag: null, pages: 1 });
  assert.deepEqual(parseIndexState('?'), { kind: 'all', tag: null, pages: 1 });
});

test('parses kind, tag and more', () => {
  assert.deepEqual(parseIndexState('?kind=discussion&tag=garten&more=3'), {
    kind: 'discussion', tag: 'garten', pages: 3,
  });
});

test('unknown kind falls back to all; saved is not a URL kind', () => {
  assert.equal(parseIndexState('?kind=bogus').kind, 'all');
  assert.equal(parseIndexState('?kind=saved').kind, 'all');
  assert.equal(parseIndexState('?kind=mine').kind, 'mine');
});

test('tag is trimmed, a leading # is stripped, empty is none', () => {
  assert.equal(parseIndexState('?tag=%23garten').tag, 'garten');
  assert.equal(parseIndexState('?tag=%20caf%C3%A9%20').tag, 'café');
  assert.equal(parseIndexState('?tag=').tag, null);
  assert.equal(parseIndexState('?tag=%23').tag, null);
});

test('more below 2 or non-numeric is one page', () => {
  assert.equal(parseIndexState('?more=1').pages, 1);
  assert.equal(parseIndexState('?more=0').pages, 1);
  assert.equal(parseIndexState('?more=-4').pages, 1);
  assert.equal(parseIndexState('?more=abc').pages, 1);
  assert.equal(parseIndexState('?more=2.9').pages, 2);
});

test('serializes non-default values only', () => {
  assert.equal(serializeIndexState({ kind: 'all', tag: null, pages: 1 }, BASE), BASE);
  assert.equal(
    serializeIndexState({ kind: 'discussion', tag: 'garten', pages: 2 }, BASE),
    `${BASE}?kind=discussion&tag=garten&more=2`,
  );
  assert.equal(serializeIndexState({ kind: 'mine', tag: null, pages: 1 }, BASE), `${BASE}?kind=mine`);
});

test('serializing removes stale params and keeps unrelated ones', () => {
  const href = `${BASE}?kind=discussion&tag=garten&more=2&just_posted=1`;
  assert.equal(
    serializeIndexState({ kind: 'all', tag: null, pages: 1 }, href),
    `${BASE}?just_posted=1`,
  );
});

test('round-trips', () => {
  const s = { kind: 'recommendation' as const, tag: 'umsonst', pages: 4 };
  const href = serializeIndexState(s, BASE);
  assert.deepEqual(parseIndexState(new URL(href).search), s);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx tsx src/lib/forum/indexUrlState.test.ts`
Expected: the run aborts with a module-resolution error for `./indexUrlState` (file does not exist yet).

- [ ] **Step 3: Write the helper**

Create `src/lib/forum/indexUrlState.ts`:

```ts
// Forum index view state ⇄ URL query. Dependency-pure (no DOM, no Svelte)
// so the island can import it and it can be unit-tested with node:test.
//
//   ?kind=discussion|announcement|recommendation|mine   (absent = all)
//   ?tag=garten                                         (absent = none)
//   ?more=2                                             (revealed pages, absent = 1)
//
// 'saved' is deliberately NOT a URL kind: the pill routes to /bookmarks.
// Params are omitted at their defaults; params this helper doesn't own
// (e.g. just_posted) pass through untouched.

export type IndexKind = 'all' | 'discussion' | 'announcement' | 'recommendation' | 'mine';

export interface IndexUrlState {
  kind: IndexKind;
  tag: string | null;
  pages: number;
}

const KINDS: ReadonlySet<string> = new Set(['discussion', 'announcement', 'recommendation', 'mine']);

export function parseIndexState(search: string): IndexUrlState {
  const params = new URLSearchParams(search);
  const rawKind = params.get('kind') ?? '';
  const kind: IndexKind = KINDS.has(rawKind) ? (rawKind as IndexKind) : 'all';
  const rawTag = (params.get('tag') ?? '').trim().replace(/^#/, '');
  const tag = rawTag.length ? rawTag : null;
  const more = Math.floor(Number(params.get('more')));
  const pages = Number.isFinite(more) && more >= 2 ? more : 1;
  return { kind, tag, pages };
}

export function serializeIndexState(state: IndexUrlState, currentHref: string): string {
  const url = new URL(currentHref);
  const p = url.searchParams;
  if (state.kind === 'all') p.delete('kind'); else p.set('kind', state.kind);
  if (state.tag) p.set('tag', state.tag); else p.delete('tag');
  if (state.pages >= 2) p.set('more', String(state.pages)); else p.delete('more');
  return url.toString();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsx src/lib/forum/indexUrlState.test.ts`
Expected: the Node 24 reporter prints `ℹ pass 8` and `ℹ fail 0`.

- [ ] **Step 5: Gate check and commit**

Run: `npx tsc --noEmit -p . 2>&1 | grep -c "error TS"` → must print `26`.

```bash
git add src/lib/forum/indexUrlState.ts src/lib/forum/indexUrlState.test.ts
git commit -m "feat(forum): pure URL-state helper for the index (kind, tag, more)"
```

---

### Task 2: Wire URL state + scroll restore into the forum index island

**Files:**
- Modify: `src/components/forum/kiosk/ForumIndexInner.svelte` (script block: the `onMount` at ~line 48, the filter state at ~line 166, the pagination block at ~line 207–223)
- Modify: `src/components/forum/kiosk/CLAUDE.md` (forum-index notes)
- Create (gitignored, not committed): `scratchpad/forum-backnav.cjs`

**Interfaces:**
- Consumes: `parseIndexState(search: string): IndexUrlState`, `serializeIndexState(state: IndexUrlState, currentHref: string): string`, `type IndexKind` from `src/lib/forum/indexUrlState.ts` (Task 1). `IndexKind` is a strict subset of the island's `Filter` type (`Filter` adds `'saved'`), so an `IndexKind` assigns to `Filter` without a cast; the reverse direction needs the `'saved'` guard shown below.
- Produces: nothing new for other tasks.

- [ ] **Step 1: Read the current code you will change**

Open `src/components/forum/kiosk/ForumIndexInner.svelte` and read lines 40–60 (the `onMount` with the `just_posted` strip), 160–225 (filter state, `filteredRest`, pagination) and 270–290 (`handleFilterChange`, `handleTagChange`, `clearFilters`). Do not change `filteredRest`, the handlers or the markup.

- [ ] **Step 2: Add the import**

Next to the existing `import { relTime } from '../../../lib/relTime';` add:

```ts
  import { parseIndexState, serializeIndexState } from '../../../lib/forum/indexUrlState';
```

- [ ] **Step 3: Initialise the filter state from the URL**

Replace exactly these two lines:

```ts
  let activeFilter = $state<Filter>('all');
  let activeTag = $state<string | null>(null);
```

with:

```ts
  // View state lives in the URL (?kind=&tag=&more=) so browser back from a
  // post restores the same feed (parked since the 09-09 mobile audit).
  // client:only island → window exists at init; the guard keeps the
  // SSR-compile path harmless.
  const initialUrlState = parseIndexState(
    typeof window !== 'undefined' ? window.location.search : ''
  );
  let activeFilter = $state<Filter>(initialUrlState.kind);
  let activeTag = $state<string | null>(initialUrlState.tag);
```

- [ ] **Step 4: Initialise the page count from the URL and stop the reset effect from clobbering it**

Replace exactly this block:

```ts
  const PAGE_SIZE = 12;
  let visibleCount = $state(PAGE_SIZE);
```

with:

```ts
  const PAGE_SIZE = 12;
  let visibleCount = $state(PAGE_SIZE * initialUrlState.pages);
```

and replace exactly this block:

```ts
  // Reset to the first page whenever the active filter or tag changes.
  $effect(() => {
    activeFilter;
    activeTag;
    visibleCount = PAGE_SIZE;
  });
```

with:

```ts
  // Reset to the first page whenever the active filter or tag CHANGES —
  // compared against the last seen pair, so the first run (which may
  // carry ?more=N from the URL) doesn't reset anything.
  let lastFilterKey = `${activeFilter}|${activeTag ?? ''}`;
  $effect(() => {
    const key = `${activeFilter}|${activeTag ?? ''}`;
    if (key === lastFilterKey) return;
    lastFilterKey = key;
    visibleCount = PAGE_SIZE;
  });

  // Mirror the view state into the URL. replaceState, not pushState: the
  // back button leaves the forum, it doesn't step through filter clicks.
  // history.state is passed through unchanged — Astro's ClientRouter keeps
  // { index, scrollX, scrollY } there and loses its place if it's wiped.
  $effect(() => {
    if (typeof window === 'undefined') return;
    const kind = activeFilter === 'saved' ? 'all' : activeFilter;
    const next = serializeIndexState(
      { kind, tag: activeTag, pages: Math.max(1, Math.ceil(visibleCount / PAGE_SIZE)) },
      window.location.href
    );
    if (next !== window.location.href) window.history.replaceState(window.history.state, '', next);
  });
```

- [ ] **Step 5: Scroll snapshot on leave, restore on return; fix the just_posted strip**

Replace exactly these lines inside the existing `onMount`:

```ts
    if (url.searchParams.get('just_posted') === '1') {
      showToast($t['forum.compose.success'], { type: 'success' });
      url.searchParams.delete('just_posted');
      window.history.replaceState({}, '', url.toString());
    }
```

with:

```ts
    if (url.searchParams.get('just_posted') === '1') {
      showToast($t['forum.compose.success'], { type: 'success' });
      url.searchParams.delete('just_posted');
      // Keep Astro's ClientRouter state ({ index, scrollX, scrollY }) intact.
      window.history.replaceState(window.history.state, '', url.toString());
    }

    // Scroll restore across browser back. Astro's router scrolls to the
    // saved position right after the swap — while this client:only island
    // is still empty, so the page is too short and the attempt clamps to
    // ~0 (and its scrollend bookkeeping then overwrites history.state with
    // that 0). So we keep our own snapshot: written when the page is left,
    // honoured only when we come back to the SAME history entry and URL.
    const SCROLL_KEY = 'forum-index-scroll';
    const historyIndex = (): number | null =>
      (window.history.state as { index?: number } | null)?.index ?? null;
    const snapshot = () => {
      try {
        sessionStorage.setItem(
          SCROLL_KEY,
          JSON.stringify({ index: historyIndex(), href: window.location.href, y: window.scrollY })
        );
      } catch { /* storage unavailable — no restore, nothing else breaks */ }
    };
    try {
      const raw = sessionStorage.getItem(SCROLL_KEY);
      sessionStorage.removeItem(SCROLL_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { index: number | null; href: string; y: number };
        const samePath = new URL(saved.href, window.location.href).pathname === window.location.pathname;
        if (saved.index === historyIndex() && samePath && saved.y > 0) {
          tick().then(() => window.scrollTo({ top: saved.y, behavior: 'instant' as ScrollBehavior }));
        }
      }
    } catch { /* malformed or unavailable — ignore */ }
    // astro:before-preparation fires at the start of every client-routed
    // navigation (ViewTransitions); pagehide covers hard navigations,
    // reloads and tab discards.
    document.addEventListener('astro:before-preparation', snapshot);
    window.addEventListener('pagehide', snapshot);
```

Then make the `onMount` callback return a cleanup. Find the end of the `onMount(() => { … })` body (after the `fetch('/api/posts/save')` chain) and add, as the last statement before the closing `});`:

```ts
    return () => {
      document.removeEventListener('astro:before-preparation', snapshot);
      window.removeEventListener('pagehide', snapshot);
    };
```

`tick` must be imported: change `import { onMount } from 'svelte';` to `import { tick, onMount } from 'svelte';` if `tick` is not already imported (check — an earlier session removed it).

- [ ] **Step 6: Gate check**

Run: `npx tsc --noEmit -p . 2>&1 | grep -c "error TS"` → `26`.
Run: `npx -y svelte-check@4 --output human 2>&1 | tail -1` → `svelte-check found 92 errors …`.
If either count rose, the new code introduced it — fix it before continuing (likely culprits: the `ScrollBehavior` cast, the `history.state` typing, or `tick` missing).

- [ ] **Step 7: Write the headless back-nav probe**

Create `scratchpad/forum-backnav.cjs` (gitignored):

```js
const { chromium } = require('playwright');
const pw = require('fs').readFileSync('scratchpad/devpw.txt', 'utf8').trim();
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 700 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4655/login?redirect=%2Fforum');
  await page.fill('input[type="email"]', 'ayse@mahalle-dev.test');
  await page.fill('input[type="password"]', pw);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/forum', { timeout: 20000 });
  await page.waitForSelector('button[aria-pressed]', { timeout: 20000 });
  const out = {};
  out.astroStateAtStart = await page.evaluate(() => history.state && typeof history.state.index === 'number');

  // 1. filter pill → URL
  await page.getByRole('button', { name: 'Diskussion', exact: true }).click();
  await page.waitForTimeout(150);
  out.urlAfterKind = new URL(page.url()).search;
  // 2. first tag pill → URL
  const tagPill = page.locator('button[aria-pressed]').filter({ hasText: /^#/ }).first();
  const tagText = (await tagPill.innerText()).trim();
  await tagPill.click();
  await page.waitForTimeout(150);
  out.urlAfterTag = new URL(page.url()).search;
  out.tagText = tagText;
  out.astroStateKept = await page.evaluate(() => history.state && typeof history.state.index === 'number');

  // 3. reload keeps the state
  await page.reload();
  await page.waitForSelector('button[aria-pressed="true"]', { timeout: 20000 });
  out.pressedAfterReload = await page.locator('button[aria-pressed="true"]').allInnerTexts();

  // 4. clear the tag again so cards are visible, scroll, open a card, go back
  await page.locator('button[aria-pressed="true"]').filter({ hasText: /^#/ }).first().click();
  await page.waitForTimeout(150);
  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(400); // let Astro's scrollend bookkeeping settle
  out.scrollBeforeLeave = await page.evaluate(() => window.scrollY);
  const card = page.locator('a[href^="/topics/"]:visible').first();
  const cardHref = await card.getAttribute('href');
  await card.click();
  await page.waitForURL('**' + cardHref, { timeout: 20000 });
  await page.goBack();
  await page.waitForURL(/\/forum\?kind=discussion/, { timeout: 20000 });
  await page.waitForSelector('button[aria-pressed="true"]', { timeout: 20000 });
  await page.waitForTimeout(800);
  out.urlAfterBack = new URL(page.url()).search;
  out.pressedAfterBack = await page.locator('button[aria-pressed="true"]').allInnerTexts();
  out.scrollAfterBack = await page.evaluate(() => window.scrollY);

  // 5. "Alle" clears the kind param
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await page.waitForTimeout(150);
  out.urlAfterAll = new URL(page.url()).search;
  console.log(JSON.stringify(out));
  await browser.close();
})().catch((e) => { console.error(e.message.split('\n')[0]); process.exit(1); });
```

- [ ] **Step 8: Run the probe against a dev server**

```bash
(pnpm dev --port 4655 > /dev/null 2>&1 &)
for i in $(seq 1 40); do curl -s -o /dev/null -w "%{http_code}" http://localhost:4655/login | grep -q 200 && break; sleep 1; done
NODE_PATH="$(npm root -g)/@playwright/cli/node_modules" node scratchpad/forum-backnav.cjs
fuser -k 4655/tcp
```

Expected JSON (values, not exact strings):
- `astroStateAtStart: true`, `astroStateKept: true` (our replaceState preserved the router's state)
- `urlAfterKind: "?kind=discussion"`
- `urlAfterTag: "?kind=discussion&tag=<tagText without #>"`
- `pressedAfterReload` contains `"Diskussion"` and the tag text
- `scrollBeforeLeave: 500` (if the dev DB's discussion feed is shorter than 700 px the scroll clamps — then the value is whatever the page allows; use that as the baseline)
- `urlAfterBack: "?kind=discussion"`, `pressedAfterBack` contains `"Diskussion"`
- `scrollAfterBack` within ±40 px of `scrollBeforeLeave`
- `urlAfterAll: ""`

If `scrollAfterBack` is 0 while `scrollBeforeLeave` is > 0, the snapshot did not match or the restore ran too early: log `sessionStorage['forum-index-scroll']` right after the card click (on the detail page) and `history.state.index` on return; if both match, log `document.documentElement.scrollHeight` inside the `tick().then` — a page shorter than `y` means the list hadn't rendered yet and the restore needs to wait for the items (e.g. `requestAnimationFrame` after `tick`). Fix before continuing.

- [ ] **Step 9: Update the forum area notes**

In `src/components/forum/kiosk/CLAUDE.md`, find the bullet that begins with `- **Compose success toast**` and insert this new bullet directly BEFORE it:

```md
- **Index view state lives in the URL** (2026-09-12, closes the 09-09 mobile-audit "back-nav resets scroll+filter" park): `?kind=discussion|announcement|recommendation|mine`, `?tag=garten`, `?more=2` (revealed pages); defaults omitted. Parse/serialize is the pure `src/lib/forum/indexUrlState.ts` (`npx tsx src/lib/forum/indexUrlState.test.ts`, 8 cases); `ForumIndexInner` initialises `activeFilter`/`activeTag`/`visibleCount` from it and mirrors changes back with `history.replaceState` (NOT push — back leaves the forum). **Every `replaceState` in this island passes `history.state` through**: Astro's ClientRouter keeps `{ index, scrollX, scrollY }` there and loses its place if it's wiped (the old `just_posted` strip did exactly that). **Scroll restore is our own**, not Astro's: the router scrolls right after the swap while the `client:only` island is still empty, so the attempt clamps to ~0 and its scrollend bookkeeping overwrites `history.state.scrollY` with that 0. The island snapshots `{ index, href, y }` to `sessionStorage['forum-index-scroll']` on `astro:before-preparation` + `pagehide` and, on mount, scrolls to `y` only when `history.state.index` and the pathname match (then deletes the entry). The page-reset effect compares against the last seen filter/tag pair so the first run doesn't clobber `?more=`. Probe: `scratchpad/forum-backnav.cjs` (standalone playwright, mobile viewport).
```

- [ ] **Step 10: Commit**

```bash
git add src/components/forum/kiosk/ForumIndexInner.svelte src/components/forum/kiosk/CLAUDE.md
git commit -m "feat(forum): filter, tag and page state in the URL; scroll and filters survive browser back"
```

---

## Audit notes (verified against node_modules on 2026-09-12)

- `astro:before-preparation` is dispatched on `document` (`astro/dist/transitions/events.js`), so the island's `document.addEventListener` receives it.
- On a client-routed swap Astro fires `astro:after-swap` → `astro-island.unmount` → `astro:unmount` → `@astrojs/svelte` calls Svelte `unmount()`, so the `onMount` cleanup runs and the old island's listeners are removed. Without that, the old forum island's `snapshot` would fire again when LEAVING the detail page and overwrite the good snapshot with the detail page's index — the reason the cleanup in Step 5 is not optional.
- Svelte 5 `onMount` is a user effect; effects run in declaration order, so the `onMount` at ~line 48 runs before the mirror effect at ~line 220. Either order is safe (the serializer keeps `just_posted`, the strip removes it), it just determines which one writes the URL first.
- On the very first page load `history.state` is `null` until Astro's `load` handler sets `{ index: 0, … }`; the mirror effect may run before that and pass `null` through — harmless, Astro then initialises it.
- Astro's router does `scrollTo(0,0)` then `scrollTo(state.scrollY)` synchronously inside the swap, before the island hydrates; the island's `tick().then(scrollTo)` therefore runs after and wins. Astro's `scrollend` bookkeeping afterwards just records our restored `y`.

## Out of scope (deliberate)

- The detail page's „← Forum" link stays a plain `/forum` href. Filters survive the browser/gesture back only; the link is a fresh entry to the index.
- `pushState` per filter click (stepping back through filters) — rejected: the back button should leave the forum.
- Scroll restore on other kiosk indexes (newsboard, marketplace) — same pattern applies if ever wanted; not part of this plan.
