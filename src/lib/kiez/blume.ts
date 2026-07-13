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
