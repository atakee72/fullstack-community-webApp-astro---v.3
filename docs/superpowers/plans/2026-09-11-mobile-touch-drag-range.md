# Mobile Touch Drag-to-Select Range Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On the phone month grid, a long-press that keeps moving over other days stretches the selection into a range in one gesture, instead of needing a second tap.

**Architecture:** The mobile grid (`CalendarMobileMonth.svelte`) already long-presses to anchor a day and arms the „+ termin" pin; a following tap extends it. This plan keeps that state machine untouched and adds a *drag phase* between the long-press firing and the finger lifting: pointer capture on the anchor cell, `elementFromPoint` on every pointermove, a non-passive `touchmove` guard so the browser never converts the travel into a page scroll, and a pure helper that decides where the moving end lands (past clamp, month edge, anchor day). Desktop `CalendarMonthGrid.svelte` is the reference implementation of the same idea and is not touched.

**Tech Stack:** Astro 5 + Svelte 5 runes, date-fns, Pointer Events + Touch Events, `node:test` via `tsx` for the pure helper, `playwright-cli` + CDP `Input.dispatchTouchEvent` for the touch verification.

**Spec:** none (bounded change). The design is the "Behavior" section below; the parked note it closes is in `src/components/calendar/kiosk/CLAUDE.md` (the "Mobile month grid: tap selects, long-press creates" bullet, last sentence).

## Global Constraints

- CI gates are ratchet-only: `pnpm type-check` errors ≤ **26**, `npx -y svelte-check@4` errors ≤ **92**. Never raise them; fixing errors may lower them.
- Commit messages: one line, simple and concise, **no** "Generated with Claude Code" signature, **no** `Co-Authored-By` footer. Verify with `git log -1 --format=%B`.
- Stage only named files (`git add <file> …`), never `git add .` or `git add -A`. `scratchpad/` is gitignored and stays that way.
- Never print, echo, slice or write the dev password anywhere. It is read from a file straight into a `fill` argument (see Task 2 Step 8).
- No new `<style>` block in `CalendarMobileMonth.svelte` (nested-island CSS gets orphaned in prod builds); any CSS goes to `src/styles/global.css` — this plan needs none.
- Own dev server on port **4655** only (`pnpm dev --port 4655`); run `fuser -k 4655/tcp` when done. Never start a server on 3000.
- `playwright-cli -s=<name> open <url>` must precede any `run-code` in that session; close the session at the end.
- Kiosk copy is DE + EN, both in `src/lib/kiosk-i18n.ts` (DE block first, EN block ~1860 lines later). Every changed key gets both.
- Wine/ochre semantic accents in the calendar stay as they are (see the area CLAUDE.md "Don't touch" list).

## Behavior (the design)

Today on a phone (all in `src/components/calendar/kiosk/mobile/CalendarMobileMonth.svelte`):

- plain tap on an in-month day → `selectedDay` (panel below), clears any leftover range;
- long-press (450 ms, touch only) → haptic + pulse + `handleDateTap(date, true)`: `rangeStart = date`, `isRangeArmed = true`, the pin opens on that day;
- a later plain tap on another day → range committed (`rangeEnd`), `isRangeArmed = false`.

After this plan, additionally:

1. When the long-press timer fires on a *future* in-month day, the gesture enters **drag mode** (`dragging = true`) with pointer capture on the anchor cell. The pin still opens on the anchor at this moment (no change to the press feedback).
2. While the finger moves, the cell under it (via `elementFromPoint`) becomes the moving end through `resolveDragEnd()`: off-grid or out-of-month keeps the previous end, days before today clamp to today, coming back onto the anchor day means single-day (`rangeEnd = null`). Each change vibrates 10 ms. The range stripes live (`inCommittedRange` already handles both orders). The pin hides while a range is being stretched (`dragging && rangeEnd`), so it never sits under the finger.
3. A non-passive `touchmove` listener on the grid wrapper calls `preventDefault()` only while `dragging`, so the browser never starts a pan (which would `pointercancel` the drag). Plain touches keep native scrolling: the listener is a no-op then.
4. On `pointerup`/`pointercancel`: `dragging = false`; if the finger travelled (`rangeEnd` set) the range is committed exactly like a second tap would (`isRangeArmed = false`) and the pin reappears at the far end; with no travel the anchor stays armed (tap-to-extend keeps working). The wrapper's `swipeX` action gets a new `ignore: () => dragging` option so a horizontal drag across a row never flips the month. (`stopPropagation` in the cell handler cannot do this: Svelte 5 delegates `pointerup` to the root, so the wrapper's native listener fires first.)
5. `contextmenu` on a cell is suppressed after a long-press (Android fires it ~500 ms in; nothing useful is in it for a button).
6. Guidance copy under the grid and the tour's mobile body mention the drag, DE + EN.

