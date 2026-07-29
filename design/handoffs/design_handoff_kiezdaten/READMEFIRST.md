# READ ME FIRST — Kiez-Daten pass (Batch 3, LAST surface)

Hi Claude Code. This package is the **Editorial Kiosk** redesign of Mahalle's Schillerkiez
data dashboard: **route `/schillerkiez`** — instrument strip (live air) · broadsheet index
with global PLR selector · Kanäle 01–05 (Bevölkerung / Alter / Vielfalt / Soziale Lage /
Soziale Entwicklung) · 5 novel modules · 7-state matrix. Desktop + mobile, **DE + EN full
parity everywhere**.

This is the **8th and final surface** of the Kiosk rollout. Forum, Calendar, Marketplace,
Newsboard and Profile are shipped in code; Auth and Admin are designed. The design system,
paper grain, riso shadows and the `--carved-accent` per-page variable are live. **You are
applying the existing system, not bootstrapping one.**

---

## ⚑ FOUR FLAGS — read these before anything else

1. **Messwert-Logger is a BACKEND ENABLER, not decoration (novel §00).** The user
   explicitly wants air-quality *history* (7-day strip, gap handling, weekly means for the
   Zahl der Woche). **That history does not exist anywhere in the backend today** — the
   BLUME API (`luftdaten.berlin.de/api/lqis/data`, station mc042) serves the current
   instant only, and `/api/kiez-air` just caches it 30 min. You must build a small logger:
   cron every 30 min → append to a new Mongo collection `schillerkiez_air_log` → daily
   rollup (max + mean) → retention hourly 90 d / daily forever. Gaps > 6 h render as
   **dashed empty bars — NEVER interpolate**. Every `†` footnote in the designs points at
   this item. Without it, ship the strip without the 7-day sparkline — do not fake it.

2. **Berlin-Vergleich needs reference data that isn't imported yet (novel §02).** The
   dumbbell chart compares Kiez vs. Bezirk Neukölln vs. Berlin. AfS/MSS publish those
   reference figures, but `scripts/sync-stats.ts` currently imports only the 4 Schillerkiez
   PLRs. Extend the import to also read Berlin-total + Neukölln-district rows → new
   collection `schillerkiez_reference` → **additive** response field
   `reference?: { berlin, neukoelln }` on `/api/kiez-stats`. If the reference is missing,
   the module is **quietly absent** (same behaviour as air). No new infrastructure.

3. **Every number in the seeds is INVENTED.** Realistic, AfS/MSS-shaped, but made up:
   pop 25.900, ALQ 8,9 %, Kinderarmut 38,2 %, Transfer 24,6 %, LQI 2, all trends, the
   Zahl der Woche — everything in `KZ_DATA` / `KD_SEED`. **Do not copy a single figure
   into production.** Real values come from the actual sync + BLUME at implementation.
   The seeds exist only so the layouts show true-to-life densities and digit counts.

4. **This is a REBUILD of `KiezDashboard.svelte`, not a reskin.** The current component is
   a **981-line single file** built around dark-glass horizontal carousels. The design
   replaces carousels with a broadsheet vertical flow driven by one global PLR selector —
   the information architecture changes, not just the paint. Strong recommendation: split
   into per-Kanal components (`KzInstrumentStrip`, `KzSelector`, `KzKanalPop`, `KzKanalAge`,
   `KzKanalMig`, `KzKanalSocial`, `KzKanalSocTrend`, `KzFooter`) mirroring the JSX files,
   instead of growing the monolith.

---

## What's in this folder

