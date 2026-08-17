# Air-Staleness Notice (Messnetz-Störung) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When BLUME serves outdated air data (station network disruption), the Kiez-Daten instrument strip stops claiming "LIVE" and instead shows a disruption notice with the age of the last reading.

**Architecture:** No new API, no scraping of BLUME's Störung banner — staleness is derived client-side from the measurement timestamp the strip already receives (`air.datetime`): older than 6h ⇒ stale. The existing `ready` branch of `KzInstrumentStrip.svelte` gets a stale variant (mute dot, „STÖRUNG" label, ochre note line); the existing `off` state (fetch failure) is untouched. Two i18n key pairs (DE/EN) in `kiosk-i18n.ts`.

**Tech Stack:** Svelte 5 runes, kiosk i18n (`t`/`tStr`), Tailwind + kiosk CSS vars.

**Spec:** This plan IS the spec (user request 2026-08-17: "if our system detects a Störung in BLUME, our UI displays that the data is old"; wording delegated to us). Context: live incident — luftdaten.berlin.de frozen since 14 Aug 22:00 CEST with an official „Störung in der Datenübertragung" notice; our strip currently shows a green LIVE dot beside the frozen timestamp.

## Global Constraints

- **Detection is timestamp-based, never banner-scraping:** stale ⇔ `Date.now() - Date.parse(air.datetime) > 6h`. Catches every cause (their outage, their API lying, our proxy caching), not just this incident. Threshold constant `STALE_MS = 6 * 3_600_000` lives in `KzInstrumentStrip.svelte` (BLUME publishes hourly; 6h absorbs normal multi-hour hiccups without flapping).
- **The `off` state (§04, fetch failure) is NOT touched** — stale is a variant of the `ready` branch only (`airStatus === 'ready' && air` present but old).
- **i18n:** both DE and EN keys, added next to the existing `kiez.strip.*` keys in `src/lib/kiosk-i18n.ts`. No color words in user-facing copy (established rule — describe by meaning, not color names).
- **Colors:** only tokens already used in this component — `var(--k-ochre)` for the disruption label/note, `var(--k-ink-mute)` for the dot (same as the off state's dot). No new tokens.
- **Files touched:** exactly `src/components/kiez/kiosk/KzInstrumentStrip.svelte` and `src/lib/kiosk-i18n.ts` (Task 1), plus `src/components/kiez/CLAUDE.md` (Task 2). Nothing else.
- **Test cycle** (no component-test framework): `pnpm type-check 2>&1 | grep -c "error"` must equal the pre-existing baseline (record it in Task 1 Step 1; was 37 on 2026-08-16) + `pnpm build` green + Task 2 browser verification. `/schillerkiez` is public — no auth state needed.
- **Do not touch port 3000** (user's dev server). For browser checks use port 4655 only after `ss -tlnp | grep 4655` shows it free; tear down with `pkill -f "astro dev --port 4655"`.
- **Commit style:** simple/concise message, NO AI signature, NO Co-Authored-By footer. Stage only the named files.

---

### Task 1: Stale variant in KzInstrumentStrip + i18n keys

**Files:**
- Modify: `src/components/kiez/kiosk/KzInstrumentStrip.svelte` (script ~line 16-20, live branch ~lines 101-112)
- Modify: `src/lib/kiosk-i18n.ts` (DE + EN `kiez.strip.*` blocks — locate with `grep -n "kiez.strip.live" src/lib/kiosk-i18n.ts`)

**Interfaces:**
- Consumes: existing props `{ air: AirQualityResponse | null, airStatus, history }`; `air.datetime` is the measurement's ISO timestamp (already rendered via `formatAirTs`).
- Produces: no interface changes — purely internal render variant. Task 2 relies on the strings `kiez.strip.disrupted` and `kiez.strip.staleNote` existing in both locales.

- [ ] **Step 1: Record the type-check baseline**

Run: `pnpm type-check 2>&1 | grep -c "error"` — note the number; later checks must not exceed it.

- [ ] **Step 2: Add the stale derive to the script block**

In `KzInstrumentStrip.svelte`, after the `intlLocale` derive (~line 18), add:

```ts
// Störung detection (2026-08 BLUME freeze): the live API can serve a 200
// with an old measurement — a green LIVE badge next to a days-old
// timestamp is a lie. Timestamp-based, never banner-scraping: catches
// their outage, their API lying, and our proxy caching alike. BLUME
// publishes hourly; 6h absorbs normal hiccups without flapping.
const STALE_MS = 6 * 3_600_000;
const isStale = $derived(
  !!air && Date.now() - Date.parse(air.datetime) > STALE_MS
);
```

- [ ] **Step 3: Make the live branch stale-aware**

In the `{:else if air}` branch, replace the dot + label lines (currently):

```svelte
<span class="kz-live-dot inline-block h-[7px] w-[7px] rounded-full bg-[var(--k-success)]"></span>
{$t['kiez.strip.station']} · {$t['kiez.strip.live']}
```

with:

```svelte
<span
  class="inline-block h-[7px] w-[7px] rounded-full {isStale ? 'bg-[var(--k-ink-mute)]' : 'kz-live-dot bg-[var(--k-success)]'}"
></span>
{$t['kiez.strip.station']} · {isStale ? $t['kiez.strip.disrupted'] : $t['kiez.strip.live']}
```

Then, directly AFTER the headline `<div class="{headlineLiveClass}">…</div>` (still inside the left block `<div class="{leftClass}">`), add the notice line:

```svelte
{#if isStale}
  <div class="mt-1 max-w-[420px] font-dmmono text-[10px] leading-relaxed text-[var(--k-ochre)]">
    {tStr($t['kiez.strip.staleNote'], { ts: formatAirTs(air.datetime) })}
  </div>
{/if}
```

(`tStr` is already imported in this file. The grade tiles and sparkline stay untouched — they show the last known values, which the note now dates honestly.)

- [ ] **Step 4: Add the i18n keys**

In `src/lib/kiosk-i18n.ts`, next to the existing `'kiez.strip.live'` key in the **DE** block, add:

```ts
'kiez.strip.disrupted': 'STÖRUNG',
'kiez.strip.staleNote':
  'Messnetz gestört — die Berliner Stationen liefern zurzeit keine neuen Daten. Letzter Messwert: {ts}. Sobald das Messnetz wieder sendet, erscheinen hier neue Werte.',
```

And next to `'kiez.strip.live'` in the **EN** block, add:

```ts
'kiez.strip.disrupted': 'DISRUPTED',
'kiez.strip.staleNote':
  'Measurement network disrupted — the Berlin stations are currently not delivering new data. Last reading: {ts}. New readings will appear here once the network is back.',
```

- [ ] **Step 5: Verify**

Run: `pnpm type-check 2>&1 | grep -c "error"` → must equal Step 1 baseline.
Run: `pnpm build 2>&1 | tail -3` → green.

- [ ] **Step 6: Commit**

```bash
git add src/components/kiez/kiosk/KzInstrumentStrip.svelte src/lib/kiosk-i18n.ts
git commit -m "feat: kiez air strip shows Störung notice when BLUME data is stale (>6h)"
```

---

### Task 2: Browser verification + docs

**Files:**
- Modify: `src/components/kiez/CLAUDE.md` (orchestrator/states bullet + air-quality bullet)

**Interfaces:**
- Consumes: Task 1's shipped behavior. The REAL BLUME outage is live right now (frozen 14 Aug 22:00 CEST) — production conditions, so the stale state will render on any fresh fetch without mocking.

- [ ] **Step 1: Start a throwaway dev server**

`ss -tlnp | grep 4655` (must be free) → `pnpm dev --port 4655` in background → poll `curl -s -o /dev/null -w "%{http_code}" http://localhost:4655/schillerkiez --max-time 5` until 200 (first compile can take ~30s).

- [ ] **Step 2: Verify the stale state renders (desktop 1280×800)**

playwright-cli: open `http://localhost:4655/schillerkiez` (public, no auth). The islands are client-hydrated — wait for the strip (`page.waitForSelector` on text `MESSSTATION`-region or re-snapshot after a delay). Expect in the strip: NO pulsing live label; „STÖRUNG" after the station name; the ochre note line with „Messnetz gestört … Letzter Messwert: 14.08. · 22:00 …"; grade tiles + sparkline still visible. Toggle EN (nav locale pill): note reads "Measurement network disrupted … Last reading: 14 Aug · 22:00 …".

If BLUME resumed between planning and execution (note timestamp newer than 6h ago): the strip will correctly show LIVE — then verify the stale branch by temporarily testing with a lowered threshold ONLY in the browser console (e.g. re-evaluate the date math manually); do NOT commit any threshold change. Record which path you verified.

- [ ] **Step 3: Mobile spot-check (390×844)**

Same page: strip wraps (flex-wrap), note line must not overflow the dark strip container (it's `max-w-[420px]`, container is full-width — confirm no horizontal scroll on the page body).

- [ ] **Step 4: Teardown**

`playwright-cli close` and `pkill -f "astro dev --port 4655"` — even on failure.

- [ ] **Step 5: Update docs**

In `src/components/kiez/CLAUDE.md`:
- In the "Orchestrator + states contract" bullet, extend the state inventory sentence with: `§04b stale-live (ready but measurement older than 6h → „STÖRUNG" label + ochre note in the strip, values stay visible and dated; detection is timestamp-based in KzInstrumentStrip, never scraped from BLUME's banner)`.
- In the data-pipeline "Air quality" bullet, append one sentence: the strip flags readings older than 6h as a Messnetz-Störung (first real occurrence: citywide BLUME freeze 14–17+ Aug 2026).

- [ ] **Step 6: Commit**

```bash
git add src/components/kiez/CLAUDE.md
git commit -m "docs: kiez air strip stale-live state (§04b)"
```