Out of scope: desktop grid, agenda/day views, any change to the pin component, past-day selection.

## File map

- Create `src/lib/calendar/rangeDrag.ts` — pure `resolveDragEnd()`; dependency-pure (date-fns only) so it can be unit-tested and imported by the island.
- Create `src/lib/calendar/rangeDrag.test.ts` — `node:test` cases for the helper.
- Modify `src/lib/swipe.ts` — optional `ignore?: () => boolean` on `SwipeXOptions` (checked at pointerup; backwards compatible, `CalendarDayView` keeps working unchanged).
- Modify `src/components/calendar/kiosk/mobile/CalendarMobileMonth.svelte` — drag phase (state, handlers, touchmove guard, pin hide, swipe ignore, contextmenu guard).
- Modify `src/lib/kiosk-i18n.ts` — `cal.mobile.guidance` and `tour.cal.s3.bodyMobile`, DE + EN.
- Modify `src/components/calendar/kiosk/CLAUDE.md` — replace the parked sentence with the shipped behavior.

---

### Task 1: Pure helper `resolveDragEnd()` with tests

**Files:**
- Create: `src/lib/calendar/rangeDrag.ts`
- Create: `src/lib/calendar/rangeDrag.test.ts`

**Interfaces:**
- Consumes: nothing project-specific (date-fns `isSameDay`, `isSameMonth`, `startOfDay`).
- Produces: `resolveDragEnd(anchor: Date, candidate: Date | null, today: Date, visibleMonth: Date, prev: Date | null): Date | null` — Task 2 imports it.

- [ ] **Step 1: Write the failing test**

Create `src/lib/calendar/rangeDrag.test.ts`:

```ts
// Unit tests for the touch-drag end resolver. Run directly:
//   npx tsx src/lib/calendar/rangeDrag.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDragEnd } from './rangeDrag';

const d = (s: string) => new Date(`${s}T00:00:00`); // local midnight, like the grid's cells
const month = d('2026-09-01');
const today = d('2026-09-11');
const ms = (x: Date | null) => x?.getTime() ?? null;

test('extends to a later in-month day', () => {
  assert.equal(ms(resolveDragEnd(d('2026-09-15'), d('2026-09-18'), today, month, null)), ms(d('2026-09-18')));
});

test('keeps the previous end when the finger is off the grid', () => {
  assert.equal(ms(resolveDragEnd(d('2026-09-15'), null, today, month, d('2026-09-18'))), ms(d('2026-09-18')));
});

test('keeps the previous end over an out-of-month cell', () => {
  assert.equal(ms(resolveDragEnd(d('2026-09-15'), d('2026-10-01'), today, month, d('2026-09-18'))), ms(d('2026-09-18')));
});

test('clamps a backwards drag at today', () => {
  assert.equal(ms(resolveDragEnd(d('2026-09-15'), d('2026-09-03'), today, month, null)), ms(today));
});

test('back on the anchor day means a single-day selection', () => {
  assert.equal(resolveDragEnd(d('2026-09-15'), d('2026-09-15'), today, month, d('2026-09-18')), null);
});

test('anchor is today and the finger goes into the past: single-day', () => {
  assert.equal(resolveDragEnd(today, d('2026-09-03'), today, month, null), null);
});

test('a candidate with a time part is normalised to midnight', () => {
  const noon = new Date('2026-09-18T12:30:00');
  assert.equal(ms(resolveDragEnd(d('2026-09-15'), noon, today, month, null)), ms(d('2026-09-18')));
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx tsx src/lib/calendar/rangeDrag.test.ts`
Expected: fails to load — `Cannot find module './rangeDrag'` (or equivalent ERR_MODULE_NOT_FOUND).

- [ ] **Step 3: Write the helper**

Create `src/lib/calendar/rangeDrag.ts`:

