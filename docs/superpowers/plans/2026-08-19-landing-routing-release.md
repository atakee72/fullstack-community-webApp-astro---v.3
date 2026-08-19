# Landing Page + Routing Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Public landing page („Das Schaufenster") at `/`, forum moves to `/forum`, member surfaces become login-gated, plus the public heartbeat data layer and the legal pages the landing footer links to.

**Architecture:** One SSR route at `/` with its own minimal layout (sibling of AuthLayout) mounting a single `client:load` Svelte island (SSR-rendered HTML + hydration for the DE/EN toggle; the heartbeat pulse is pure CSS). All landing data comes from one server lib (`getLandingData`) with a 1h in-Mongo cache doc (chronikCache pattern) — SSR consumes the lib directly; `GET /api/kiez-heartbeat` is a thin public wrapper. Gating is centralized in `src/middleware.ts` (page-prefix redirect → `/login?redirect=…`, API-prefix 401).

**Tech Stack:** Astro 5 SSR, Svelte 5 runes, kiosk i18n (`t`/`tStr`, localStorage locale), MongoDB direct driver, `sharp` (asset conversion), kiosk CSS vars.

**Spec:** `design/handoffs/design_handoff_landing/` — READMEFIRST.md + LANDING_SCOPING.md (§00–§14) + `jsx/kiosk-landing.jsx` (markup/copy source) + `tokens-landing.css` + `motion-landing.css`. CD's confirm-before-code answers were relayed in chat 2026-08-19 and are written into the package as `LANDING_CC_ANSWERS.md` by Task 1 (the file was announced but never landed in the folder). User decisions 2026-08-19: gate ALL member surfaces EXCEPT marketplace (stays public for SEO, final call later); legal pages drafted by us, user reviews; footer targets confirmed (Über → `/blog/das-mahalle-manifest`, Förderung → same post, Kontakt → `mailto:admin@mahalle.digital`, GitHub → `https://github.com/atakee72/fullstack-community-webApp-astro---v.3`).

## Global Constraints

