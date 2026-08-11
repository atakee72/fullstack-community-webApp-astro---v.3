# Tour Phase 2 — Six Chapters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the six remaining tour chapters (Kalender, Marktplatz, Kurier, Kiez-Daten, Blog, Profil) plus the small engine extensions CD's answers require — completing „Die Führung" across all seven kiosk surfaces.

**Architecture:** The v1 engine (`TourController.svelte` + registry `tourChapters.ts`) is chapter-agnostic by design — each chapter is a registry entry + i18n keys + `data-tour` anchors. Phase 2 adds four small engine capabilities first (visible-first anchor matching, per-stop mobile body, final-chapter end card, per-stop prefill link), parameterizes the hello modal + offer strip for non-forum surfaces, then adds the six chapters one or two per task, each independently browser-verifiable.

**Tech Stack:** Astro 5, Svelte 5 (runes), TypeScript, kiosk-i18n dictionary pattern, playwright-cli for browser gates.

## Global Constraints

- **Copy source of truth:** `design/handoffs/TOUR_CC_ANSWERS.md` (in-repo). All stop copy DE+EN is transcribed **verbatim** from its tables. Exception — the per-chapter `end.note`/`end.next` connective strings (Tasks 3–7) are CC-authored in this plan (CD's document only specifies the Profil final end card); their exact values are IN the task steps — use them as written, don't hunt for them in TOUR_CC_ANSWERS — German quotes „…“ (U+201E/U+201C), EN typographic apostrophes/quotes (U+2019/U+201C/U+201D) preserved byte-for-byte. After any i18n edit, byte-verify one sampled string per language with `sed -n '<line>p' src/lib/kiosk-i18n.ts | od -c | head` (expect `342 200 231` for ’, `342 200 236` for „). NEVER flatten to ASCII quotes.
- **Safe anchors only:** chrome + top-level controls/containers, never the n-th item of an `{#each}` list (established exception: `data-tour={i === 0 ? '…' : undefined}` first-item pattern, and per-instance conditionals like `nr === '01'`).
- **Engine contract (five duties) is untouchable** — no changes to hydration wait, silent skip, scroll-then-measure, nav-abort semantics. Additions only.
- **Storage is untouched**: `ChapterKey` set, first-write-wins POST, LS mirror — no schema or API changes in this plan.
- **Type-check baseline:** record the count BEFORE your task's changes with `pnpm type-check 2>&1 | grep -icE "error ts"` (expected ~28 pre-existing) and verify it is UNCHANGED after. The invariant is "no new errors", not the absolute number.
- **Browser gate rule:** every task touching `.svelte` files must be verified in a real browser (playwright-cli) before commit — `pnpm build` green is necessary but not sufficient. **NEVER use port 3000** (user's own dev server). Pick a free port: `ss -tlnp | grep 4655` must be EMPTY before `pnpm dev --port 4655`; kill by explicit PID afterwards.
- **Tour chrome accent stays OCHRE** (`--k-ochre` / deep `#b07515`); the offer-strip kicker uses the page accent `var(--k-accent)` (already wired). Don't touch semantic accents.
- **Commits:** simple conventional messages, NO "Generated with Claude Code" signature, NO Co-Authored-By footer, never `--no-verify` (gitleaks pre-commit is armed).
- **i18n parity:** every new key exists in BOTH the DE and EN dictionaries of `src/lib/kiosk-i18n.ts`.

---

## File Map

| File | Role in this plan |
|---|---|
| `src/lib/tour/tourChapters.ts` | Types grow 4 optional fields; 6 new registry entries |
| `src/components/tour/TourController.svelte` | `findAnchor()` visible-first helper replaces raw `querySelector` (4 call sites); passes `chapter` to hello modal |
| `src/components/tour/TourSpotlight.svelte` | bMobile body pick, final-chapter stamp/no-next-link, per-stop prefill link, stamp i18n |
| `src/components/tour/TourHelloModal.svelte` | Parameterized body ({surface}, {n}) |
| `src/components/tour/TourOfferStrip.svelte` | Parameterized text ({surface}, {n}) |
| `src/lib/kiosk-i18n.ts` | ~140 new entries (6 chapters × 2 locales + surface names + reworked hello/offer + template + stamp keys) |
| 14 surface components (see per-task lists) | `data-tour` attributes only — zero behavior changes |
| `src/components/tour/CLAUDE.md`, root `CLAUDE.md` | Doc updates (Task 9) |

Anchor naming convention (new): `cal-view`, `cal-grid`, `cal-rsvp`, `cal-categories`, `markt-kinds`, `markt-create`, `markt-grid`, `markt-mine`, `kurier-masthead`, `kurier-saved`, `kurier-fade`, `kurier-submit`, `kiez-plr`, `kiez-kanal`, `kiez-druck`, `blog-rubriken`, `blog-archiv`, `blog-aufruf`, `profil-hobbies`, `profil-archiv`, `profil-chronik`.

Chapter chain (CD §6, confirmed): Forum → `/calendar` → `/marketplace` → `/newsboard` → `/schillerkiez` → `/blog` → `/profile` → end (Profil is final: no next link, „✓ FÜHRUNG“ stamp).

`page` prop ↔ `ChapterKey` mapping: `calendar`→`kalender`, `marketplace`→`markt`, `newsboard`→`kurier`, `schillerkiez`→`kiezdaten`, `blog`→`blog`, `profile`→`profil`.

---

### Task 1: Engine extensions (visible-first anchors, bMobile, final chapter, stop link)

**Files:**
- Modify: `src/lib/tour/tourChapters.ts` (types only)
- Modify: `src/components/tour/TourController.svelte`
- Modify: `src/components/tour/TourSpotlight.svelte`
- Modify: `src/lib/kiosk-i18n.ts` (2 keys × 2 locales)

**Interfaces:**
- Consumes: existing `TourStop`/`TourChapter` types, `TourSpotlight` props.
- Produces (later tasks rely on these exact shapes):
  ```ts
  export interface TourStop {
    anchor: string;
    titleKey: string;
    bodyKey: string;
    bodyMobileKey?: string;               // NEW — used once (Kalender S2)
    link?: {                              // NEW — used once (Forum S7 template)
      labelKey: string;
      hrefBase: string;                   // e.g. '/topics/create'
      prefillTitleKey: string;
      prefillBodyKey: string;
      prefillTags: string;                // e.g. 'neu-hier'
    };
  }
  export interface TourChapter {
    key: ChapterKey; page: string; kickerKey: string;
    stops: TourStop[]; endNoteKey: string;
    nextChapterKey?: string; nextChapterHref?: string;   // now OPTIONAL
    final?: boolean;                                     // NEW — Profil only
  }
  ```
  Plus (module-private in `TourController.svelte`, listed so reviewers know the name): `function findAnchor(sel: string): HTMLElement | null`.

- [ ] **Step 1: Extend the types** in `src/lib/tour/tourChapters.ts` — replace the two interfaces with the block above (keep the existing comment and forum entry untouched; the forum entry compiles unchanged because the new fields are optional).

- [ ] **Step 2: Visible-first anchor matching** in `TourController.svelte`. Several phase-2 anchors exist twice in the DOM (desktop + mobile variants, CSS-hidden per breakpoint) — `document.querySelector` would happily return the `display:none` copy. Add a module-scope helper and use it at ALL FOUR anchor-lookup sites (`waitForAnchor` poll, `availableStops` compute in `startChapter`, `showStop`, the `onScroll` re-measure):

```ts
  // Visible-first anchor lookup: several anchors exist twice in the DOM
  // (desktop + mobile variants, CSS-hidden per breakpoint). A display:none
  // node has no client rects — skip it and take the first visible match.
  function findAnchor(sel: string): HTMLElement | null {
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      if (el.getClientRects().length > 0) return el;
    }
    return null;
  }
```

  Replace: `document.querySelector<HTMLElement>(sel)` → `findAnchor(sel)` in `waitForAnchor` (line ~39) and `showStop` (line ~63) and the `onScroll` handler (line ~107); replace `document.querySelector(s.anchor)` → `findAnchor(s.anchor)` in the `availableStops` map (line ~52).

- [ ] **Step 3: bMobile + final chapter + stop link** in `TourSpotlight.svelte`:
  - Add near the top of the script (after existing derives):
    ```ts
    const isMobileVp = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
    const stop = $derived(chapter.stops[availableStops[stopIndex]]);
    const bodyKey = $derived(isMobileVp && stop.bodyMobileKey ? stop.bodyMobileKey : stop.bodyKey);
    function stopLinkHref(l: NonNullable<import('../../lib/tour/tourChapters').TourStop['link']>): string {
      return `${l.hrefBase}?prefill_title=${encodeURIComponent($t[l.prefillTitleKey])}&prefill_body=${encodeURIComponent($t[l.prefillBodyKey])}&prefill_tags=${l.prefillTags}`;
    }
    ```
    (If the template already computes the current stop inline, refactor those usages onto the new `stop`/`bodyKey` derives — one source of truth.)
  - Body render uses `{$t[bodyKey]}`.
  - Stamp: replace the hardcoded `KAPITEL` text with `{$t[chapter.final ? 'tour.chrome.stampFinal' : 'tour.chrome.stamp']}`.
  - Next-chapter link: guard with `{#if isLast && chapter.nextChapterHref && chapter.nextChapterKey}`.
  - Stop link (rendered on any stop that has one, above `.tour-foot`, styled like the existing `.tour-nextch` link):
    ```svelte
    {#if stop.link}
      <a class="tour-nextch font-dmmono" href={stopLinkHref(stop.link)}>{$t[stop.link.labelKey]}</a>
    {/if}
    ```
    (Clicking navigates → duty 5 aborts the tour and stamps seen — correct and intended; it's the last forum stop.)

- [ ] **Step 4: Stamp i18n keys** in `src/lib/kiosk-i18n.ts` — add to the DE tour block (near `tour.chrome.close`): `'tour.chrome.stamp': 'KAPITEL',` `'tour.chrome.stampFinal': 'FÜHRUNG',` and identical values in the EN block (they're proper-noun-ish stamps, same both locales).

- [ ] **Step 5: Type-check + build** — `pnpm type-check 2>&1 | grep -icE "error ts"` → expect **28**; `pnpm build` → green.

- [ ] **Step 6: Browser gate (forum regression)** — free-port dev server (see Global Constraints), then with playwright-cli: open `http://localhost:<port>/`, run `window.__mahalleTourStart()` via evaluate, snapshot → forum stop 1 card + ring render exactly as before (counter „1 / N“, weiter/zurück work). Close browser, kill dev server by PID.

- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(tour): engine extensions for phase 2 (visible-first anchors, bMobile, final chapter, stop link)"`

---

### Task 2: Parameterized entrances + „Hallo Kiez“ template on Forum S7

**Files:**
- Modify: `src/components/tour/TourHelloModal.svelte`
- Modify: `src/components/tour/TourOfferStrip.svelte`
- Modify: `src/components/tour/TourController.svelte` (prop passing only)
- Modify: `src/lib/tour/tourChapters.ts` (forum S7 gets `link`)
- Modify: `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: Task 1's `TourStop.link` shape and optional-field types.
- Produces: `TourHelloModal` new props `{ name, surfaceKey, stopCount, onStart, onDismiss }`; `TourOfferStrip` new props `{ page, surfaceKey, stopCount, onStart, onDismiss }`; i18n keys `tour.surface.{forum|kalender|markt|kurier|kiezdaten|blog|profil}` (both locales) that later tasks' chapters are announced with.

- [ ] **Step 1: Surface-name keys** in `kiosk-i18n.ts` (CD §7 verbatim). DE: `'tour.surface.forum': 'durchs Forum'`, `'tour.surface.kalender': 'durch den Kalender'`, `'tour.surface.markt': 'über den Marktplatz'`, `'tour.surface.kurier': 'durch den Kurier'`, `'tour.surface.kiezdaten': 'durch die Kiez-Daten'`, `'tour.surface.blog': 'durch den Blog'`, `'tour.surface.profil': 'durchs Profil'`. EN: `'tour.surface.forum': 'of the forum'`, `…kalender: 'of the calendar'`, `…markt: 'of the marketplace'`, `…kurier: 'of the Kurier'`, `…kiezdaten: 'of the Kiez data'`, `…blog: 'of the blog'`, `…profil: 'of your profile'`.

- [ ] **Step 2: Reword hello body + offer text** (replace existing values in BOTH locales; the placeholder literal is `{surface}` in BOTH — the component code splits on one name):
  - `'tour.hello.body'` DE: `'Kurze Führung {surface}? {n} Stationen, ungefähr eine Minute. Du kannst jederzeit abbrechen — und sie später beliebig oft neu starten.'` · EN: `'A quick tour {surface}? {n} stops, about a minute. You can stop any time — and restart it whenever you like.'`
  - `'tour.offer.text'` DE: `'Kurze Führung {surface} — {n} Stationen, jederzeit abbrechbar.'` · EN: `'A quick tour {surface} — {n} stops, stop any time.'`

- [ ] **Step 3: TourHelloModal** — add props `surfaceKey: string` (a full i18n key, e.g. `'tour.surface.forum'`) and `stopCount: number`. Interpolate with the established split/join pattern (never `.replace` — `$`-pattern quirk):
  ```ts
  const body = $derived($t['tour.hello.body'].split('{surface}').join($t[surfaceKey]).split('{n}').join(String(stopCount)));
  ```
  Render `{body}` where `$t['tour.hello.body']` was rendered.

- [ ] **Step 4: TourOfferStrip** — same two props, same derivation on `tour.offer.text`, render the derived string.

- [ ] **Step 5: TourController** — at the two render sites pass `surfaceKey={'tour.surface.' + chapter.key}` and `stopCount={chapter.stops.length}` (registry length = honest chapter length; the in-tour counter still adapts to available anchors).

- [ ] **Step 6: Template keys + forum S7 link.** i18n (CD §5 verbatim — brackets stay):
  - DE: `'tour.template.title': 'Hallo Kiez, ich bin neu hier'`, `'tour.template.body': 'Hallo zusammen! Ich bin [Name] und wohne seit Kurzem im Kiez, rund um [Straße/Ecke]. Ich freue mich über eure Tipps: Wo gibt es den besten Kaffee, wo trifft man Leute? Bis bald im Kiez!'`, `'tour.template.open': '„Hallo Kiez“-Vorlage öffnen →'`
  - EN: `'tour.template.title': 'Hello Kiez, I’m new here'`, `'tour.template.body': 'Hi everyone! I’m [name] and I recently moved to the Kiez, around [street/corner]. I’d love your tips: where’s the best coffee, where do people meet? See you around the Kiez!'`, `'tour.template.open': 'Open the “Hello Kiez” template →'`
  - In `tourChapters.ts`, forum stop 7 gets:
    ```ts
    link: { labelKey: 'tour.template.open', hrefBase: '/topics/create', prefillTitleKey: 'tour.template.title', prefillBodyKey: 'tour.template.body', prefillTags: 'neu-hier' },
    ```
    (The composer already consumes `?prefill_title/prefill_body/prefill_tags` — `ComposePageInner.svelte:83-85`; same mechanism the blog Aufruf CTA uses.)
  - **Verify the tag charset first:** the composer comment says a prefilled tag "can never be a value the form itself would reject" — read the tag validation in `ComposePageInner.svelte` (around lines 83-95) and confirm a HYPHENATED tag survives it. If `neu-hier` would be rejected/stripped, use `neuhier` in `prefillTags` and say so in your report (the blog precedent `blogidee` has no hyphen, so this is genuinely unverified).

- [ ] **Step 7: Byte-verify quotes** — `grep -n "tour.template.title" src/lib/kiosk-i18n.ts`, then `sed -n '<EN line>p' src/lib/kiosk-i18n.ts | od -c | grep -o "342 200 231" | head -1` → must output `342 200 231` (U+2019 in “I’m”). Same check for one DE „ (`342 200 236`).

- [ ] **Step 8: Type-check + build** — baseline 28, build green.

- [ ] **Step 9: Browser gate** — free-port dev server; on `/`: (a) `__mahalleTourStart()` → advance to stop 7 (click weiter × N) → template link visible; click it → lands on `/topics/create` with title + body prefilled and tag `neu-hier` seeded; (b) clear `localStorage['mahalle-tour-state']` + reload → offer strip shows „… durchs Forum — 7 Stationen …“. Kill server by PID.

- [ ] **Step 10: Commit** — `git commit -m "feat(tour): parameterized hello/offer copy + Hallo-Kiez template link on forum stop 7"`

---

### Task 3: Kalender chapter

**Files:**
- Modify: `src/components/calendar/kiosk/CalendarTitleBlock.svelte:95` (switcher container)
- Modify: `src/components/calendar/kiosk/mobile/CalendarMobileMonth.svelte:450` (mobile switcher), `:524` (mobile grid wrapper), `:609` (selected-day panel)
- Modify: `src/components/calendar/kiosk/CalendarMonthGrid.svelte:252` (desktop grid root)
- Modify: `src/components/calendar/kiosk/CalendarAgendaView.svelte:66` (agenda root)
- Modify: `src/components/calendar/kiosk/CalCategoryRail.svelte:43` (desktop rail), `src/components/calendar/kiosk/mobile/CalendarMobileMonth.svelte:476` (mobile rail)
- Modify: `src/lib/tour/tourChapters.ts`, `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: Task 1 types (`bodyMobileKey`, optional next fields), Task 2 surface keys.
- Produces: registry entry `calendar`, anchors `cal-view`, `cal-grid`, `cal-rsvp`, `cal-categories`.

- [ ] **Step 1: Anchors.** Add plain `data-tour="…"` attributes (no other changes):
  - `cal-view` → `CalendarTitleBlock.svelte:95` container div (`role="tablist"`) AND `CalendarMobileMonth.svelte:450` container (mutually exclusive mounts; same value is correct).
  - `cal-grid` → `CalendarMonthGrid.svelte:252` root div AND `CalendarMobileMonth.svelte:524` (`<div class="px-2 pt-2 relative" bind:this={gridWrapper}>`). Both may co-exist in DOM CSS-hidden — Task 1's `findAnchor` picks the visible one.
  - `cal-rsvp` → `CalendarAgendaView.svelte:66` root (agenda view, both viewports) AND `CalendarMobileMonth.svelte:609` selected-day panel (`px-4 pt-4 mt-2 border-t…`) AND — desktop month view — the `hidden lg:block` wrapper at `CalendarPageInner.svelte:375` (so the stop is never skipped: in desktop month view the ring frames the events grid area while the copy says „Öffne einen Termin …“).
  - `cal-categories` → `CalCategoryRail.svelte:43` section AND `CalendarMobileMonth.svelte:476` scroll rail.

- [ ] **Step 2: Registry entry** in `tourChapters.ts` (after `forum`):
```ts
  calendar: {
    key: 'kalender',
    page: 'calendar',
    kickerKey: 'tour.cal.kicker',
    stops: [
      { anchor: '[data-tour="cal-view"]',       titleKey: 'tour.cal.s1.title', bodyKey: 'tour.cal.s1.body' },
      { anchor: '[data-tour="cal-grid"]',       titleKey: 'tour.cal.s2.title', bodyKey: 'tour.cal.s2.body', bodyMobileKey: 'tour.cal.s2.bodyMobile' },
      { anchor: '[data-tour="cal-rsvp"]',       titleKey: 'tour.cal.s3.title', bodyKey: 'tour.cal.s3.body' },
      { anchor: '[data-tour="cal-categories"]', titleKey: 'tour.cal.s4.title', bodyKey: 'tour.cal.s4.body' },
    ],
    endNoteKey: 'tour.cal.end.note',
    nextChapterKey: 'tour.cal.end.next',
    nextChapterHref: '/marketplace',
  },
```

- [ ] **Step 3: i18n keys** (both locales). Kicker DE `'tour.cal.kicker': 'FÜHRUNG · KALENDER'` / EN `'TOUR · CALENDAR'`. Stops s1–s4 title+body (+ `tour.cal.s2.bodyMobile`): transcribe **verbatim** from `design/handoffs/TOUR_CC_ANSWERS.md:26-29` (KALENDER table — DE column → DE dict, EN column → EN dict; the `bMobile` cell of row 2 → `s2.bodyMobile`). End note DE `'tour.cal.end.note': 'Kapitel geschafft — weiter geht’s auf dem Marktplatz.'` / EN `'Chapter done — next up: the marketplace.'`; next-link DE `'tour.cal.end.next': 'Nächstes Kapitel: Marktplatz →'` / EN `'Next chapter: Marketplace →'`.

- [ ] **Step 4: Type-check (28) + build green.** Byte-verify one DE „ from the new block (od -c → `342 200 236`).

- [ ] **Step 5: Browser gate** — free-port server; open `/calendar`, run `__mahalleTourStart()`: 4 stops walk (S1 rings the switcher, S2 the grid, S3 the grid wrapper [month view], S4 the category rail), counter „n / 4“, end card shows „Nächstes Kapitel: Marktplatz →“. Resize to 390×844 (playwright-cli resize) + reload + restart tour → S2 shows the bMobile body („Tipp auf einen Tag …“). Kill server.

- [ ] **Step 6: Commit** — `git commit -m "feat(tour): Kalender chapter (4 stops, bMobile on S2)"`

---

### Task 4: Marktplatz chapter

**Files:**
- Modify: `src/components/marketplace/kiosk/browse/MarketFilterRail.svelte:110` (kind chips container), `:171` („Meine Anzeigen“ button)
- Modify: `src/components/marketplace/kiosk/browse/MarketTitleBlock.svelte:98` (desktop CTA wrapper div)
- Modify: `src/components/marketplace/kiosk/browse/MarketplaceBrowseInner.svelte:460` (grid), `:567` (mobile FAB)
- Modify: `src/lib/tour/tourChapters.ts`, `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: Task 1 types, Task 2 surface keys.
- Produces: registry entry `marketplace`, anchors `markt-kinds`, `markt-create`, `markt-grid`, `markt-mine`.

- [ ] **Step 1: Anchors.** `markt-kinds` → `MarketFilterRail.svelte:110` container div. `markt-create` → `MarketTitleBlock.svelte:98` (`hidden lg:block` wrapper div — do NOT tag the `<KioskBtn>` itself, it doesn't spread rest props) AND `MarketplaceBrowseInner.svelte:567` mobile FAB `<a>` (same value; `findAnchor` resolves). `markt-grid` → `MarketplaceBrowseInner.svelte:460` grid div. `markt-mine` → `MarketFilterRail.svelte:171` button (not in an `{#each}`). Note: unlike the forum's Gespeichert/Meine chips (which are NOT rendered logged-out → those stops skip), this button renders `disabled` for logged-out visitors — the stop therefore SHOWS for them, ringing a disabled control. That is deliberate and acceptable: the copy stays true and doubles as a sign-in nudge. Don't "fix" it by hiding the anchor.

- [ ] **Step 2: Registry entry**:
```ts
  marketplace: {
    key: 'markt',
    page: 'marketplace',
    kickerKey: 'tour.markt.kicker',
    stops: [
      { anchor: '[data-tour="markt-kinds"]',  titleKey: 'tour.markt.s1.title', bodyKey: 'tour.markt.s1.body' },
      { anchor: '[data-tour="markt-create"]', titleKey: 'tour.markt.s2.title', bodyKey: 'tour.markt.s2.body' },
      { anchor: '[data-tour="markt-grid"]',   titleKey: 'tour.markt.s3.title', bodyKey: 'tour.markt.s3.body' },
      { anchor: '[data-tour="markt-mine"]',   titleKey: 'tour.markt.s4.title', bodyKey: 'tour.markt.s4.body' },
    ],
    endNoteKey: 'tour.markt.end.note',
    nextChapterKey: 'tour.markt.end.next',
    nextChapterHref: '/newsboard',
  },
```

- [ ] **Step 3: i18n** (both locales). Kicker `'FÜHRUNG · MARKTPLATZ'` / `'TOUR · MARKETPLACE'`. Stops verbatim from `TOUR_CC_ANSWERS.md:35-38` (MARKTPLATZ table). End note DE `'Kapitel geschafft — als Nächstes: der Kurier.'` / EN `'Chapter done — next up: the Kurier.'`; next link DE `'Nächstes Kapitel: Kurier →'` / EN `'Next chapter: Kurier →'`.

- [ ] **Step 4: Type-check (28) + build green + „-byte check.**

- [ ] **Step 5: Browser gate** — `/marketplace`, `__mahalleTourStart()`: 4 stops (S2 rings the desktop CTA wrapper at ≥1024px; at 390px the FAB), counter honest, end card → Kurier. Kill server.

- [ ] **Step 6: Commit** — `git commit -m "feat(tour): Marktplatz chapter (4 stops)"`

---

### Task 5: Kurier chapter (softened S3 — user-approved option (a))

**Files:**
- Modify: `src/components/newsboard/kiosk/browse/NewsMasthead.svelte:20` (masthead section)
- Modify: `src/components/newsboard/kiosk/browse/NewsFilterRail.svelte:60` (row-2 container), `:77` (saved button)
- Modify: `src/components/newsboard/kiosk/browse/NewsTitleBlock.svelte:18` (wrap the submit `<KioskBtn>`)
- Modify: `src/lib/tour/tourChapters.ts`, `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: Task 1 types, Task 2 surface keys.
- Produces: registry entry `newsboard`, anchors `kurier-masthead`, `kurier-saved`, `kurier-fade`, `kurier-submit`.

**Context for the S3 deviation (document in the code comment):** CD's original S3 anchor was the Ungelesen filter, but that control is shipped **disabled** (`NewsFilterRail.svelte:88`, „Phase 1 … needs read-state, Phase 3“) — ringing a disabled control with copy claiming it filters would be false. User-approved option (a): anchor the row-2 filter container instead and drop the filter sentence from the copy. The read-FADE itself is live (cards decay via `article.read`), so the remaining copy stays true.

- [ ] **Step 1: Anchors.** `kurier-masthead` → `NewsMasthead.svelte:20` root section. `kurier-saved` → `NewsFilterRail.svelte:77` saved button (disabled-when-logged-out is fine). `kurier-fade` → `NewsFilterRail.svelte:60` row-2 container div. `kurier-submit` → in `NewsTitleBlock.svelte:18`, wrap the `<KioskBtn variant="secondary" href="/newsboard/submit">…</KioskBtn>` in `<span data-tour="kurier-submit" class="inline-flex">…</span>` (KioskBtn doesn't spread rest props).

- [ ] **Step 2: Registry entry**:
```ts
  newsboard: {
    key: 'kurier',
    page: 'newsboard',
    kickerKey: 'tour.kurier.kicker',
    stops: [
      { anchor: '[data-tour="kurier-masthead"]', titleKey: 'tour.kurier.s1.title', bodyKey: 'tour.kurier.s1.body' },
      { anchor: '[data-tour="kurier-saved"]',    titleKey: 'tour.kurier.s2.title', bodyKey: 'tour.kurier.s2.body' },
      // S3 anchor deviates from TOUR_CC_ANSWERS (Ungelesen filter is shipped
      // disabled — Phase-1 placeholder); rings the filter row instead,
      // copy softened accordingly. User-approved 2026-08-10.
      { anchor: '[data-tour="kurier-fade"]',     titleKey: 'tour.kurier.s3.title', bodyKey: 'tour.kurier.s3.body' },
      { anchor: '[data-tour="kurier-submit"]',   titleKey: 'tour.kurier.s4.title', bodyKey: 'tour.kurier.s4.body' },
    ],
    endNoteKey: 'tour.kurier.end.note',
    nextChapterKey: 'tour.kurier.end.next',
    nextChapterHref: '/schillerkiez',
  },
```

- [ ] **Step 3: i18n** (both locales). Kicker `'FÜHRUNG · KURIER'` / `'TOUR · KURIER'`. S1, S2, S4 verbatim from `TOUR_CC_ANSWERS.md:44-47` (KURIER table rows 1, 2, 4). **S3 uses this softened copy (NOT the table's row 3):**
  - DE title `'Gelesenes verblasst'`, DE body `'Gelesene Artikel verblassen still, Neues bleibt kräftig — ein Blick zeigt, was heute noch wartet.'`
  - EN title `'Read pieces fade'`, EN body `'Read articles quietly fade; new ones stay bold — one glance shows what still waits today.'`
  End note DE `'Kapitel geschafft — weiter zu den Kiez-Daten.'` / EN `'Chapter done — on to the Kiez data.'`; next link DE `'Nächstes Kapitel: Kiez-Daten →'` / EN `'Next chapter: Kiez data →'`.

- [ ] **Step 4: Type-check (28) + build green + byte check.**

- [ ] **Step 5: Browser gate** — `/newsboard`, `__mahalleTourStart()`: 4 stops (S3 rings the whole filter row, never the disabled unread chip alone), end card → Kiez-Daten. Kill server.

- [ ] **Step 6: Commit** — `git commit -m "feat(tour): Kurier chapter (4 stops, softened S3 for disabled unread filter)"`

---

### Task 6: Kiez-Daten chapter

**Files:**
- Modify: `src/components/kiez/kiosk/KzSelector.svelte:22` (selector section)
- Modify: `src/components/kiez/kiosk/KzKanal.svelte:18-19` (conditional on `nr`)
- Modify: `src/components/kiez/kiosk/KzFooter.svelte:23` (print link)
- Modify: `src/lib/tour/tourChapters.ts`, `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: Task 1 types, Task 2 surface keys.
- Produces: registry entry `schillerkiez`, anchors `kiez-plr`, `kiez-kanal`, `kiez-druck`.

- [ ] **Step 1: Anchors.** `kiez-plr` → `KzSelector.svelte:22` root section (covers maps + chips). `kiez-kanal` → `KzKanal.svelte:19` **header row div** (`<div class="mb-3.5 flex flex-wrap items-end justify-between gap-3">` — CD's spec says „Kanal-01-Kopfzeile", the header row, NOT the whole channel section whose charts would make a huge ring). The component is a shared shell for all 5 channels, so use the per-instance conditional pattern (mirrors `TagBar.svelte:128`): `data-tour={nr === '01' ? 'kiez-kanal' : undefined}` on that div. `kiez-druck` → `KzFooter.svelte:23` `<a href="/schillerkiez/druck" …>`.

- [ ] **Step 2: Registry entry**:
```ts
  schillerkiez: {
    key: 'kiezdaten',
    page: 'schillerkiez',
    kickerKey: 'tour.kiez.kicker',
    stops: [
      { anchor: '[data-tour="kiez-plr"]',   titleKey: 'tour.kiez.s1.title', bodyKey: 'tour.kiez.s1.body' },
      { anchor: '[data-tour="kiez-kanal"]', titleKey: 'tour.kiez.s2.title', bodyKey: 'tour.kiez.s2.body' },
      { anchor: '[data-tour="kiez-druck"]', titleKey: 'tour.kiez.s3.title', bodyKey: 'tour.kiez.s3.body' },
    ],
    endNoteKey: 'tour.kiez.end.note',
    nextChapterKey: 'tour.kiez.end.next',
    nextChapterHref: '/blog',
  },
```
  (Note: `KiezPageInner` remounts channels via `{#key plr}` on PLR change — harmless mid-tour, `findAnchor` re-queries by selector on every measure. The selector/channels are absent during loading/error states — duty-3 skipping covers it.)

- [ ] **Step 3: i18n** (both locales). Kicker `'FÜHRUNG · KIEZ-DATEN'` / `'TOUR · KIEZ DATA'`. Stops verbatim from `TOUR_CC_ANSWERS.md:53-55` (KIEZ-DATEN table). End note DE `'Kapitel geschafft — als Nächstes: die Beilage.'` / EN `'Chapter done — next up: the Beilage.'`; next link DE `'Nächstes Kapitel: Blog →'` / EN `'Next chapter: Blog →'`.

- [ ] **Step 4: Type-check (28) + build green + byte check.**

- [ ] **Step 5: Browser gate** — `/schillerkiez` (wait for hydration — the page fetches data), `__mahalleTourStart()`: 3 stops (S2 rings ONLY Kanal 01, scrolled into view; S3 scrolls to the footer print link). Kill server.

- [ ] **Step 6: Commit** — `git commit -m "feat(tour): Kiez-Daten chapter (3 stops)"`

---

### Task 7: Blog chapter

**Files:**
- Modify: `src/components/blog/kiosk/BeilageIndex.svelte` — snippet roots `:184` (cloud), mobile tag row `:292`, and the four snippet call sites `:390`/`:397` (archiv) + `:392`/`:399` (aufruf)
- Modify: `src/lib/tour/tourChapters.ts`, `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: Task 1 types (visible-first matching is load-bearing here — all duplicates co-exist in DOM), Task 2 surface keys.
- Produces: registry entry `blog`, anchors `blog-rubriken`, `blog-archiv`, `blog-aufruf`.

- [ ] **Step 1: Anchors.** All inside `BeilageIndex.svelte`:
  - `blog-rubriken` → the sidebar `cloudModule` root div (`:184`, desktop-only render at `:389`) AND the mobile tag row (`:292`, `lg:hidden`). Same value on both; `findAnchor` picks the visible one.
  - `blog-archiv` → wrap or tag the two RENDER SITES, not the snippet root (a snippet-root attribute would produce two identical nodes and the desktop copy comes first in DOM order): at `:390` and `:397` wrap each `{@render archivModule()}` in `<div data-tour="blog-archiv">…</div>` (the wrapper is display-neutral inside the existing flex columns).
  - `blog-aufruf` → same treatment at `:392` and `:399` for `{@render aufrufCard()}`.

- [ ] **Step 2: Registry entry**:
```ts
  blog: {
    key: 'blog',
    page: 'blog',
    kickerKey: 'tour.blog.kicker',
    stops: [
      { anchor: '[data-tour="blog-rubriken"]', titleKey: 'tour.blog.s1.title', bodyKey: 'tour.blog.s1.body' },
      { anchor: '[data-tour="blog-archiv"]',   titleKey: 'tour.blog.s2.title', bodyKey: 'tour.blog.s2.body' },
      { anchor: '[data-tour="blog-aufruf"]',   titleKey: 'tour.blog.s3.title', bodyKey: 'tour.blog.s3.body' },
    ],
    endNoteKey: 'tour.blog.end.note',
    nextChapterKey: 'tour.blog.end.next',
    nextChapterHref: '/profile',
  },
```

- [ ] **Step 3: i18n** (both locales). Kicker `'FÜHRUNG · BLOG'` / `'TOUR · BLOG'`. Stops verbatim from `TOUR_CC_ANSWERS.md:61-63` (BLOG table). End note DE `'Kapitel geschafft — zum Schluss: dein Profil.'` / EN `'Chapter done — last stop: your profile.'`; next link DE `'Nächstes Kapitel: Profil →'` / EN `'Next chapter: Profile →'`.

- [ ] **Step 4: Type-check (28) + build green + byte check.**

- [ ] **Step 5: Browser gate** — `/blog`, `__mahalleTourStart()` at ≥1024px: S1 rings the sidebar cloud, S2 the sidebar archive, S3 the Aufruf card. Resize 390px + reload + restart: S1 rings the mobile tag row, S2/S3 the mobile stack copies (NOT invisible desktop nodes — this validates Task 1's `findAnchor`). Kill server.

- [ ] **Step 6: Commit** — `git commit -m "feat(tour): Blog chapter (3 stops)"`

---

### Task 8: Profil chapter (final — closes the chain)

**Files:**
- Modify: `src/components/profile/kiosk/PIdentityCard.svelte:381` (hobbies block, read state)
- Modify: `src/components/profile/kiosk/PActivityLedger.svelte:144` (filter-chip row — `PCard` can't take attrs)
- Modify: `src/components/profile/kiosk/PChronikStrip.svelte:53` (chronik root)
- Modify: `src/lib/tour/tourChapters.ts`, `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: Task 1's `final?: boolean` + optional next fields + `tour.chrome.stampFinal`.
- Produces: registry entry `profile` — the only `final: true` chapter.

- [ ] **Step 1: Anchors.** `profil-hobbies` → `PIdentityCard.svelte:381` (`<div style="margin-top: 16px;">` around label + chip row; survives an empty hobby list; note the EDIT state renders a different branch — the anchor vanishing while the user edits mid-tour is duty-2/3 handled). `profil-archiv` → `PActivityLedger.svelte:144` filter-chip scroll row. `profil-chronik` → `PChronikStrip.svelte:53` root div (conditional on `showChronik && initialChronik` — absent chronik = skipped stop, correct).

- [ ] **Step 2: Registry entry** (note: NO `nextChapterKey`/`nextChapterHref`, `final: true`):
```ts
  profile: {
    key: 'profil',
    page: 'profile',
    kickerKey: 'tour.profil.kicker',
    stops: [
      { anchor: '[data-tour="profil-hobbies"]', titleKey: 'tour.profil.s1.title', bodyKey: 'tour.profil.s1.body' },
      { anchor: '[data-tour="profil-archiv"]',  titleKey: 'tour.profil.s2.title', bodyKey: 'tour.profil.s2.body' },
      { anchor: '[data-tour="profil-chronik"]', titleKey: 'tour.profil.s3.title', bodyKey: 'tour.profil.s3.body' },
    ],
    endNoteKey: 'tour.profil.end.note',
    final: true,
  },
```

- [ ] **Step 3: i18n** (both locales). Kicker `'FÜHRUNG · PROFIL'` / `'TOUR · PROFILE'`. Stops verbatim from `TOUR_CC_ANSWERS.md:69-71` (PROFIL table — the italic parenthetical in row 1 is a design note, NOT part of the copy). Final end note (CD §6 verbatim): DE `'tour.profil.end.note': 'Das war die Führung — du kennst jetzt den ganzen Kiosk. Jederzeit neu: Avatar-Menü → „Führung starten“.'` / EN `'That’s the tour — you now know the whole kiosk. Any time again: avatar menu → ‘Start tour’.'`

- [ ] **Step 4: Type-check (28) + build green + byte check** (the EN end note carries ’ U+2019 twice — verify).

- [ ] **Step 5: Browser gate (limited)** — `/profile` renders its own logged-out state without the profile cards, so anchors won't exist without auth. Verify what's verifiable headlessly: page loads, no console errors, `document.querySelectorAll('[data-tour^="profil-"]').length === 0` logged-out (expected — stops would adapt). Grep-verify the three anchors exist in source: `grep -rl 'data-tour="profil-' src/components/profile/kiosk/` → exactly the 3 files (PIdentityCard, PActivityLedger, PChronikStrip). **Flag in the task report: logged-in E2E (3 stops + final „✓ FÜHRUNG“ card, no next-link) is deferred to the user's manual pass** — same pattern as tour v1.

- [ ] **Step 6: Commit** — `git commit -m "feat(tour): Profil chapter (3 stops, final end card)"`

---

### Task 9: Docs

**Files:**
- Modify: `src/components/tour/CLAUDE.md`
- Modify: root `CLAUDE.md` (tour section, ~3 lines)

- [ ] **Step 1: `src/components/tour/CLAUDE.md`** — update: (a) "How to add a chapter" intro: all 7 chapters live now, TOUR_CC_ANSWERS.md is the copy source; (b) new engine capabilities paragraph: `findAnchor` visible-first matching (why: duplicate desktop/mobile anchors), `bodyMobileKey` (used once: Kalender S2), `final`/optional-next (Profil), per-stop `link` (Forum S7 template → composer prefill); (c) v1-deviations section: remove the "copy-only in v1" template bullet (shipped), keep the offer-strip placement note (CD approved below-nav as final in TOUR_CC_ANSWERS §4), add the Kurier-S3 re-anchor decision (disabled unread filter, option (a), 2026-08-10); (d) entrance rules: hello modal + offer strip are now parameterized per surface ({surface}, {n}).

- [ ] **Step 2: Root `CLAUDE.md`** — in the "Onboarding Tour" section: replace "forum chapter live (7 stops)" with all-7-chapters-live (24 + 7 stops), note the chapter chain ends at Profil (final card), and that remaining tour work is only the deferred code minors (LS bleed, focus restore, atomic POST, stale tail — unchanged).

- [ ] **Step 3: Verify** — `pnpm type-check` count unchanged (28); no build needed for docs.

- [ ] **Step 4: Commit** — `git commit -m "docs: tour phase 2 — all seven chapters live"`

---

## Self-Review (done at write time)

- **Spec coverage:** TOUR_CC_ANSWERS §1+2 → Tasks 3–8 (24 stops incl. 5 anchor decisions + 2 hardenings: agenda-region → cal-rsvp multi-anchor, market contact → grid, blog S3 → Aufruf module, Kanal-01 conditional, Kurier S3 option-(a) deviation is user-approved); §3 nose stays dropped (24px rule already satisfied at 16px — no code change; documented in Task 9); §4 offer strip below-nav confirmed + accent already wired via `--k-accent`, chapter+count added in Task 2; §5 template → Task 2; §6 chain + final card → Tasks 3–8 registry entries + Task 1 `final` support; §7 parameterized hello → Task 2; bMobile → Tasks 1+3.
- **Placeholder scan:** none — every step names exact files/lines/values; stop copy is pointed at exact line ranges of the canonical in-repo spec file rather than re-transcribed (deliberate: one lossy hop fewer, the v1 quote-flattening lesson).
- **Type consistency:** `TourStop.link` shape identical in Tasks 1, 2; `findAnchor` name consistent; registry keys (`calendar`/`marketplace`/`newsboard`/`schillerkiez`/`blog`/`profile`) match KioskLayout `page` values verified in repo; `ChapterKey` values match `tourStore.ts`'s existing union; `tour.surface.*` keys consistent between Tasks 2 and 3–8.