```ts
// Where a live touch-drag's moving end lands on the phone month grid.
// Pure and dependency-free beyond date-fns, so the island can import it
// and it can be unit-tested without a DOM.
//
//   anchor        the long-pressed day (never in the past — the island
//                 refuses to arm past days before this is ever called)
//   candidate     the day under the finger, or null when the finger is
//                 off the grid / over something that is not a cell
//   today         start of today (caller passes startOfDay(new Date()))
//   visibleMonth  the month the grid shows; out-of-month cells are inert
//   prev          the current moving end (kept when the finger is off)
//
// Rules: off-grid or out-of-month → keep prev; before today → clamp to
// today (no events in the past); back on the anchor day → null, i.e. a
// single-day selection; otherwise the candidate's local midnight.
import { isSameDay, isSameMonth, startOfDay } from 'date-fns';

export function resolveDragEnd(
  anchor: Date,
  candidate: Date | null,
  today: Date,
  visibleMonth: Date,
  prev: Date | null,
): Date | null {
  if (!candidate || !isSameMonth(candidate, visibleMonth)) return prev;
  const day = startOfDay(candidate);
  const floor = startOfDay(today);
  const clamped = day < floor ? floor : day;
  return isSameDay(clamped, anchor) ? null : clamped;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsx src/lib/calendar/rangeDrag.test.ts`
Expected: TAP output with `# pass 7`, `# fail 0`.

- [ ] **Step 5: Confirm the test file doesn't move the tsc gate**

Run: `pnpm type-check 2>&1 | grep -c "error TS"`
Expected: `26` (tsconfig includes `**/*`, so the test file is type-checked; `node:test` types come from `@types/node`, which is installed).

- [ ] **Step 6: Commit**

```bash
git add src/lib/calendar/rangeDrag.ts src/lib/calendar/rangeDrag.test.ts
git commit -m "feat(calendar): resolveDragEnd helper for the phone month grid's touch drag"
git log -1 --format=%B   # one line, no footer
```

---

### Task 2: Drag phase in `CalendarMobileMonth.svelte` + touch verification

**Files:**
- Modify: `src/lib/swipe.ts` (options interface + `onUp`)
- Modify: `src/components/calendar/kiosk/mobile/CalendarMobileMonth.svelte` (script lines ~119–260 and ~295–300, markup lines ~415 and ~445–455)

**Interfaces:**
- Consumes: `resolveDragEnd` from `src/lib/calendar/rangeDrag.ts` (Task 1).
- Produces: `SwipeXOptions.ignore?: () => boolean` (optional; other `swipeX` users unchanged). Existing component state (`rangeStart`, `rangeEnd`, `isRangeArmed`, `pin`) keeps its meaning; a new `dragging` `$state` is internal.

Read the whole `<script>` of the component first (it is ~400 lines); the edits below are exact-string replacements against the current file.

Event-order fact this task depends on: Svelte 5 delegates `pointerdown`, `pointermove`, `pointerup` and `contextmenu` to the document root (`node_modules/svelte/src/utils.js` DelegatedEvents), while `pointercancel` and `pointerleave` are attached to the element. A `use:` action's native `addEventListener` on the wrapper therefore runs BEFORE the cell's delegated `onpointerup` handler. Nothing in this task may rely on `stopPropagation` from a delegated handler reaching the wrapper.

- [ ] **Step 0: Let `swipeX` be told to sit a gesture out**

In `src/lib/swipe.ts`, find:

```ts
export interface SwipeXOptions {
  onLeft?: () => void;   // finger moved left → "next"
  onRight?: () => void;  // finger moved right → "previous"
  threshold?: number;    // px, default 60
}
```

Replace with:

```ts
export interface SwipeXOptions {
  onLeft?: () => void;   // finger moved left → "next"
  onRight?: () => void;  // finger moved right → "previous"
  threshold?: number;    // px, default 60
  ignore?: () => boolean; // true at pointerup → this gesture is someone else's (e.g. a live drag-select)
}
```

Find:

```ts
  function onUp(e: PointerEvent) {
    if (pointerId === null || e.pointerId !== pointerId) return;
    pointerId = null;
    const dx = e.clientX - startX;
```

Replace with:

```ts
  function onUp(e: PointerEvent) {
    if (pointerId === null || e.pointerId !== pointerId) return;
    pointerId = null;
    // Asked at pointerup, not pointerdown: a drag-select only becomes one
    // 450 ms into the press, long after our onDown ran.
    if (opts.ignore?.()) return;
    const dx = e.clientX - startX;
```