- **Background recipe (non-negotiable, §02):** full-page absolute layer, `rotate(180deg)` · `background-size: cover` · `background-position: center top` · `mix-blend-mode: multiply` · `opacity: 0.16` · NO blur/filter. z-stack: image layer `z-index: 0`, ALL sibling children `position: relative; z-index: 1` — NEVER negative z-index. Teaser zone always on opaque paper `#f3ead8`. This overprint is sanctioned ONLY on `/`.
- **Zero rule (non-negotiable, §03):** the strip never shows a zero — lifeless rows are omitted SERVER-SIDE; strip handles 1–4 rows; 0 rows → strip doesn't render at all (no skeleton, no error text).
- **Confirmed heartbeat queries (LANDING_CC_ANSWERS):** Forum = approved topics+announcements+recommendations of the current ISO week (Europe/Berlin) · Termine = events Fri–Sun of the coming weekend · Luft = last logger reading ≤ 90 min else mute-dash · Kurier = today's curated issue exists. NO issue number anywhere — copy is „HEUTIGE AUSGABE ERSCHIENEN" / "TODAY'S ISSUE OUT".
- **ONE CTA** („Mitmachen — kostenlos" → `/register`); the only other auth entry is the „Anmelden →" text link in the date line. Logged-in on `/` → SSR redirect `/forum` before any render.
- **Banner slot stays EMPTY** between the masthead double rule and the strip (Sept launch banner) — a code comment marks it, nothing renders there.
- **Kurier headlines link to the SOURCE** (`target="_blank" rel="noopener noreferrer"`), never into the app. Blog + Kiez-Daten link into the app (`/blog/[slug]`, `/blog`, `/schillerkiez`).
- **Aggregates only** in heartbeat data — never names, titles, or UGC fragments (the Kurier *teaser* shows news titles: those are curated external headlines, not member UGC — allowed by §07).
- **No zeros faked, no seeds hardcoded** — every number from real sources at runtime; population from the demographics DB, never the 25.900 seed.
- **Accents only in their own slot:** Blog rust `#a3552e` · Kiez-Daten moss `var(--k-moss)` · Kurier ink · CTA ochre. Strip on-ink dot colors: air `#9db97c`, forum `#d16a87`, events `#6fb5c4`, kurier paper.
- **i18n:** full DE/EN parity via `kiosk-i18n.ts` (`lnd.*` keys); curly quotes DE „…", EN “…”; Kurier headlines + blog titles stay in source language. No color words in copy.
- **Motion:** exactly ONE animation (`lndPulse`, 2.4s opacity 0.3→1→0.3); `prefers-reduced-motion: reduce` → dots static at full opacity (mute dots stay at 0.45, never pulse).
- **Gating (user decision):** login-required prefixes = `/forum /topics /announcements /recommendations /calendar /events /newsboard /bookmarks /search /steckbrief /nachbarn` (pages) and `/api/topics /api/announcements /api/recommendations /api/events /api/news /api/comments` (GET/all methods, 401 JSON) with allowlist exception `/api/news/fetch-daily` (Vercel cron, has its own CRON_SECRET gate). Marketplace (`/marketplace`, `/api/listings`) stays PUBLIC. `/profile` keeps its in-page logged-out state (do NOT add it to the gate).
- **Landing asset:** `public/assets/background_landing_page.webp`, target < 200 KB; the PNG master stays in the handoff folder, untouched.
- **All landing/legal routes are SSR** (no `export const prerender`) — `/` needs the session check; legal pages just follow suit.
- Do not touch port 3000 (user's dev server). Browser checks: port 4655 only after `ss -tlnp | grep 4655` is free; teardown by PID if the pkill pattern misses.
- **Test cycle:** `pnpm type-check 2>&1 | grep -c "error"` equal to baseline (record in Task 1) + `pnpm build` green per task + Task 6 browser verification (dev DB `mahalle-dev`, NEVER prod).
- **Commit style:** simple/concise, NO AI signature, NO Co-Authored-By footer. Stage only named files.

---

### Task 1: Landing data lib + heartbeat endpoint + CC answers file

**Files:**
- Create: `design/handoffs/design_handoff_landing/LANDING_CC_ANSWERS.md`
- Create: `src/lib/landing.ts`
- Create: `src/pages/api/kiez-heartbeat.ts`

**Interfaces:**
- Consumes: `connectDB` (`src/lib/mongodb.ts`), `getAirHistory` (`src/lib/kiez/airLog.ts` — returns `{ days: [{day, lqiMean, lqiMax, readings}×7], lastReading: {ts, lqi} | null }`).
- Produces (Tasks 2/5 rely on): `getLandingData(): Promise<LandingData>` and types from `src/lib/landing.ts`:
  ```ts
  interface HeartbeatRow { kind: 'air' | 'forum' | 'events' | 'kurier'; value?: number; mute?: boolean; spark?: (number | null)[] }
  interface LandingData {
    rows: HeartbeatRow[];            // zero-filtered, display order air→forum→events→kurier
    population: number | null;       // latest demographics period, sum of population.total
    airGrade: number | null;         // 1–5 LQI grade of the last FRESH reading, null when stale/absent
    airSpark: (number | null)[];     // 7 days lqiMean, oldest first, null = gap
    kurier: { title: string; sourceName: string; sourceUrl: string }[]; // top 3 today, [] when no issue
    computedAt: string;              // ISO
  }
  ```
  Endpoint `GET /api/kiez-heartbeat` → `{ rows, computedAt }` (rows only — structured kinds, no baked labels; deviation from the spec's *proposed* response shape, sanctioned by CD's "design is serving-agnostic").

- [ ] **Step 1: Record the type-check baseline**

Run: `pnpm type-check 2>&1 | grep -c "error"` — note the number; later checks must not exceed it.

- [ ] **Step 2: Write the CC answers into the handoff package**

Create `design/handoffs/design_handoff_landing/LANDING_CC_ANSWERS.md` (the README references this file but it never landed; content reconstructed verbatim from CD's relayed message, 2026-08-19):

```markdown
# LANDING_CC_ANSWERS · Antworten auf die Confirm-before-code-Punkte (Aug 19 2026)

Von CD bestätigt (Relay via User, 19. Aug 2026):

1. **PNG-Gewicht** — WebP/AVIF mit Alpha, Ziel < 200 KB. Rezept ist formatunabhängig
   (rotate 180° · cover · center top · multiply · 0.16 · kein Blur); nur die Dateireferenz
   ändert sich. PNG bleibt als Master im Paket.
2. **„Nr. 214" entfällt** — eine erfundene Ausgabennummer wäre eine Fake-Metrik im
   Zeitungskostüm. Neue Copy: DE „HEUTIGE AUSGABE ERSCHIENEN" / EN "TODAY'S ISSUE OUT".
   Die Heartbeat-Zeile trägt keinen Zahlenwert; der Kurier-Teaser hatte nie eine Nummer.
3. **Heartbeat-Serving** — Lib-Funktion + 1h-Mongo-Cache-Doc (kiezKontextCache-Muster),
   direkt vom SSR konsumiert; `GET /api/kiez-heartbeat` als dünner Transparenz-Wrapper.
   SSR-Self-Fetch war nie intendiert — Design ist serving-agnostisch. Damit ist auch
   offene Frage 3 entschieden: Cache in-DB, nicht CDN.

**Q1 Query-Definitionen — bestätigt wie von CC vorgeschlagen:**
Forum = approved Topics+Announcements+Recommendations der laufenden ISO-Woche ·
Termine = Fr–So des KOMMENDEN Wochenendes · Luft = letzter Logger-Wert ≤ 90 min,
sonst Mute-Gedankenstrich (strenger als die 6h der Kiez-Seite — Absicht: der Strip
verspricht „stündlich aktualisiert", die Kiez-Seite nur Freshness-Ehrlichkeit) ·
Kurier = heutige Ausgabe vorhanden. Zero-Regel bleibt serverseitig.

**Q2 — bestätigt:** `/landing` → 301 auf `/`.

Hinweis: das kompilierte Bundle im Paket zeigt noch „Nr. 214" — ignorieren, die
JSX-Strings + diese Datei sind maßgeblich.
```

- [ ] **Step 3: Create `src/lib/landing.ts`**

```ts
/**
 * Landing-page data: heartbeat rows (zero rule SERVER-SIDE), population,
 * air grade + 7-day sparkline, today's Kurier top 3. SERVER-ONLY.
 *
 * Cached 1 HOUR in a Mongo singleton doc (`landingCache`, in-code TTL —
 * chronikCache pattern): the landing promises "STÜNDLICH AKTUALISIERT",
 * so the cache window and the promise match. SSR consumes this directly;
 * /api/kiez-heartbeat is a thin public wrapper. Never self-fetch over HTTP.
 *
 * Every aggregate is fail-soft (own try/catch): a failing source drops its
 * row/field and the page renders without it — no throw reaches the route.
 */
import { connectDB } from './mongodb';
import { getAirHistory } from './kiez/airLog';

export interface HeartbeatRow {
  kind: 'air' | 'forum' | 'events' | 'kurier';
  value?: number;
  mute?: boolean;
  spark?: (number | null)[];
}

export interface LandingData {
  rows: HeartbeatRow[];
  population: number | null;
  airGrade: number | null;
  airSpark: (number | null)[];
  kurier: { title: string; sourceName: string; sourceUrl: string }[];
  computedAt: string;
}

const CACHE_MS = 60 * 60 * 1000; // 1h — matches "STÜNDLICH AKTUALISIERT"
const AIR_FRESH_MS = 90 * 60 * 1000; // LANDING_CC_ANSWERS Q1: ≤90 min else mute

// Berlin-local Y-M-D parts for "now" (avoids UTC drift around midnight).
function berlinParts(now: Date): { y: number; m: number; d: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  const weekdayMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return {
    y: Number(get('year')),
    m: Number(get('month')),
    d: Number(get('day')),
    weekday: weekdayMap[get('weekday')] ?? 1,
  };
}

// Midnight Europe/Berlin for a Berlin-local Y-M-D, as a UTC Date.
// Berlin is UTC+1 or +2; compute via the offset the zone had at that moment.
function berlinMidnightUTC(y: number, m: number, d: number): Date {
  // Start from the naive UTC midnight, then correct by the zone offset.
  const naive = new Date(Date.UTC(y, m - 1, d));
  const tzName = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    timeZoneName: 'longOffset',
  })
    .formatToParts(naive)
    .find((p) => p.type === 'timeZoneName')?.value; // e.g. "GMT+02:00"
  const match = tzName?.match(/([+-])(\d{2}):(\d{2})/);
  const offsetMin = match ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3])) : 60;
  return new Date(naive.getTime() - offsetMin * 60_000);
}

/** Monday 00:00 Europe/Berlin of the current ISO week. */
export function isoWeekStart(now: Date): Date {
  const { y, m, d, weekday } = berlinParts(now);
  const monday = new Date(Date.UTC(y, m - 1, d - (weekday - 1)));
  return berlinMidnightUTC(monday.getUTCFullYear(), monday.getUTCMonth() + 1, monday.getUTCDate());
}

/** [Fri 00:00, Mon 00:00) Europe/Berlin of the COMING weekend (Fri–Sun; during Fri–Sun = the current one). */
export function weekendRange(now: Date): { from: Date; to: Date } {
  const { y, m, d, weekday } = berlinParts(now);
  // 5 - weekday: Mon–Thu → days AHEAD to Friday; Fri/Sat/Sun → 0/-1/-2,
  // i.e. the CURRENT weekend's Friday (spec: during the weekend, count it).
  const friOffset = 5 - weekday;
  const fri = new Date(Date.UTC(y, m - 1, d + friOffset));
  const mon = new Date(Date.UTC(fri.getUTCFullYear(), fri.getUTCMonth(), fri.getUTCDate() + 3));
  return {
    from: berlinMidnightUTC(fri.getUTCFullYear(), fri.getUTCMonth() + 1, fri.getUTCDate()),
    to: berlinMidnightUTC(mon.getUTCFullYear(), mon.getUTCMonth() + 1, mon.getUTCDate()),
  };
}

// Visible-to-the-public moderation filter (matches buildModerationFilter's
// public branch: approved or legacy-absent status).
const PUBLIC_MOD = { moderationStatus: { $nin: ['pending', 'rejected'] } };

async function compute(now: Date): Promise<LandingData> {
  const db = await connectDB();

  // ── air (row + grade + spark) ──
  let airGrade: number | null = null;
  let airSpark: (number | null)[] = [];
  let airRow: HeartbeatRow | null = null;
  try {
    const hist = await getAirHistory(db, now);
    airSpark = hist.days.map((d) => d.lqiMean);
    const fresh =
      hist.lastReading && now.getTime() - Date.parse(hist.lastReading.ts) <= AIR_FRESH_MS;
    if (fresh && hist.lastReading) {
      airGrade = hist.lastReading.lqi;
      airRow = { kind: 'air', value: airGrade, spark: airSpark };
    } else {
      // §03 Luft-Absent-State: row STAYS, mute dash — never a stale value.
      airRow = { kind: 'air', mute: true };
    }
  } catch {
    airRow = null; // air source completely down → row falls away entirely
  }

  // ── forum posts this ISO week ──
  let forumCount = 0;
  try {
    const since = isoWeekStart(now);
    const [t, a, r] = await Promise.all([
      db.collection('topics').countDocuments({ ...PUBLIC_MOD, createdAt: { $gte: since } }),
      db.collection('announcements').countDocuments({ ...PUBLIC_MOD, createdAt: { $gte: since } }),
      db.collection('recommendations').countDocuments({ ...PUBLIC_MOD, createdAt: { $gte: since } }),
    ]);
    forumCount = t + a + r;
  } catch {
    forumCount = 0;
  }

  // ── events on the coming weekend ──
  let weekendEvents = 0;
  try {
    const { from, to } = weekendRange(now);
    weekendEvents = await db.collection('events').countDocuments({
      ...PUBLIC_MOD,
      visibility: { $ne: 'private' },
      startDate: { $gte: from, $lt: to },
    });
  } catch {
    weekendEvents = 0;
  }

  // ── kurier: the STRIP row is today-only (honest "HEUTIGE AUSGABE"), but
  //    the TEASER falls back to the latest issue ≤3 days old — the daily
  //    cron runs 06:00 UTC (08:00 Berlin), so a today-only teaser would sit
  //    empty every morning. fetchDate is written via toISOString().split('T')[0]
  //    (UTC-keyed) — match that, not Berlin. ──
  let kurier: LandingData['kurier'] = [];
  let kurierToday = false;
  try {
    const todayKey = now.toISOString().split('T')[0];
    const latest = await db
      .collection('news')
      .find(
        { moderationStatus: 'approved', fetchDate: { $exists: true } },
        { projection: { fetchDate: 1 } },
      )
      .sort({ fetchDate: -1 })
      .limit(1)
      .toArray();
    const issueDay: string | undefined = latest[0]?.fetchDate;
    kurierToday = issueDay === todayKey;
    if (issueDay && Date.parse(todayKey) - Date.parse(issueDay) <= 3 * 86_400_000) {
      const docs = await db
        .collection('news')
        .find(
          { fetchDate: issueDay, moderationStatus: 'approved' },
          { projection: { title: 1, sourceName: 1, sourceUrl: 1, aiRelevanceScore: 1 } },
        )
        .sort({ aiRelevanceScore: -1 })
        .limit(3)
        .toArray();
      kurier = docs.map((d) => ({
        title: String(d.title ?? ''),
        sourceName: String(d.sourceName ?? ''),
        sourceUrl: String(d.sourceUrl ?? ''),
      }));
    }
  } catch {
    kurier = [];
    kurierToday = false;
  }

  // ── population: latest demographics period, all PLR areas summed ──
  let population: number | null = null;
  try {
    const agg = await db
      .collection('schillerkiez_demographics')
      .aggregate([
        { $sort: { period: -1 } },
        { $group: { _id: '$period', total: { $sum: '$population.total' } } },
        { $sort: { _id: -1 } },
        { $limit: 1 },
      ])
      .toArray();
    population = agg[0]?.total ?? null;
    if (typeof population !== 'number' || population <= 0) population = null;
  } catch {
    population = null;
  }

  // ── zero rule, SERVER-SIDE (§03): a row without life is omitted; the
  //    mute air row is life ("measurement paused" is information). ──
  const rows: HeartbeatRow[] = [];
  if (airRow) rows.push(airRow);
  if (forumCount > 0) rows.push({ kind: 'forum', value: forumCount });
  if (weekendEvents > 0) rows.push({ kind: 'events', value: weekendEvents });
  if (kurierToday) rows.push({ kind: 'kurier' });

  return { rows, population, airGrade, airSpark, kurier, computedAt: now.toISOString() };
}

export async function getLandingData(now: Date = new Date()): Promise<LandingData> {
  try {
    const db = await connectDB();
    const cacheCol = db.collection('landingCache');
    const cached = await cacheCol.findOne({ _id: 'landing' as any });
    if (cached && now.getTime() - new Date(cached.computedAt).getTime() < CACHE_MS) {
      return cached.payload as LandingData;
    }
    const payload = await compute(now);
    await cacheCol.updateOne(
      { _id: 'landing' as any },
      { $set: { payload, computedAt: now } },
      { upsert: true },
    );
    return payload;
  } catch (err) {
    console.error('[landing] getLandingData failed:', err);
    // Total failure → empty data; the strip collapses, the manifest carries
    // the page (§03 Totalausfall). Never throw into the route.
    return { rows: [], population: null, airGrade: null, airSpark: [], kurier: [], computedAt: now.toISOString() };
  }
}
```

- [ ] **Step 4: Create `src/pages/api/kiez-heartbeat.ts`**

```ts
import type { APIRoute } from 'astro';
import { getLandingData } from '../../lib/landing';

// Public transparency wrapper around the landing's cached aggregate data
// (LANDING_SCOPING §04). Unauth by design; aggregates only — no names, no
// UGC. Rows come pre-filtered (zero rule server-side); structured kinds
// instead of baked labels (serving-agnostic per LANDING_CC_ANSWERS #3).
export const GET: APIRoute = async () => {
  const data = await getLandingData();
  return new Response(JSON.stringify({ rows: data.rows, computedAt: data.computedAt }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
    },
  });
};
```

- [ ] **Step 5: Verify**

Run: `pnpm type-check 2>&1 | grep -c "error"` → equals baseline.
Run: `pnpm build 2>&1 | tail -3` → green.
(Do NOT try to smoke-test the lib via `npx tsx` — `src/lib/mongodb.ts` reads `import.meta.env`, which plain tsx doesn't provide; that's exactly why `scripts/*` use a raw MongoClient. Runtime verification of `getLandingData` + the endpoint happens in Task 6 via `curl /api/kiez-heartbeat` against the dev server.)

- [ ] **Step 6: Commit**

```bash
git add design/handoffs/design_handoff_landing/LANDING_CC_ANSWERS.md src/lib/landing.ts src/pages/api/kiez-heartbeat.ts
git commit -m "feat: landing data lib with 1h cache + public kiez-heartbeat endpoint"
```

---

### Task 2: Asset conversion + i18n keys + LandingPage island + LandingLayout

**Files:**
- Create: `public/assets/background_landing_page.webp` (generated, committed)
- Create: `src/layouts/LandingLayout.astro`
- Create: `src/components/landing/LandingPage.svelte`
- Modify: `src/lib/kiosk-i18n.ts` (add `lnd.*` keys in BOTH locale blocks)

**Interfaces:**
- Consumes: `LandingData`, `HeartbeatRow` types from `src/lib/landing.ts` (type-only import — dependency-pure, no server bleed); `t`, `tStr`, `locale`, `setLocale` from `src/lib/kiosk-i18n`.
- Produces: `LandingPage.svelte` props contract for Task 3:
  ```ts
  { data: LandingData; blog: { slug: string; title: string; description: string; pubDateISO: string }[] }
  ```

- [ ] **Step 1: Convert the background asset**

```bash
mkdir -p public/assets
node -e "
const sharp = require('sharp');
sharp('design/handoffs/design_handoff_landing/assets/background_landing_page-transparent.png')
  .webp({ quality: 80, alphaQuality: 80 })
  .toFile('public/assets/background_landing_page.webp')
  .then(i => console.log('bytes:', i.size));
"
```
Expected: printed size < 200000. If ≥ 200 KB, lower `quality` in steps of 10 until under (do not resize — the recipe uses `cover`, resolution matters). The PNG master in the handoff folder stays untouched.

- [ ] **Step 2: Add the `lnd.*` i18n keys**

In `src/lib/kiosk-i18n.ts`, in the **DE** block (near the other page namespaces), add:

```ts
  // Landing („Das Schaufenster")
  'lnd.loc': 'SCHILLERKIEZ · BERLIN-NEUKÖLLN',
  'lnd.signin': 'Anmelden →',
  'lnd.manifest': 'Der Kiez hat einen Ort. Reden, tauschen, treffen — hier, wo du wohnst.',
  'lnd.strip.right': 'STÜNDLICH AKTUALISIERT',
  'lnd.strip.air': 'LUFT IM KIEZ: {grade}',
  'lnd.strip.airMute': 'LUFT: MESSUNG PAUSIERT —',
  'lnd.strip.forum': '{n} BEITRÄGE DIESE WOCHE',
  'lnd.strip.forum1': '1 BEITRAG DIESE WOCHE',
  'lnd.strip.events': '{n} TERMINE AM WOCHENENDE',
  'lnd.strip.events1': '1 TERMIN AM WOCHENENDE',
  'lnd.strip.kurier': 'HEUTIGE AUSGABE ERSCHIENEN',
  'lnd.air.grade.1': 'SEHR GUT',
  'lnd.air.grade.2': 'GUT',
  'lnd.air.grade.3': 'MÄSSIG',
  'lnd.air.grade.4': 'SCHLECHT',
  'lnd.air.grade.5': 'SEHR SCHLECHT',
  'lnd.blog.kicker': 'AUS DER BEILAGE',
  'lnd.blog.byline': 'MAHALLE TEAM',
  'lnd.blog.link': 'Zur Beilage →',
  'lnd.daten.kicker': 'DER KIEZ, GEMESSEN',
  'lnd.daten.sub': 'NACHBAR:INNEN IM SCHILLERKIEZ',
  'lnd.daten.air': 'Luft heute: {grade}',
  'lnd.daten.spark': 'LETZTE 7 TAGE',
  'lnd.daten.link': 'Alle Zahlen →',
  'lnd.daten.grade.1': 'sehr gut',
  'lnd.daten.grade.2': 'gut',
  'lnd.daten.grade.3': 'mäßig',
  'lnd.daten.grade.4': 'schlecht',
  'lnd.daten.grade.5': 'sehr schlecht',
  'lnd.kurier.kicker': 'DER KURIER · HEUTE AUSGEWÄHLT',
  'lnd.kurier.note': 'Aus 9 Quellen kuratiert — jeder Link führt zur Quelle.',
  'lnd.cta.h': 'Mach mit im Kiez.',
  'lnd.cta.btn': 'Mitmachen — kostenlos',
  'lnd.cta.sub': 'FÜR NACHBAR:INNEN IM SCHILLERKIEZ · ANMELDUNG IN ZWEI MINUTEN',
  'lnd.cta.slogan': '„Das hier wird, was wir draus machen.“',
  'lnd.foot.impressum': 'Impressum',
  'lnd.foot.datenschutz': 'Datenschutz',
  'lnd.foot.ueber': 'Über das Projekt',
  'lnd.foot.foerderung': 'Förderung: Gebietsfonds',
  'lnd.foot.kontakt': 'Kontakt',
  'lnd.foot.github': 'GitHub ↗',
  'lnd.foot.copyright': '© {year} MAHALLE · SCHILLERKIEZ',
```

And in the **EN** block:

```ts
  // Landing ("The shop window")
  'lnd.loc': 'SCHILLERKIEZ · BERLIN-NEUKÖLLN',
  'lnd.signin': 'Sign in →',
  'lnd.manifest': 'The Kiez has a place. Talk, swap, meet — right where you live.',
  'lnd.strip.right': 'UPDATED HOURLY',
  'lnd.strip.air': 'KIEZ AIR: {grade}',
  'lnd.strip.airMute': 'AIR: MEASUREMENT PAUSED —',
  'lnd.strip.forum': '{n} POSTS THIS WEEK',
  'lnd.strip.forum1': '1 POST THIS WEEK',
  'lnd.strip.events': '{n} EVENTS THIS WEEKEND',
  'lnd.strip.events1': '1 EVENT THIS WEEKEND',
  'lnd.strip.kurier': 'TODAY’S ISSUE OUT',
  'lnd.air.grade.1': 'VERY GOOD',
  'lnd.air.grade.2': 'GOOD',
  'lnd.air.grade.3': 'MODERATE',
  'lnd.air.grade.4': 'POOR',
  'lnd.air.grade.5': 'VERY POOR',
  'lnd.blog.kicker': 'FROM THE SUPPLEMENT',
  'lnd.blog.byline': 'MAHALLE TEAM',
  'lnd.blog.link': 'Read the supplement →',
  'lnd.daten.kicker': 'THE KIEZ, MEASURED',
  'lnd.daten.sub': 'NEIGHBORS IN SCHILLERKIEZ',
  'lnd.daten.air': 'Air today: {grade}',
  'lnd.daten.spark': 'LAST 7 DAYS',
  'lnd.daten.link': 'All figures →',
  'lnd.daten.grade.1': 'very good',
  'lnd.daten.grade.2': 'good',
  'lnd.daten.grade.3': 'moderate',
  'lnd.daten.grade.4': 'poor',
  'lnd.daten.grade.5': 'very poor',
  'lnd.kurier.kicker': 'KURIER · TODAY’S PICKS',
  'lnd.kurier.note': 'Curated from 9 sources — every link goes to the source.',
  'lnd.cta.h': 'Join your Kiez.',
  'lnd.cta.btn': 'Join — it’s free',
  'lnd.cta.sub': 'FOR NEIGHBORS IN SCHILLERKIEZ · SIGN-UP TAKES TWO MINUTES',
  'lnd.cta.slogan': '“This becomes what we make of it.”',
  'lnd.foot.impressum': 'Impressum',
  'lnd.foot.datenschutz': 'Privacy',
  'lnd.foot.ueber': 'About the project',
  'lnd.foot.foerderung': 'Funding: Gebietsfonds',
  'lnd.foot.kontakt': 'Contact',
  'lnd.foot.github': 'GitHub ↗',
  'lnd.foot.copyright': '© {year} MAHALLE · SCHILLERKIEZ',
```

- [ ] **Step 3: Create `src/layouts/LandingLayout.astro`**

```astro
---
// Minimal public layout for `/` (Das Schaufenster) and the legal pages.
// Sibling of AuthLayout: no KioskNav, no tour, no splash, no avatar.
// The page content (incl. its own date line + footer) comes from the slot.
import { ViewTransitions } from 'astro:transitions';

export interface Props {
  title: string;
  description?: string;
}

const {
  title,
  description = 'Mahalle — der Ort für den Schillerkiez. Reden, tauschen, treffen.',
} = Astro.props;
---

<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content={description} />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
    <ViewTransitions />
  </head>
  <body class="min-h-screen k-paper-bg text-ink font-bricolage antialiased" data-page="landing">
    <slot />
  </body>
</html>

<style is:global>
  @import '../styles/global.css';
</style>
```

- [ ] **Step 4: Create `src/components/landing/LandingPage.svelte`**

This component renders the WHOLE page (date line → masthead → strip → teasers → CTA → footer) and is mounted `client:load` (SSR HTML for SEO + hydration for the DE/EN toggle). Styles live in the component `<style>` — it is mounted directly from an `.astro` route, so its scoped CSS is route-linked (the nested-island orphan rule does NOT apply here).

```svelte
<script lang="ts">
  // Das Schaufenster — public landing (design/handoffs/design_handoff_landing).
  // Data is SSR-provided via props (lib-direct, 1h cache); the ONLY runtime
  // JS behaviors are the locale toggle and the date line. Pulse is pure CSS.
  import { t, tStr, locale, setLocale } from '../../lib/kiosk-i18n';
  import type { LandingData, HeartbeatRow } from '../../lib/landing';

  let { data, blog } = $props<{
    data: LandingData;
    blog: { slug: string; title: string; description: string; pubDateISO: string }[];
  }>();

  const GITHUB_URL = 'https://github.com/atakee72/fullstack-community-webApp-astro---v.3';
  const year = new Date().getFullYear();

  const dateLine = $derived(
    new Intl.DateTimeFormat($locale === 'de' ? 'de-DE' : 'en-GB', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin',
    })
      .format(new Date())
      .toUpperCase()
      .replace(', ', ' · '),
  );

  function rowLabel(r: HeartbeatRow): string {
    switch (r.kind) {
      case 'air':
        return r.mute
          ? $t['lnd.strip.airMute']
          : tStr($t['lnd.strip.air'], { grade: $t[`lnd.air.grade.${r.value}`] ?? '' });
      case 'forum':
        return r.value === 1 ? $t['lnd.strip.forum1'] : tStr($t['lnd.strip.forum'], { n: String(r.value) });
      case 'events':
        return r.value === 1 ? $t['lnd.strip.events1'] : tStr($t['lnd.strip.events'], { n: String(r.value) });
      case 'kurier':
        return $t['lnd.strip.kurier'];
      default:
        return '';
    }
  }

  const DOT: Record<string, string> = {
    air: '#9db97c', forum: '#d16a87', events: '#6fb5c4', kurier: 'var(--k-paper)',
  };

  // Sparkline points from lqiMean values (nulls = gaps, simply skipped —
  // never interpolated). Y inverted: grade 1 (best) at top.
  function sparkPoints(vals: (number | null)[], w: number, h: number): string {
    const pts: string[] = [];
    const n = vals.length;
    vals.forEach((v, i) => {
      if (v == null) return;
      const x = n === 1 ? w / 2 : (i / (n - 1)) * (w - 2) + 1;
      const y = 1 + ((v - 1) / 4) * (h - 2);
      pts.push(`${x.toFixed(1)},${Math.min(h - 1, Math.max(1, y)).toFixed(1)}`);
    });
    return pts.join(' ');
  }

  function fmtBlogDate(iso: string): string {
    return new Intl.DateTimeFormat($locale === 'de' ? 'de-DE' : 'en-GB', {
      day: '2-digit', month: 'long', year: 'numeric',
    }).format(new Date(iso)).toUpperCase();
  }

  const popFmt = $derived(
    data.population != null
      ? new Intl.NumberFormat($locale === 'de' ? 'de-DE' : 'en-GB').format(data.population)
      : null,
  );
</script>

<div class="lnd-root">
  <!-- §02 VOLLBILD GESPIEGELT — z0 layer; every sibling is z1 via CSS below -->
  <div class="lnd-bg" aria-hidden="true"></div>

  <!-- date line -->
  <div class="lnd-dateline font-dmmono">
    <span>{dateLine}</span>
    <span class="lnd-loc">{$t['lnd.loc']}</span>
    <span class="lnd-dateline-right">
      <a href="/login" class="lnd-signin">{$t['lnd.signin']}</a>
      <span class="lnd-lang">
        <button type="button" class:active={$locale === 'de'} onclick={() => setLocale('de')}>DE</button>
        <span aria-hidden="true">|</span>
        <button type="button" class:active={$locale === 'en'} onclick={() => setLocale('en')}>EN</button>
      </span>
    </span>
  </div>

  <!-- masthead -->
  <header class="lnd-masthead">
    <h1 class="font-bricolage">M<span class="font-instrument lnd-a">a</span>halle</h1>
    <p class="font-instrument lnd-manifest">{$t['lnd.manifest']}</p>
  </header>
  <div class="lnd-rule"><div class="lnd-rule-thick"></div><div class="lnd-rule-thin"></div></div>

  <!-- BANNER SLOT (Sept launch banner, Gebietsfonds events) — stays EMPTY, do not build here -->

  <!-- §03 heartbeat strip — collapses entirely at 0 rows -->
  {#if data.rows.length > 0}
    <div class="lnd-strip" role="status">
      {#each data.rows as r (r.kind)}
        <div class="lnd-cell" class:lnd-cell-spark={!!r.spark}>
          <span class="lnd-dot" class:lnd-dot--mute={r.mute} style="background:{DOT[r.kind]}"></span>
          <span class="lnd-cell-label font-dmmono" class:lnd-mutetext={r.mute}>{rowLabel(r)}</span>
          {#if r.spark && r.spark.some((v) => v != null)}
            <svg class="lnd-cell-sparkline" width="62" height="16" viewBox="0 0 62 16" aria-hidden="true">
              <polyline points={sparkPoints(r.spark, 62, 16)} fill="none" stroke="#9db97c" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          {/if}
        </div>
      {/each}
      <div class="lnd-strip-right font-dmmono">{$t['lnd.strip.right']}</div>
    </div>
  {/if}

  <!-- teaser zone — ALWAYS opaque paper (§02) -->
  <main class="lnd-main">
    <section class="lnd-teaser lnd-teaser-blog">
      <div class="lnd-kicker"><span class="font-dmmono" style="background:#a3552e">{$t['lnd.blog.kicker']}</span></div>
      {#if blog[0]}
        <a href={`/blog/${blog[0].slug}`} class="lnd-plain"><h3 class="font-bricolage lnd-blog-h">{blog[0].title}</h3></a>
        <p class="lnd-blog-s">{blog[0].description}</p>
        <div class="lnd-meta font-dmmono">{fmtBlogDate(blog[0].pubDateISO)} · {$t['lnd.blog.byline']}</div>
      {/if}
      {#if blog[1]}
        <div class="lnd-blog2">
          <a href={`/blog/${blog[1].slug}`} class="lnd-plain"><div class="lnd-blog2-h">{blog[1].title}</div></a>
          <div class="lnd-meta font-dmmono">{fmtBlogDate(blog[1].pubDateISO)}</div>
        </div>
      {/if}
      <div class="lnd-linkrow"><a href="/blog" class="lnd-link" style="color:#a3552e">{$t['lnd.blog.link']}</a></div>
    </section>

    <section class="lnd-teaser lnd-teaser-daten">
      <div class="lnd-kicker"><span class="font-dmmono" style="background:var(--k-moss)">{$t['lnd.daten.kicker']}</span></div>
      {#if popFmt}
        <div class="lnd-bignum font-bricolage">{popFmt}</div>
        <div class="lnd-meta font-dmmono">{$t['lnd.daten.sub']}</div>
      {/if}
      {#if data.airGrade != null}
        <div class="lnd-airline">
          <span class="lnd-dot" style="background:var(--k-moss); width:9px; height:9px;"></span>
          <span>{tStr($t['lnd.daten.air'], { grade: $t[`lnd.daten.grade.${data.airGrade}`] ?? '' })}</span>
        </div>
      {/if}
      {#if data.airSpark.some((v) => v != null)}
        <div class="lnd-sparkrow">
          <svg width="120" height="26" viewBox="0 0 120 26" aria-hidden="true">
            <polyline points={sparkPoints(data.airSpark, 120, 26)} fill="none" stroke="var(--k-moss)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="lnd-meta font-dmmono">{$t['lnd.daten.spark']}</span>
        </div>
      {/if}
      <div class="lnd-linkrow"><a href="/schillerkiez" class="lnd-link" style="color:var(--k-moss)">{$t['lnd.daten.link']}</a></div>
    </section>

    <section class="lnd-teaser lnd-teaser-kurier">
      <div class="lnd-kicker"><span class="font-dmmono" style="background:var(--k-ink)">{$t['lnd.kurier.kicker']}</span></div>
      {#each data.kurier as h, i (h.sourceUrl + i)}
        <div class="lnd-head" class:lnd-head-first={i === 0}>
          <div class="lnd-head-t">{h.title}</div>
          <a href={h.sourceUrl} target="_blank" rel="noopener noreferrer" class="lnd-head-s font-dmmono">{h.sourceName.toUpperCase()} ↗</a>
        </div>
      {/each}
      <div class="font-instrument lnd-kurier-note">{$t['lnd.kurier.note']}</div>
    </section>
  </main>

  <!-- CTA (§08) — the page's ONE call to action -->
  <div class="lnd-cta">
    <h2 class="font-bricolage">{$t['lnd.cta.h']}</h2>
    <a href="/register" class="lnd-cta-btn font-bricolage">{$t['lnd.cta.btn']}</a>
    <div class="lnd-meta font-dmmono lnd-cta-sub">{$t['lnd.cta.sub']}</div>
    <div class="font-instrument lnd-slogan">{$t['lnd.cta.slogan']}</div>
  </div>

  <!-- footer (§09) — no language switcher here (it sits in the date line) -->
  <footer class="lnd-footer">
    <div class="lnd-footlinks font-dmmono">
      <a href="/impressum">{$t['lnd.foot.impressum']}</a>
      <a href="/datenschutz">{$t['lnd.foot.datenschutz']}</a>
      <a href="/blog/das-mahalle-manifest">{$t['lnd.foot.ueber']}</a>
      <a href="/blog/das-mahalle-manifest">{$t['lnd.foot.foerderung']}</a>
      <a href="mailto:admin@mahalle.digital">{$t['lnd.foot.kontakt']}</a>
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">{$t['lnd.foot.github']}</a>
    </div>
    <span class="font-dmmono lnd-copy">{tStr($t['lnd.foot.copyright'], { year })}</span>
  </footer>
</div>

<style>
  /* ── root + §02 background (VOLLBILD GESPIEGELT, non-negotiable) ── */
  .lnd-root { min-height: 100vh; display: flex; flex-direction: column; background: var(--k-paper); position: relative; overflow-x: clip; }
  .lnd-root > :global(*) { position: relative; z-index: 1; }
  .lnd-root > .lnd-bg {
    position: absolute; inset: 0; z-index: 0; pointer-events: none;
    background-image: url('/assets/background_landing_page.webp');
    background-size: cover; background-repeat: no-repeat; background-position: center top;
    mix-blend-mode: multiply; opacity: 0.16; transform: rotate(180deg);
  }

  /* ── date line ── */
  .lnd-dateline { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 12px 48px; border-bottom: 1px solid var(--k-rule); font-size: 10px; letter-spacing: 0.12em; color: var(--k-ink-mute); }
  .lnd-dateline-right { display: flex; gap: 18px; align-items: baseline; }
  .lnd-signin { color: var(--k-ink); text-decoration: underline; text-decoration-style: dashed; text-underline-offset: 3px; }
  .lnd-lang button { background: none; border: none; padding: 0 2px; font: inherit; color: var(--k-ink-mute); cursor: pointer; min-width: 24px; min-height: 24px; }
  .lnd-lang button.active { color: var(--k-ink); font-weight: 700; }

  /* ── masthead + double rule ── */
  .lnd-masthead { text-align: center; padding: 30px 48px 20px; }
  .lnd-masthead h1 { font-size: 96px; font-weight: 800; letter-spacing: -0.045em; line-height: 0.95; margin: 0; color: var(--k-ink); }
  .lnd-a { font-style: italic; font-weight: 400; letter-spacing: 0; }
  .lnd-manifest { font-style: italic; font-size: 23px; color: var(--k-ink-soft); margin: 13px 0 0; }
  .lnd-rule { padding: 0 48px; margin-bottom: 10px; }
  .lnd-rule-thick { height: 3px; background: var(--k-ink); }
  .lnd-rule-thin { height: 1px; background: var(--k-ink); margin-top: 3px; }

  /* ── heartbeat strip ── */
  .lnd-strip { background: var(--k-ink); color: var(--k-paper); display: flex; align-items: stretch; padding: 0 48px; }
  .lnd-cell { display: flex; align-items: center; gap: 9px; padding: 13px 18px; flex: 1; min-width: 0; }
  .lnd-cell + .lnd-cell { border-left: 1px solid rgba(243, 234, 216, 0.22); }
  .lnd-cell-spark { flex: 1.2; }
  .lnd-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; animation: lndPulse 2.4s ease-in-out infinite; }
  .lnd-dot--mute { animation: none; opacity: 0.45; }
  .lnd-cell-label { font-size: 10.5px; letter-spacing: 0.1em; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lnd-mutetext { color: rgba(243, 234, 216, 0.55); }
  .lnd-cell-sparkline { flex-shrink: 0; }
  .lnd-strip-right { display: flex; align-items: center; padding: 13px 0 13px 18px; border-left: 1px solid rgba(243, 234, 216, 0.22); margin-left: auto; font-size: 9.5px; letter-spacing: 0.12em; color: rgba(243, 234, 216, 0.5); white-space: nowrap; }
  @keyframes lndPulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }

  /* ── teaser zone (ALWAYS opaque paper, §02) ── */
  .lnd-main { flex: 1; display: grid; grid-template-columns: 1.18fr 1fr 1fr; padding: 28px 48px 22px; background: var(--k-paper); }
  .lnd-teaser-blog { padding-right: 26px; }
  .lnd-teaser-daten { padding: 0 26px; border-left: 1px solid var(--k-rule); }
  .lnd-teaser-kurier { padding-left: 26px; border-left: 1px solid var(--k-rule); display: flex; flex-direction: column; }
  .lnd-kicker { border-bottom: 1px dashed var(--k-rule); padding-bottom: 7px; margin-bottom: 14px; }
  .lnd-kicker span { font-size: 10.5px; font-weight: 500; letter-spacing: 0.16em; color: var(--k-paper); padding: 3px 9px 4px; display: inline-block; }
  .lnd-plain { text-decoration: none; color: inherit; }
  .lnd-blog-h { font-size: 25px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.12; margin: 0 0 10px; }
  .lnd-blog-s { font-size: 13.5px; line-height: 1.55; color: var(--k-ink-soft); margin: 0 0 8px; }
  .lnd-meta { font-size: 9.5px; letter-spacing: 0.1em; color: var(--k-ink-mute); }
  .lnd-blog2 { border-top: 1px dashed var(--k-rule); margin-top: 14px; padding-top: 12px; }
  .lnd-blog2-h { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.25; }
  .lnd-linkrow { margin-top: 16px; }
  .lnd-link { font-size: 13px; font-weight: 700; text-decoration: underline; text-decoration-style: dashed; text-underline-offset: 3px; }
  .lnd-bignum { font-size: 62px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; color: var(--k-moss); }
  .lnd-airline { display: flex; align-items: center; gap: 9px; margin-top: 20px; padding-top: 14px; border-top: 1px dashed var(--k-rule); font-size: 14px; font-weight: 600; }
  .lnd-sparkrow { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
  .lnd-head { padding: 11px 0; border-top: 1px dashed var(--k-rule); }
  .lnd-head-first { padding-top: 0; border-top: none; }
  .lnd-head-t { font-size: 15px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.3; }
  .lnd-head-s { display: inline-block; font-size: 9.5px; letter-spacing: 0.1em; color: var(--k-ink-mute); margin-top: 5px; text-decoration: underline; text-decoration-style: dashed; text-underline-offset: 3px; }
  .lnd-kurier-note { font-style: italic; font-size: 12.5px; color: var(--k-ink-mute); margin-top: auto; padding-top: 10px; }

  /* ── CTA (§08) ── */
  .lnd-cta { text-align: center; padding: 26px 48px 28px; border-top: 1px dashed var(--k-ochre); background: rgba(176, 117, 21, 0.10); }
  .lnd-cta h2 { font-size: 30px; font-weight: 800; letter-spacing: -0.025em; margin: 0 0 16px; }
  .lnd-cta-btn { display: inline-block; background: var(--k-ink); color: var(--k-paper); font-size: 16px; font-weight: 700; padding: 13px 30px; min-height: 48px; box-sizing: border-box; border-radius: 999px; border: 1.5px solid var(--k-ink); box-shadow: 3px 3px 0 var(--k-ochre); text-decoration: none; }
  .lnd-cta-sub { margin-top: 13px; }
  .lnd-slogan { font-style: italic; font-size: 21px; color: var(--k-ink); margin-top: 16px; }

  /* ── footer (§09) ── */
  .lnd-footer { border-top: 1px solid var(--k-rule); padding: 15px 48px 20px; display: flex; flex-wrap: wrap; gap: 16px; align-items: baseline; justify-content: space-between; }
  .lnd-footlinks { display: flex; flex-wrap: wrap; gap: 16px; }
  .lnd-footlinks a { font-size: 10px; letter-spacing: 0.08em; color: var(--k-ink-soft); text-decoration: underline; text-decoration-style: dashed; text-underline-offset: 3px; }
  .lnd-copy { font-size: 10px; letter-spacing: 0.08em; color: var(--k-ink-mute); }

  /* ── mobile (§10): stacked, strip as row-stack, teasers in one opaque wrapper ── */
  @media (max-width: 1023px) {
    .lnd-dateline { padding: 10px 18px; font-size: 9px; }
    .lnd-loc { display: none; }
    .lnd-masthead { padding: 22px 18px 16px; }
    .lnd-masthead h1 { font-size: 54px; }
    .lnd-manifest { font-size: 16.5px; line-height: 1.35; margin-top: 10px; }
    .lnd-rule { padding: 0 18px; }
    .lnd-strip { flex-direction: column; padding: 0; }
    .lnd-cell { padding: 11px 18px; }
    .lnd-cell + .lnd-cell { border-left: none; border-top: 1px solid rgba(243, 234, 216, 0.18); }
    .lnd-cell-sparkline { margin-left: auto; }
    .lnd-strip-right { display: none; }
    .lnd-main { grid-template-columns: 1fr; padding: 4px 18px 12px; }
    .lnd-teaser-blog { padding: 16px 0 4px; }
    .lnd-teaser-daten { padding: 18px 0 4px; border-left: none; }
    .lnd-teaser-kurier { padding: 18px 0 0; border-left: none; }
    .lnd-blog-h { font-size: 20px; }
    .lnd-bignum { font-size: 42px; }
    .lnd-cta { padding: 26px 18px; }
    .lnd-cta h2 { font-size: 26px; }
    .lnd-cta-btn { font-size: 15px; padding: 13px 26px; }
    .lnd-slogan { font-size: 18px; }
    .lnd-footer { padding: 16px 18px 20px; gap: 8px 14px; }
    .lnd-footlinks { gap: 8px 14px; }
    .lnd-footlinks a { min-height: 24px; display: inline-flex; align-items: center; }
  }

  /* §12: reduced motion — dots static at FULL opacity, mute stays dimmed.
     MUST remain the last lnd-dot rules in this block (source order beats
     equal specificity — same guard as the .am-* block in global.css). */
  @media (prefers-reduced-motion: reduce) {
    .lnd-dot { animation: none; opacity: 1; }
    .lnd-dot--mute { opacity: 0.45; }
  }
</style>
```

- [ ] **Step 5: Verify**

Run: `pnpm type-check 2>&1 | grep -c "error"` → equals baseline.
Run: `pnpm build 2>&1 | tail -3` → green (the component isn't routed yet — Task 3 wires it; the build catches syntax/type issues now).
Run: `ls -la public/assets/background_landing_page.webp` → exists, < 200 KB.

- [ ] **Step 6: Commit**

```bash
git add public/assets/background_landing_page.webp src/layouts/LandingLayout.astro src/components/landing/LandingPage.svelte src/lib/kiosk-i18n.ts
git commit -m "feat: landing page island, minimal layout, i18n keys, webp background"
```

---

### Task 3: Routing — forum to /forum, landing at /, fossil 301, nav + link updates

**Files:**
- Rename: `src/pages/index.astro` → `src/pages/forum.astro` (git mv, then edit comment)
- Create: new `src/pages/index.astro` (landing route)
- Rewrite: `src/pages/landing.astro` (fossil → 301)
- Modify: `src/components/forum/kiosk/KioskNav.svelte` (Forum pill href + FORUM_MATCH)
- Modify: `src/components/forum/kiosk/ForumPostDetail.svelte:325`, `src/components/forum/kiosk/compose/ComposePageInner.svelte:231,236`, `src/components/auth/kiosk/AuthLoginInner.svelte:108`, `src/components/auth/kiosk/AuthVerifyInner.svelte:31` (semantic „forum home" links `'/'` → `'/forum'`)
- Modify: `src/components/SplashScreen.astro` (remove the now-dead `'/'` allowlist entry)

**Interfaces:**
- Consumes: `LandingLayout.astro` + `LandingPage.svelte` (Task 2 props contract), `getLandingData` (Task 1).
- Produces: `/` = landing (SSR, logged-in redirect → `/forum`); `/forum` = the forum index (unchanged content); `/landing` → 301 `/`.

- [ ] **Step 1: Move the forum index**

```bash
git mv src/pages/index.astro src/pages/forum.astro
```
Then edit the moved file's leading comment: replace the paragraph starting `// URL move (`/` → `/forum`) is deferred…` with:
```
// Lives at /forum since the landing release (Aug 2026): `/` is the public
// landing (Das Schaufenster), which SSR-redirects logged-in members here.
```
Nothing else in the file changes.

- [ ] **Step 2: Create the new `src/pages/index.astro`**

```astro
---
// Das Schaufenster — public landing at `/`. Members never see this page:
// SSR redirects any session straight to /forum before render (§00).
// All data comes lib-direct (1h Mongo cache) — never self-fetch our own API.
import LandingLayout from '../layouts/LandingLayout.astro';
import LandingPage from '../components/landing/LandingPage.svelte';
import { getSession } from 'auth-astro/server';
import { getCollection } from 'astro:content';
import { getLandingData } from '../lib/landing';

const session = await getSession(Astro.request);
if (session?.user) return Astro.redirect('/forum');

const data = await getLandingData();

// Blog teaser: newest two non-draft posts (build-time content collection —
// no caching needed). Fail-soft: an empty collection renders an empty slot.
let blog: { slug: string; title: string; description: string; pubDateISO: string }[] = [];
try {
  const entries = (await getCollection('blog', ({ data: d }) => !d.draft))
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .slice(0, 2);
  blog = entries.map((e) => ({
    slug: e.id,
    title: e.data.title,
    description: e.data.description ?? '',
    pubDateISO: e.data.pubDate.toISOString(),
  }));
} catch (err) {
  console.error('[landing] blog teaser failed:', err);
}
---

<LandingLayout
  title="Mahalle — Der Ort für den Schillerkiez"
  description="Der Kiez hat einen Ort. Reden, tauschen, treffen — hier, wo du wohnst. Community-Plattform für den Schillerkiez, Berlin-Neukölln."
>
  <LandingPage client:load {data} {blog} />
</LandingLayout>
```

**Note for the implementer:** the blog collection uses the Astro 5 content-layer glob loader (`src/content.config.ts`), so the entry identifier is `e.id` (e.g. `das-mahalle-manifest`) and the detail route is `src/pages/blog/[...slug].astro`. Sanity-check one URL: `/blog/das-mahalle-manifest` must be how the existing blog index links its cards (grep `BeilageIndex`'s href construction if in doubt).

- [ ] **Step 3: Rewrite the `/landing` fossil as a 301**

Replace the ENTIRE content of `src/pages/landing.astro` with:

```astro
---
// 2023 fossil route. Permanently moved: the landing lives at `/` since
// Aug 2026 (LANDING_CC_ANSWERS Q2 — 301 keeps any old external links alive).
return Astro.redirect('/', 301);
---
```

- [ ] **Step 4: Update KioskNav**

In `src/components/forum/kiosk/KioskNav.svelte`:
1. Replace `const FORUM_MATCH = ['/', '/forum', '/topics', '/announcements', '/recommendations'];` with:
```ts
  // `/` is the public landing now — the Forum pill points at /forum and no
  // longer claims the root path. (Members hitting `/` get SSR-redirected.)
  const FORUM_MATCH = ['/forum', '/topics', '/announcements', '/recommendations'];
```
2. In `topNav`, change the Forum entry `{ href: '/', … }` to `{ href: '/forum', label: $t['nav.forum'], match: FORUM_MATCH },`.
3. In `bottomNav`, change the Forum entry `{ href: '/', … }` to `{ href: '/forum', label: $t['nav.short.forum'], match: FORUM_MATCH },`.
4. The brand link (`<a href="/" class="flex items-center gap-3 group shrink-0">`) STAYS at `/` — logged-out visitors on public kiosk pages (blog, marketplace, Kiez-Daten) correctly reach the landing; members get redirected to /forum by the route itself.

- [ ] **Step 5: Update semantic forum-home links**

Each of these means "go to the forum index" and must point at `/forum` (the `/`→`/forum` redirect would cover members, but direct links skip the extra hop):
- `src/components/forum/kiosk/ForumPostDetail.svelte:325`: `window.location.href = '/';` → `window.location.href = '/forum';`
- `src/components/forum/kiosk/compose/ComposePageInner.svelte:231` and `:236`: `window.location.href = '/';` → `window.location.href = '/forum';`
- `src/components/auth/kiosk/AuthLoginInner.svelte:108`: `window.location.href = '/';` → `window.location.href = '/forum';` (Task 5 extends this line further for `?redirect=` — leave it simple here)
- `src/components/auth/kiosk/AuthVerifyInner.svelte:31`: `hasSession ? '/' : '/login'` → `hasSession ? '/forum' : '/login'`

Do NOT touch `src/pages/logout.astro` (`Astro.redirect('/')`) — a logged-out user landing on the landing page is correct.

- [ ] **Step 6: Clean the splash allowlist**

In `src/components/SplashScreen.astro`, find the page-allowlist array (contains `'/'`, `'/newsboard'`, `'/calendar'`, …) and remove the `'/'` entry. (It has been dead since the forum moved to KioskLayout — the landing uses LandingLayout, which has no splash — but a live `'/'` entry would now *look* like it targets the landing.) Add no new entries; `/forum` uses KioskLayout and gets no splash, matching every other kiosk surface.

- [ ] **Step 7: Verify**

Run: `pnpm type-check 2>&1 | grep -c "error"` → equals baseline.
Run: `pnpm build 2>&1 | tail -3` → green.
Run: `grep -rn "href: '/'" src/components/forum/kiosk/KioskNav.svelte` → ZERO matches (the nav-array Forum entries now use `/forum`; the brand anchor is markup `href="/"`, which this pattern deliberately doesn't match — it stays).

- [ ] **Step 8: Commit**

```bash
git add -A src/pages/index.astro src/pages/forum.astro src/pages/landing.astro src/components/forum/kiosk/KioskNav.svelte src/components/forum/kiosk/ForumPostDetail.svelte src/components/forum/kiosk/compose/ComposePageInner.svelte src/components/auth/kiosk/AuthLoginInner.svelte src/components/auth/kiosk/AuthVerifyInner.svelte src/components/SplashScreen.astro
git commit -m "feat: landing at /, forum moves to /forum, /landing 301, nav + link updates"
```

---

### Task 4: Legal pages (/impressum, /datenschutz)

**Files:**
- Create: `src/pages/impressum.astro`
- Create: `src/pages/datenschutz.astro`

**Interfaces:**
- Consumes: `LandingLayout.astro` (Task 2).
- Produces: the two routes the landing footer (Task 2) links to. Static German-only content (legal texts are authoritative in German; no EN variant — standard practice).

- [ ] **Step 1: Create `src/pages/impressum.astro`**

```astro
---
// Impressum — static legal page on the landing's minimal layout.
// ⚠ ADDRESS PLACEHOLDER: user must supply the ladungsfähige Anschrift
// before this is legally complete (flagged in the release summary).
import LandingLayout from '../layouts/LandingLayout.astro';
---

<LandingLayout title="Impressum | Mahalle" description="Impressum der Mahalle-Plattform.">
  <div class="lgl-wrap">
    <a href="/" class="lgl-back font-dmmono">← Mahalle</a>
    <h1 class="font-bricolage">Impressum</h1>

    <h2 class="font-bricolage">Angaben gemäß § 5 DDG</h2>
    <p>
      Ercan Atak<br />
      [Straße Hausnummer]<br />
      [PLZ] Berlin
    </p>
    <p>E-Mail: <a href="mailto:admin@mahalle.digital">admin@mahalle.digital</a></p>

    <h2 class="font-bricolage">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
    <p>Ercan Atak (Anschrift wie oben)</p>

    <h2 class="font-bricolage">Über dieses Projekt</h2>
    <p>
      Mahalle ist ein nichtkommerzielles Nachbarschaftsprojekt für den Schillerkiez
      in Berlin-Neukölln. Der Quellcode ist öffentlich einsehbar
      (<a href="https://github.com/atakee72/fullstack-community-webApp-astro---v.3" target="_blank" rel="noopener noreferrer">GitHub</a>,
      PolyForm-Noncommercial-Lizenz). Das Projekt wird anteilig durch den
      Gebietsfonds des Quartiersmanagements gefördert.
    </p>

    <h2 class="font-bricolage">Haftung für Inhalte</h2>
    <p>
      Beiträge im Forum, Kalender und Marktplatz werden von Mitgliedern erstellt.
      Alle Inhalte durchlaufen eine automatisierte Prüfung und werden bei Meldungen
      redaktionell geprüft. Bei Hinweisen auf Rechtsverstöße entfernen wir die
      betroffenen Inhalte umgehend: <a href="mailto:admin@mahalle.digital">admin@mahalle.digital</a>.
    </p>
  </div>
</LandingLayout>

<style>
  .lgl-wrap { max-width: 680px; margin: 0 auto; padding: 40px 22px 60px; }
  .lgl-back { display: inline-block; font-size: 11px; letter-spacing: 0.1em; color: var(--k-ink-mute); text-decoration: none; margin-bottom: 24px; }
  .lgl-wrap h1 { font-size: 34px; font-weight: 800; letter-spacing: -0.03em; margin: 0 0 20px; }
  .lgl-wrap h2 { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; margin: 26px 0 8px; }
  .lgl-wrap p { font-size: 14px; line-height: 1.65; color: var(--k-ink-soft); margin: 0 0 10px; }
  .lgl-wrap a { color: var(--k-ink); text-decoration: underline; text-decoration-style: dashed; text-underline-offset: 3px; }
</style>
```

- [ ] **Step 2: Create `src/pages/datenschutz.astro`**

Same layout/`<style>` block as Step 1 (repeat the `.lgl-*` styles verbatim in this file's own `<style>` — scoped styles don't share between pages). Content:

```astro
---
// Datenschutzerklärung — static legal page. Drafted from the actual data
// flows of the app (processors: MongoDB Atlas Frankfurt, Vercel, Cloudinary,
// Resend EU, Sentry EU, OpenAI moderation). User reviews before launch.
import LandingLayout from '../layouts/LandingLayout.astro';
---

<LandingLayout title="Datenschutz | Mahalle" description="Datenschutzerklärung der Mahalle-Plattform.">
  <div class="lgl-wrap">
    <a href="/" class="lgl-back font-dmmono">← Mahalle</a>
    <h1 class="font-bricolage">Datenschutzerklärung</h1>

    <h2 class="font-bricolage">1. Verantwortlicher</h2>
    <p>Ercan Atak, [Anschrift wie im Impressum] · <a href="mailto:admin@mahalle.digital">admin@mahalle.digital</a></p>

    <h2 class="font-bricolage">2. Welche Daten wir verarbeiten</h2>
    <p>
      <strong>Konto:</strong> Name, E-Mail-Adresse und Passwort (verschlüsselt gespeichert
      als bcrypt-Hash). <strong>Inhalte:</strong> Beiträge, Kommentare, Termine, Inserate
      und hochgeladene Bilder, die du selbst veröffentlichst. <strong>Technisch:</strong>
      Session-Cookies für den Login (JWT), Spracheinstellung im lokalen Speicher deines
      Browsers, sowie gekürzte/gehashte IP-Adressen zur Missbrauchsabwehr (Rate-Limiting).
      Es gibt kein Werbe-Tracking und keine Analyse-Cookies.
    </p>

    <h2 class="font-bricolage">3. Zwecke und Rechtsgrundlagen</h2>
    <p>
      Verarbeitung zur Bereitstellung der Plattform und deines Kontos
      (Art. 6 Abs. 1 lit. b DSGVO), zur Missbrauchs- und Spamabwehr einschließlich
      automatisierter Inhaltsprüfung (Art. 6 Abs. 1 lit. f DSGVO) sowie zum Versand
      funktionaler E-Mails wie Verifizierung und Passwort-Zurücksetzen
      (Art. 6 Abs. 1 lit. b DSGVO).
    </p>

    <h2 class="font-bricolage">4. Auftragsverarbeiter und Empfänger</h2>
    <p>
      Hosting: Vercel (Serverless, Region Frankfurt). Datenbank: MongoDB Atlas
      (Frankfurt). Bilder: Cloudinary. E-Mail-Versand: Resend (EU-Region).
      Fehlerdiagnose: Sentry (EU-Region, ohne personenbezogene Zusatzdaten).
      Automatisierte Inhaltsprüfung: OpenAI (übermittelt werden nur die zu
      prüfenden Texte/Bilder, keine Kontodaten). Mit den Anbietern bestehen
      Auftragsverarbeitungsverträge nach Art. 28 DSGVO.
    </p>

    <h2 class="font-bricolage">5. Speicherdauer und Löschung</h2>
    <p>
      Deine Daten bleiben gespeichert, solange dein Konto besteht. Du kannst dein
      Konto jederzeit selbst löschen (Profil → Konto): nach einer 7-tägigen
      Widerrufsfrist werden Name, E-Mail, Passwort und Profildaten entfernt bzw.
      anonymisiert. Beim Kontakt über den Marktplatz speichern wir nur Metadaten
      (keine Nachrichtentexte).
    </p>

    <h2 class="font-bricolage">6. Deine Rechte</h2>
    <p>
      Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der
      Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO) sowie
      das Recht auf Beschwerde bei einer Aufsichtsbehörde — in Berlin: Berliner
      Beauftragte für Datenschutz und Informationsfreiheit. Anfragen an:
      <a href="mailto:admin@mahalle.digital">admin@mahalle.digital</a>.
    </p>
  </div>
</LandingLayout>
```

(plus the identical `<style>` block from Step 1.)

- [ ] **Step 3: Verify**

Run: `pnpm type-check 2>&1 | grep -c "error"` → equals baseline.
Run: `pnpm build 2>&1 | tail -3` → green.

- [ ] **Step 4: Commit**

```bash
git add src/pages/impressum.astro src/pages/datenschutz.astro
git commit -m "feat: Impressum + Datenschutz pages (address placeholder pending)"
```

---

### Task 5: Login gating (middleware) + ?redirect support + auth heartbeat refit

**Files:**
- Modify: `src/middleware.ts` (gate after session resolution)
- Modify: `src/components/auth/kiosk/AuthLoginInner.svelte` (`?redirect=` support at the success line)
- Modify: `src/components/auth/kiosk/KiezHeartbeat.svelte` (single-fetch refit — the old `/api/news` + `/api/events` fetches 401 after gating)
- Modify: `src/lib/kiosk-i18n.ts` (auth heartbeat label wording, DE + EN)

**Interfaces:**
- Consumes: `GET /api/kiez-heartbeat` → `{ rows: [{kind, value?, mute?, spark?}] }` (Task 1); existing `context.locals.session` population in the middleware.
- Produces: logged-out requests to gated pages → 302 `/login?redirect=<path+search>`; gated APIs → 401 JSON; login honors a sanitized `?redirect=`.

- [ ] **Step 1: Add the gate to `src/middleware.ts`**

Directly after the session try/catch that populates `context.locals` (the block ending with `context.locals.session = null;` and its closing braces), insert:

```ts
    // ── Login gate (Aug 2026 landing release) ──
    // Member surfaces require a session. Marketplace deliberately stays
    // public (SEO decision pending), /profile renders its own logged-out
    // state, and the landing/blog/Kiez-Daten/legal/auth pages are public.
    const GATED_PAGES = [
      '/forum', '/topics', '/announcements', '/recommendations',
      '/calendar', '/events', '/newsboard',
      '/bookmarks', '/search', '/steckbrief', '/nachbarn',
    ];
    // List/read APIs of gated surfaces — without this the page gate is
    // cosmetic (data stays scrapable). Write endpoints already self-gate.
    const GATED_APIS = [
      '/api/topics', '/api/announcements', '/api/recommendations',
      '/api/events', '/api/news', '/api/comments',
    ];
    // The daily news cron is a GET from Vercel with its own CRON_SECRET
    // Bearer gate — it must keep working without a session.
    const API_ALLOWLIST = ['/api/news/fetch-daily'];

    if (!context.locals.user) {
      const hit = (prefixes: string[]) =>
        prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
      if (hit(GATED_APIS) && !API_ALLOWLIST.some((p) => pathname.startsWith(p))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (hit(GATED_PAGES)) {
        const target = encodeURIComponent(pathname + context.url.search);
        return context.redirect(`/login?redirect=${target}`);
      }
    }
```

(Everything stays inside the existing outer try/catch so Sentry capture still wraps it. The `pathname` const already exists at the top of the middleware.)

- [ ] **Step 2: Honor `?redirect=` in the login flow**

In `src/components/auth/kiosk/AuthLoginInner.svelte`, add near the top of the `<script>` block:

```ts
  // Post-login destination: honor ?redirect= from the middleware gate, but
  // only same-origin paths (open-redirect guard: must start with exactly
  // one '/'). Anything else falls back to the forum.
  function postLoginTarget(): string {
    try {
      const r = new URLSearchParams(window.location.search).get('redirect');
      // exactly one leading slash; reject '//' (protocol-relative) and '/\'
      // (browsers normalize backslash to slash — same open-redirect vector)
      if (r && r.startsWith('/') && !r.startsWith('//') && !r.startsWith('/\\')) return r;
    } catch { /* fall through */ }
    return '/forum';
  }
```

Then change the success line (Task 3 set it to `/forum`): `window.location.href = '/forum';` → `window.location.href = postLoginTarget();`

- [ ] **Step 3: Refit the auth-page KiezHeartbeat**

`src/components/auth/kiosk/KiezHeartbeat.svelte` currently makes three client fetches (`/api/kiez-air`, `/api/news`, `/api/events`); the last two return 401 after Step 1 (the component fails soft — segments vanish — but that silently guts the auth pages' heartbeat). Refit its `onMount` to ONE fetch of the public aggregate endpoint, keeping the ambient fail-soft contract:

Replace the three fetch blocks inside `onMount` with:

```ts
    // Single public aggregate fetch — same source as the landing strip.
    // Each segment still resolves independently: a missing row leaves its
    // stat null and the segment is omitted (ambient, never blocks paint).
    fetch('/api/kiez-heartbeat', opts)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!Array.isArray(d?.rows)) return;
        for (const row of d.rows) {
          if (row.kind === 'air' && !row.mute && typeof row.value === 'number') {
            air = AIR_LABELS[row.value] ?? null;
          }
          if (row.kind === 'forum' && typeof row.value === 'number') posts = row.value;
          if (row.kind === 'events' && typeof row.value === 'number') events = row.value;
        }
      })
      .catch(() => {});
```

Add above `onMount` (module-level in the script):

```ts
  // LQI grade → label (matches /api/kiez-air's GRADE_LABELS, grades 1–5).
  const AIR_LABELS: Record<number, string> = { 1: 'sehr gut', 2: 'gut', 3: 'mäßig', 4: 'schlecht', 5: 'sehr schlecht' };
```

Remove the now-unused `todayISO()` helper. Keep the AbortController/timeout wiring exactly as is (one `opts` reference remains).

- [ ] **Step 4: Fix the auth heartbeat label semantics**

The refit changes meaning: posts = this ISO week (was: today's news count — mislabeled data anyway), events = coming weekend (was: today). In `src/lib/kiosk-i18n.ts`, apply these four exact edits (`auth.heartbeat.live` and `auth.heartbeat.air` stay unchanged):

DE block (~line 1105–1106):
```ts
  'auth.heartbeat.events': 'Events am Wochenende',   // was: 'Events heute'
  'auth.heartbeat.posts': 'Beiträge diese Woche',    // was: 'neue Beiträge'
```

EN block (~line 2813–2814):
```ts
  'auth.heartbeat.events': 'events this weekend',    // was: 'events today'
  'auth.heartbeat.posts': 'posts this week',         // was: 'new posts'
```

- [ ] **Step 5: Verify**

Run: `pnpm type-check 2>&1 | grep -c "error"` → equals baseline.
Run: `pnpm build 2>&1 | tail -3` → green.

- [ ] **Step 6: Commit**

```bash
git add src/middleware.ts src/components/auth/kiosk/AuthLoginInner.svelte src/components/auth/kiosk/KiezHeartbeat.svelte src/lib/kiosk-i18n.ts
git commit -m "feat: login gate for member surfaces + ?redirect support + auth heartbeat refit"
```

---

### Task 6: Browser verification + docs

**Files:**
- Modify: `CLAUDE.md` (root — routing/gating/landing/collection notes)
- Modify: `src/components/forum/kiosk/CLAUDE.md` (forum path note)
- Modify: `src/components/auth/kiosk/CLAUDE.md` (heartbeat refit note — create the note section if the file lacks one)

**Interfaces:**
- Consumes: everything shipped in Tasks 1–5; seeded dev DB `mahalle-dev`.

- [ ] **Step 1: Reseed dev DB + start throwaway server**

`npx tsx scripts/seed-dev-db.ts` (note the printed password — never commit it). Then `ss -tlnp | grep 4655` (must be free) → `pnpm dev --port 4655` in background → poll `curl -s -o /dev/null -w "%{http_code}" http://localhost:4655/ --max-time 5` until 200.

- [ ] **Step 2: Logged-out flows (desktop 1280×800, playwright-cli)**

1. `/` renders the landing: masthead „Mahalle" (italic a), manifest line, heartbeat strip (rows depend on dev-DB liveliness — the seeded forum content should yield a forum row; zero rows is legal but then verify the strip element is ABSENT, not empty), three teasers on opaque paper, ONE CTA button, footer links. Verify the background layer: `getComputedStyle` of the `.lnd-bg` element shows `mix-blend-mode: multiply` and the transform, and NO content element is invisible/unclickable (z-stack).
2. DE/EN toggle in the date line flips manifest + kicker copy without reload.
3. `/forum` while logged out → redirected to `/login?redirect=%2Fforum`.
4. `/calendar`, `/newsboard` → same redirect behavior. `/marketplace` → renders WITHOUT login (stays public). `/blog`, `/schillerkiez` → render without login.
5. `curl -s http://localhost:4655/api/topics` → 401. `curl -s http://localhost:4655/api/listings?limit=1` → 200 (public). `curl -s http://localhost:4655/api/kiez-heartbeat` → 200 JSON with `rows`.
6. `curl -sI http://localhost:4655/landing` → `301` with `Location: /`.
7. `/impressum` + `/datenschutz` render (placeholder address visible — expected).

- [ ] **Step 3: Login round-trip**

From the `/login?redirect=%2Fforum` page, log in as `ayse@mahalle-dev.test` → lands on `/forum` (the redirect param). Log out → back at `/` (landing). Log in again from the landing's „Anmelden →" link (no redirect param) → lands on `/forum` (default). While logged in, navigate to `/` → immediately redirected to `/forum` (member never sees the landing). Check the auth page's KiezHeartbeat pill rendered segments (air + any non-zero counts) before logging in — the refit must not blank it.

- [ ] **Step 4: Mobile spot-check (390×844)**

`/` mobile: stacked order (date line → masthead 54px → double rule → strip as row-stack → teasers in ONE opaque wrapper → CTA → footer); no horizontal scroll; tap targets (lang buttons, CTA, footer links) ≥ 24px visual/44px effective; background recipe identical (crops harder — approved).

- [ ] **Step 5: Teardown**

`playwright-cli close`; kill the dev server (`pkill -f "astro dev --port 4655"`, PID fallback via `ss -tlnp | grep 4655`). Confirm port free.

- [ ] **Step 6: Update docs**

1. Root `CLAUDE.md`:
   - Project Overview / structure area: note `/` = public landing („Das Schaufenster", `LandingLayout` + `src/components/landing/LandingPage.svelte`, SSR redirect for members → `/forum`), forum index lives at `src/pages/forum.astro`.
   - New subsection under Key Architecture Patterns, `### Landing + login gating (Aug 2026)`: gated page prefixes + gated APIs + cron allowlist (copy the middleware lists), marketplace deliberately public (SEO decision pending), `?redirect=` login flow with the open-redirect guard, `/landing` 301 fossil.
   - Database Collections: add `landingCache` — 1h in-code-TTL singleton (`{ _id: 'landing', payload, computedAt }`) behind `getLandingData()` (`src/lib/landing.ts`); zero rule applied server-side; public wrapper `GET /api/kiez-heartbeat`.
   - Splash allowlist bullet: remove the `/` mention (entry deleted).
2. `src/components/forum/kiosk/CLAUDE.md`: in the multi-collection feed section, note the index route is `/forum` (`src/pages/forum.astro`) since the landing release; `FORUM_MATCH` no longer contains `/`.
3. `src/components/auth/kiosk/CLAUDE.md`: note `KiezHeartbeat.svelte` now consumes `GET /api/kiez-heartbeat` (single aggregate fetch; weekly posts + weekend events semantics) because the per-surface list APIs are login-gated.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md src/components/forum/kiosk/CLAUDE.md src/components/auth/kiosk/CLAUDE.md
git commit -m "docs: landing release (routing, gating, landingCache, heartbeat)"
```
