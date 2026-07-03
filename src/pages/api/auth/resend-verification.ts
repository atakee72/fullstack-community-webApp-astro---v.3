import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { ObjectId } from 'mongodb';
import { connectDB } from '../../../lib/mongodb';
import { createEmailVerifyToken } from '../../../lib/auth/emailVerify';
import { sendVerifyEmail } from '../../../lib/auth/sendVerifyEmail';
import { getTrustedBaseUrl } from '../../../lib/auth/baseUrl';

// Re-sends the verification link for the LOGGED-IN user's own account.
// Session-gated → no enumeration surface (you can only resend to yourself).
// Abuse throttle: createEmailVerifyToken's 60s resend guard → 429.
export const POST: APIRoute = async ({ request }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const session = await getSession(request);
    if (!session?.user?.id) return json({ error: 'Unauthorized' }, 401);

    const db = await connectDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) });
    if (!user) return json({ error: 'Unauthorized' }, 401);
    if (user.emailVerified === true) return json({ ok: true, alreadyVerified: true }, 200);

    const rawToken = await createEmailVerifyToken(String(user._id));
    if (!rawToken) return json({ error: 'throttled' }, 429);

    // SECURITY: link base from trusted NEXTAUTH_URL, fail-closed in prod
    // (CWE-640 — see src/lib/auth/baseUrl.ts).
    const base = getTrustedBaseUrl(request);
    if (!base) {
      console.error('resend-verification: NEXTAUTH_URL not configured in production — refusing to build a verify link from the untrusted Host header');
      return json({ error: 'internal' }, 500);
    }

    await sendVerifyEmail(user.email, `${base}/verify-email?token=${rawToken}`);
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('resend-verification error:', err);
    return json({ error: 'internal' }, 500);
  }
};