- [ ] **Step 1: Import the helper and add the drag state**

Find the import block (it contains `import { swipeX } from '../../../../lib/swipe';`) and add right after that line:

```ts
  import { resolveDragEnd } from '../../../../lib/calendar/rangeDrag';
```

Find:

```ts
  // Non-reactive locals — internal flags only.
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressFired = false;
```

Replace with:

```ts
  // Touch drag (2026-09-11): after the long-press fires, the SAME finger
  // can keep moving over other days to stretch the range — no second tap
  // needed. `dragging` is reactive because the pin effect hides the pin
  // while a range is being stretched; `dragPointerId` pins the gesture to
  // the finger that started it.
  let dragging = $state(false);
  let dragPointerId: number | null = null;

  // Non-reactive locals — internal flags only.
  let longPressTimer: ReturnType<typeof setTimeout> | null = null;
  let longPressFired = false;
```

- [ ] **Step 2: Start the drag when the long-press fires**

Find the whole `cellPointerDown` function:

```ts
  function cellPointerDown(e: PointerEvent, date: Date, isInMonth: boolean) {
    longPressFired = false;
    if (e.pointerType !== 'touch' || !isInMonth) return;
    clearLongPress();
    longPressTimer = setTimeout(() => {
      longPressFired = true;
      if ('vibrate' in navigator) {
        try { navigator.vibrate([30, 30, 30]); } catch { /* ignore */ }
      }
      pulseCellKey = date.toISOString();
      setTimeout(() => (pulseCellKey = null), 400);
      // Commit IN the timer — iOS Safari swallows the post-long-press
      // synthetic click, so onclick won't fire reliably.
      handleDateTap(date, true);
    }, 450);
  }
```

Replace with:

```ts
  function cellPointerDown(e: PointerEvent, date: Date, isInMonth: boolean) {
    longPressFired = false;
    if (e.pointerType !== 'touch' || !isInMonth) return;
    clearLongPress();
    // `currentTarget` is null once the event has finished dispatching —
    // grab the button now for the pointer capture inside the timer.
    const cellEl = e.currentTarget as HTMLElement | null;
    const pointerId = e.pointerId;
    longPressTimer = setTimeout(() => {
      longPressFired = true;
      if ('vibrate' in navigator) {
        try { navigator.vibrate([30, 30, 30]); } catch { /* ignore */ }
      }
      pulseCellKey = date.toISOString();
      setTimeout(() => (pulseCellKey = null), 400);
      // Commit IN the timer — iOS Safari swallows the post-long-press
      // synthetic click, so onclick won't fire reliably.
      handleDateTap(date, true);
      // Past days never arm (handleDateTap bails) — nothing to drag then.
      if (!isRangeArmed) return;
      // Drag phase: keep move/up events flowing to this cell even when
      // the finger leaves it. The touchmove guard below stops the browser
      // from turning the travel into a page scroll.
      dragging = true;
      dragPointerId = pointerId;
      try {
        cellEl?.setPointerCapture(pointerId);
      } catch {
        /* pointer already released — endDrag will never fire, harmless */
      }
    }, 450);
  }

  function cellPointerMove(e: PointerEvent) {
    if (!dragging || e.pointerId !== dragPointerId || !rangeStart) return;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const iso = under?.closest('[data-cell-date]')?.getAttribute('data-cell-date') ?? null;
    const next = resolveDragEnd(rangeStart, iso ? new Date(iso) : null, startOfDay(new Date()), visibleMonth, rangeEnd);
    if ((next?.getTime() ?? null) === (rangeEnd?.getTime() ?? null)) return;
    rangeEnd = next;
    if ('vibrate' in navigator) {
      try { navigator.vibrate(10); } catch { /* ignore */ }
    }
  }

  // pointerup AND pointercancel. A finger that travelled to another day
  // committed a range (same outcome as the second-tap path); no travel
  // keeps the anchor armed so tap-to-extend still works. The wrapper's
  // swipeX has already run by the time this delegated handler fires
  // (Svelte 5 delegates pointerup to the root) — it reads `dragging`
  // through its `ignore` option, still true at that moment, which is
  // why the flag is cleared HERE and not earlier.
  function endDrag(e: PointerEvent) {
    clearLongPress();
    if (!dragging || e.pointerId !== dragPointerId) return;
    dragging = false;
    dragPointerId = null;
    if (rangeEnd) isRangeArmed = false;
  }

  // Android fires contextmenu ~500 ms into a press; after our long-press
  // it would only get in the way of the drag.
  function cellContextMenu(e: Event) {
    if (longPressFired || dragging) e.preventDefault();
  }
```