```
design_handoff_kiezdaten/
  READMEFIRST.md                  ← you are here
  KIEZDATEN_SCOPING.md            ← full spec: anatomy, Kanäle, novel modules, states, schema impact
  Mahalle Redesign.html           ← self-contained bundle of the whole canvas (open in a browser)
  tokens-kiezdaten.css            ← moss accent, PLR series colors, LQI ramp, logger/freshness knobs
  motion-kiezdaten.css            ← skeleton sweep, live-dot pulse, chart draw-in spec, reduced motion
  jsx/
    kiosk-system.jsx              ← base design system (already in your context — reference copy)
    kiosk-kiezdaten-explore.jsx   ← MUST LOAD FIRST — exports the wobble helpers kdWobLine /
                                    kdWobRect + KDMap (real LOR-2021 PLR polygons) + KD_SEED.
                                    Also holds the decided exploration boards (reference only).
    kiosk-kiezdaten.jsx           ← KZ_DATA seeds · chart atoms (KZBar/KZLine/KZGrid/KZDonut) ·
                                    KZInstrumentStrip · KZTitle (+ Zahl der Woche) · KZSelector ·
                                    KZKanal 01–05 · KZFooter · KiezIndexDesktop {lang, plr}
    kiosk-kiezdaten-mobile.jsx    ← KiezIndexMobile (390px)
    kiosk-kiezdaten-novel.jsx     ← 5 modules: §00 Messwert-Logger · §01 Zahl der Woche ·
                                    §02 Berlin-Vergleich · §03 Datenarchiv A4 · §04 Anwohner-Kontext
    kiosk-kiezdaten-states.jsx    ← 7-state matrix (desktop + mobile) + kzSweep/kzPulse CSS
```

**The JSX is the source of truth for layout + copy.** Read it directly — that worked best
on all seven prior surfaces. The `.css` files give you tokens and keyframes; the `.jsx`
gives you exact structure, spacing, chart geometry and both-language strings. As with
Auth/Admin/Profile: wire values through the established `--k-*` pattern — the CSS files
are spec, not drop-ins.

---

## Step-by-step

**Step 0 — Look at it.** Open `Mahalle Redesign.html`. The top three canvas sections are
this pass: index (DE / EN / PLR-selected / mobile), novel features, state matrix. The
„ENTSCHIEDEN“ exploration section below them is kept for reference only — do not build it.

**Step 1 — Read `KIEZDATEN_SCOPING.MD`** end to end, especially §14 (backend/schema
impact) and §15 (open questions).

**Step 2 — Wire the tokens.** Add `tokens-kiezdaten.css` + `motion-kiezdaten.css` values.
`--carved-accent` on this page = **moss `#6b8a4a`** (the last free primary). Emit
`data-page` for `/schillerkiez` as the layout already does for other surfaces.

**Step 3 — Backend first (the enablers):**
1. Messwert-Logger (flag 1) — cron + `schillerkiez_air_log` + rollup + gap rule.
2. Reference import (flag 2) — `schillerkiez_reference` + additive response field.
3. Both are independent of the UI rebuild and can land as their own PRs.

**Step 4 — Build the page, in JSX dependency order:**
1. `kiosk-system.jsx` — already in your context.
2. `kiosk-kiezdaten-explore.jsx` — take ONLY `kdWobLine`, `kdWobRect`, `KDMap` (the chart
   hand + the PLR mini-map). Ignore the exploration boards.
3. `kiosk-kiezdaten.jsx` — instrument strip, title + Zahl der Woche, PLR selector,
   Kanäle 01–05, footer. Note: **Kanal 05 renders only when the selector is on Gesamt.**
4. `kiosk-kiezdaten-mobile.jsx` — 390px stack.
5. `kiosk-kiezdaten-states.jsx` — the 7-state contract (see scoping §13).
6. `kiosk-kiezdaten-novel.jsx` — §01 Zahl der Woche share flow, §03 print route
   `/schillerkiez/druck`, §04 Anwohner-Kontext chips. (§00/§02 are Step 3.)

**Step 5 — Print route.** `/schillerkiez/druck` = pure print-CSS A4, 2 riso colors
(ink + moss), QR generated locally (same mechanics as the Profile Steckbrief), Stand-Datum
mandatory on the sheet. Entry: the „⎙ Kiez in Zahlen · A4 drucken“ footer button.

