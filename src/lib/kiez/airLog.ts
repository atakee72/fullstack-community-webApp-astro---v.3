// Air-quality logger core (Kiez-Daten novel §00 — Messwert-Logger).
// This module is server-only once Task 2 adds the Mongo/BLUME functions;
// never import it from client islands (they fetch the APIs instead).
import type { Db } from 'mongodb';
import type { AirDailyDoc, AirLogDoc } from '../../types/kiezStats';
import { fetchMc042 } from './blume';

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