`startOfDay` (date-fns import, used by `handleDateTap`) and the `visibleMonth` prop are already in scope.

- [ ] **Step 3: Block page scroll while dragging**

Find the `clearLongPress` function:

```ts
  function clearLongPress() {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }
```

Add right BEFORE it:

```ts
  // While a drag is live, swallow touchmove so the browser never starts a
  // pan (a pan would pointercancel the drag). Non-passive on purpose;
  // attached once to the stable wrapper and checks the flag per event, so
  // plain touches keep native scrolling. Reading `dragging` inside the
  // listener does not subscribe the effect — that is intended.
  $effect(() => {
    const el = gridWrapper;
    if (!el) return;
    const block = (ev: TouchEvent) => {
      if (dragging) ev.preventDefault();
    };
    el.addEventListener('touchmove', block, { passive: false });
    return () => el.removeEventListener('touchmove', block);
  });
```

- [ ] **Step 4: Hide the pin while a range is being stretched**

Find the start of the pin-positioning effect:

```ts
  $effect(() => {
    if (!rangeStart || !gridWrapper) {
      pin = null;
      return;
    }
    const target = rangeEnd ?? rangeStart;
```

Replace with:

```ts
  $effect(() => {
    if (!rangeStart || !gridWrapper) {
      pin = null;
      return;
    }
    // Stretching a range under the finger: the pin would sit under the
    // thumb and jump every cell — hide it until the finger lifts. The
    // press itself (no travel yet) keeps showing the pin on the anchor.
    if (dragging && rangeEnd) {
      pin = null;
      return;
    }
    const target = rangeEnd ?? rangeStart;
```

- [ ] **Step 5: Wire the handlers in the markup**

Find (inside the cell `<button>`):

```svelte
          onclick={(e) => cellClick(e, cell, inMonth)}
          onpointerdown={(e) => cellPointerDown(e, cell, inMonth)}
          onpointerup={clearLongPress}
          onpointercancel={clearLongPress}
          onpointerleave={clearLongPress}
```

Replace with:

```svelte
          onclick={(e) => cellClick(e, cell, inMonth)}
          onpointerdown={(e) => cellPointerDown(e, cell, inMonth)}
          onpointermove={cellPointerMove}
          onpointerup={endDrag}
          onpointercancel={endDrag}
          onpointerleave={clearLongPress}
          oncontextmenu={cellContextMenu}
```

`onpointerleave` keeps cancelling a not-yet-fired long-press when the finger drifts off the cell early (existing behavior); after pointer capture it no longer fires until release, which is what we want.

Then find the wrapper (line ~415):

```svelte
  <div data-tour="cal-grid" class="px-2 pt-2 relative" bind:this={gridWrapper} use:swipeX={{ onLeft: onNextMonth, onRight: onPrevMonth }}>
```

Replace with:

```svelte
  <div data-tour="cal-grid" class="px-2 pt-2 relative" bind:this={gridWrapper} use:swipeX={{ onLeft: onNextMonth, onRight: onPrevMonth, ignore: () => dragging }}>
```

- [ ] **Step 6: Gates**

Run:

```bash
pnpm type-check 2>&1 | grep -c "error TS"
npx -y svelte-check@4 2>&1 | tail -1
```

Expected: `26` and a summary line with `92 ERRORS` (warnings may stay at their current count; the new `$effect` and handlers must add no error). If svelte-check reports a NEW error in `CalendarMobileMonth.svelte`, fix it — do not touch the budget.

- [ ] **Step 7: Start the dev server**

```bash
(pnpm dev --port 4655 > scratchpad/dev4655.log 2>&1 &)
for i in $(seq 1 40); do sleep 1; curl -s -o /dev/null -w "%{http_code}" http://localhost:4655/login | grep -q 200 && break; done
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4655/login   # 200
```

- [ ] **Step 8: Log in through the gate bounce (password never printed)**

```bash
playwright-cli -s=drag open "http://localhost:4655/calendar" > /dev/null 2>&1
playwright-cli -s=drag snapshot | grep -E 'textbox "E-Mail"|textbox "Passwort|button "anmelden"'
```

