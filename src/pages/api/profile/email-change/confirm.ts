import type { APIRoute } from 'astro';
import { confirmEmailChange } from '../../../../lib/auth/emailChange';

// Consumes an email-change token (single-use) and swaps users.email.
// No session required — the link may be opened in a different browser than
// the one that started the change (mirrors /api/auth/verify-email). POST
// (not GET) so email-scanner link prefetches can't burn the token.
//
// Both 'invalid' (bad/expired/used token) and 'email_taken' (someone else
// registered the target address in the meantime — see emailChange.ts) map
// to the SAME generic 400 externally: a sessionless route must not leak
// which case occurred (no oracle).
export const POST: APIRoute = async ({ request }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token : '';
    if (!token) return json({ error: 'invalid_or_expired' }, 400);

    const result = await confirmEmailChange(token);
    return result === 'ok' ? json({ ok: true }, 200) : json({ error: 'invalid_or_expired' }, 400);
  } catch (err) {
    console.error('email-change/confirm error:', err);
    return json({ error: 'internal' }, 500);
  }
};
