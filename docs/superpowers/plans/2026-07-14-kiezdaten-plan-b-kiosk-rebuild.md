# Kiez-Daten Plan B — /schillerkiez Kiosk Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/schillerkiez` from the 1023-line dark-glass carousel monolith into the Editorial-Kiosk "Messstation" broadsheet — instrument strip, global PLR selector, Kanäle 01–05, Zahl der Woche, Berlin-Vergleich, Anwohner-Kontext, 7-state matrix, `/schillerkiez/druck` print route — plus a data-correctness fix the design surfaced (MSS S-column mapping).

**Architecture:** One `KioskLayout` page mounting a single Svelte 5 orchestrator island (`KiezPageInner`, `client:load` — SSR renders the skeleton, island fetches client-side with seq-guards; the designed state matrix §01–§07 IS the loading/error contract). Pure view-model + wobble + Zahl-der-Woche libs under `src/lib/kiez/` (tsx-assert testable). Per-Kanal components under `src/components/kiez/kiosk/`. Air (`/api/kiez-air` + `/api/kiez-air-history`) and stats (`/api/kiez-stats`) stay independent sources. Anwohner-Kontext is a new server lib + 24h-cached public endpoint. Print route is server-rendered with a locally generated QR (Steckbrief mechanics).

**Tech Stack:** Astro 5 (server output), Svelte 5 runes islands, existing kiosk design system (`--k-*` tokens, `kiosk-i18n.ts`), MongoDB direct driver, `qrcode` (already a dep), `date-fns` `getISOWeek`, playwright-cli for UI verification. No new dependencies.

## Global Constraints