Note the three `[ref=eN]` values, then (email first, password LAST with output suppressed, then submit, then a URL check — never snapshot while the password field is filled):

```bash
playwright-cli -s=drag fill <emailRef> admin@mahalle-dev.test > /dev/null 2>&1
PWFILE=scratchpad/devpw.txt; [ -s "$PWFILE" ] || PWFILE=~/.claude/projects/-home-atakee-projects-fullstack-community-webApp-astro---v-3/scratchpad/devpw.txt
playwright-cli -s=drag fill <pwRef> "$(cat "$PWFILE")" > /dev/null 2>&1
playwright-cli -s=drag click <anmeldenRef> > /dev/null 2>&1
playwright-cli -s=drag run-code "async page => page.url()" 2>&1 | grep -A1 "### Result"
```

Expected: `http://localhost:4655/calendar`. If it is still `/login`, immediately `playwright-cli -s=drag fill <pwRef> ""` and stop — report BLOCKED (wrong seed password; the orchestrator reseeds).

- [ ] **Step 9: Write the touch-drag probe**

Create `scratchpad/touch-drag.js` (gitignored):

```js
async page => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForSelector('[data-cell-date]', { timeout: 10000 });
  await page.evaluate(() => { document.getElementById('kiosk-splash')?.remove(); sessionStorage['mahalle-splash-shown'] = '1'; });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });

  // Two future days. Same month as today when possible; otherwise step to
  // the next month and use its 3rd..6th.
  const off = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
  let from = off(3), to = off(6);
  if (to.getMonth() !== new Date().getMonth()) {
    // The arrow exists twice (mobile hero + hidden desktop block) — take the visible one.
    await page.getByRole('button', { name: /nächster monat|next month/i }).locator('visible=true').first().click();
    await page.waitForTimeout(500);
    from = new Date(to.getFullYear(), to.getMonth(), 3); to = new Date(to.getFullYear(), to.getMonth(), 6);
  }
  const a = page.locator(`[data-cell-date="${from.toISOString()}"]`);
  const b = page.locator(`[data-cell-date="${to.toISOString()}"]`);
  await a.scrollIntoViewIfNeeded();
  const ra = await a.boundingBox(), rb = await b.boundingBox();
  if (!ra || !rb) throw new Error('cells not found');
  let ax = ra.x + ra.width / 2, ay = ra.y + ra.height * 0.3;   // above the dot row
  let bx = rb.x + rb.width / 2, by = rb.y + rb.height * 0.3;
  // The sticky masthead can sit over the top rows after scrollIntoView —
  // the touch would land on the header, not the cell. Nudge and re-measure.
  const hitAnchor = async () => page.evaluate(([x, y, iso]) => document.elementFromPoint(x, y)?.closest('[data-cell-date]')?.getAttribute('data-cell-date') === iso, [ax, ay, from.toISOString()]);
  if (!(await hitAnchor())) {
    await page.evaluate(() => window.scrollBy(0, -120));
    await page.waitForTimeout(300);
    const ra2 = await a.boundingBox(), rb2 = await b.boundingBox();
    ax = ra2.x + ra2.width / 2; ay = ra2.y + ra2.height * 0.3; bx = rb2.x + rb2.width / 2; by = rb2.y + rb2.height * 0.3;
    if (!(await hitAnchor())) throw new Error('anchor cell is covered — check scroll position / masthead');
  }
  const monthBefore = await page.evaluate(() => document.querySelector('[data-tour="cal-month-nav"]')?.textContent?.trim());
  const scrollBefore = await page.evaluate(() => window.scrollY);

  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: ax, y: ay }] });
  await page.waitForTimeout(650);                                      // > 450 ms long-press
  const pinAtPress = await page.locator('.k-cal-pin').count();
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: ax + (bx - ax) * i / 8, y: ay + (by - ay) * i / 8 }] });
    await page.waitForTimeout(40);
  }
  const pinWhileDragging = await page.locator('.k-cal-pin').count();
  const stripedWhileDragging = await page.evaluate(() => document.querySelectorAll('[data-cell-date].bg-wine\\/10').length);
  await page.screenshot({ path: 'scratchpad/touch-drag-mid.png' });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);

  const pinAfter = await page.locator('.k-cal-pin').count();
  const pinText = pinAfter ? await page.locator('.k-cal-pin').innerText() : null;
  const stripedAfter = await page.evaluate(() => document.querySelectorAll('[data-cell-date].bg-wine\\/10').length);
  const monthAfter = await page.evaluate(() => document.querySelector('[data-tour="cal-month-nav"]')?.textContent?.trim());
  const scrollAfter = await page.evaluate(() => window.scrollY);
  await page.screenshot({ path: 'scratchpad/touch-drag-after.png' });
  return { from: from.toDateString(), to: to.toDateString(), pinAtPress, pinWhileDragging, stripedWhileDragging, pinAfter, pinText, stripedAfter, monthBefore, monthAfter, scrollBefore, scrollAfter };
}
```

