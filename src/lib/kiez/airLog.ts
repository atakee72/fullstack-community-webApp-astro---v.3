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
