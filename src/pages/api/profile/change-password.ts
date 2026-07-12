import type { APIRoute } from 'astro';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { rejectIfBanned } from '../../../lib/auth/banGuard';
import { consumeRateLimit } from '../../../lib/auth/rateLimit';
import { ChangePasswordSchema } from '../../../schemas/auth.schema';

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// Own-account password change. On success, `passwordChangedAt` is stamped so
// the auth.config.ts jwt callback can invalidate JWTs issued before this
// moment (other-device sign-out) — see that file's callback + this route's
// task brief. The response echoes the session's own email (no new leak) so
// the client can immediately silently re-login and keep THIS device's
// session alive.
export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    const bannedRes = await rejectIfBanned(userId);
    if (bannedRes) return bannedRes;

    const limit = await consumeRateLimit(`pwch:${userId}`, 5, 60 * 60 * 1000);
    if (limit.limited) return json({ error: 'throttled' }, 429);

    const body = await request.json().catch(() => ({}));
    const parsed = ChangePasswordSchema.safeParse(body);
    if (!parsed.success) return json({ error: 'validation', issues: parsed.error.flatten() }, 400);
    const { currentPassword, newPassword } = parsed.data;

    const db = await connectDB();
    const uid = new ObjectId(userId);
    const user = await db.collection('users').findOne(
      { _id: uid },
      { projection: { password: 1, email: 1 } }
    );

    // Generic invalid_password for both "no password on file" (shouldn't
    // happen for a credentials-auth session) and an actual mismatch — no
    // signal leaked either way.
    const currentOk =
      typeof user?.password === 'string' ? await bcrypt.compare(currentPassword, user.password) : false;
    if (!currentOk) return json({ error: 'invalid_password' }, 400);

    // Reject a "change" that doesn't actually change anything — compared
    // against the CURRENT hash before it gets overwritten.
    const sameAsCurrent = await bcrypt.compare(newPassword, user!.password);
    if (sameAsCurrent) return json({ error: 'same_password' }, 400);

    const passwordChangedAt = new Date();
    await db.collection('users').updateOne(
      { _id: uid },
      {
        $set: {
          password: await bcrypt.hash(newPassword, 12),
          passwordChangedAt,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    return json({ ok: true, email: user!.email }, 200);
  } catch (err) {
    console.error('profile/change-password error:', err);
    return json({ error: 'internal' }, 500);
  }
};