- **JSX is the source of truth for layout + copy.** Files: `design/handoffs/design_handoff_kiezdaten/jsx/kiosk-kiezdaten.jsx` (desktop index: strip, title+ZdW, selector, Kanäle 01–05, footer), `kiosk-kiezdaten-mobile.jsx` (390px stack), `kiosk-kiezdaten-states.jsx` (7-state matrix + kzSweep/kzPulse CSS), `kiosk-kiezdaten-novel.jsx` (§01 ZdW share flow, §02 Berlin-Vergleich dumbbell, §03 A4 sheet, §04 Kontext chips), `kiosk-kiezdaten-explore.jsx` lines 46–78 ONLY (`KDMap`, `kdWobLine`, `kdWobRect` — ignore the exploration boards). Implementers transcribe structure, spacing, chart geometry, and DE/EN strings from these files.
- **Every figure in the JSX seeds (`KZ_DATA`/`KD_SEED`) is INVENTED.** Never copy a number into code, fixtures excepted where marked. All real values come from `/api/kiez-stats`, `/api/kiez-air`, `/api/kiez-air-history`.
- **Accent**: moss. `[data-page="schillerkiez"] { --k-accent: var(--k-moss) }` already exists in `src/styles/tokens.css:104` — reuse, don't re-add. Kickers + carved-italic title accents = moss. Do NOT touch semantic accents (live/pulse dots, grade ramps, danger/warn colors).
- **PLR series colors are FIXED**: Gesamt = moss `#6b8a4a` · `08100102` Schillerpromenade Nord = teal `#3f8f9f` · `08100103` Süd = wine `#b23a5b` · `08100104` Wartheplatz = ochre `#e8a53a` · `08100105` Silbersteinstraße = plum `#6f2f59`. One selector drives ALL Kanäle.
- **Chart hand = „Mischung"**: precise hairline axes/grid/tick labels (mono) — **axes are never wobbled**; only data marks (bars, lines, donut segments) get the seeded wobble (`kzWobLine`/`kzWobRect`) + offset double-strike (+2px x, +1.6px y, lower opacity).
- **Honesty rules (non-negotiable)**: never interpolate measurement gaps (dashed empty bars + caption naming the pause); no 0%-bars for missing data (§05 serif blank inside the kept Kanal frame); LOR-2021 merge stays visible (dashed in-chart „LOR 2021" marker + §-prefixed Gebietsreform footnote); migration segments non-overlapping + caption says so; Status/Dynamik keep the „(*) MSS-Systematik, s. Quellen" footnote; as-of line always visible; §07 warn line when `lastUpdated` > 8 months (page stays fully usable); sources line „Amt für Statistik Berlin-Brandenburg · Monitoring Soziale Stadtentwicklung · BLUME-Messnetz (mc042)".
- **Data facts** (verified): `households.singlePerson` is ALWAYS 0 in the DB (AfS publication lacks it, `sync-stats.ts:235`) — hide the Einpersonen-HH line when falsy, skip the ZdW figure. Status/Dynamik indices are NUMERIC in the DB — render numbers like the legacy dashboard does (the JSX seed strings „niedrig"/„+1" are inventions). Kanal 05 renders only for Gesamt on desktop; mobile ships the SIMPLIFIED K05 card from the mobile JSX (the scoping §07 "omitted on mobile" is superseded by the JSX — JSX wins).
- **Air and stats are independent**: a kiez-stats failure never hides the instrument strip; a silent BLUME never breaks the page (state §04 replaces the legacy silent vanish).
- **Zahl der Woche** shares through the normal pipeline: link to `/topics/create?prefill_title=…&prefill_body=…` (exact param names, confirmed in `ComposePageInner.svelte:60-95`). Counts against the 5/day quota, normal AI moderation, NO special endpoint. Rotation: ISO week seeds a pick from a fixed code-side menu; skip underivable figures deterministically.
- **Anwohner-Kontext is asymmetric** (dashboard → forum only, no forum-side changes), only threads > 1 h old, 0 matches ⇒ row without chips — never empty shells, never a "no discussions" placeholder.
- **i18n**: new `kiez.*` namespace in `src/lib/kiosk-i18n.ts` — every key in BOTH `de` and `en` (the `Dict = Record<keyof typeof de, string>` type enforces parity at compile time). German strings use curly quotes: opener `„` (U+201E), closer `“` (U+201C). Interpolation via the existing `tStr($t['key'], {var})`.
- **Svelte 5 discipline**: every variable an `$effect` reads as a guard MUST be `$state`; all fetches seq-guarded (`let seq = 0; const mySeq = ++seq; … if (mySeq !== seq) return;`); browser APIs (`matchMedia`, `window`) only inside `$effect`/`onMount` or behind `typeof window !== 'undefined'` (the island is `client:load` — its script RUNS during SSR).
- **Motion**: all animations pure CSS gated on `@media (prefers-reduced-motion: no-preference)` per `design/handoffs/design_handoff_kiezdaten/motion-kiezdaten.css` (kzSweep skeleton, kzPulse live dot — a dead station must NOT pulse, kzSwapIn PLR crossfade, kzStampIn, kzChipIn, kzBarIn/kzLineIn/kzDotIn draw-ins). Reduced motion = final state, no fallback animations.
- **Mobile**: hit targets ≥ 44px (PLR chip row is a ≥44px touch band even though chips are 30px tall — pad the row); chip rows scroll horizontally with `use:scrollFade` (`src/lib/scrollFade.ts`) + `.kiosk-scroll-fade` + `shrink-0` on pills.
- **Additive API stance**: `/api/kiez-stats`, `/api/kiez-air`, `/api/kiez-air-history` response shapes unchanged in this plan except Task 1's value corrections. The only new endpoint is `GET /api/kiez-kontext`.
- **Shared prod DB** (`CommunityWebApp-test`): Task 1's re-sync intentionally rewrites real 2023 rows (data fix). Any synthetic test fixtures carry `_tmpE2E: true`, tracked and deleted by `_id`, residual scan 0. Kontext testing uses REAL existing topics read-only.
- **Type-check baseline is exactly 29** (`pnpm type-check 2>&1 | grep -c "error TS"`). There is no svelte-check — every island change must be verified live in a browser (playwright-cli), not just compiled.
- **Dev server**: the user runs their own on :3000 — NEVER touch it. Verification servers on port **4399** (`pnpm dev --port 4399`), stopped when done.
- **Commits**: plain concise messages, NO AI signatures/footers, never `--no-verify`. Verification scripts at project root as `.verify-*.tmp.ts`, deleted before committing.
- **Sticky-bar/footer rule**: `KioskFooter` already provides ~146px clearance — no big spacers at page end (forum kiosk CLAUDE.md rule).
- **PLR selection is page-local state** (resets on reload) — no URL params, no new state infra (handoff §15 Q3, settled).

## Controller decisions baked into this plan (flag to the human if they look wrong)

1. **Task 1 data fix**: the MSS 2023 S-column mapping in `syncMSS`/`syncReference` is WRONG (verified against both 2023 files' Erläuterungen sheets on 2026-07-14: S2 = Kinder in alleinerziehenden Haushalten, S3 = Transferbezug, S4 = Kinderarmut — in ALL report years). Currently `child_poverty_rate` (2023) holds the single-parent share and `transfer_benefit_rate` holds actual Kinderarmut. Fixed + re-synced before any UI renders these labels.
2. **Berlin-Vergleich placement**: the index JSX omits it; it renders as a sub-block INSIDE Kanal 04 (below the indicator bars), only when the selector is on Gesamt (the reference yardstick compares kiez-wide values), quietly absent without `reference` data.
3. **Status/Dynamik rendered numerically** with the (*) footnote (matches legacy + real data; JSX class-label strings are seed inventions).
4. **Kanal 05 on mobile**: simplified single-chart card per the mobile JSX (JSX supersedes scoping §07's "omitted").

## File structure

```
scripts/sync-stats.ts                     MODIFY (Task 1) — S-column fix in syncMSS + syncReference
src/types/kiezStats.ts                    MODIFY (Task 1) — KiezSocialDoc field correction
src/styles/kiez.css                       NEW (Task 2) — kiezdaten tokens + motion keyframes
src/pages/schillerkiez.astro              REWRITE (Task 2) — KioskLayout + island
src/lib/kiosk-i18n.ts                     MODIFY (Tasks 2,4–10) — kiez.* namespace
src/components/kiez/kiosk/
  KiezPageInner.svelte                    NEW (Task 2) — orchestrator: fetches, states §01/02/03/07
  KzSkeleton.svelte                       NEW (Task 2) — state §01 layout-mirroring skeleton
  KzFooter.svelte                         NEW (Task 2) — sources + † + ⎙ print link
  primitives/KzBar.svelte                 NEW (Task 3)
  primitives/KzLine.svelte                NEW (Task 3)
  primitives/KzGrid.svelte                NEW (Task 3)
  primitives/KzDonut.svelte               NEW (Task 3)
  primitives/KzMap.svelte                 NEW (Task 3) — reuses src/components/kiez/plrPaths.ts
  KzInstrumentStrip.svelte                NEW (Task 4) — live/off/compact + 7-day sparkline (§04/§06)
  KzTitleBlock.svelte                     NEW (Task 5) — kicker/H1/dek/facts + ZdW stamp card
  KzSelector.svelte                       NEW (Task 6) — map + 5 chips, drives all Kanäle
  KzKanal.svelte                          NEW (Task 6) — Kanal frame (kicker, title, right meta)
  KzKanalPop.svelte                       NEW (Task 6) — Kanal 01
  KzKanalAge.svelte                       NEW (Task 6) — Kanal 02
  KzKanalMig.svelte                       NEW (Task 7) — Kanal 03
  KzKanalSocial.svelte                    NEW (Task 7) — Kanal 04 (+§05 noData, kontext chips slot, Berlin-Vergleich slot)
  KzKanalSocTrend.svelte                  NEW (Task 8) — Kanal 05 (LOR merge)
  KzBerlinVergleich.svelte                NEW (Task 8) — novel §02 dumbbell
src/lib/kiez/
  kzWobble.ts                             NEW (Task 3) — pure: kzRnd, kzWobLine, kzWobRect
  kiezViewModel.ts                        NEW (Task 3) — pure: buildKiezViewModel + mergeSocialPlrTrend port
  zdw.ts                                  NEW (Task 5) — pure: deriveZdw (ISO-week menu)
  kontext.ts                              NEW (Task 9) — server: keyword match + 24h cache
src/pages/api/kiez-kontext.ts             NEW (Task 9)
src/pages/schillerkiez/druck.astro        NEW (Task 10) — A4 print route
src/components/kiez/KiezDashboard.svelte  DELETE (Task 11) — legacy monolith
src/components/kiez/plrPaths.ts           KEPT — consumed by KzMap
CLAUDE.md, src/components/kiez/CLAUDE.md, README.md  MODIFY (Tasks 1, 11)
```

---

### Task 1: MSS S-column mapping fix + re-sync (data correctness first)

**Files:**
- Modify: `scripts/sync-stats.ts` (syncMSS ~lines 326–340 + row build ~396–415 + upsert ~427–439; syncReference ~lines 105–112)
- Modify: `src/types/kiezStats.ts` (`KiezSocialDoc`)
- Modify: `CLAUDE.md` (MSS column layout bullet in the Kiez Data section reference), `src/components/kiez/CLAUDE.md` (MSS column layout bullet, line 9)
- Modify: `.env` (refresh stale MSS URLs — NEVER staged)

**Interfaces:**
- Consumes: existing sync helpers; env `MSS_XLSX_URL`, `MSS_SDI_URL`, `MSS_BEZIRKE_XLSX_URL`, `MSS_PERIOD=2023`.
- Produces: corrected `schillerkiez_social` period-2023 docs (`child_poverty_rate` = S4/col7, `transfer_benefit_rate` = S3/col6, NEW optional `single_parent_children_rate` = S2/col5 for 2023+, `youth_unemployment_rate` REMOVED via `$unset`); corrected `schillerkiez_reference` docs. Downstream tasks render these under their real labels.

**Verified facts (2026-07-14, both 2023 XLSX Erläuterungen sheets):** S1=Arbeitslosigkeit (col4), S2=Kinder u. Jugendliche in alleinerziehenden Haushalten (col5), S3=Transferbezug (col6), S4=Kinderarmut U15 (col7). The pre-2023 mapping in the code (CP=7, TR=6) was already correct; the "2023+ layout" branch was a misreading. Expected corrected values: PLR `08100102` 2023 → alq 5.55, child_poverty 26.85, transfer 13.55; Bezirke NK → child_poverty 36.45, transfer 15.72.

- [ ] **Step 1: Refresh the stale MSS URLs in `.env`** (public URLs, not secrets; `.env` stays unstaged):

```
MSS_XLSX_URL=https://www.berlin.de/sen/stadt/_assets/stadtdaten/stadtwissen/monitoring-soziale-stadtentwicklung/bericht-2023/21indexind_anteile_plr_mss2023.xlsx
MSS_SDI_URL=https://www.berlin.de/sen/stadt/_assets/stadtdaten/stadtwissen/monitoring-soziale-stadtentwicklung/bericht-2023/1sdi_mss2023.xlsx
```
(Replace the existing stale `/sen/sbw/` values. `MSS_BEZIRKE_XLSX_URL` was added in Plan A and is already current.)

- [ ] **Step 2: Fix `syncMSS` column mapping** in `scripts/sync-stats.ts`. Replace the block at ~lines 327–333:

```ts
  // MSS S-column semantics — verified against the 2023 files' Erläuterungen
  // sheets (PLR + Bezirke level, 2026-07-14): S1=Arbeitslosigkeit(4),
  // S2(5)=pre-2023 Langzeitarbeitslose / 2023+ Kinder in alleinerziehenden
  // Haushalten, S3=Transferbezug(6), S4=Kinderarmut(7) — SAME column order in
  // all report years. The former "2023+ layout" branch (CP=5, TR=7) was a
  // misreading and stored single-parent share as Kinderarmut and Kinderarmut
  // as Transfer for period 2023.
  const COL_UNEMPLOYMENT = 4;
  const COL_CHILD_POVERTY = 7;
  const COL_TRANSFER = 6;
  const COL_S2 = 5; // stored as single_parent_children_rate for 2023+ only
```

Update the log line accordingly. In the `SocialRow` interface + row build (~lines 385–415): remove `youth_unemployment_rate`; add `single_parent_children_rate?: number`, set only when `periodNum >= 2023`:

```ts
    const row: SocialRow = {
      plr_code: plr,
      plr_name: String(cellValue(row0, 2) ?? plr),
      unemployment_rate: Math.round(toNumber(cellValue(row0, COL_UNEMPLOYMENT)) * 100) / 100,
      child_poverty_rate: Math.round(toNumber(cellValue(row0, COL_CHILD_POVERTY)) * 100) / 100,
      transfer_benefit_rate: Math.round(toNumber(cellValue(row0, COL_TRANSFER)) * 100) / 100,
      status_index: sdi?.status ?? 0,
      dynamik_index: sdi?.dynamik ?? 0,
    };
    if (periodNum >= 2023) {
      row.single_parent_children_rate = Math.round(toNumber(cellValue(row0, COL_S2)) * 100) / 100;
    }
    rows.push(row);
```
(Adapt variable names to the existing loop — `row0` above stands for the existing `row = ws.getRow(r)`.)

Change the upsert (~line 432) to also clean the mislabeled field on re-runs:

```ts
    await collection.updateOne(
      { plr_code: row.plr_code, period },
      { $set: { ...row, period, date: `${period}-12-31` }, $unset: { youth_unemployment_rate: '' } },
      { upsert: true }
    );
```

- [ ] **Step 3: Fix `syncReference`** the same way — replace its period-aware block (~lines 106–108):

```ts
  const COL_UNEMPLOYMENT = 4;
  const COL_CHILD_POVERTY = 7; // S4 Kinderarmut — same order in all report years
  const COL_TRANSFER = 6;      // S3 Transferbezug
```
(Delete the `periodNum`/ternary lines there; keep everything else.)

- [ ] **Step 4: Fix the type.** In `src/types/kiezStats.ts`, `KiezSocialDoc`: delete `youth_unemployment_rate: number;`, add:

```ts
  /** 2023+ only: S2 — share of children in single-parent households (NOT poverty). Pre-2023 S2 (Langzeitarbeitslose) is not stored. */
  single_parent_children_rate?: number;
```

- [ ] **Step 5: Dry-run, sanity-check, real run.**

```bash
set -a && source .env && set +a
STATS_XLSX_URL= pnpm tsx scripts/sync-stats.ts --dry-run
```
Expected: MSS section logs `unemployment=col4, child_poverty=col7, transfer=col6`; PLR rows print with child-poverty values ~26–37 and transfer ~11–16 for the 4 PLRs; reference section prints `neukoelln: unemployment 6.98% · child poverty 36.45% · transfer 15.72%` and a Berlin weighted row with child poverty ≈ 24–27 and transfer ≈ 10–12. If values look transposed, STOP and re-check.

Then the real run (rewrites real 2023 rows — this is the intended fix):

```bash
STATS_XLSX_URL= pnpm tsx scripts/sync-stats.ts
```
Expected: `✓ Upserted 4 documents into schillerkiez_social` + `✓ Upserted 2 documents into schillerkiez_reference`.

- [ ] **Step 6: Verify via API + DB.** With a dev server on 4399:

```bash
curl -s http://localhost:4399/api/kiez-stats | jq '{social, reference}'
```
Expected: `social.childPovertyRate` somewhere in 26–40 (avg of the 4 PLRs — must be CLEARLY larger than `transferBenefitRate`), `social.transferBenefitRate` ≈ 11–16, `reference.neukoelln.childPovertyRate == 36.45`, `reference.neukoelln.transferBenefitRate == 15.72`. If childPoverty < transfer, the mapping is still crossed — STOP. Also `.verify-task1.tmp.ts` (project root, `set -a && source .env && set +a && pnpm tsx .verify-task1.tmp.ts`):

```ts
import assert from 'node:assert';
import { MongoClient } from 'mongodb';
const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();
const db = client.db();
const doc = await db.collection('schillerkiez_social').findOne({ plr_code: '08100102', period: '2023' });
assert.ok(doc, '2023 doc exists');
assert.equal(doc!.child_poverty_rate, 26.85);
assert.equal(doc!.transfer_benefit_rate, 13.55);
assert.equal(doc!.unemployment_rate, 5.55);
assert.equal(doc!.youth_unemployment_rate, undefined, 'mislabeled field unset');
assert.equal(typeof doc!.single_parent_children_rate, 'number');
console.log('✓ Task 1 DB assertions passed');
await client.close();
```

- [ ] **Step 7: Docs.** `src/components/kiez/CLAUDE.md` line 9 (MSS column layout bullet): replace with the corrected semantics (all years: S1=col4 unemployment, S3=col6 transfer, S4=col7 child poverty; col5 = pre-2023 long-term-unemployment (unstored) / 2023+ single-parent-children share stored as `single_parent_children_rate`; `youth_unemployment_rate` removed — it never held youth unemployment). Root `CLAUDE.md`: update the `youth_unemployment` out-of-scope line in the Kiez section if present, and the collections line if it mentions the field.

- [ ] **Step 8: Type-check (29), cleanup, commit.**

```bash
pnpm type-check 2>&1 | grep -c "error TS"   # 29
rm .verify-task1.tmp.ts
git add scripts/sync-stats.ts src/types/kiezStats.ts CLAUDE.md src/components/kiez/CLAUDE.md
git commit -m "fix(kiez): correct MSS S-column mapping (S4=Kinderarmut, S3=Transfer) + re-sync 2023"
```
(Confirm `.env` unstaged.)

---

### Task 2: Page scaffold — kiez.css, i18n base, rebuilt route, orchestrator shell with state matrix

**Files:**
- Create: `src/styles/kiez.css`
- Rewrite: `src/pages/schillerkiez.astro`
- Create: `src/components/kiez/kiosk/KiezPageInner.svelte`, `src/components/kiez/kiosk/KzSkeleton.svelte`, `src/components/kiez/kiosk/KzFooter.svelte`
- Modify: `src/lib/kiosk-i18n.ts` (base `kiez.*` keys, both dicts)

**Interfaces:**
- Consumes: `KioskLayout` (`page="schillerkiez"` already typed), `KiezStatsResponse`/`AirQualityResponse`/`AirHistoryResponse` types, `t`/`tStr` from kiosk-i18n.
- Produces (later tasks slot into these): `KiezPageInner` holds `$state`: `stats: KiezStatsResponse | null`, `statsStatus: 'loading'|'ready'|'error'`, `air: AirQualityResponse | null`, `airStatus: 'loading'|'ready'|'off'`, `history: AirHistoryResponse | null`, `plr: string` (`'all'` initial), plus `refetchStats()`. Render slots marked `<!-- TASK N -->` comments where later components mount.

- [ ] **Step 1: `src/styles/kiez.css`** — kiezdaten tokens + motion, transcribed from `tokens-kiezdaten.css` + `motion-kiezdaten.css` (both in the handoff folder). Structure:

```css
/* Kiez-Daten (kiosk) — page tokens + motion. Spec: design/handoffs/design_handoff_kiezdaten/{tokens,motion}-kiezdaten.css */
[data-page="schillerkiez"] {
  --kz-series-gesamt: #6b8a4a;
  --kz-series-08100102: #3f8f9f;
  --kz-series-08100103: #b23a5b;
  --kz-series-08100104: #e8a53a;
  --kz-series-08100105: #6f2f59;
  --kz-grade-good: #5a8a3a;
  --kz-grade-mid: #c8881e;
  --kz-grade-bad: #a83245;
  --kz-grade-good-on-ink: #9fd08a;
  --kz-grade-mid-on-ink: #ecc76e;
  --kz-grade-bad-on-ink: #e08a8a;
}
@media (prefers-reduced-motion: no-preference) {
  .kz-skel { background: linear-gradient(90deg, #ebe1c7 25%, #e2d7bd 50%, #ebe1c7 75%); background-size: 400px 100%; animation: kzSweep 1.4s linear infinite; }
  @keyframes kzSweep { 0% { background-position: -200px 0; } 100% { background-position: 400px 0; } }
  .kz-live-dot { animation: kzPulse 1.8s ease-in-out infinite; }
  @keyframes kzPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  .kz-bar-in { transform-origin: left center; animation: kzBarIn 480ms cubic-bezier(.2,.7,.3,1) both; }
  @keyframes kzBarIn { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  .kz-swap-in { animation: kzSwapIn 220ms cubic-bezier(.2,.7,.3,1) both; }
  @keyframes kzSwapIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .kz-zdw-in { animation: kzStampIn 380ms cubic-bezier(.2,.8,.2,1.2) 200ms both; }
  @keyframes kzStampIn { from { opacity: 0; transform: rotate(2.2deg) scale(0.96); } to { opacity: 1; transform: rotate(0.6deg) scale(1); } }
  .kz-kontext-chip-in { animation: kzChipIn 220ms cubic-bezier(.2,.8,.2,1.2) both; }
  @keyframes kzChipIn { from { opacity: 0; transform: translateY(4px) scale(0.94); } to { opacity: 1; transform: translateY(0) scale(1); } }
}
/* .kz-skel static fallback (outside the media query): */
.kz-skel { background: var(--k-paper-soft, #ebe1c7); }
```
(Line/dot draw-ins `kzLineIn`/`kzDotIn` land in Task 3 with the primitives that use them — same file.)

- [ ] **Step 2: i18n base keys** — add to BOTH `de` and `en` in `src/lib/kiosk-i18n.ts` (new `// ── Kiez-Daten ──` section; German curly quotes; transcribe EN from the JSX):

| key | de | en |
|---|---|---|
| `kiez.kicker` | `KIEZ-DATEN · SCHILLERKIEZ · STAND {stand}` | `KIEZ-DATEN · SCHILLERKIEZ · AS OF {stand}` |
| `kiez.title.pre` | `Der Kiez, ` | `The Kiez, ` |
| `kiez.title.italic` | `gemessen` | `measured` |
| `kiez.dek` | `Vier Planungsräume, {pop} Nachbarinnen und Nachbarn, eine Messstation — alle Kanäle auf einer Seite.` | `Four planning areas, {pop} neighbours, one measuring station — every channel on a single page.` |
| `kiez.fact.residents` | `Einwohner` | `residents` |
| `kiez.fact.areas` | `Planungsräume` | `planning areas` |
| `kiez.fact.sync` | `AfS-Sync` | `AfS sync` |
| `kiez.fact.syncRate` | `2×/Jahr` | `2×/yr` |
| `kiez.state.error.title` | `Die Zahlen lassen sich gerade nicht abholen.` | `The figures can’t be fetched right now.` |
| `kiez.state.error.retry` | `erneut versuchen` | `try again` |
| `kiez.state.empty.title` | `Das Archiv ist noch leer.` | `The archive is still empty.` |
| `kiez.state.empty.body` | `Der AfS-Import läuft zweimal im Jahr (März + September). Danach stehen hier die ersten Zahlen.` | `The AfS import runs twice a year (March + September). The first figures appear after that.` |
| `kiez.state.stale.title` | `Stand {date} — der nächste Halbjahres-Import fehlt.` | `As of {date} — the next half-yearly import is missing.` |
| `kiez.state.stale.hint` | `Erwartet: Sync im März/September. Admin sieht Details im Aktions-Log.` | `Expected: sync in March/September. Admin sees details in the action log.` |
| `kiez.footer.sources` | `QUELLEN` | `SOURCES` |
| `kiez.footer.loggerNote` | `7-Tage-Luftverlauf: Messwert-Logger — BLUME liefert nur den Augenblick.` | `7-day air course: reading logger — BLUME serves the moment only.` |
| `kiez.footer.print` | `⎙ Kiez in Zahlen · A4 drucken` | `⎙ Kiez in figures · print A4` |

- [ ] **Step 3: Rewrite `src/pages/schillerkiez.astro`** (removes `prerender`, BaseLayout, PageHeader, dark-glass wrappers):

```astro
---
import KioskLayout from '../layouts/KioskLayout.astro';
import KiezPageInner from '../components/kiez/kiosk/KiezPageInner.svelte';

Astro.response.headers.set('Cache-Control', 'no-store, must-revalidate');
---

<KioskLayout
  title="Kiez-Daten — Mahalle"
  description="Der Schillerkiez, gemessen: Luftgüte, Bevölkerung, Alter, Vielfalt und soziale Lage — alle Kanäle auf einer Seite."
  page="schillerkiez"
>
  <KiezPageInner client:load />
</KioskLayout>

<style is:global>
  @import '../styles/kiez.css';
</style>
```

- [ ] **Step 4: `KiezPageInner.svelte`** — the orchestrator. Complete fetch/state logic (render slots filled by later tasks):

```svelte
<script lang="ts">
  import { t, tStr } from '../../../lib/kiosk-i18n';
  import type { KiezStatsResponse, AirQualityResponse, AirHistoryResponse } from '../../../types/kiezStats';
  import KzSkeleton from './KzSkeleton.svelte';
  import KzFooter from './KzFooter.svelte';

  let stats = $state<KiezStatsResponse | null>(null);
  let statsStatus = $state<'loading' | 'ready' | 'error'>('loading');
  let air = $state<AirQualityResponse | null>(null);
  let airStatus = $state<'loading' | 'ready' | 'off'>('loading');
  let history = $state<AirHistoryResponse | null>(null);
  let plr = $state('all');

  let seq = 0;
  let errorDetail = $state('');
  async function refetchStats() {
    const mySeq = ++seq;
    statsStatus = 'loading';
    try {
      const res = await fetch('/api/kiez-stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (mySeq !== seq) return;
      stats = body;
      statsStatus = 'ready';
    } catch (e) {
      if (mySeq !== seq) return;
      errorDetail = e instanceof Error && e.message.startsWith('HTTP') ? e.message : 'Netzwerk';
      statsStatus = 'error';
    }
  }
  async function fetchAir() {
    try {
      const res = await fetch('/api/kiez-air');
      if (!res.ok) throw new Error('off');
      air = await res.json();
      airStatus = 'ready';
    } catch {
      airStatus = 'off'; // state §04 — the strip stays and says so
    }
  }
  async function fetchHistory() {
    try {
      const res = await fetch('/api/kiez-air-history');
      if (res.ok) history = await res.json();
    } catch { /* sparkline simply absent */ }
  }

  let started = $state(false);
  $effect(() => {
    if (started) return;
    started = true;
    refetchStats();
    fetchAir();
    fetchHistory();
  });

  const isEmpty = $derived(statsStatus === 'ready' && !stats?.demographics && !stats?.social);
  const isStale = $derived.by(() => {
    const d = stats?.lastUpdated;
    if (!d) return false;
    return Date.now() - new Date(d).getTime() > 8 * 30.44 * 24 * 3600 * 1000; // > 8 months
  });
</script>

<div class="mx-auto w-full max-w-[1280px]">
  <!-- TASK 4: <KzInstrumentStrip {air} {airStatus} {history} /> — renders in ALL stats states (independent sources) -->

  {#if statsStatus === 'loading'}
    <KzSkeleton />
  {:else if statsStatus === 'error'}
    <section class="px-5 py-12 lg:px-9">
      <div class="rounded-lg border-[1.5px] border-dashed border-[var(--k-danger)] px-5 py-6 text-center">
        <p class="font-serif italic text-[17px] text-[var(--k-ink-soft)]">{$t['kiez.state.error.title']}</p>
        <p class="mt-1.5 font-mono text-[10px] text-[var(--k-ink-mute)]">{errorDetail} · /api/kiez-stats</p>
        <button
          class="mt-3 min-h-[44px] rounded-full bg-[var(--k-ink)] px-5 py-2 text-[13px] font-bold text-[var(--k-paper)]"
          onclick={refetchStats}
        >{$t['kiez.state.error.retry']}</button>
      </div>
    </section>
  {:else if isEmpty}
    <section class="px-5 py-12 lg:px-9">
      <div class="rounded-lg border-[1.5px] border-dashed border-[var(--k-rule)] px-5 py-6 text-center">
        <p class="font-serif italic text-[17px] text-[var(--k-ink-soft)]">{$t['kiez.state.empty.title']}</p>
        <p class="mt-2 text-[12.5px] leading-relaxed text-[var(--k-ink-mute)]">{$t['kiez.state.empty.body']}</p>
      </div>
    </section>
  {:else if stats}
    <!-- TASK 5: <KzTitleBlock {vm} {history} {isStale} /> (carries the §07 warn line; `vm` derivation lands in Task 5) -->
    <!-- TASK 6: <KzSelector {stats} bind:plr /> + Kanal 01 + Kanal 02 -->
    <!-- TASK 7: Kanal 03 + Kanal 04 -->
    <!-- TASK 8: {#if plr === 'all'} Kanal 05 {/if} -->
  {/if}

  <KzFooter />
</div>
```
(Exact class names/tokens: match the kiosk token names actually used in `src/styles/tokens.css` — read them; the `--k-danger`/`--k-rule`/`--k-ink*` names above must be adjusted to the real token names in that file.)

- [ ] **Step 5: `KzSkeleton.svelte`** — state §01 per `kiosk-kiezdaten-states.jsx:62-72`, EXCLUDING the ink strip block: the real `KzInstrumentStrip` (Task 4) always renders above the stats states and carries its own loading skeleton, so this component mirrors only the content BELOW the strip (title-row skels: `180px + flex` row, then Kanal-block skels; mobile per lines 188–190). No spinner, no emoji. (Until Task 4 lands, the strip area is simply empty during loading — acceptable on the branch.)

- [ ] **Step 6: `KzFooter.svelte`** — per `kiosk-kiezdaten.jsx:542-554`: sources line (verbatim string `Amt für Statistik Berlin-Brandenburg · Monitoring Soziale Stadtentwicklung · BLUME-Messnetz (mc042)` — a literal, not i18n), `† {$t['kiez.footer.loggerNote']}`, and the ⎙ pill as `<a href="/schillerkiez/druck">{$t['kiez.footer.print']}</a>` (route lands in Task 10 — dead link until then is fine on the branch), `min-h-[44px]` on mobile.

- [ ] **Step 7: Verify live** (dev server 4399 + playwright-cli): `/schillerkiez` renders KioskNav with „Kiez" tab active, skeleton flashes then real→(empty Kanal area, expected — components come later), footer present; block stats (`playwright-cli route "**/api/kiez-stats" --status 500`) → §02 error card with retry, and retry works after unblocking; DE/EN toggle switches copy. Mobile 390px snapshot clean.

- [ ] **Step 8: Type-check (29), commit.**

```bash
git add src/styles/kiez.css src/pages/schillerkiez.astro src/components/kiez/kiosk/ src/lib/kiosk-i18n.ts
git commit -m "feat(kiez): kiosk scaffold — moss page, state matrix shell, footer, i18n base"
```

---

### Task 3: Pure libs (wobble + view-model) and chart primitives

**Files:**
- Create: `src/lib/kiez/kzWobble.ts`, `src/lib/kiez/kiezViewModel.ts`
- Create: `src/components/kiez/kiosk/primitives/{KzBar,KzLine,KzGrid,KzDonut,KzMap}.svelte`
- Modify: `src/styles/kiez.css` (add kzLineIn/kzDotIn keyframes)

**Interfaces:**
- Consumes: `KiezStatsResponse` type; `PLR_PATHS`, `PLR_VIEWBOX` from `src/components/kiez/plrPaths.ts`.
- Produces (Tasks 4–8, 10 rely on these exact names):
  - `kzWobble.ts`: `kzRnd(i: number, seed: number): number`, `kzWobLine(x1,y1,x2,y2, seed?, amp?, segs?): string` (polyline points), `kzWobRect(x,y,w,h, seed?, amp?): string` (path d).
  - `kiezViewModel.ts`: `KZ_PLR_SHORT: Record<string,string>`, `KZ_SERIES_COLORS: Record<string,string>` (`all` = moss + 4 codes, hex values from Global Constraints), and:
    ```ts
    export interface KzAreaVM {
      code: string;            // 'all' | PLR code
      name: string;
      short: string;
      pop: number; male: number; female: number;
      singlePerson: number;    // 0 today — UI hides when falsy
      delta: string | null;    // e.g. "+180", "−40" (U+2212 for minus), null when <2 trend points
      deltaVsLabel: string | null; // previous period label, e.g. "H2 '24"
      agePct: number[];        // 7 groups, percentages
      ageAbs: number[];        // 7 groups, counts
      mig: { a: number; mh: number; o: number } | null; // non-overlapping percentages (1 decimal)
      social: { alq: number; ka: number; tr: number; status: number; dyn: number } | null;
      trend: { label: string; value: number }[]; // population per period, "H2 '21" labels
    }
    export interface KiezVM {
      stand: string;           // dd.mm.yyyy from lastUpdated
      lastUpdated: string;
      ageLabels: string[];     // ['0–5','6–17','18–26','27–44','45–54','55–64','65+']
      areas: KzAreaVM[];       // [0] = 'all' aggregate, then the 4 PLRs in code order
      divTrend: { label: string; a: number; mh: number; o: number }[]; // Gesamt diversity % over periods
      socialPeriod: string | null; // raw latest MSS period, e.g. "2023" (Kanal 04 right meta "MSS 2023")
      socTrend: {
        years: string[];       // "'13" … "'23"
        gesamt: { alq: number[]; ka: number[]; tr: number[] };
        series: { name: string; alq: (number | null)[] }[]; // merged LOR series, aligned to years
        reformBeforeIndex: number; // index of first year >= 2021 (boundary marker sits before it)
      } | null;
    }
    export function buildKiezViewModel(stats: KiezStatsResponse): KiezVM;
    export function periodLabel(period: string): string; // '2025h2' → "H2 '25", '2023' → "'23"
    ```

- [ ] **Step 1: `kzWobble.ts`** — port EXACTLY from `kiosk-kiezdaten-explore.jsx:64-78` (deterministic seeded jitter; endpoints never jittered):

```ts
// Hand-printed riso chart hand (Kiez-Daten "Mischung"). Deterministic: same
// seed → same wobble, so SSR and client render identical markup.
export const kzRnd = (i: number, seed: number): number => {
  const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function kzWobLine(x1: number, y1: number, x2: number, y2: number, seed = 1, amp = 1.4, segs = 7): string {
  const pts: string[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const jx = (kzRnd(i, seed) - 0.5) * amp;
    const jy = (kzRnd(i, seed + 5) - 0.5) * amp;
    pts.push(
      `${(x1 + (x2 - x1) * t + (i === 0 || i === segs ? 0 : jx)).toFixed(1)},${(y1 + (y2 - y1) * t + (i === 0 || i === segs ? 0 : jy)).toFixed(1)}`
    );
  }
  return pts.join(' ');
}

export function kzWobRect(x: number, y: number, w: number, h: number, seed = 1, amp = 1.3): string {
  const j = (i: number, s: number) => (kzRnd(i, seed + s) - 0.5) * amp;
  return `M${x},${y + j(0, 1)} L${x + w + j(1, 2)},${y + j(2, 3)} L${x + w + j(3, 4)},${y + h + j(4, 5)} L${x + j(5, 6)},${y + h + j(6, 7)} Z`;
}
```

- [ ] **Step 2: `kiezViewModel.ts`** — pure mapping. Key logic (write completely; no DB/fetch imports — must stay client-safe):

```ts
import type { KiezStatsResponse } from '../../types/kiezStats';

export const KZ_PLR_SHORT: Record<string, string> = {
  '08100102': 'Schiller. N',
  '08100103': 'Schiller. S',
  '08100104': 'Warthepl.',
  '08100105': 'Silberst.',
};
export const KZ_SERIES_COLORS: Record<string, string> = {
  all: '#6b8a4a',
  '08100102': '#3f8f9f',
  '08100103': '#b23a5b',
  '08100104': '#e8a53a',
  '08100105': '#6f2f59',
};

export function periodLabel(period: string): string {
  const m = period.match(/^(\d{4})h([12])$/);
  if (m) return `H${m[2]} '${m[1].slice(2)}`;
  return `'${period.slice(2)}`;
}

const fmtDelta = (curr: number, prev: number): string => {
  const d = curr - prev;
  return d >= 0 ? `+${d}` : `−${Math.abs(d)}`; // U+2212 minus
};
```

`buildKiezViewModel(stats)`:
- `stand`: `lastUpdated` ("YYYY-MM-DD") → "DD.MM.YYYY".
- Gesamt area from `stats.demographics` (+ `null`-guard: caller only invokes when demographics exist), per-PLR areas from `stats.plrAreas` sorted by code. `agePct`/`ageAbs` from `ageDistribution` (`percentage`/`count` per entry, order as served — it matches `ageLabels`).
- `mig` percentages: `Math.round(x / totalPopulation * 1000) / 10` for the three non-overlapping counts (null when `totalPopulation` 0).
- `trend` per area: gesamt from `stats.trend` (period → `periodLabel`), per-PLR from `stats.plrTrend` filtered by code. `delta`/`deltaVsLabel`: last vs previous trend point (null when < 2 points).
- `social` per area from `plrAreas[].social` / `stats.social` (map `unemploymentRate`→alq, `childPovertyRate`→ka, `transferBenefitRate`→tr, `statusIndex`→status, `dynamikIndex`→dyn); null stays null (§05).
- `divTrend` from `stats.trend`: per period compute non-overlapping percentages from `foreignNationals`/`germanWithMigBg`/`withoutMigBg` vs their sum (1 decimal).
- `socialPeriod`: last entry of `stats.socialTrend`'s `period` (they're sorted ascending), null when empty.
- `socTrend`: null when `stats.socialTrend.length < 2`. `years` from `socialTrend[].period` (`periodLabel`). `gesamt` arrays from `socialTrend` (`unemploymentRate`/`childPovertyRate`/`transferBenefitRate`). `series` = port of `mergeSocialPlrTrend` from `src/components/kiez/KiezDashboard.svelte:112-135` VERBATIM in logic (`SOCIAL_PLR_GROUPS` with old codes `08010117`→[`08100102`,`08100103`] named `Schillerpromenade`, `08010118`→[`08100104`,`08100105`] named `Silbersteinstraße`; period < 2021 → old code rows, else mean of the new codes; round 1 decimal), but **aligned to `years`**: a period with no data for a group yields `null` at that index (chart skips — no interpolation). `reformBeforeIndex` = index of the first year whose `parseInt(period) >= 2021`.

- [ ] **Step 3: Verify the pure libs** with `.verify-task3.tmp.ts` (project root) — build a handcrafted mini `KiezStatsResponse` fixture (2 PLR areas, 3 trend periods `2023h2/2024h2/2025h2`, socialTrend periods `2019/2021/2023` with plrSocialTrend rows for old code `08010117` at 2019 and new codes at 2021/2023) and assert:

```ts
import assert from 'node:assert';
import { periodLabel, buildKiezViewModel } from './src/lib/kiez/kiezViewModel';
import { kzWobLine, kzWobRect } from './src/lib/kiez/kzWobble';

assert.equal(periodLabel('2025h2'), "H2 '25");
assert.equal(periodLabel('2023'), "'23");
assert.equal(kzWobLine(0, 0, 10, 10, 3), kzWobLine(0, 0, 10, 10, 3), 'deterministic');
assert.ok(kzWobRect(0, 0, 10, 10, 1).startsWith('M0,'));
// fixture asserts (write the fixture inline):
// - vm.areas[0].code === 'all'; delta formatting '+…'/'−…'; singlePerson passthrough
// - vm.socTrend.reformBeforeIndex === 1 (2021 is first >= 2021 in the fixture)
// - merged series: 2019 value from the old code, 2021/2023 = mean of the two new codes, 1 decimal
// - a group with no rows for a period → null at that index (never interpolated)
console.log('✓ Task 3 assertions passed');
```

- [ ] **Step 4: Chart primitives** — transcribe geometry from `kiosk-kiezdaten.jsx:93-124` (KZBar/KZLine/KZGrid) and `:362-382` (KZDonut), map from `kiosk-kiezdaten-explore.jsx:53-62` (KDMap, but import `PLR_PATHS`/`PLR_VIEWBOX` from `src/components/kiez/plrPaths.ts` instead of inlining polygons). Props exactly:
  - `KzBar`: `{ x, y, w, h, seed, color?, opacity? }` — ghost fill path (`kzWobRect(x+2, y+1.6, w, h, seed)`, opacity per prop default 0.42) + ink outline path (`kzWobRect(x, y, w, h, seed+7)`, strokeWidth 1.5). Wrap both in `<g class="kz-bar-in">`.
  - `KzLine`: `{ pts: [number,number][], color?, seed?, width?, dots? }` — per-segment `<polyline points={kzWobLine(...)}>`; dots = ghost circle (+1.5,+1.2, opacity .45) + paper-filled ink-ringed circle, class `kz-dot-in`.
  - `KzGrid`: `{ x1, x2, rows, top, step }` — hairlines `stroke: var(--k-rule-color or literal #c9beA3)` 0.8px. NEVER wobbled.
  - `KzDonut`: `{ segs: {v: number; c: string}[], size? }` — double-struck dasharray segments + two precise ink rings (r 30.5 / 49.5).
  - `KzMap`: `{ size?, accent?, highlight? }` — active polygon filled `accent` at 0.8 opacity, others `--k-paper-soft`; `aria-hidden="true"`.
  Add to `kiez.css` inside the reduced-motion-gated block: `.kz-line-in { stroke-dasharray: var(--kz-len, 600); stroke-dashoffset: var(--kz-len, 600); animation: kzLineIn 720ms cubic-bezier(.4,0,.2,1) 120ms both; } @keyframes kzLineIn { to { stroke-dashoffset: 0; } } .kz-dot-in { animation: kzDotIn 220ms cubic-bezier(.2,.8,.2,1.2) 700ms both; } @keyframes kzDotIn { from { transform: scale(0); opacity: 0; } 60% { transform: scale(1.2); opacity: 1; } to { transform: scale(1); opacity: 1; } }`.

- [ ] **Step 5: Type-check (29), delete verify script, commit.**

```bash
git add src/lib/kiez/ src/components/kiez/kiosk/primitives/ src/styles/kiez.css
git commit -m "feat(kiez): wobble + view-model libs, riso chart primitives"
```

---

### Task 4: Instrument strip (live / off / compact + 7-day sparkline)

**Files:**
- Create: `src/components/kiez/kiosk/KzInstrumentStrip.svelte`
- Modify: `src/components/kiez/kiosk/KiezPageInner.svelte` (mount at the TASK 4 slot)
- Modify: `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: `air: AirQualityResponse | null`, `airStatus: 'loading'|'ready'|'off'`, `history: AirHistoryResponse | null` (Task 2 state); grade ramp CSS vars (Task 2).
- Produces: `<KzInstrumentStrip {air} {airStatus} {history} compact={false} />` — `compact` used by mobile layout (responsive classes acceptable instead of a prop if cleaner; JSX shows a `compact` variant with wrapping).

**Design source**: `kiosk-kiezdaten.jsx:127-181` (live + off), `kiosk-kiezdaten-states.jsx:101-107` (§04 usage), `:118-134` (§06 gap bars — dashed empty `rx=3` rects, `stroke-dasharray="3 3"`).

Behaviors (exact):
- Ink band (`--k-ink` background, paper text), always rendered regardless of stats state (mounted OUTSIDE the stats `{#if}` chain).
- Kicker: `MESSSTATION NANSENSTRASSE · MC042 · LIVE` (ochre mono) with `.kz-live-dot` (success green). **`off` state**: dot static + inkMute (NO pulse class), suffix `KEIN SIGNAL`, headline `Die Station meldet sich nicht.` at 0.75 opacity, right side shows `Letzter Wert: {ts} · LQI {lqi}` from `history.lastReading` (format ts via `Intl.DateTimeFormat` with `timeZone: 'Europe/Berlin'`; when `lastReading` null show only the second line) + `BLUME antwortet nicht — Rest der Seite unberührt.`
- Live state: `Luftgüte: {overallGrade} · {overallLabel}` (grade value in `--kz-grade-good-on-ink` ramp by grade) + mono timestamp; 4 pollutant tiles (name / grade / gradeLabel, `k.A.` styling when grade null — the API already sends `keine Angabe` as gradeLabel; display the grade slot as `–` when null) colored by the on-ink ramp (≤2 good, 3 mid, ≥4 bad).
- 7-day sparkline (right): from `history.days` — day with `lqiMax` → filled bar height `lqiMax * 11`, color by on-ink ramp, last slot full opacity/others 0.55; day with `lqiMax === null` → dashed empty outline bar (§06). Caption `7-TAGE-VERLAUF†`; when ≥1 null day, add the gap caption line (`kiez.strip.gap` below). When `history` is null entirely, omit the sparkline block (keep † footnote in the page footer only).
- `airStatus === 'loading'`: render the strip frame with `.kz-skel` blocks (part of §01's mirroring).

i18n keys (both dicts): `kiez.strip.station` (`MESSSTATION NANSENSTRASSE · MC042` / `MEASURING STATION NANSENSTRASSE · MC042`), `kiez.strip.live` (`LIVE`/`LIVE`), `kiez.strip.noSignal` (`KEIN SIGNAL`/`NO SIGNAL`), `kiez.strip.airQuality` (`Luftgüte`/`Air quality`), `kiez.strip.offTitle` (`Die Station meldet sich nicht.`/`The station isn’t reporting.`), `kiez.strip.lastReading` (`Letzter Wert: {ts} · LQI {lqi}`/`Last reading: {ts} · LQI {lqi}`), `kiez.strip.offNote` (`BLUME antwortet nicht — Rest der Seite unberührt.`/`BLUME not responding — rest of the page unaffected.`), `kiez.strip.week` (`7-TAGE-VERLAUF†`/`7-DAY COURSE†`), `kiez.strip.gap` (`Aufzeichnung pausierte — Lücken gestrichelt, nie interpoliert.`/`Recording paused — gaps dashed, never interpolated.`), `kiez.strip.today` (`heute`/`today`). Weekday letters under sparkline bars: derive with `Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'Europe/Berlin' })` from the `day` strings (last slot uses `kiez.strip.today`).

Steps: implement → mount in `KiezPageInner` above the stats states → live verify: (a) normal load shows live strip + sparkline with today's single logged day + 6 dashed gap days (real current data!), (b) `playwright-cli route "**/api/kiez-air" --status 502` → §04 off-variant with last-reading from history, page otherwise intact, dot NOT pulsing, (c) block BOTH air routes → strip off-variant without last reading; stats untouched → type-check 29 → commit `feat(kiez): instrument strip — live/off variants + honest 7-day sparkline`.

---

### Task 5: Title block + Zahl der Woche (derivation lib + stamp card + share flow)

**Files:**
- Create: `src/lib/kiez/zdw.ts` (pure), `src/components/kiez/kiosk/KzTitleBlock.svelte`
- Modify: `KiezPageInner.svelte` (TASK 5 slot), `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: `KiezVM` (Task 3), `AirHistoryResponse | null`, `isStale` (Task 2), `getISOWeek` from `date-fns`.
- Produces:
  ```ts
  // src/lib/kiez/zdw.ts — PURE, client-safe, no Date.now() inside (caller passes now)
  export interface ZdwResult {
    kw: number;                 // ISO week
    figureKey: 'ageShare' | 'populationDelta' | 'diversity' | 'singleHouseholds' | 'airWeekMean';
    value: string;              // pre-formatted, de-style decimals ("37,9 %") — EN callers replace ',' with '.'
    varsForText: Record<string, string>; // interpolation vars for the i18n reading line
  }
  export function deriveZdw(vm: KiezVM, history: AirHistoryResponse | null, now: Date): ZdwResult | null;
  ```

**Menu + derivability (exact):** fixed order `['ageShare', 'populationDelta', 'diversity', 'singleHouseholds', 'airWeekMean']`. Start index `(getISOWeek(now) - 1) % 5`, advance (wrapping) past underivable figures; all underivable → null (card hidden — never fake). Derivations from the Gesamt area (`vm.areas[0]`):
- `ageShare`: `agePct[3]` (27–44) exists and > 0 → value `"37,9 %"`-style.
- `populationDelta`: `delta !== null` → value = delta (e.g. `"+180"`), vars `{ vs: deltaVsLabel }`.
- `diversity`: `mig` non-null → value = `mig.a + mig.mh` rounded 1 decimal + ` %` (share with international history), vars `{}`.
- `singleHouseholds`: `singlePerson > 0` (today: always skipped — self-enables if AfS ever ships the column).
- `airWeekMean`: `history` non-null AND ≥ 4 days with `lqiMean !== null` → value `LQI Ø {mean}` (mean of non-null lqiMeans, 1 decimal).

i18n reading lines (both dicts; `{value}` shown separately in the big mono figure, these are the one-sentence readings):
| key | de | en |
|---|---|---|
| `kiez.zdw.label` | `ZAHL DER WOCHE` | `FIGURE OF THE WEEK` |
| `kiez.zdw.kw` | `KW {kw}` | `wk {kw}` |
| `kiez.zdw.read.ageShare` | `der Nachbarschaft ist zwischen 27 und 44 — der Kiez bleibt jung.` | `of the neighbourhood is between 27 and 44 — the Kiez stays young.` |
| `kiez.zdw.read.populationDelta` | `Nachbarinnen und Nachbarn mehr als {vs} — der Kiez wächst.` | `more neighbours than {vs} — the Kiez is growing.` |
| `kiez.zdw.read.diversity` | `der Nachbarschaft haben eine internationale Geschichte.` | `of the neighbourhood have an international story.` |
| `kiez.zdw.read.singleHouseholds` | `aller Haushalte im Kiez sind Einpersonen-Haushalte.` | `of all households in the Kiez are single-person households.` |
| `kiez.zdw.read.airWeekMean` | `war die mittlere Luftgüte der letzten Woche — gemessen an der Nansenstraße.` | `was last week’s mean air quality — measured at Nansenstraße.` |
| `kiez.zdw.share` | `im Forum diskutieren →` | `discuss in the forum →` |
| `kiez.zdw.shareTitle` | `Zahl der Woche (KW {kw}): {value}` | `Figure of the week (wk {kw}): {value}` |
| `kiez.zdw.shareBody` | `Quelle: Kiez-Daten · Stand {stand} · {url} — Was bedeutet das für uns?` | `Source: Kiez data · as of {stand} · {url} — what does it mean for us?` |

**Share link** (novel §01, NO special endpoint): plain `<a href={shareHref}>` where
```ts
const shareHref = $derived(zdw ? `/topics/create?prefill_title=${encodeURIComponent(tStr($t['kiez.zdw.shareTitle'], { kw: String(zdw.kw), value: displayValue }))}&prefill_body=${encodeURIComponent(tStr($t['kiez.zdw.shareBody'], { stand: vm.stand, url: pageUrl }))}` : '#');
```
`pageUrl` = `typeof window !== 'undefined' ? window.location.origin + '/schillerkiez' : '/schillerkiez'`. Compose reads `prefill_title`/`prefill_body` synchronously (confirmed) — nothing to change forum-side.

**Wiring in `KiezPageInner`** (this task adds it — the first VM consumer): `import { buildKiezViewModel } from '../../../lib/kiez/kiezViewModel';` and `const vm = $derived(stats?.demographics ? buildKiezViewModel(stats) : null);`. The ready-content branch becomes `{:else if vm}` (a stats payload with `demographics: null` but `social` present falls back to the §03 empty card — extend `isEmpty` to `statsStatus === 'ready' && !stats?.demographics`). All Kanal/title components receive `vm`/`vm.areas` — never raw `stats` (except `stats.reference` in Task 8).

**KzTitleBlock** per `kiosk-kiezdaten.jsx:183-221`: left = moss mono kicker (`tStr($t['kiez.kicker'], {stand})`), carved H1 (`kiez.title.pre` + serif-italic moss `kiez.title.italic`), serif dek (`{pop}` = localized `toLocaleString`), mono fact row (residents · `4` areas · 2×/Jahr AfS-Sync; hide the Einpersonen-HH — NOT in this row per JSX). Right = ZdW stamp card (paperWarm, ink-bold border, print shadow, `rotate(0.6deg)`, class `kz-zdw-in`): label row, huge mono value (EN locale: `value.replace(',', '.')`), reading line, dashed rule, share link. Card hidden entirely when `deriveZdw` returns null. **§07 warn line**: when `isStale`, render under the title block header (JSX `kiosk-kiezdaten-states.jsx:139-149`): ⚠ + `tStr($t['kiez.state.stale.title'], {date: vm.stand})` bold + `kiez.state.stale.hint` mono — warn border `--kz-grade-mid`, bg `#f5e7c8`.

Steps: zdw.ts → `.verify-task5.tmp.ts` asserts (fixture VM: ISO week rotation picks expected key; singleHouseholds skipped when 0; wrap-around; all-underivable → null; deterministic for fixed `now`) → KzTitleBlock + mount → live verify (real data: card shows a real derived figure; share link opens /topics/create with prefilled title+body — verify via playwright as an anonymous → login redirect is fine, just check the URL params; DE/EN toggle re-formats value comma/point) → type-check 29 → delete verify script → commit `feat(kiez): title block + Zahl der Woche (ISO-week rotation, forum share prefill)`.

---

### Task 6: PLR selector + Kanal frame + Kanal 01 (Bevölkerung) + Kanal 02 (Alter)

**Files:**
- Create: `KzSelector.svelte`, `KzKanal.svelte`, `KzKanalPop.svelte`, `KzKanalAge.svelte` (all in `src/components/kiez/kiosk/`)
- Modify: `KiezPageInner.svelte` (TASK 6 slot), `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: `KiezVM`, primitives (Task 3), `KZ_SERIES_COLORS`, `scrollFade`.
- Produces: `<KzSelector areas={vm.areas} bind:plr />`; `<KzKanal nr="01" area={...} title={...}>{children}</KzKanal>` frame with `right` snippet; Kanäle receive `{ area: KzAreaVM, vm: KiezVM }`.

**Design source**: `kiosk-kiezdaten.jsx:224-267` (selector + frame), `:270-325` (K01), `:328-358` (K02); mobile `kiosk-kiezdaten-mobile.jsx:79-129`.

Behaviors (exact):
- **Selector**: `KzMap size 92` (desktop) / 56 (mobile) with `accent=KZ_SERIES_COLORS[plr]`, `highlight=plr`; 5 chips (Gesamt + 4 PLRs by `short` on mobile, full DE name on desktop per JSX) each with series-color square + mono pop count; active chip ink-filled. Chips are `<button>`s (min-h 44px touch band on mobile via row padding; chip row `use:scrollFade` + `.kiosk-scroll-fade` + `overflow-x-auto` + `shrink-0` on mobile, `flex-wrap` on desktop). Kicker line `PLANUNGSRAUM WÄHLEN — ALLE KANÄLE FOLGEN DER AUSWAHL` / `PICK A PLANNING AREA — EVERY CHANNEL FOLLOWS` (`kiez.selector.hint`).
- **PLR switch animation**: in `KiezPageInner`, wrap the Kanäle region in `{#key plr}<div class="kz-swap-in">…</div>{/key}`.
- **KzKanal frame**: mono kicker `KANAL {nr} · {areaName}` (`kiez.kanal.label` = `KANAL`/`CHANNEL`), bold 24px title, `right` snippet slot, dashed bottom rule, `mx` gutters per JSX.
- **K01** (3-col `lg:grid-cols-[220px_1fr_330px]`, single column mobile): gauge card (mono `EINWOHNER` label via `kiez.k01.residents`, big mono pop, ♂/♀ counts; Einpersonen-HH line ONLY when `area.singlePerson > 0` — today hidden); trend line chart (`KzGrid` + axis line + `KzLine` in `KZ_SERIES_COLORS[plr]`, value labels above dots, mono period labels below — compute y-scale from min/max as JSX does); per-PLR small multiples (4 sparkline rows: short name, `KzLine` dots=false width 1.8 in each PLR's color, right-aligned pop) — small multiples always show ALL 4 PLRs regardless of selection. `right` meta: `Δ {area.delta} / {area.deltaVsLabel}` in moss mono, hidden when delta null. Mobile: gauge figures + trend chart per `kiosk-kiezdaten-mobile.jsx:97-112`.
- **K02**: horizontal bar chart, 7 rows: `KzBar` in `KZ_SERIES_COLORS[plr]` with opacity `0.28 + 0.55 * (pct / maxPct)`, value label `` `{pct} % · {abs}` `` (abs = `ageAbs` rounded to 10: `Math.round(abs/10)*10`, localized); precise vertical gridlines at 0/10/20/30/40 % with mono tick labels; ink axis. `right` meta: `KzMap size 40`. i18n: `kiez.k01.title` (`Bevölkerung`/`Population`), `kiez.k02.title` (`Alter`/`Age`), `kiez.k01.residents` (`EINWOHNER`/`RESIDENTS`), `kiez.k01.course` (`ENTWICKLUNG {range}`/`COURSE {range}`), `kiez.k01.byArea` (`NACH PLANUNGSRAUM`/`BY PLANNING AREA`), `kiez.k01.singleHH` (`Einpersonen-Haushalte`/`single-person households`), `kiez.selector.total` (`Gesamt`/`Total`).

Steps: implement → mount (inside `{#key plr}`) → live verify: selector switches recolor K01/K02 + map + locator, small multiples stable, Gesamt↔PLR swap animates, age labels sum sanity (~100%), mobile 390 snapshot (chips scroll with fade, ≥44px band) → type-check 29 → commit `feat(kiez): PLR selector + Kanäle 01/02 (Bevölkerung, Alter)`.

---

### Task 7: Kanal 03 (Vielfalt) + Kanal 04 (Soziale Lage with §05 + numeric Status/Dynamik)

**Files:**
- Create: `KzKanalMig.svelte`, `KzKanalSocial.svelte`, `src/lib/kiez/kontextTypes.ts`
- Modify: `KiezPageInner.svelte` (TASK 7 slot), `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: `KiezVM`, primitives, `plr`.
- Produces: `src/lib/kiez/kontextTypes.ts` (PURE — no imports; shared with Task 9's server lib):
  ```ts
  export interface KontextChip { id: string; title: string; href: string }
  export interface KiezKontext { alq: KontextChip[]; kinderarmut: KontextChip[]; transfer: KontextChip[] }
  ```
  `KzKanalSocial` props: `{ area, vm, plr, kontext = null, children? }` with `kontext: KiezKontext | null` (Task 9 starts sending real data; until then Inner passes `null`).

**Design source**: `kiosk-kiezdaten.jsx:361-431` (K03: double-struck donut, 3 segments teal/wine/ochre, non-overlap caption, 5-period Zeitverlauf lines — Gesamt data only), `:434-483` (K04: 3 indicator bars teal/wine/ochre, grid to 50 %, inline ♨ thread links, footer row Status/Dynamik + (*)), states `:110-116` (§05).

Behaviors (exact):
- **K03**: donut from `area.mig` (3 segments: a=teal, mh=wine, o=ochre; legend labels `kiez.k03.foreign` `Ausländische Nachbar:innen`/`Foreign nationals`, `kiez.k03.germanMig` `Deutsche mit Migrationsgeschichte`/`Germans with migration background`, `kiez.k03.noMig` `Ohne Migrationsgeschichte`/`No migration background`); **non-overlap caption** `kiez.k03.caption` (`MH schließt Ausländer:innen NICHT ein — Segmente überlappen nicht.` / `Segments are non-overlapping.`). Zeitverlauf chart from `vm.divTrend` (3 `KzLine`s, ALWAYS Gesamt data — label `IM ZEITVERLAUF · GESAMT`/`OVER TIME · TOTAL`, `kiez.k03.overTime`); hidden when `divTrend.length < 2`. `area.mig` null → skip donut card gracefully (keep frame).
- **K04**: when `area.social === null` → **§05**: keep the Kanal frame, dashed-rule box, serif-italic `kiez.k04.noData` (`Für diesen Planungsraum liegen keine Sozialdaten vor.` / `No social data available for this planning area.`). NO bars, NO zeros. Otherwise: 3 rows — `kiez.k04.alq` (`Arbeitslosenquote`/`Unemployment rate`) teal, `kiez.k04.ka` (`Kinderarmut (U15)`/`Child poverty (U15)`) wine, `kiez.k04.tr` (`Transferleistungen`/`Transfer benefits`) ochre — `KzBar` scaled to 50 % grid (precise gridlines 0–50, mono ticks), value label mono. After the value, when kontext chips exist for that indicator: inline moss mono `♨ {n} Gespräch(e) im Forum →` (`kiez.k04.threads.one` `Gespräch im Forum` / `forum thread`, `kiez.k04.threads.many` `Gespräche im Forum` / `forum threads`) — desktop inline in the SVG per JSX is fiddly; acceptable adaptation: render the count+chips row UNDER each bar row in HTML (mobile JSX does exactly this, lines 158–162) on both breakpoints. Chips themselves land in Task 9 (this task renders them when `kontext` prop is non-null; pass `kontext={null}` from Inner for now). Footer row: `Status-Index: {status}` · `Dynamik: {dyn}` (NUMERIC — controller decision 3) · `(*) MSS-Systematik, s. Quellen` (`kiez.k04.status` `Status-Index`/`Status index`, `kiez.k04.dyn` `Dynamik`/`Dynamics`, `kiez.k04.mss` `(*) MSS-Systematik, s. Quellen`/`(*) MSS methodology, see sources`). `right` meta: mono `MSS {vm.socialPeriod}` (omit when `socialPeriod` null).
- Reserve the Berlin-Vergleich slot: `{#if children}{@render children()}{/if}` at the card's end (Task 8 fills it).

Steps: implement → mount → live verify: Gesamt shows all data; select `Wartheplatz` etc. and confirm per-PLR values swap; **force §05** (all 4 real PLRs currently have social data): serve a modified kiez-stats payload via playwright-cli route fulfillment with a JSON body file (one area's `social: null`) if the CLI supports a body override; if it does not, temporarily hardcode `social: null` for one area in the view-model mapping, verify the rendered §05 blank live, REVERT the hack before committing, and state in the report which method was used — the frame stays, serif blank, no 0-bars; donut caption present; K04 values now show the CORRECTED Kinderarmut (~27–37 %) vs Transfer (~11–16 %) from Task 1 — sanity-check the ranges → type-check 29 → commit `feat(kiez): Kanäle 03/04 (Vielfalt, Soziale Lage) — honest blanks, numeric MSS indices`.

---

### Task 8: Kanal 05 (Soziale Entwicklung, LOR merge) + Berlin-Vergleich (novel §02)

**Files:**
- Create: `KzKanalSocTrend.svelte`, `KzBerlinVergleich.svelte`
- Modify: `KiezPageInner.svelte` (TASK 8 slot: `{#if plr === 'all' && vm.socTrend}<KzKanalSocTrend …/>{/if}`), `KzKanalSocial` mount site (pass Berlin-Vergleich as children when `plr === 'all'`), `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: `vm.socTrend` (years/gesamt/series/reformBeforeIndex), `stats.reference` (Plan A field: `{ period, berlin: {unemploymentRate, childPovertyRate, transferBenefitRate} | null, neukoelln: {...} | null } | undefined`), Gesamt `area.social`.
- Produces: nothing consumed later.

**Design source**: `kiosk-kiezdaten.jsx:486-539` (K05: left 3-indicator Gesamt chart with year labels `'13`…; right ALQ-by-area chart with merged series wine/plum + dashed `LOR 2021` boundary line + label; below: §-prefixed Gebietsreform footnote), mobile `:168-183` (simplified single chart + short footnote); novel `:146-188` (§02 dumbbell: per indicator a row — inkMute connector line, Berlin = paper dot, Neukölln = sky dot (check `src/styles/tokens.css` for an existing sky/blue token first and reuse it; if none exists, grep `sky:` in `design/handoffs/design_handoff_kiezdaten/jsx/kiosk-system.jsx` and use that exact hex as a literal), Schillerkiez = moss double-struck dot with value label; legend row).

Behaviors (exact):
- **K05** desktop: two cards. Boundary marker x = between `reformBeforeIndex - 1` and `reformBeforeIndex` (midpoint), dashed 4 4 inkMute 1.2px + mono `LOR 2021` label. Merged series: wine (Schillerpromenade) + plum (Silbersteinstraße); null points skipped (line segment not drawn across a null — split into sub-polylines; never interpolate). Footnote `kiez.k05.reform`: `§ Gebietsreform 2021: vor 2021 zwei Planungsräume, seither vier. Alte Gebiete werden mit den neuen zusammengeführt (Mittelwert der Nachfolger) — durchgängige Linien, ehrlicher Bruchvermerk.` / `§ 2021 boundary reform: two planning areas before 2021, four since. Old areas are merged with their successors (average) — continuous lines, honest break marker.` Legend keys: `kiez.k05.alq` (`Arbeitslosigkeit`/`Unemployment`), `kiez.k05.ka` (`Kinderarmut`/`Child poverty`), `kiez.k05.tr` (`Transfer`/`Transfer`), titles `kiez.k05.title` (`Soziale Entwicklung`/`Social development`), `kiez.k05.left` (`DREI INDIKATOREN · GESAMT`/`THREE INDICATORS · TOTAL`), `kiez.k05.right` (`ARBEITSLOSIGKEIT NACH GEBIET`/`UNEMPLOYMENT BY AREA`). Mobile (`lg:hidden` variant inside the same component): single left-chart card, short footnote `kiez.k05.reformShort` (`§ Gebietsreform 2021 — Linien amtlich zusammengeführt.`/`§ 2021 boundary reform — series merged, break marked.`).
- **Berlin-Vergleich** (controller decision 2): rendered as children of `KzKanalSocial` only when `plr === 'all'` AND `stats.reference` exists AND at least one scope non-null. Kicker `kiez.bv.title` (`BERLIN-VERGLEICH · MSS {period}`/`BERLIN COMPARISON · MSS {period}`). One dumbbell row per indicator (alq/ka/tr — same 42%-scale x-axis as the JSX with gridlines 0–40); kiez dot value from Gesamt `social`; berlin/neukoelln dots only for non-null scopes. Legend: `Schillerkiez` (moss) · `Neukölln` (sky) · `Berlin` (paper). Absent reference ⇒ the whole block ABSENT — no placeholder (`quietly absent` contract). Add one mono footnote line `kiez.bv.note` (`Berlin = gewichtetes Mittel der zwölf Bezirke.`/`Berlin = weighted mean of the twelve districts.`) — honest about the derivation.

Steps: implement → live verify: Gesamt shows K05 with real 2013–2023 series (post-Task-1 semantics: ka trend now truly continuous across 2021→2023), boundary marker between '19/'21 columns (real years from DB: 2013,2015,2017,2019,2021,2023), PLR selection hides K05 AND the dumbbell; dumbbell shows real reference values (NK ka 36.45 dot right of Berlin's ~24–27) → mobile snapshot → type-check 29 → commit `feat(kiez): Kanal 05 (LOR-merge trend) + Berlin-Vergleich dumbbell`.

---

### Task 9: Anwohner-Kontext (keyword matching + 24h cache + endpoint + chips)

**Files:**
- Create: `src/lib/kiez/kontext.ts` (server), `src/pages/api/kiez-kontext.ts` (types already exist: `src/lib/kiez/kontextTypes.ts` from Task 7 — import, do not redefine)
- Modify: `KiezPageInner.svelte` (fetch kontext, pass down), `KzKanalSocial.svelte` (render chips), `src/lib/kiosk-i18n.ts` (none needed beyond Task 7's thread-count keys — chips show raw topic titles)

**Interfaces:**
- Consumes: `topics` collection (READ-ONLY), `connectDB`.
- Produces:
  ```ts
  // kontextTypes.ts (pure — imported by both server lib and Svelte component)
  export interface KontextChip { id: string; title: string; href: string }
  export interface KiezKontext { alq: KontextChip[]; kinderarmut: KontextChip[]; transfer: KontextChip[] }
  ```
  `getKiezKontext(): Promise<KiezKontext>` (server), `GET /api/kiez-kontext` → `KiezKontext` (public, `Cache-Control: public, max-age=3600`).

**Rules (non-negotiable):** asymmetric — NO forum-side changes of any kind; only topics older than 1 h; publicly visible topics only (approved-or-absent moderation gate — copy the exact `$or` shape used by the public forum queries in `src/lib/topicsQuery.ts`; read that file and match it); max 3 chips per indicator, newest first; 0 matches ⇒ empty array ⇒ row renders without chips (Task 7 already guards).

- [ ] **Step 1: Discovery (read-only).** Read `src/lib/topicsQuery.ts` for the public moderation `$or` and the topics doc shape (`title`, `kind`?, `createdAt` types); read how forum cards link to a topic detail (grep `href` in `src/components/forum/kiosk/ForumPostCard.svelte`) to build `href` correctly per kind. If the detail-URL pattern is ambiguous, restrict the query to `kind: 'discussion'`-equivalent and use that route; if still unclear, STOP and report NEEDS_CONTEXT.

- [ ] **Step 2: `src/lib/kiez/kontext.ts`:**

```ts
// Anwohner-Kontext (Kiez-Daten novel §04): where the Kiez talks about a
// figure, the figure points to the talk. ASYMMETRIC by design (like Kurier
// heat): this lib reads the forum; the forum knows nothing about it.
// Curated keyword map, recomputed at most every 24 h (kiezKontextCache —
// same in-code TTL pattern as chronikCache).
import { connectDB } from '../mongodb';
import type { KiezKontext, KontextChip } from './kontextTypes';

const CACHE_KEY = 'kiez-kontext-v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_AGE_MS = 60 * 60 * 1000; // spam guard: threads must be > 1 h old
const MAX_CHIPS = 3;

const KEYWORDS: Record<keyof KiezKontext, string[]> = {
  alq: ['arbeitslos', 'jobcenter', 'arbeitssuche', 'jobsuche', 'bewerbung', 'weiterbildung'],
  kinderarmut: ['kinderarmut', 'familienhilfe', 'nachbarschaftshilfe', 'mittagstisch', 'schulweg', 'kita', 'hausaufgabenhilfe'],
  transfer: ['bürgergeld', 'sozialamt', 'wohngeld', 'grundsicherung', 'beratung', 'sgb'],
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function getKiezKontext(): Promise<KiezKontext> {
  const db = await connectDB();
  const cache = db.collection('kiezKontextCache');
  const cached = await cache.findOne({ key: CACHE_KEY });
  if (cached && Date.now() - new Date(cached.computedAt).getTime() < CACHE_TTL_MS) {
    return cached.payload as KiezKontext;
  }

  const cutoff = new Date(Date.now() - MIN_AGE_MS);
  const publicGate = { /* exact $or from topicsQuery.ts — fill from Step 1 */ };
  const result: KiezKontext = { alq: [], kinderarmut: [], transfer: [] };
  for (const key of Object.keys(KEYWORDS) as (keyof KiezKontext)[]) {
    const re = new RegExp(KEYWORDS[key].map(escapeRe).join('|'), 'i');
    const docs = await db
      .collection('topics')
      .find(
        { ...publicGate, createdAt: { $lte: cutoff }, title: re },
        { projection: { title: 1 }, sort: { createdAt: -1 }, limit: MAX_CHIPS }
      )
      .toArray();
    result[key] = docs.map((d): KontextChip => ({
      id: String(d._id),
      title: d.title,
      href: /* detail route from Step 1 */ `/topics/${String(d._id)}`,
    }));
  }

  await cache.updateOne(
    { key: CACHE_KEY },
    { $set: { key: CACHE_KEY, computedAt: new Date(), payload: result } },
    { upsert: true }
  );
  return result;
}
```
(Title-only matching is deliberate — titles are what the chips display; body matching would surface chips whose labels look unrelated. Note this in the code comment.)

- [ ] **Step 3: `src/pages/api/kiez-kontext.ts`** — public GET, `getKiezKontext()` in try/catch, 200 JSON with `Cache-Control: public, max-age=3600`, 500 generic on error (island treats failure as `kontext = null` → no chips anywhere; never an error surface).

- [ ] **Step 4: Wire the island.** `KiezPageInner`: `let kontext = $state<KiezKontext | null>(null);` + silent fetch alongside air; pass to `KzKanalSocial`. Chips render (Task 7's slot): pill per chip — ochre ♨ mono glyph + title, `class="kz-kontext-chip-in"`, `<a href={chip.href}>`, paperWarm bg, ink border, `min-h-[44px]` touch on mobile. Chips ONLY on the Gesamt + per-PLR alike (kontext is kiez-wide; same chips whatever the selection — matches the design's indicator-level linkage).

- [ ] **Step 5: Verify.** `.verify-task9.tmp.ts`: call `getKiezKontext()` twice — second call must come from cache (assert same `computedAt` via direct cache read); assert every returned topic is > 1 h old and publicly visible (re-query by `_id` and check the gate fields); clean NOTHING (read-only lib; the cache doc is real and kept — it's production data). Then curl the endpoint; then live: chips appear under indicators that have matches (with real forum data some rows may legitimately have none — confirm 0-match rows show no chip row at all), chip click navigates to the topic. Forum pages unchanged (asymmetry): grep confirms zero forum-file edits in the diff.

- [ ] **Step 6: Type-check (29), delete verify script, commit** `feat(kiez): Anwohner-Kontext — curated keyword chips, 24h cache, asymmetric`.

---

### Task 10: Print route `/schillerkiez/druck` (Datenarchiv A4)

**Files:**
- Create: `src/pages/schillerkiez/druck.astro`
- Modify: nothing in kiosk-i18n — the sheet is a server-rendered German-first artifact (hallway pinboard): render the DE strings from the novel JSX as literals, exactly as the Steckbrief handles its sheet labels (read `src/pages/steckbrief.astro` first and mirror its approach; if it turns out to localize server-side, match that mechanism instead and say so in the report)

**Interfaces:**
- Consumes: `/api/kiez-stats` (server-side self-fetch), `fetchMc042` (`src/lib/kiez/blume.ts`, try/catch), `QRCode` (`qrcode` package), `kzWobRect` (bars survive print), Steckbrief print-CSS precedent (`src/pages/steckbrief.astro:381-426` + its inline comments).
- Produces: the route; Task 2's footer ⎙ link goes live.

**Design source**: novel §03 A4 preview `kiosk-kiezdaten-novel.jsx:191-243`: header (mono kicker `KIEZ IN ZAHLEN · STAND {stand}` moss + `Schillerkiez, gemessen` carved title with serif-italic moss), 2×2 headline tiles (Einwohner · Planungsräume `4` · the 27–44 age share · air LQI overall — swap the JSX's 1-Pers.-HH tile for `Luftgüte {lqi} · {label}` since singlePerson is 0; when air unavailable, tile shows `Luftgüte k.A.`), age-distribution wobble bars (7 rows, moss), 3 social indicator lines (ALQ/Kinderarmut/Transfer with values), footer: `AfS · MSS · BLUME` + page URL + QR. **Stand-Datum mandatory.** 2 riso colors ONLY: ink + moss (grade ramps NOT used on print — the air tile prints ink).

Implementation notes (all verified precedents):
- Frontmatter: `const statsRes = await fetch(new URL('/api/kiez-stats', Astro.url.origin)); const stats = statsRes.ok ? await statsRes.json() : null;` — on null render a minimal sheet with the error line `Zahlen derzeit nicht verfügbar.` + Stand omitted. Air: `try { const data = await fetchMc042(); … } catch { air = null; }`.
- QR: `const base = getTrustedBaseUrl(Astro.request) ?? 'https://mahalle-das-kiezgesichterbuch.vercel.app';` (check `src/lib/auth/baseUrl.ts` for the exact signature/fallback semantics and match steckbrief.astro's usage) → `QRCode.toString(base + '/schillerkiez', { type: 'svg', margin: 0, color: { dark: '#1b1a17', light: '#0000' } })` → `<Fragment set:html={qrSvg} />` (safe: URL built from trusted base + constant path — keep the safety comment). The printed URL text under the sources = the same base + `/schillerkiez`.
- Print CSS: `@media print { @page { size: A4; margin: 0; } body * { visibility: hidden !important; } .kiez-sheet, .kiez-sheet * { visibility: visible !important; } .kiez-sheet-frame { position: fixed !important; top: 0 !important; left: 0 !important; } }` — **`!important` is load-bearing** (Astro scoped `[data-astro-cid-*]` attribute selectors out-specify plain classes; see steckbrief.astro's inline comments). QR + `set:html` SVG styling must live in `<style is:global>` (injected SVG never gets the scoped hash). Do NOT combine `size: A4` with a `landscape` keyword. Screen view: sheet centered on kiosk paper with a visible „drucken" button (`window.print()` inline onclick is fine) + a back link.
- Layout: KioskLayout `page="schillerkiez"` so nav/footer exist on screen; print CSS hides them.

Steps: implement → verify: `curl -s http://localhost:4399/schillerkiez/druck | grep -c "KIEZ IN ZAHLEN"` ≥ 1, QR `<svg` present, Stand string present, real figures (post-Task-1 Kinderarmut semantics); playwright screenshot of the screen view; print-preview cannot be automated — verify via playwright `--print-background` PDF if available, else visual check of the `@media print` block against steckbrief's pattern; footer ⎙ link navigates → type-check 29 → commit `feat(kiez): /schillerkiez/druck — A4 riso sheet, local QR, mandatory Stand`.

---

### Task 11: Legacy deletion, whole-page verification sweep, docs

**Files:**
- Delete: `src/components/kiez/KiezDashboard.svelte`
- Keep: `src/components/kiez/plrPaths.ts` (consumed by `KzMap`)
- Modify: `src/components/kiez/CLAUDE.md` (rewrite frontend sections), root `CLAUDE.md` (page-accent table row, Kiez section pointer), `README.md` (feature row if the kiosk table lists surfaces)

- [ ] **Step 1: Delete the monolith + prove zero refs.**

```bash
git rm src/components/kiez/KiezDashboard.svelte
grep -rn "KiezDashboard" src/ && echo "REFS REMAIN — fix before committing" || echo "0 refs"
```
Expected `0 refs` (Task 2 already rewrote the only mount site).

- [ ] **Step 2: Full-page verification sweep** (dev server 4399 + playwright-cli, both locales, 1280 + 390 widths):
  1. Normal load: strip live + sparkline, title + ZdW + share URL params, selector drives all Kanäle, K05 + dumbbell on Gesamt only, kontext chips where matched, footer + ⎙ → druck.
  2. `route "**/api/kiez-stats" --status 500` → §02 with retry; strip STAYS live (independent sources). Retry after unblock recovers without reload.
  3. `route "**/api/kiez-air" --status 502` → §04 off-strip with last logged reading; Kanäle untouched.
  4. Modified-body fixture (one area `social: null`) → §05 honest blank.
  5. Fixture with `lastUpdated` 10 months old → §07 warn line, page fully usable.
  6. Sparkline gap days render dashed (real data still has gaps — confirm).
  7. Mobile: chip row scrolls w/ fade, all buttons ≥ 44px (measure via playwright bounding boxes on the smallest), simplified K05 card present.
  8. `pnpm build` green AND page loads from `pnpm preview` (server-only-module bleed check — the island imports `kiezViewModel`/`kzWobble`/`kontextTypes` which must be pure; `kontext.ts` (mongodb) must NOT be imported by any client component — grep the import graph).
- [ ] **Step 3: Docs.**
  - `src/components/kiez/CLAUDE.md`: replace the legacy-frontend bullets (carousels, reveal action, old loading states) with the kiosk architecture (orchestrator + states contract, view-model lib, wobble hand rules, selector, ZdW rotation, kontext cache + asymmetry, druck route, JSX handoff pointer); KEEP the data-pipeline bullets (as corrected in Task 1) and LOR-code table.
  - Root `CLAUDE.md`: page-accent table — add `| Kiez-Daten | moss | via `--k-moss` |` row; update the Kiez Data Dashboard section pointer (kiosk rebuild note); add `kiezKontextCache` to Database Collections.
  - `README.md`: mark the statistics/Kiez surface as migrated if the surface table exists.
- [ ] **Step 4: Type-check (29), commit.**

```bash
git add -A src/components/kiez/ CLAUDE.md README.md
git commit -m "feat(kiez): remove legacy dashboard, docs — kiosk rebuild complete"
```