---

## Non-negotiables (don't regress these)

- **Air and stats are independent sources.** A `/api/kiez-stats` failure never hides the
  instrument strip, and a silent BLUME never breaks the page. **The legacy behaviour —
  air section vanishing wordlessly — is replaced** by state §04: the strip stays, says
  „Die Station meldet sich nicht.“ and shows the last logged reading (via the logger).
- **Never interpolate measurement gaps.** Dashed empty bars + a caption naming the pause.
- **No 0%-bars for missing data.** A PLR without social data gets the honest serif blank
  („Für diesen Planungsraum liegen keine Sozialdaten vor.“) inside the kept Kanal frame.
- **The LOR-2021 merge stays visible.** Kanal 05 uses the existing `mergeSocialPlrTrend`
  virtual series (old codes 08010117/08010118 → averaged successors) with the dashed
  „LOR 2021“ boundary marker in-chart AND the Gebietsreform footnote. Continuous lines,
  honest break marker — never hide the reform.
- **Migration segments are non-overlapping** (foreignNationals / germanWithMigBg /
  withoutMigBg) — the donut says so in its caption. Don't re-introduce overlap math.
- **Status/Dynamik keep the „(*)“ MSS-methodology footnote** (exists in legacy — keep).
- **PLR series colors are fixed:** Gesamt = moss · Schillerpromenade N = teal ·
  S = wine · Wartheplatz = ochre · Silbersteinstraße = plum. One selector drives ALL
  Kanäle — no per-Kanal area switches.
- **Chart hand = „Mischung“:** precise hairline axes + grid carry the truth; only the
  data marks (bars, lines, donut) get the riso wobble + offset double-strike. Axes are
  never wobbled.
- **Loading is a layout-mirroring skeleton** (instrument strip + Kanal blocks, kzSweep).
  No spinner, no emoji — replaces legacy's 6 pulse cards.
- **Zahl der Woche shares through the normal pipeline:** `/topics/create` pre-filled,
  counts against the 5/day forum quota, normal AI moderation. No special endpoint.
- **Anwohner-Kontext is asymmetric** (like Kurier heat): the dashboard links to forum
  threads; the forum knows nothing about the dashboard. Threads must be > 1 h old;
  0 matches ⇒ no chips, never empty shells.
- **The as-of line („STAND 31.12.2025“) is always visible**, and state §07 adds the warn
  line when `lastUpdated` > 8 months — page stays fully usable.
- **Sources line stays:** „Amt für Statistik Berlin-Brandenburg · Monitoring Soziale
  Stadtentwicklung · BLUME-Messnetz (mc042)“.
- **Curly quotes in German strings.** Opener `„` (U+201E) + closer `“` (U+201C). Straight
  ASCII `"` breaks Babel and is wrong typography. The JSX here is lint-checked clean;
  keep it that way.
- **DE + EN parity** on every screen of this pass — including states and novel modules.
- **Hit targets ≥ 44px on mobile** (PLR chips row scrolls; buttons meet the minimum).

---

## Out of scope for this pass

- **youth_unemployment** — in the DB but not in the API; stays unexposed.
- **Forecasting / projections** — the page reports, it doesn't predict.
- **Per-pollutant history charts** — the logger stores per-pollutant values, but v1 shows
  only the LQI 7-day strip; finer views are a later iteration.
- **Admin tooling for the Zahl-der-Woche menu** — the menu is a fixed code-side list.
- **New nav work** — „Kiez Data“ tab label/position unchanged.
- **PDF backend** — the Datenarchiv is print-CSS only, like the Steckbrief.

When in doubt about app behaviour, read from `main` — the grounding for this pass was
`src/components/kiez/KiezDashboard.svelte`, `src/types/kiezStats.ts`, `plrPaths.ts`,
`/api/kiez-stats`, `/api/kiez-air`, and `scripts/sync-stats.ts`.
