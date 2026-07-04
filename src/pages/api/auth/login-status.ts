import type { APIRoute } from 'astro';
import { peekRateLimit, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS } from '../../../lib/auth/rateLimit';

// UI helper for the login page's state-05 banner: is this identifier
// currently locked out? PEEK-only (never counts an attempt, so polling can't
// extend a lockout). No enumeration surface: the lockout state derives purely
// from failed attempts against the submitted identifier — it exists for
// unknown emails too and says nothing about whether an account exists.
export const POST: APIRoute = async ({ request }) => {
  const json = (body: object) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) return json({ locked: false, retryAfterSec: 0 });

    const { limited, retryAfterSec } = await peekRateLimit(`login:${email}`, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS);
    return json({ locked: limited, retryAfterSec: limited ? retryAfterSec : 0 });
  } catch (err) {
    console.error('login-status error:', err);
    return json({ locked: false, retryAfterSec: 0 });
  }
};
