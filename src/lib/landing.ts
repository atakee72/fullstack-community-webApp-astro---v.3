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
