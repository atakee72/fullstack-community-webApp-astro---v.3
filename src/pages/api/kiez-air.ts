import type { APIRoute } from 'astro';
import type { AirQualityResponse } from '../../types/kiezStats';

const BLUME_LQI_URL = 'https://luftdaten.berlin.de/api/lqis/data';
const STATION_ID = 'mc042';

const POLLUTANT_NAMES: Record<string, string> = {
  pm10: 'PM10',
  no2: 'NO₂',
  o3: 'O₃',
  co: 'CO',
};

const GRADE_LABELS = ['', 'sehr gut', 'gut', 'mäßig', 'schlecht', 'sehr schlecht'];

export const GET: APIRoute = async () => {
  try {
    const res = await fetch(BLUME_LQI_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`BLUME API returned ${res.status}`);

    const stations: Array<{ station: string; data: Array<{ datetime: string; component: string; value: number | null; grade: number | null }> }> = await res.json();

    const mc042 = stations.find((s) => s.station === STATION_ID);
    if (!mc042) {
      return new Response(JSON.stringify({ error: 'Station mc042 not found' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const lqi = mc042.data.find((d) => d.component === 'lqi');
    if (!lqi || lqi.grade == null) {
      return new Response(JSON.stringify({ error: 'No LQI data for mc042' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pollutants = mc042.data
      .filter((d) => d.component !== 'lqi' && d.grade != null)
      .map((d) => ({
        name: POLLUTANT_NAMES[d.component] ?? d.component.toUpperCase(),
        component: d.component,
        grade: d.grade!,
        gradeLabel: GRADE_LABELS[d.grade!] ?? '',
      }));

    const response: AirQualityResponse = {
      station: STATION_ID,
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