- [ ] **Step 10: Run the probe and check every value**

```bash
playwright-cli -s=drag run-code "$(cat scratchpad/touch-drag.js)" 2>&1 | grep -A2 "### Result"
```

Expected (all must hold):
- `pinAtPress: 1` — long-press still opens the pin on the anchor.
- `pinWhileDragging: 0` — pin hidden while the range stretches.
- `stripedWhileDragging: 4` and `stripedAfter: 4` — from..to inclusive (4 days).
- `pinAfter: 1` and `pinText` contains both day numbers (DE renders `14.–17. September`-style; EN `Sep 14–17`).
- `monthBefore === monthAfter` — the horizontal travel did not swipe the month. This is the check that proves the `swipeX` `ignore` option works; if the month flipped, the `ignore` read `dragging` as `false` — verify `endDrag` still clears the flag only in the delegated handler and that `ignore` is passed on the wrapper.
- `scrollAfter === scrollBefore` — the drag did not scroll the page.

Look at `scratchpad/touch-drag-mid.png` (4 striped cells, anchor outlined, far end filled, no pin) and `scratchpad/touch-drag-after.png` (pin on the far end). If any value is off, fix the component and re-run (`open` is not needed again while the session is alive).

- [ ] **Step 11: Regression probe — plain tap and plain scroll still work**

```bash
playwright-cli -s=drag run-code "$(cat <<'EOF'
async page => {
  const cdp = await page.context().newCDPSession(page);
  // Plain tap on a future in-month day: selects it, no pin.
  const off = (n) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() + n); return d; };
  const target = off(1);
  const cell = page.locator(`[data-cell-date="${target.toISOString()}"]`);
  const box = await cell.boundingBox();
  if (!box) return { skipped: 'day+1 not in visible month; step the month back first' };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width/2, y: box.y + box.height*0.3 }] });
  await page.waitForTimeout(80);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
  const pinAfterTap = await page.locator('.k-cal-pin').count();
  // Plain vertical swipe over the grid still scrolls the page.
  const before = await page.evaluate(() => window.scrollY);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: 500 }] });
  for (let i = 1; i <= 6; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 195, y: 500 - i * 40 }] }); await page.waitForTimeout(30); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.scrollY);
  return { pinAfterTap, scrolled: after > before };
}
EOF
)" 2>&1 | grep -A2 "### Result"
```

Expected: `pinAfterTap: 0`, `scrolled: true`.

- [ ] **Step 12: Tear down**

```bash
playwright-cli -s=drag close > /dev/null 2>&1
fuser -k 4655/tcp > /dev/null 2>&1
```

- [ ] **Step 13: Commit**

```bash
git add src/lib/swipe.ts src/components/calendar/kiosk/mobile/CalendarMobileMonth.svelte
git commit -m "feat(calendar): long-press then drag stretches a range on the phone month grid"
git log -1 --format=%B
```

---

### Task 3: Copy (guidance + tour, DE/EN) and area docs

**Files:**
- Modify: `src/lib/kiosk-i18n.ts` (DE `cal.mobile.guidance` ~line 581, DE `tour.cal.s3.bodyMobile` ~line 1939, EN `cal.mobile.guidance` ~line 2505, EN `tour.cal.s3.bodyMobile` ~line 3811)
- Modify: `src/components/calendar/kiosk/CLAUDE.md` (the "Mobile month grid: tap selects, long-press creates" bullet)

**Interfaces:**
- Consumes: the behavior shipped in Task 2. No code interfaces.

- [ ] **Step 1: Guidance copy under the grid**

Find (DE):

