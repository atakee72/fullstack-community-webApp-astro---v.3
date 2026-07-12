import type { APIRoute } from 'astro';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { consumeRateLimit } from '../../../../lib/auth/rateLimit';
import { getTrustedBaseUrl } from '../../../../lib/auth/baseUrl';
import { scheduleDeletion } from '../../../../lib/auth/accountDeletion';
import { sendAccountDeletionScheduled } from '../../../../lib/auth/sendDeletionEmails';

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const BodySchema = z.object({
  password: z.string().min(1),
  confirmHandle: z.string().min(1),
});

// Schedules the caller's own account for deletion GRACE_MS (7 days) from
// now. NOTHING is deleted or anonymized by this endpoint — it only stamps
// `users.deletionScheduledAt` and issues a mail undo token. The day-7
// anonymization pipeline is Task 11, separate and not built yet.
//
// Deliberately NOT rejectIfBanned-gated: banning restricts posting, not
// account ownership — a banned user must still be able to delete their own
// account, and scheduling has no content-write surface to abuse.
export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    const limit = await consumeRateLimit(`del:${userId}`, 3, 60 * 60 * 1000);
    if (limit.limited) return json({ error: 'throttled' }, 429);

    const body = await request.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return json({ error: 'validation' }, 400);
    const { password, confirmHandle } = parsed.data;

    const db = await connectDB();
    const uid = new ObjectId(userId);
    const user = await db.collection('users').findOne(
      { _id: uid },
      { projection: { password: 1, email: 1, handle: 1, deletionScheduledAt: 1 } }
    );
    if (!user) return json({ error: 'internal' }, 500);

    if (user.deletionScheduledAt) return json({ error: 'already_scheduled' }, 409);

    // Generic invalid_password for both "no password on file" (shouldn't
    // happen for a credentials-auth session) and an actual mismatch — no
    // signal leaked either way.
    const validPassword =
      typeof user.password === 'string' ? await bcrypt.compare(password, user.password) : false;
    if (!validPassword) return json({ error: 'invalid_password' }, 400);

    // Server re-check — the modal's handle-typing gate is UX only.
    if (confirmHandle !== user.handle) return json({ error: 'handle_mismatch' }, 400);

    const { deletionDate, rawToken } = await scheduleDeletion(userId);

    // Mail is best-effort: the schedule itself already succeeded and the
    // in-app "Widerrufen" action on the Konto card works independently of
    // mail delivery. If NEXTAUTH_URL is unset in prod, getTrustedBaseUrl()
    // fails closed ('') per its own CWE-640 contract — log and skip
    // sending rather than mail an untrusted/broken link. The schedule
    // still stands either way.
    try {
      const base = getTrustedBaseUrl(request);
      if (base && rawToken) {
        await sendAccountDeletionScheduled(
          String(user.email),
          deletionDate,
          `${base}/widerrufen?token=${rawToken}`
        );
      } else {
        console.error(
          'delete-account/schedule: no trusted base URL or token — skipped undo mail (in-app Widerrufen still available)'
        );
      }
    } catch (err) {
      console.error('delete-account/schedule: mail send failed (non-fatal, schedule still stands):', err);
    }

    return json({ ok: true, deletionScheduledAt: deletionDate.toISOString() }, 200);
  } catch (err) {
    console.error('delete-account/schedule error:', err);
    return json({ error: 'internal' }, 500);
  }
};
