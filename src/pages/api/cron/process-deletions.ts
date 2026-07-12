import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import { runDeletionPipeline } from '../../../lib/auth/accountDeletion';

// Day-7 deletion pipeline cron (Task 11). Vercel-scheduled (see
// vercel.json — "30 5 * * *"), auth pattern mirrors
// src/pages/api/news/fetch-daily.ts:319-330 exactly (Bearer CRON_SECRET,
// skip-if-unset so local/dev without CRON_SECRET still works).
//
// Finds every user whose deletionScheduledAt has elapsed and hasn't
// already been anonymized, and runs the anonymization pipeline for each.
// Naturally idempotent: runDeletionPipeline's tombstone step $unsets
// deletionScheduledAt and sets anonymized: true, so a re-run of this query
// no longer matches a user it already finished.
export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = import.meta.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = await connectDB();
    const dueUsers = await db
      .collection('users')
      .find(
        { deletionScheduledAt: { $lte: new Date() }, anonymized: { $ne: true } },
        { projection: { _id: 1 } }
      )
      .toArray();

    const results: Array<{ userId: string; ok: boolean; steps: Record<string, number> }> = [];
    for (const u of dueUsers) {
      const userId = String(u._id);
      try {
        const result = await runDeletionPipeline(userId);
        results.push({ userId, ...result });
      } catch (err) {
        console.error(`[cron/process-deletions] pipeline threw for user ${userId}:`, err);
        results.push({ userId, ok: false, steps: { fatal: -1 } });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[cron/process-deletions] error:', err);
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
