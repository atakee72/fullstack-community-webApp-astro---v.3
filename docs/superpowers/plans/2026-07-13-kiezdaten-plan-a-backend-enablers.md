# Kiez-Daten Plan A — Backend Enablers (Air Logger + Berlin-Vergleich Reference) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the two backend enablers the Kiez-Daten kiosk redesign depends on — a 30-minute air-quality logger (BLUME → `schillerkiez_air_log` + daily rollups + history API) and the Berlin/Neukölln reference import for the Berlin-Vergleich module (additive `reference` field on `/api/kiez-stats`).

**Architecture:** A GitHub-Actions-scheduled cron endpoint (`/api/cron/log-air`, fail-closed `CRON_SECRET` auth, same pattern as `process-deletions`) appends BLUME readings to `schillerkiez_air_log`, maintains per-Berlin-day rollups in `schillerkiez_air_daily`, and prunes hourly rows older than 90 days. A new public `GET /api/kiez-air-history` serves the 7-day strip + last-logged-reading from Mongo only (independent of live BLUME). `scripts/sync-stats.ts` gains a `syncReference()` step reading the MSS **Bezirke-level** XLSX (separate file from the PLR file) into `schillerkiez_reference`, exposed additively on `/api/kiez-stats`.

**Tech Stack:** Astro 5 API routes (server output, Vercel), MongoDB 6 direct driver, ExcelJS (already used by sync-stats), GitHub Actions (curl-only job), no new dependencies.

## Global Constraints

