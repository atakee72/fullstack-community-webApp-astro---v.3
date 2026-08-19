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