```ts
  'cal.mobile.guidance':
    'Tippe auf einen Tag, um seine Termine zu sehen. Halte einen Tag gedrückt, um dort einen Termin anzulegen — tippe danach auf einen anderen Tag für einen Zeitraum.',
```

Replace with:

```ts
  'cal.mobile.guidance':
    'Tippe auf einen Tag, um seine Termine zu sehen. Halte einen Tag gedrückt, um dort einen Termin anzulegen — zieh weiter (oder tippe danach auf einen anderen Tag) für einen Zeitraum.',
```

Find (EN):

```ts
  'cal.mobile.guidance':
    'Tap a day to see its events. Hold a day to add an event there — then tap another day for a range.',
```

Replace with:

```ts
  'cal.mobile.guidance':
    'Tap a day to see its events. Hold a day to add an event there — keep dragging (or tap another day afterwards) for a range.',
```

- [ ] **Step 2: Tour copy**

Find (DE):

```ts
  'tour.cal.s3.bodyMobile': 'Halte einen Tag gedrückt — dort beginnt dein Termin. Titel, Zeit, Ort — mehr braucht es fürs Erste nicht.',
```

Replace with:

```ts
  'tour.cal.s3.bodyMobile': 'Halte einen Tag gedrückt — dort beginnt dein Termin; zieh weiter, wenn er mehrere Tage dauert. Titel, Zeit, Ort — mehr braucht es fürs Erste nicht.',
```

Find (EN):

```ts
  'tour.cal.s3.bodyMobile': 'Hold a day — your event starts there. Title, time, place — that’s all it takes to begin.',
```

Replace with:

```ts
  'tour.cal.s3.bodyMobile': 'Hold a day — your event starts there; keep dragging if it spans several days. Title, time, place — that’s all it takes to begin.',
```

(The EN apostrophe is the typographic `’` already in the file — keep it.)

- [ ] **Step 3: Verify both locales render the new copy**

```bash
grep -n "zieh weiter" src/lib/kiosk-i18n.ts | wc -l     # 2
grep -n "keep dragging" src/lib/kiosk-i18n.ts | wc -l   # 2
pnpm type-check 2>&1 | grep -c "error TS"               # 26
```

- [ ] **Step 4: Area docs**

In `src/components/calendar/kiosk/CLAUDE.md`, find the sentence at the end of the "Mobile month grid: tap selects, long-press creates" bullet:

```
Drag-to-select a range on touch was considered and parked — a finger drag over the grid is page scroll, taking it over after a long-press is ~40 lines plus a real-device test.
```

Replace with:

```
**Touch drag (2026-09-11)**: once the long-press fires, the same finger can keep moving to stretch the range — pointer capture on the anchor cell, `elementFromPoint` per pointermove, end resolved by the pure `resolveDragEnd()` (`src/lib/calendar/rangeDrag.ts`, unit-tested with `npx tsx src/lib/calendar/rangeDrag.test.ts`: off-grid/out-of-month keeps the previous end, past clamps to today, back on the anchor = single day). A non-passive `touchmove` listener on the wrapper `preventDefault`s ONLY while `dragging` (otherwise the browser's pan would `pointercancel` the drag; plain touches keep native scrolling), the pin hides while a range is being stretched and reappears at the far end on release, the wrapper's `swipeX` gets `ignore: () => dragging` so a horizontal drag never flips the month (a `stopPropagation` in the cell handler could NOT do this — Svelte 5 delegates `pointerup` to the root, so the action's native wrapper listener fires first; the flag is therefore cleared only in the delegated `endDrag`), and `contextmenu` is suppressed after a long-press. No travel keeps the anchor armed, so tap-to-extend still works. Verified headless via CDP `Input.dispatchTouchEvent` (touchStart → 650 ms → touchMove steps → touchEnd; `page.touchscreen` can only tap).
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/kiosk-i18n.ts src/components/calendar/kiosk/CLAUDE.md
git commit -m "docs(calendar): touch-drag copy DE/EN and area notes"
git log -1 --format=%B
```

---

## After the plan (orchestrator, not a task)

- Full gates once more on the final tree (`26` / `92`), then hand to the user: „merge and push" is the user's call. Real-device check is the user's (Android + iOS Safari: long-press, drag across a row, release; then a plain vertical scroll over the grid).
- Memory/handoff: the parked item in `project_open_followups.md` and `.remember/remember.md` closes.