- **Shared prod DB**: local dev and production share MongoDB `CommunityWebApp-test`. Synthetic test fixtures MUST carry `_tmpE2E: true`, be tracked by `_id`, deleted by `_id` after verification, and end with a residual scan of 0. (Note: no production reader of the three new collections exists yet — Plan B ships the UI — so a brief fixture presence is safe. Rigorous cleanup anyway.) Genuine BLUME readings logged during verification are REAL data and are kept.
- **Never interpolate measurement gaps** (handoff non-negotiable). A day without readings is `lqiMax: null` in the API — never an estimated value, never a written rollup doc.
- **Fail-closed cron auth**: `/api/cron/log-air` returns 503 when `CRON_SECRET` is unset, 401 on wrong Bearer — copied verbatim from `src/pages/api/cron/process-deletions.ts:21-40`.
- **Additive API changes only**: every existing field and status code of `/api/kiez-air` and `/api/kiez-stats` is unchanged (the legacy `KiezDashboard.svelte` is still live until Plan B). New fields are optional (`reference?`) or new endpoints.
- **Reference is strictly 1:1 per period** — `reference` is served only for the exact `latestSocial.period`; no back-filling from other periods. Missing ⇒ field omitted (module quietly absent, same contract as air).
- **Berlin day boundaries**: all "day" bucketing uses the `Europe/Berlin` calendar day (DST-safe), never UTC days.
- **BLUME facts (verified 2026-07-13)**: `https://luftdaten.berlin.de/api/lqis/data` returns per-station component arrays; `datetime` is ISO **with explicit offset** (e.g. `2026-07-13T18:00:00+02:00`, so `new Date()` parses it correctly); the `lqis` endpoint serves **grades** (its `value` mirrors `grade`), so the log stores grades 1–5.
- **MSS Bezirke file facts (verified 2026-07-13)**: `https://www.berlin.de/sen/stadt/_assets/stadtdaten/stadtwissen/monitoring-soziale-stadtentwicklung/bericht-2023/23indexind_anteile_bezirke_mss2023_kor.xlsx` → sheet `2.3.IndexInd_Ant_Bezirk_MSS2023`, data rows start where col 1 is a 2-digit code: `[1]` Bezirk code, `[2]` name, `[3]` EW (residents), `[4]` S1, `[5]` S2, `[6]` S3, `[7]` S4. 2023+ semantics: S1=unemployment, S2=child poverty, S4=transfer (same period-aware mapping as `syncMSS`). Neukölln = code `08`. There is **no Berlin-total row** — Berlin is derived as the EW-weighted mean of the 12 Bezirk rows (documented in the doc's `derivation` field).
- **Type-check baseline is 29 errors** (`pnpm type-check`) — no new errors allowed.
- **No new npm dependencies.**
- **Commits**: plain concise messages, NO "Generated with Claude Code" signature, NO "Co-Authored-By: Claude" footer. Never `git commit --no-verify`.
- **Dev server**: the user runs their own on :3000 — never touch it. For verification start your own on port **4399** (`pnpm dev --port 4399`) and stop it when done.
- **Verification scripts**: place temporary tsx scripts at the **project root** as `.verify-*.tmp.ts` (tsx cannot resolve project deps from outside the project dir) and delete them before committing.

## Environment / secrets notes (user actions, not tasks)

- `CRON_SECRET` already exists in local `.env`; it must also exist in Vercel prod (already required by the deletions cron) and be added as a **GitHub Actions repo secret** `CRON_SECRET` before the logger workflow can run.
- The old `MSS_XLSX_URL` in `.env`/GH secrets is **stale (404)** — Berlin moved MSS files from `/sen/sbw/` to `/sen/stadt/`. Fresh URLs (all verified 200 on 2026-07-13):
  - PLR shares: `https://www.berlin.de/sen/stadt/_assets/stadtdaten/stadtwissen/monitoring-soziale-stadtentwicklung/bericht-2023/21indexind_anteile_plr_mss2023.xlsx`
  - SDI: `https://www.berlin.de/sen/stadt/_assets/stadtdaten/stadtwissen/monitoring-soziale-stadtentwicklung/bericht-2023/1sdi_mss2023.xlsx`
  - Bezirke shares (NEW, for Task 5): `https://www.berlin.de/sen/stadt/_assets/stadtdaten/stadtwissen/monitoring-soziale-stadtentwicklung/bericht-2023/23indexind_anteile_bezirke_mss2023_kor.xlsx`
- The GitHub Actions logger workflow only takes effect after this branch merges to `main` (scheduled workflows run from the default branch) AND the Vercel prod deploy carries `/api/cron/log-air`. Red runs before that are expected — to avoid failure-notification spam, the user can disable the workflow in the GitHub Actions UI until the deploy + secret are verified, then re-enable it.

## File structure

```
src/lib/kiez/
  blume.ts            NEW — shared BLUME fetch (server-only), used by kiez-air route + logger
  airLog.ts           NEW — day-key helpers, rollup math, logger tick, history read
src/pages/api/
  kiez-air.ts         MODIFY — refactor to use blume.ts (behavior-identical)
  kiez-air-history.ts NEW — public 7-day strip + last reading (Mongo only)
  kiez-stats.ts       MODIFY — additive `reference` field
  cron/log-air.ts     NEW — fail-closed logger tick endpoint
src/types/kiezStats.ts MODIFY — AirLogDoc, AirDailyDoc, AirHistory*, KiezReferenceDoc, reference field
scripts/sync-stats.ts  MODIFY — syncReference() (Bezirke XLSX → schillerkiez_reference)
.github/workflows/
  kiez-air-logger.yml       NEW — 30-min curl trigger
  schillerkiez-stats.yml    MODIFY — MSS_BEZIRKE_XLSX_URL env + dispatch input
CLAUDE.md, src/components/kiez/CLAUDE.md — docs (Task 7)
```

---

### Task 1: Air-log types + pure day/rollup helpers

**Files:**
- Modify: `src/types/kiezStats.ts` (append at end)
- Create: `src/lib/kiez/airLog.ts` (pure part only — no mongodb import yet)

**Interfaces:**
- Consumes: nothing (pure).
- Produces (used by Tasks 2, 3): types `AirLogDoc`, `AirDailyDoc`, `AirHistoryDay`, `AirHistoryResponse`; constants `AIR_LOG_COLLECTION = 'schillerkiez_air_log'`, `AIR_DAILY_COLLECTION = 'schillerkiez_air_daily'`, `HOURLY_RETENTION_DAYS = 90`; functions `berlinDayKey(d: Date): string`, `lastBerlinDays(n: number, now: Date): string[]`, `buildDailyRollup(day: string, lqis: number[]): Omit<AirDailyDoc, 'updatedAt'> | null`.

- [ ] **Step 1: Write the failing verification script**

Create `.verify-task1.tmp.ts` at the project root:

```ts
import assert from 'node:assert';
import { berlinDayKey, lastBerlinDays, buildDailyRollup } from './src/lib/kiez/airLog';

// Winter (CET, UTC+1): 22:30Z = 23:30 Berlin (same day); 23:30Z = 00:30 next Berlin day
assert.equal(berlinDayKey(new Date('2026-01-10T22:30:00Z')), '2026-01-10');
assert.equal(berlinDayKey(new Date('2026-01-10T23:30:00Z')), '2026-01-11');
// Summer (CEST, UTC+2): 21:30Z = 23:30 Berlin; 22:30Z = 00:30 next Berlin day
assert.equal(berlinDayKey(new Date('2026-07-10T21:30:00Z')), '2026-07-10');
assert.equal(berlinDayKey(new Date('2026-07-10T22:30:00Z')), '2026-07-11');
// DST spring-forward day (2026-03-29, 02:00→03:00): bucketed to the right day
assert.equal(berlinDayKey(new Date('2026-03-29T01:30:00Z')), '2026-03-29');

// 7 consecutive Berlin days, oldest first, spanning the 25-hour fall-back day (2026-10-25)
const days = lastBerlinDays(7, new Date('2026-10-28T10:00:00Z'));
assert.equal(days.length, 7);
assert.equal(new Set(days).size, 7, 'no duplicate/skipped day keys across DST');
assert.equal(days[0], '2026-10-22');
assert.equal(days[6], '2026-10-28');
assert.ok(days.includes('2026-10-25'), 'the fall-back day appears exactly once');

assert.deepEqual(buildDailyRollup('2026-07-13', [2, 2, 3]), {
  day: '2026-07-13', lqiMax: 3, lqiMean: 2.3, readings: 3,
});
assert.equal(buildDailyRollup('2026-07-13', []), null, 'no readings ⇒ null, never an empty rollup');
console.log('✓ Task 1 assertions passed');
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm tsx .verify-task1.tmp.ts`
Expected: FAIL — `Cannot find module './src/lib/kiez/airLog'`

- [ ] **Step 3: Add the types**

Append to `src/types/kiezStats.ts`:

```ts
/** MongoDB doc in `schillerkiez_air_log` — one BLUME reading (logger runs every 30 min; BLUME publishes hourly, duplicates are dropped on the unique `ts`). Hourly rows are pruned after 90 days. */
export interface AirLogDoc {
  ts: Date;            // BLUME measurement timestamp (unique key)
  day: string;         // "YYYY-MM-DD" Europe/Berlin calendar day of `ts`
  lqi: number;         // overall LQI grade 1–5
  pm10: number | null; // pollutant grades 1–5, null = no current reading
  no2: number | null;
  o3: number | null;
  co: number | null;
  loggedAt: Date;      // when the logger wrote the doc
}

/** MongoDB doc in `schillerkiez_air_daily` — per-Berlin-day rollup, kept forever. Only ever written for days that HAVE readings (gaps stay absent — never interpolated). */
export interface AirDailyDoc {
  day: string;     // "YYYY-MM-DD" Europe/Berlin (unique key)
  lqiMax: number;
  lqiMean: number; // rounded to 0.1
  readings: number;
  updatedAt: Date;
}

/** One slot of the 7-day strip served by GET /api/kiez-air-history */
export interface AirHistoryDay {
  day: string;           // "YYYY-MM-DD" Europe/Berlin
  lqiMax: number | null; // null = no readings logged that day → render dashed empty bar
  lqiMean: number | null;
  readings: number;
}

/** GET /api/kiez-air-history response — Mongo only, independent of live BLUME */
export interface AirHistoryResponse {
  days: AirHistoryDay[]; // exactly 7, oldest first, last entry = today (Europe/Berlin)
  lastReading: { ts: string; lqi: number } | null; // latest logged reading (ISO ts), for state §04
}
```

- [ ] **Step 4: Create the pure helpers**

Create `src/lib/kiez/airLog.ts`:

```ts
// Air-quality logger core (Kiez-Daten novel §00 — Messwert-Logger).
// This module is server-only once Task 2 adds the Mongo/BLUME functions;
// never import it from client islands (they fetch the APIs instead).
import type { AirDailyDoc } from '../../types/kiezStats';

export const AIR_LOG_COLLECTION = 'schillerkiez_air_log';
export const AIR_DAILY_COLLECTION = 'schillerkiez_air_daily';
export const HOURLY_RETENTION_DAYS = 90;

const berlinDayFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Berlin',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "YYYY-MM-DD" of the Europe/Berlin calendar day containing `d`. */
export function berlinDayKey(d: Date): string {
  return berlinDayFmt.format(d);
}

/**
 * Last `n` Berlin day keys, oldest first, ending with the day containing `now`.
 * Steps in 24h increments from NOON UTC of the current Berlin day — noon UTC
 * is always well inside a Berlin day, so DST 23h/25h days can't skip or
 * duplicate a key.
 */
export function lastBerlinDays(n: number, now: Date): string[] {
  const [y, m, d] = berlinDayKey(now).split('-').map(Number);
  const anchor = Date.UTC(y, m - 1, d, 12);
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    days.push(berlinDayKey(new Date(anchor - i * 86400000)));
  }
  return days;
}

/** Daily rollup from a day's LQI readings. Returns null when there are none — a gap day never gets a rollup doc (never interpolate). */
export function buildDailyRollup(
  day: string,
  lqis: number[]
): Omit<AirDailyDoc, 'updatedAt'> | null {
  if (lqis.length === 0) return null;
  const lqiMax = Math.max(...lqis);
  const lqiMean = Math.round((lqis.reduce((a, b) => a + b, 0) / lqis.length) * 10) / 10;
  return { day, lqiMax, lqiMean, readings: lqis.length };
}
```

- [ ] **Step 5: Run the verification script — expect PASS**

Run: `pnpm tsx .verify-task1.tmp.ts`
Expected: `✓ Task 1 assertions passed`

- [ ] **Step 6: Type-check**

Run: `pnpm type-check 2>&1 | grep -c "error TS"`
Expected: `29` (baseline, no new errors)

- [ ] **Step 7: Delete the script and commit**

```bash
rm .verify-task1.tmp.ts
git add src/types/kiezStats.ts src/lib/kiez/airLog.ts
git commit -m "feat(kiez): air-log types + Berlin-day/rollup helpers"
```

---

### Task 2: BLUME extraction + logger tick + fail-closed cron endpoint

**Files:**
- Create: `src/lib/kiez/blume.ts`
- Modify: `src/pages/api/kiez-air.ts` (full rewrite below — behavior-identical)
- Modify: `src/lib/kiez/airLog.ts` (append DB functions)
- Create: `src/pages/api/cron/log-air.ts`

**Interfaces:**
- Consumes: Task 1's `berlinDayKey`, `buildDailyRollup`, collection constants, `AirLogDoc`.
- Produces (used by Tasks 3, 4): `fetchMc042(): Promise<BlumeComponent[]>` (throws on failure); `runAirLogger(db: Db, now?: Date): Promise<LogResult>` where `LogResult = { logged: boolean; duplicate?: boolean; reason?: string; ts?: string; day?: string; pruned?: number }`; `ensureAirIndexes(db: Db): Promise<void>`; endpoint `GET /api/cron/log-air` (Bearer `CRON_SECRET`; 503 unset / 401 wrong / 200 `LogResult`).

- [ ] **Step 1: Create the shared BLUME fetcher**

Create `src/lib/kiez/blume.ts`:

```ts
// Shared BLUME (luftdaten.berlin.de) fetch for station mc042 — used by the
// public /api/kiez-air route and the air logger. Server-only.
export const BLUME_LQI_URL = 'https://luftdaten.berlin.de/api/lqis/data';
export const BLUME_STATION_ID = 'mc042';

export interface BlumeComponent {
  datetime: string; // ISO with explicit offset, e.g. "2026-07-13T18:00:00+02:00"
  component: string; // "lqi" | "pm10" | "no2" | "o3" | "co"
  value: number | null;
  grade: number | null;
}

/** Fetch mc042's current component list. Throws on network error, non-OK status, or missing station. */
export async function fetchMc042(): Promise<BlumeComponent[]> {
  const res = await fetch(BLUME_LQI_URL, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`BLUME API returned ${res.status}`);
  const stations: Array<{ station: string; data: BlumeComponent[] }> = await res.json();
  const mc042 = stations.find((s) => s.station === BLUME_STATION_ID);
  if (!mc042) throw new Error('Station mc042 not found');
  return mc042.data;
}
```

- [ ] **Step 2: Capture the pre-refactor /api/kiez-air response**

With a dev server on 4399 (`pnpm dev --port 4399`, background):

```bash
curl -s http://localhost:4399/api/kiez-air | jq -S . > /tmp/kiez-air-before.json
cat /tmp/kiez-air-before.json
```

Expected: 200 JSON with `station`, `stationName`, `datetime`, `overallGrade`, `overallLabel`, `pollutants[4]`.

- [ ] **Step 3: Refactor `src/pages/api/kiez-air.ts` to use the shared fetcher**

Replace the whole file with:

```ts
import type { APIRoute } from 'astro';
import type { AirQualityResponse } from '../../types/kiezStats';
import { fetchMc042, BLUME_STATION_ID } from '../../lib/kiez/blume';

const POLLUTANT_NAMES: Record<string, string> = {
  pm10: 'PM10',
  no2: 'NO₂',
  o3: 'O₃',
  co: 'CO',
};

const GRADE_LABELS = ['', 'sehr gut', 'gut', 'mäßig', 'schlecht', 'sehr schlecht'];

export const GET: APIRoute = async () => {
  try {
    const data = await fetchMc042();

    const lqi = data.find((d) => d.component === 'lqi');
    if (!lqi || lqi.grade == null) {
      return new Response(JSON.stringify({ error: 'No LQI data for mc042' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pollutants = data
      .filter((d) => d.component !== 'lqi' && d.component in POLLUTANT_NAMES)
      .map((d) => ({
        name: POLLUTANT_NAMES[d.component] ?? d.component.toUpperCase(),
        component: d.component,
        grade: d.grade,
        gradeLabel: d.grade != null ? (GRADE_LABELS[d.grade] ?? '') : 'keine Angabe',
      }));

    const response: AirQualityResponse = {
      station: BLUME_STATION_ID,
      stationName: 'Nansenstraße',
      datetime: lqi.datetime,
      overallGrade: lqi.grade,
      overallLabel: GRADE_LABELS[lqi.grade] ?? '',
      pollutants,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    console.error('kiez-air API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch air quality data' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

(Only observable change: the station-missing case now returns the generic 502 body instead of `{"error":"Station mc042 not found"}` — status code identical, and the legacy client only checks `res.ok`. This is accepted.)

- [ ] **Step 4: Verify /api/kiez-air is unchanged**

```bash
curl -s http://localhost:4399/api/kiez-air | jq -S . > /tmp/kiez-air-after.json
diff /tmp/kiez-air-before.json /tmp/kiez-air-after.json && echo "IDENTICAL"
```

Expected: `IDENTICAL` (BLUME serves hourly values with 30-min cache headers; if a reading rolled over between the two curls, only `datetime`/grades may differ — re-run both curls back-to-back to confirm shape equality).

- [ ] **Step 5: Append the DB functions to `src/lib/kiez/airLog.ts`**

REPLACE the file's existing import block with exactly this (the type import gains `AirLogDoc` — do not end up with two imports from `'../../types/kiezStats'`):

```ts
import type { Db } from 'mongodb';
import type { AirDailyDoc, AirLogDoc } from '../../types/kiezStats';
import { fetchMc042 } from './blume';
```

Append at the end of the file:

```ts
export async function ensureAirIndexes(db: Db): Promise<void> {
  await db
    .collection(AIR_LOG_COLLECTION)
    .createIndex({ ts: 1 }, { unique: true, name: 'air_log_ts_unique' });
  await db
    .collection(AIR_DAILY_COLLECTION)
    .createIndex({ day: 1 }, { unique: true, name: 'air_daily_day_unique' });
}

/** Recompute one Berlin day's rollup from its logged readings. No readings ⇒ no doc (gaps stay absent). */
export async function recomputeDailyRollup(db: Db, day: string): Promise<void> {
  const lqis = await db
    .collection(AIR_LOG_COLLECTION)
    .find({ day }, { projection: { lqi: 1 } })
    .map((d) => d.lqi as number)
    .toArray();
  const rollup = buildDailyRollup(day, lqis);
  if (!rollup) return;
  await db
    .collection(AIR_DAILY_COLLECTION)
    .updateOne({ day }, { $set: { ...rollup, updatedAt: new Date() } }, { upsert: true });
}

export interface LogResult {
  logged: boolean;
  duplicate?: boolean; // BLUME still serving the same measurement ts as a previous tick
  reason?: string;     // why nothing was logged (BLUME down / no LQI / bad datetime)
  ts?: string;
  day?: string;
  pruned?: number;     // hourly rows older than 90 d removed this tick
}

/** One logger tick: fetch BLUME → upsert reading (dedup on measurement ts) → recompute that day's rollup → prune. A failed fetch logs nothing — the gap is the honest record. */
export async function runAirLogger(db: Db, now: Date = new Date()): Promise<LogResult> {
  await ensureAirIndexes(db);

  let data;
  try {
    data = await fetchMc042();
  } catch (err) {
    return { logged: false, reason: err instanceof Error ? err.message : 'blume_unreachable' };
  }

  const lqiComp = data.find((d) => d.component === 'lqi');
  if (!lqiComp || lqiComp.grade == null) return { logged: false, reason: 'no_lqi' };

  const ts = new Date(lqiComp.datetime);
  if (isNaN(ts.getTime())) return { logged: false, reason: 'bad_datetime' };

  const grade = (name: string): number | null =>
    data.find((d) => d.component === name)?.grade ?? null;

  const day = berlinDayKey(ts);
  const doc: AirLogDoc = {
    ts,
    day,
    lqi: lqiComp.grade,
    pm10: grade('pm10'),
    no2: grade('no2'),
    o3: grade('o3'),
    co: grade('co'),
    loggedAt: now,
  };
  // Dedup on the unique measurement ts. E11000 covers the race where two
  // overlapping ticks (Actions retry / manual dispatch) upsert the same ts.
  let duplicate = false;
  try {
    const upsert = await db
      .collection(AIR_LOG_COLLECTION)
      .updateOne({ ts }, { $setOnInsert: doc }, { upsert: true });
    duplicate = upsert.upsertedCount === 0;
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) duplicate = true;
    else throw err;
  }

  await recomputeDailyRollup(db, day);

  const cutoff = new Date(now.getTime() - HOURLY_RETENTION_DAYS * 86400000);
  const pruneRes = await db.collection(AIR_LOG_COLLECTION).deleteMany({ ts: { $lt: cutoff } });

  return { logged: true, duplicate, ts: ts.toISOString(), day, pruned: pruneRes.deletedCount };
}
```

- [ ] **Step 6: Create the cron endpoint**

Create `src/pages/api/cron/log-air.ts`:

```ts
import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import { runAirLogger } from '../../../lib/kiez/airLog';

