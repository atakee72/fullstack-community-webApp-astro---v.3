import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import { runDeletionPipeline } from '../../../lib/auth/accountDeletion';

// Day-7 deletion pipeline cron (Task 11). Vercel-scheduled (see
// vercel.json — "30 5 * * *"). Auth is FAIL-CLOSED: unlike the benign news
// cron (fetch-daily.ts, skip-if-unset — worst case a stale newsfeed), this
// endpoint irreversibly anonymizes accounts, so a missing/misconfigured
// CRON_SECRET must disable it entirely rather than open it to any caller.
//
// Finds every user whose deletionScheduledAt has elapsed and hasn't
// already been anonymized, and runs the anonymization pipeline for each.
// Naturally idempotent: runDeletionPipeline's tombstone step $unsets
// deletionScheduledAt and sets anonymized: true, so a re-run of this query
// no longer matches a user it already finished. Each user is also
// re-verified atomically inside runDeletionPipeline (first operation,
// before any destructive step) to close the TOCTOU window between this
// find() snapshot and that user's turn in the loop — a Widerrufen
// (cancel) landing in between now skips cleanly instead of still being
// destroyed.
export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = import.meta.env.CRON_SECRET;

    // FAIL-CLOSED: no secret configured means no caller can ever be
    // authorized. Do not fall back to an open endpoint.
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
    const dueUsers = await db
      .collection('users')
      .find(
        { deletionScheduledAt: { $lte: new Date() }, anonymized: { $ne: true } },
        { projection: { _id: 1 } }
      )
      .toArray();

    const results: Array<{
      userId: string;
      ok: boolean;
      steps: Record<string, number>;
      skipped?: boolean;
    }> = [];
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

    const skipped = results.filter((r) => r.skipped).length;
    return new Response(JSON.stringify({ processed: results.length, skipped, results }), {
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
