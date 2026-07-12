import type { APIRoute } from 'astro';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { rejectIfBanned } from '../../../../lib/auth/banGuard';
import { consumeRateLimit } from '../../../../lib/auth/rateLimit';
import { getTrustedBaseUrl } from '../../../../lib/auth/baseUrl';
import { createEmailChangeToken } from '../../../../lib/auth/emailChange';
import { sendEmailChangeVerify, sendEmailChangeNotice } from '../../../../lib/auth/sendEmailChangeEmails';

const NewEmailSchema = z.string().email().toLowerCase().trim();

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

/** `m***@domain.tld` — first char + *** + @domain. */
function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return email;
  return `${email[0]}***${email.slice(at)}`;
}

// Starts an email-change: verifies the caller's current password, stashes
// the target on `pendingEmail`, and mails a confirm link to the NEW address
// plus a heads-up (no token) to the OLD address. The swap only takes effect
// once /confirm consumes the token — see src/lib/auth/emailChange.ts.
export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    const bannedRes = await rejectIfBanned(userId);
    if (bannedRes) return bannedRes;

    const limit = await consumeRateLimit(`emailch:${userId}`, 3, 60 * 60 * 1000);
    if (limit.limited) return json({ error: 'throttled' }, 429);

    const body = await request.json().catch(() => ({}));
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';

    const parsed = NewEmailSchema.safeParse(body?.newEmail);
    if (!parsed.success) return json({ error: 'invalid_email' }, 400);
    const newEmail = parsed.data;

    const db = await connectDB();
    const uid = new ObjectId(userId);
    const user = await db.collection('users').findOne(
      { _id: uid },
      { projection: { password: 1, email: 1 } }
    );

    // Generic invalid_password for both "no password on file" (shouldn't
    // happen for a credentials-auth session) and an actual mismatch — no
    // signal leaked either way.
    const validPassword =
      currentPassword && typeof user?.password === 'string'
        ? await bcrypt.compare(currentPassword, user.password)
        : false;
    if (!validPassword) return json({ error: 'invalid_password' }, 400);

    // Taken check: case-insensitive, also true when it equals the CURRENT
    // email (no-op changes aren't allowed — same as "already yours").
    const existing = await db.collection('users').findOne(
      { email: newEmail },
      { collation: { locale: 'en', strength: 2 } }
    );
    if (existing) return json({ error: 'email_unavailable' }, 400);

    // SECURITY: link base from trusted NEXTAUTH_URL, fail-closed in prod
    // (CWE-640 — see src/lib/auth/baseUrl.ts). Checked before any writes.
    const base = getTrustedBaseUrl(request);
    if (!base) return json({ error: 'config' }, 500);

    await db.collection('users').updateOne(
      { _id: uid },
      { $set: { pendingEmail: newEmail, updatedAt: new Date().toISOString() } }
    );

    const rawToken = await createEmailChangeToken(userId, newEmail);
    if (!rawToken) {
      // 60s resend guard — pendingEmail intentionally stays set (idempotent;
      // a prior in-flight request already has a valid token out).
      return json({ error: 'throttled' }, 429);
    }

    try {
      await sendEmailChangeVerify(newEmail, `${base}/confirm-email-change?token=${rawToken}`, newEmail);
    } catch (err) {
      console.error('email-change/start: verify mail failed, rolling back pendingEmail:', err);
      await db.collection('users').updateOne({ _id: uid }, { $unset: { pendingEmail: '' } }).catch(() => {});
      return json({ error: 'send_failed' }, 500);
    }

    // Best-effort — the change itself must not fail just because the
    // heads-up mail to the OLD address didn't go out.
    try {
      await sendEmailChangeNotice(String(user?.email ?? ''), maskEmail(newEmail), `${base}/profile`);
    } catch (err) {
      console.error('email-change/start: notice mail to old address failed (non-fatal):', err);
    }

    return json({ ok: true }, 200);
  } catch (err) {
    console.error('email-change/start error:', err);
    return json({ error: 'internal' }, 500);
  }
};
