import type { APIRoute } from 'astro';
import { cancelDeletionWithToken } from '../../../lib/auth/accountDeletion';

// Consumes a mail undo token (single-use) and cancels the scheduled
// deletion for its owner. No session required — the link may be opened in
// a different browser than the one that's logged in (mirrors
// /api/profile/email-change/confirm). POST (not GET) so email-scanner link
// prefetches can't burn the token.
export const POST: APIRoute = async ({ request }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token : '';
    if (!token) return json({ error: 'invalid_or_expired' }, 400);

    const ok = await cancelDeletionWithToken(token);
    return ok ? json({ ok: true }, 200) : json({ error: 'invalid_or_expired' }, 400);
  } catch (err) {
    console.error('auth/cancel-deletion error:', err);
    return json({ error: 'internal' }, 500);
  }
};
