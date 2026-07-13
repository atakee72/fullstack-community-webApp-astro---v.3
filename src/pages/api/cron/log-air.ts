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
