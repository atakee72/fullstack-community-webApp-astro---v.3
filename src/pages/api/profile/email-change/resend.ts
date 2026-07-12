import type { APIRoute } from 'astro';
import { ObjectId } from 'mongodb';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { consumeRateLimit } from '../../../../lib/auth/rateLimit';
import { getTrustedBaseUrl } from '../../../../lib/auth/baseUrl';
import { createEmailChangeToken } from '../../../../lib/auth/emailChange';
import { sendEmailChangeVerify } from '../../../../lib/auth/sendEmailChangeEmails';

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// Re-sends the verify mail to the pending address (e.g. the first one
// bounced or the link expired before it was clicked).
export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    const limit = await consumeRateLimit(`emailchr:${userId}`, 5, 60 * 60 * 1000);
    if (limit.limited) return json({ error: 'throttled' }, 429);

    const db = await connectDB();
    const uid = new ObjectId(userId);
    const user = await db.collection('users').findOne({ _id: uid }, { projection: { pendingEmail: 1 } });
    const pendingEmail = typeof user?.pendingEmail === 'string' ? user.pendingEmail : '';
    if (!pendingEmail) return json({ error: 'no_pending' }, 400);

    const base = getTrustedBaseUrl(request);
    if (!base) return json({ error: 'config' }, 500);

    const rawToken = await createEmailChangeToken(userId, pendingEmail);
    if (!rawToken) return json({ error: 'throttled' }, 429); // 60s resend guard

    try {
      await sendEmailChangeVerify(pendingEmail, `${base}/confirm-email-change?token=${rawToken}`, pendingEmail);
    } catch (err) {
      console.error('email-change/resend: verify mail failed:', err);
      return json({ error: 'send_failed' }, 500);
    }

    return json({ ok: true }, 200);
  } catch (err) {
    console.error('email-change/resend error:', err);
    return json({ error: 'internal' }, 500);
  }
};
