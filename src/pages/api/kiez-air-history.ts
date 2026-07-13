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