// Air-quality logger tick (Kiez-Daten novel §00 — Messwert-Logger).
// Scheduled by GitHub Actions (.github/workflows/kiez-air-logger.yml, every
// 30 min) — NOT vercel.json: Vercel crons here are daily-only and both slots
// are taken. Auth is FAIL-CLOSED like process-deletions: a missing
// CRON_SECRET disables the endpoint (503) rather than opening it. A missed
// tick is harmless by design — gaps render as dashed bars, never interpolated.
export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = import.meta.env.CRON_SECRET;

    if (!cronSecret) {
      return new Response(JSON.stringify({ error: 'cron_disabled' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = await connectDB();
    const result = await runAirLogger(db);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[cron/log-air] error:', err);
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

- [ ] **Step 7: Verify auth gates + a real tick**

```bash
source .env  # for $CRON_SECRET in this shell only — NEVER print or commit it
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4399/api/cron/log-air            # expect 401
curl -s -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer wrong" http://localhost:4399/api/cron/log-air  # expect 401
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:4399/api/cron/log-air     # expect 200
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:4399/api/cron/log-air     # expect 200, "duplicate":true
```

Expected: `401`, `401`, then `{"logged":true,"duplicate":false,...,"pruned":0}` (duplicate may be `true` on the first call too if a previous manual tick already logged this hour's measurement), then `{"logged":true,"duplicate":true,...}`.

For the 503 branch: try `CRON_SECRET="" pnpm dev --port 4399` and curl → expect 503. If the empty shell override doesn't propagate into `import.meta.env` (Vite env quirk), verify the branch by code inspection and note that in the report — it is byte-identical to the reviewed `process-deletions` gate.

- [ ] **Step 8: Verify the Mongo side**

Create `.verify-task2.tmp.ts` at the project root:

```ts
import { MongoClient } from 'mongodb';
const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();
const db = client.db();
const log = await db.collection('schillerkiez_air_log').find().sort({ ts: -1 }).limit(3).toArray();
const daily = await db.collection('schillerkiez_air_daily').find().sort({ day: -1 }).limit(3).toArray();
console.log('air_log latest:', JSON.stringify(log, null, 1));
console.log('air_daily latest:', JSON.stringify(daily, null, 1));
console.log('log count:', await db.collection('schillerkiez_air_log').countDocuments());
const idx = await db.collection('schillerkiez_air_log').indexes();
console.log('indexes:', idx.map((i) => i.name));
await client.close();
```

Run: `set -a && source .env && set +a && pnpm tsx .verify-task2.tmp.ts`
Expected: ≥1 `air_log` doc with `ts`(Date), `day`("YYYY-MM-DD"), `lqi`(1–5), pollutant grades; exactly one `air_daily` doc for today with `readings ≥ 1` and `lqiMax`/`lqiMean` consistent; index `air_log_ts_unique` present. These readings are **genuine data — keep them** (they are the first real entries of the log).

- [ ] **Step 9: Type-check, clean up, commit**

```bash
pnpm type-check 2>&1 | grep -c "error TS"   # expect 29
rm .verify-task2.tmp.ts
git add src/lib/kiez/blume.ts src/lib/kiez/airLog.ts src/pages/api/kiez-air.ts src/pages/api/cron/log-air.ts
git commit -m "feat(kiez): BLUME air logger — cron endpoint, daily rollup, 90d retention"
```

Stop the dev server if you started one and no later step in your task needs it.

---

### Task 3: Public air-history endpoint (7-day strip + last reading)

**Files:**
- Modify: `src/lib/kiez/airLog.ts` (append `getAirHistory`)
- Create: `src/pages/api/kiez-air-history.ts`

**Interfaces:**
- Consumes: Task 1's `lastBerlinDays`, collection constants; Task 1's `AirHistoryResponse`/`AirHistoryDay` types.
- Produces (consumed by Plan B UI): `GET /api/kiez-air-history` → `AirHistoryResponse` (exactly 7 `days` oldest-first ending today; gap days have `lqiMax: null`; `lastReading` from the newest log row or `null`).

- [ ] **Step 1: Append `getAirHistory` to `src/lib/kiez/airLog.ts`**

Also add `AirHistoryDay, AirHistoryResponse` to the type import from `'../../types/kiezStats'`. Then append:

```ts
/** 7-day strip + last logged reading — Mongo only, never calls BLUME (stays available when the station is silent; feeds state §04). */
export async function getAirHistory(db: Db, now: Date = new Date()): Promise<AirHistoryResponse> {
  const days = lastBerlinDays(7, now);
  const rollups = await db
    .collection(AIR_DAILY_COLLECTION)
    .find({ day: { $in: days } })
    .toArray();
  const byDay = new Map(rollups.map((r) => [r.day as string, r]));

  const out: AirHistoryDay[] = days.map((day) => {
    const r = byDay.get(day);
    return r
      ? { day, lqiMax: r.lqiMax as number, lqiMean: r.lqiMean as number, readings: r.readings as number }
      : { day, lqiMax: null, lqiMean: null, readings: 0 }; // gap — dashed bar, never interpolated
  });

  const last = await db
    .collection(AIR_LOG_COLLECTION)
    .find({}, { projection: { ts: 1, lqi: 1 } })
    .sort({ ts: -1 })
    .limit(1)
    .toArray();

  return {
    days: out,
    lastReading: last[0]
      ? { ts: (last[0].ts as Date).toISOString(), lqi: last[0].lqi as number }
      : null,
  };
}
```

- [ ] **Step 2: Create the route**

Create `src/pages/api/kiez-air-history.ts`:

```ts
import type { APIRoute } from 'astro';
import { connectDB } from '../../lib/mongodb';
import { getAirHistory } from '../../lib/kiez/airLog';

// 7-day LQI strip + last logged reading (Kiez-Daten §05 sparkline, state §04).
// Mongo-only: independent of live BLUME, so the strip survives a silent station.
export const GET: APIRoute = async () => {
  try {
    const db = await connectDB();
    const history = await getAirHistory(db);
    return new Response(JSON.stringify(history), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=900, stale-while-revalidate=900',
      },
    });
  } catch (error) {
    console.error('kiez-air-history API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch air history' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
```

- [ ] **Step 3: Verify with fixtures (shared-DB discipline)**

Create `.verify-task3.tmp.ts` at the project root:

```ts
import assert from 'node:assert';
import { MongoClient, type ObjectId } from 'mongodb';
import { lastBerlinDays } from './src/lib/kiez/airLog';

const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();
const db = client.db();
const daily = db.collection('schillerkiez_air_daily');

// Fixture: rollups for 2 past days inside the window that have no real data yet
const days = lastBerlinDays(7, new Date());
const fixtures = [days[1], days[3]].filter(Boolean);
const inserted: ObjectId[] = [];
for (const day of fixtures) {
  const existing = await daily.findOne({ day });
  if (existing) { console.log(`day ${day} already has real data — skipping fixture`); continue; }
  const res = await daily.insertOne({
    day, lqiMax: 4, lqiMean: 3.5, readings: 9, updatedAt: new Date(), _tmpE2E: true,
  });
  inserted.push(res.insertedId);
  console.log(`fixture inserted for ${day}: ${res.insertedId}`);
}

const resp = await fetch('http://localhost:4399/api/kiez-air-history');
assert.equal(resp.status, 200);
const body = await resp.json();
assert.equal(body.days.length, 7, 'exactly 7 slots');
assert.equal(body.days[6].day, days[6], 'last slot is today');
for (const [i, d] of body.days.entries()) assert.equal(d.day, days[i], 'ordered oldest→today');
const gapDays = body.days.filter((d: any) => d.lqiMax === null);
console.log('gap days (null, will render dashed):', gapDays.map((d: any) => d.day));
if (inserted.length > 0) {
  const echoed = body.days.filter((d: any) => d.lqiMax === 4 && d.readings === 9);
  assert.equal(echoed.length, inserted.length, 'every fixture day served by the API');
}
assert.ok(body.lastReading === null || (typeof body.lastReading.ts === 'string' && body.lastReading.lqi >= 1));
console.log('lastReading:', body.lastReading);

// Cleanup — _id-scoped, then residual scan
for (const id of inserted) await daily.deleteOne({ _id: id });
const residual = await daily.countDocuments({ _tmpE2E: true });
assert.equal(residual, 0, 'residual scan must be 0');
console.log('✓ Task 3 assertions passed, cleanup OK, residual:', residual);
await client.close();
```

Run (dev server on 4399 running): `set -a && source .env && set +a && pnpm tsx .verify-task3.tmp.ts`
Expected: `✓ Task 3 assertions passed, cleanup OK, residual: 0`

- [ ] **Step 4: Type-check, clean up, commit**

```bash
pnpm type-check 2>&1 | grep -c "error TS"   # expect 29
rm .verify-task3.tmp.ts
git add src/lib/kiez/airLog.ts src/pages/api/kiez-air-history.ts
git commit -m "feat(kiez): /api/kiez-air-history — 7-day LQI strip + last logged reading"
```

Stop the dev server.

---

### Task 4: GitHub Actions logger schedule

**Files:**
- Create: `.github/workflows/kiez-air-logger.yml`

**Interfaces:**
- Consumes: Task 2's `GET /api/cron/log-air` contract (Bearer `CRON_SECRET`, 200 on success).
- Produces: a 30-minute schedule hitting production. Requires GH repo secret `CRON_SECRET` (user action; same value as the Vercel env var).

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/kiez-air-logger.yml`:

```yaml
name: Kiez Air Logger
# Rings /api/cron/log-air every 30 min (Kiez-Daten Messwert-Logger, novel §00).
# GitHub Actions instead of vercel.json: Vercel crons here are daily-only and
# both slots are taken. Actions schedule jitter (minutes) and occasional
# skipped runs are harmless — BLUME publishes hourly and gaps render honestly
# as dashed bars. Requires repo secret CRON_SECRET (same value as Vercel env).
# NOTE: takes effect only once this file is on the default branch AND the
# prod deploy serves /api/cron/log-air — red runs before that are expected.
on:
  schedule:
    - cron: '7,37 * * * *' # offset from :00/:30 to dodge top-of-hour Actions congestion
  workflow_dispatch:

jobs:
  log:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger logger tick
        env:
          CRON_SECRET: ${{ secrets.CRON_SECRET }}
          APP_ORIGIN: https://mahalle-das-kiezgesichterbuch.vercel.app
        run: |
          code=$(curl -s -o /tmp/resp.json -w '%{http_code}' \
            -H "Authorization: Bearer $CRON_SECRET" \
            "$APP_ORIGIN/api/cron/log-air")
          cat /tmp/resp.json; echo
          if [ "$code" != "200" ]; then
            echo "logger tick failed with HTTP $code"
            exit 1
          fi
```

- [ ] **Step 2: Validate the YAML parses**

Run: `npx --yes js-yaml .github/workflows/kiez-air-logger.yml > /dev/null && echo "YAML OK"`
Expected: `YAML OK`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/kiez-air-logger.yml
git commit -m "feat(kiez): GitHub Actions schedule for the air logger (every 30 min)"
```

---

### Task 5: Berlin/Neukölln reference import (`syncReference`)

**Files:**
- Modify: `scripts/sync-stats.ts` (append `syncReference` after `syncMSS`, call it in `main()`)
- Modify: `src/types/kiezStats.ts` (append `KiezReferenceDoc`)
- Modify: `.github/workflows/schillerkiez-stats.yml` (new env + dispatch input)
- Modify: `.env` (append `MSS_BEZIRKE_XLSX_URL` — a public URL, not a secret; `.env` is gitignored, never staged)

**Interfaces:**
- Consumes: existing sync-stats helpers `downloadXlsx`, `cellValue`, `toNumber`, `isDryRun`; env `MSS_BEZIRKE_XLSX_URL`, `MSS_PERIOD`.
- Produces (consumed by Task 6): collection `schillerkiez_reference` with docs `{ scope: 'berlin'|'neukoelln', period: string, date: string, unemployment_rate: number, child_poverty_rate: number, transfer_benefit_rate: number, derivation: string }`, unique index `{ scope: 1, period: 1 }`.

- [ ] **Step 1: Add the doc type**

Append to `src/types/kiezStats.ts`:

```ts
/** MongoDB doc in `schillerkiez_reference` — Berlin/Neukölln yardstick figures for the Berlin-Vergleich module (novel §02). Imported per MSS period from the Bezirke-level share table; strictly 1:1 per period, never back-filled. */
export interface KiezReferenceDoc {
  scope: 'berlin' | 'neukoelln';
  period: string; // MSS period, e.g. "2023"
  date: string;   // `${period}-12-31`
  unemployment_rate: number;
  child_poverty_rate: number;
  transfer_benefit_rate: number;
  /** 'bezirk_row' (Neukölln, read directly) | 'ew_weighted_mean_of_bezirke' (Berlin — the file has no Berlin row; weighted by residents, an approximation of the true city rate) */
  derivation: string;
}
```

- [ ] **Step 2: Append `syncReference` to `scripts/sync-stats.ts`**

Insert after the `syncMSS` function (before `// ─── Main ───`):

```ts
// ─── MSS Reference Sync (Berlin + Neukölln — Kiez-Daten §02 Berlin-Vergleich) ──
// Reads the MSS BEZIRKE-level share table (a separate XLSX from the PLR file,
// e.g. 23indexind_anteile_bezirke_mss2023_kor.xlsx). Verified layout: data
// rows have [1] 2-digit Bezirk code, [2] name, [3] EW (residents),
// [4..7] S1..S4 shares — same period-aware S-column semantics as syncMSS.
// Neukölln = row "08". The file has NO Berlin-total row: Berlin is derived as
// the EW-weighted mean of the 12 Bezirk rows (approximation — weights are
// total residents, not each indicator's denominator; recorded in `derivation`).

async function syncReference(db: any) {
  const url = process.env.MSS_BEZIRKE_XLSX_URL;
  const period = process.env.MSS_PERIOD;
  if (!url || !period) {
    console.log('\n⚠ Reference sync skipped: MSS_BEZIRKE_XLSX_URL or MSS_PERIOD not set');
    return;
  }

  const periodNum = parseInt(period);
  const COL_UNEMPLOYMENT = 4;
  const COL_CHILD_POVERTY = periodNum < 2023 ? 7 : 5;
  const COL_TRANSFER = periodNum < 2023 ? 6 : 7;

  console.log('\n═══ MSS Reference Sync (Bezirke) ═══');
  const workbook = await downloadXlsx(url);

  // Data sheet = first sheet containing a row with a 2-digit code in col 1 and a name in col 2
  let ws: ExcelJS.Worksheet | null = null;
  let dataStart = -1;
  outer: for (const sheet of workbook.worksheets) {
    for (let r = 1; r <= Math.min(sheet.rowCount, 30); r++) {
      const code = String(cellValue(sheet.getRow(r), 1) ?? '').trim();
      const name = String(cellValue(sheet.getRow(r), 2) ?? '').trim();
      if (/^\d{2}$/.test(code) && name) {
        ws = sheet;
        dataStart = r;
        break outer;
      }
    }
  }
  if (!ws || dataStart < 0) {
    console.error('  ✗ Could not find Bezirk data rows — reference sync skipped');
    return;
  }
  console.log(`  Sheet "${ws.name}", data starts at row ${dataStart}`);

  interface BezirkRow { code: string; name: string; ew: number; alq: number; kap: number; tr: number }
  const rows: BezirkRow[] = [];
  for (let r = dataStart; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const code = String(cellValue(row, 1) ?? '').trim();
    if (!/^\d{2}$/.test(code)) continue;
    rows.push({
      code,
      name: String(cellValue(row, 2) ?? code).trim(),
      ew: toNumber(cellValue(row, 3)),
      alq: toNumber(cellValue(row, COL_UNEMPLOYMENT)),
      kap: toNumber(cellValue(row, COL_CHILD_POVERTY)),
      tr: toNumber(cellValue(row, COL_TRANSFER)),
    });
  }
  console.log(`  Parsed ${rows.length} Bezirk rows`);
  if (rows.length !== 12) console.log('  ⚠ Expected 12 Bezirke — check the file layout');

  const nk = rows.find((r) => r.code === '08');
  if (!nk) {
    console.error('  ✗ Neukölln (code 08) not found — reference sync skipped');
    return;
  }

  const totalEw = rows.reduce((s, r) => s + r.ew, 0);
  if (totalEw <= 0) {
    console.error('  ✗ Resident counts are zero — reference sync skipped');
    return;
  }
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const weighted = (pick: (r: BezirkRow) => number) =>
    round2(rows.reduce((s, r) => s + pick(r) * r.ew, 0) / totalEw);

  const docs = [
    {
      scope: 'neukoelln' as const,
      period,
      date: `${period}-12-31`,
      unemployment_rate: round2(nk.alq),
      child_poverty_rate: round2(nk.kap),
      transfer_benefit_rate: round2(nk.tr),
      derivation: 'bezirk_row',
    },
    {
      scope: 'berlin' as const,
      period,
      date: `${period}-12-31`,
      unemployment_rate: weighted((r) => r.alq),
      child_poverty_rate: weighted((r) => r.kap),
      transfer_benefit_rate: weighted((r) => r.tr),
      derivation: 'ew_weighted_mean_of_bezirke',
    },
  ];
  for (const doc of docs) {
    console.log(
      `    ${doc.scope}: unemployment ${doc.unemployment_rate}% · child poverty ${doc.child_poverty_rate}% · transfer ${doc.transfer_benefit_rate}%`
    );
  }

  if (isDryRun) {
    console.log('  [DRY RUN] No database writes');
    return;
  }

  const collection = db.collection('schillerkiez_reference');
  await collection.createIndex({ scope: 1, period: 1 }, { unique: true });
  for (const doc of docs) {
    await collection.updateOne({ scope: doc.scope, period }, { $set: doc }, { upsert: true });
  }
  console.log('  ✓ Upserted 2 documents into schillerkiez_reference');
}
```

In `main()`, add the call after `await syncMSS(db);`:

```ts
    await syncReference(db);
```

- [ ] **Step 3: Add the env var locally**

Append to `.env` (public download URL — not a secret; `.env` stays gitignored and unstaged):

```
MSS_BEZIRKE_XLSX_URL=https://www.berlin.de/sen/stadt/_assets/stadtdaten/stadtwissen/monitoring-soziale-stadtentwicklung/bericht-2023/23indexind_anteile_bezirke_mss2023_kor.xlsx
```

- [ ] **Step 4: Dry-run (reference section only)**

The stale `MSS_XLSX_URL` in `.env` currently 404s and `STATS_XLSX_URL` downloads ~cost 30 s — blank both so only the reference section runs:

```bash
set -a && source .env && set +a
STATS_XLSX_URL= MSS_XLSX_URL= pnpm tsx scripts/sync-stats.ts --dry-run
```

Expected output includes:
```
⚠ AfS sync skipped ...
⚠ MSS sync skipped ...
═══ MSS Reference Sync (Bezirke) ═══
  Sheet "2.3.IndexInd_Ant_Bezirk_MSS2023", data starts at row 13
  Parsed 12 Bezirk rows
    neukoelln: unemployment 6.98% · child poverty 26.18% · transfer 36.45%
    berlin: unemployment <≈4.5–4.7>% · child poverty <≈26–27>% · transfer <≈23–25>%
  [DRY RUN] No database writes
```
Sanity-check the Neukölln values against the file (S1≈6.98, S2≈26.18, S4≈36.45 for 2023) and that Berlin's weighted values are plausible (between the min and max Bezirk values).

- [ ] **Step 5: Real run (writes 2 real docs to the shared DB — intended)**

```bash
STATS_XLSX_URL= MSS_XLSX_URL= pnpm tsx scripts/sync-stats.ts
```

Expected: `✓ Upserted 2 documents into schillerkiez_reference`. These are real production reference figures — keep them. Re-run the same command once more: it must print the same values and `✓ Upserted 2 …` again — the unique `{scope, period}` index plus upsert guarantees the second run updates the same 2 docs rather than adding rows (Task 6's curl will independently confirm exactly one `berlin` + one `neukoelln` object).

- [ ] **Step 6: Extend the stats workflow**

In `.github/workflows/schillerkiez-stats.yml`, add a dispatch input after `mss_sdi_url`:

```yaml
      mss_bezirke_xlsx_url:
        description: 'MSS Bezirke XLSX URL (leave empty for secret)'
        required: false
```

and the env line after `MSS_SDI_URL`:

```yaml
          MSS_BEZIRKE_XLSX_URL: ${{ inputs.mss_bezirke_xlsx_url || secrets.MSS_BEZIRKE_XLSX_URL }}
```

Validate: `npx --yes js-yaml .github/workflows/schillerkiez-stats.yml > /dev/null && echo "YAML OK"`

- [ ] **Step 7: Type-check and commit**

```bash
pnpm type-check 2>&1 | grep -c "error TS"   # expect 29
git add scripts/sync-stats.ts src/types/kiezStats.ts .github/workflows/schillerkiez-stats.yml
git commit -m "feat(kiez): import Berlin/Neukölln reference figures into schillerkiez_reference"
```

(Verify `git status` shows `.env` untracked/unstaged before committing.)

---

### Task 6: Additive `reference` field on `/api/kiez-stats`

**Files:**
- Modify: `src/types/kiezStats.ts` (extend `KiezStatsResponse`)
- Modify: `src/pages/api/kiez-stats.ts` (read reference docs, add to response)

**Interfaces:**
- Consumes: Task 5's `schillerkiez_reference` docs; existing `latestSocial` variable in the route (`src/pages/api/kiez-stats.ts:109-111`).
- Produces (consumed by Plan B UI): optional `reference` on `KiezStatsResponse`:
  `reference?: { period: string; berlin: { unemploymentRate: number; childPovertyRate: number; transferBenefitRate: number } | null; neukoelln: { … same shape … } | null }` — omitted entirely when no reference docs exist for the displayed social period.

- [ ] **Step 1: Extend the response type**

In `src/types/kiezStats.ts`, inside `KiezStatsResponse` (after `plrSocialTrend`), add:

```ts
  /** Berlin/Neukölln yardstick for the SAME period as `social` (novel §02). Omitted when absent — the Berlin-Vergleich module is then quietly absent, like air. */
  reference?: {
    period: string;
    berlin: {
      unemploymentRate: number;
      childPovertyRate: number;
      transferBenefitRate: number;
    } | null;
    neukoelln: {
      unemploymentRate: number;
      childPovertyRate: number;
      transferBenefitRate: number;
    } | null;
  };
```

- [ ] **Step 2: Read the reference docs in the route**

In `src/pages/api/kiez-stats.ts`, after the `plrSocialTrend` mapping (line ~232) and before `const response: KiezStatsResponse = {`, insert:

```ts
    // Reference figures (Berlin + Neukölln) for the SAME period as the
    // displayed social data — strictly 1:1, never back-filled from another
    // period. Absent ⇒ `reference` stays undefined ⇒ JSON.stringify omits it
    // ⇒ the Berlin-Vergleich module is quietly absent (same contract as air).
    let reference: KiezStatsResponse['reference'];
    if (latestSocial) {
      const refDocs = await db
        .collection('schillerkiez_reference')
        .find({ period: latestSocial.period })
        .toArray();
      if (refDocs.length > 0) {
        const pick = (scope: string) => {
          const d = refDocs.find((r) => r.scope === scope);
          return d
            ? {
                unemploymentRate: d.unemployment_rate,
                childPovertyRate: d.child_poverty_rate,
                transferBenefitRate: d.transfer_benefit_rate,
              }
            : null;
        };
        reference = {
          period: latestSocial.period,
          berlin: pick('berlin'),
          neukoelln: pick('neukoelln'),
        };
      }
    }
```

Then add `reference,` to the `response` object literal (after `plrSocialTrend,`). `JSON.stringify` drops it when `undefined`.

- [ ] **Step 3: Verify additively**

With a dev server on 4399:

```bash
curl -s http://localhost:4399/api/kiez-stats | jq '.reference'
curl -s http://localhost:4399/api/kiez-stats | jq 'keys'
```

Expected: `.reference` shows `{ "period": "2023", "berlin": {...}, "neukoelln": {...} }` with the exact values Task 5 upserted; `keys` shows all pre-existing keys (`demographics`, `social`, `plrAreas`, `trend`, `plrTrend`, `socialTrend`, `plrSocialTrend`, `lastUpdated`, `source`) plus `reference`. Spot-check one legacy field (e.g. `jq '.social'`) is unchanged.

Also verify the legacy dashboard still renders: open `http://localhost:4399/schillerkiez` in a browser or via playwright-cli and confirm the page hydrates with data.

- [ ] **Step 4: Type-check and commit**

```bash
pnpm type-check 2>&1 | grep -c "error TS"   # expect 29
git add src/types/kiezStats.ts src/pages/api/kiez-stats.ts
git commit -m "feat(kiez): additive reference field (Berlin/Neukölln) on /api/kiez-stats"
```

Stop the dev server.

---

### Task 7: Documentation

**Files:**
- Modify: `CLAUDE.md` (root — collections list + env vars)
- Modify: `src/components/kiez/CLAUDE.md` (pipeline notes)

**Interfaces:**
- Consumes: everything shipped in Tasks 1–6 (documents it).
- Produces: nothing code-facing.

- [ ] **Step 1: Root `CLAUDE.md`**

In the `## Database Collections` section, after the `schillerkiez_social` line, add:

```markdown
- `schillerkiez_air_log` - BLUME air readings for station mc042, appended every 30 min by the GitHub-Actions-triggered `GET /api/cron/log-air` (Bearer `CRON_SECRET`, fail-closed 503 when unset). One doc per BLUME measurement `ts` (unique index; duplicates dropped), with Europe/Berlin `day` key and LQI + pollutant grades. Hourly rows pruned after 90 days.
- `schillerkiez_air_daily` - Per-Berlin-day LQI rollups (`lqiMax`, `lqiMean`, `readings`), kept forever. Written only for days WITH readings — measurement gaps stay absent and render as dashed bars (never interpolated). Served with a last-reading lookup by public `GET /api/kiez-air-history`.
- `schillerkiez_reference` - Berlin + Neukölln yardstick figures (unemployment/child-poverty/transfer rates) per MSS period, imported by `scripts/sync-stats.ts` from the MSS Bezirke-level XLSX (`MSS_BEZIRKE_XLSX_URL`). Berlin is the residents-weighted mean of the 12 Bezirke (the file has no Berlin row; see `derivation`). Exposed additively as `reference?` on `/api/kiez-stats`, strictly 1:1 with the displayed social period.
```

In `## Environment Variables`, after `MSS_SDI_URL=`, add:

```
MSS_BEZIRKE_XLSX_URL=   # MSS Bezirke-level shares XLSX (optional, reference import for Berlin-Vergleich)
```

- [ ] **Step 2: `src/components/kiez/CLAUDE.md`**

Append:

```markdown
- **Air logger (Messwert-Logger, since July 2026)**: GitHub Actions (`.github/workflows/kiez-air-logger.yml`, `7,37 * * * *`) curls `GET /api/cron/log-air` (Bearer `CRON_SECRET`, fail-closed 503 when unset — same gate as process-deletions). Tick = fetch BLUME → upsert into `schillerkiez_air_log` (unique on measurement `ts`; BLUME publishes hourly so half the ticks are dedup no-ops) → recompute that Berlin day's rollup in `schillerkiez_air_daily` → prune hourly rows > 90 d. Day bucketing is Europe/Berlin (`berlinDayKey`/`lastBerlinDays` in `src/lib/kiez/airLog.ts`, DST-safe via noon-UTC stepping). **Gaps are never interpolated**: a day without readings has NO rollup doc and is served as `lqiMax: null`.
- **`GET /api/kiez-air-history`**: public, Mongo-only (works while BLUME is silent) — exactly 7 day slots oldest→today + `lastReading` for the kiosk state §04 strip. `GET /api/kiez-air` (live) is unchanged; both share `src/lib/kiez/blume.ts`.
- **Reference import (Berlin-Vergleich)**: `syncReference()` in `scripts/sync-stats.ts` reads the MSS **Bezirke** XLSX (`MSS_BEZIRKE_XLSX_URL` — a different file from the PLR-level `MSS_XLSX_URL`) → `schillerkiez_reference` (`scope: berlin|neukoelln`, unique `{scope, period}`). Neukölln = Bezirk row `08`; Berlin = EW-weighted mean of the 12 Bezirke (no Berlin row in the file — approximation, recorded in `derivation`). `/api/kiez-stats` adds `reference?` only for the exact `latestSocial.period` (no back-filling); absent ⇒ field omitted ⇒ module quietly absent.
- **MSS URLs moved (July 2026)**: berlin.de relocated MSS files from `/sen/sbw/…` to `/sen/stadt/…` — the old `MSS_XLSX_URL`/`MSS_SDI_URL` values 404. Update `.env` + GitHub secrets when touching the sync.
```

- [ ] **Step 3: Final checks and commit**

```bash
pnpm type-check 2>&1 | grep -c "error TS"   # expect 29
git add CLAUDE.md src/components/kiez/CLAUDE.md
git commit -m "docs(kiez): air logger, air-history API, reference import"
```
