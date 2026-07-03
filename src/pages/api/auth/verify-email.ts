import type { APIRoute } from 'astro';
import { verifyEmailWithToken } from '../../../lib/auth/emailVerify';

// Consumes a verify token (single-use) and flips users.emailVerified to true.
// No session required — the link may be opened in a different browser than the
// one that registered. POST (not GET) so email-scanner link prefetches can't
// burn the token; the /verify-email page island fires this after hydration.
export const POST: APIRoute = async ({ request }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token : '';
    // Generic error for missing/bad/expired/used tokens — no distinction leaks.
    if (!token) return json({ error: 'invalid_or_expired' }, 400);

    const ok = await verifyEmailWithToken(token);
    return ok ? json({ ok: true }, 200) : json({ error: 'invalid_or_expired' }, 400);
  } catch (err) {
    console.error('verify-email error:', err);
    return json({ error: 'internal' }, 500);
  }
};
