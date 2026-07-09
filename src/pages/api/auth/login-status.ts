import type { APIRoute } from 'astro';
import { peekRateLimit, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS, BAN_FLAG_WINDOW_MS } from '../../../lib/auth/rateLimit';

// UI helper for the login page's state-05 banner + ban card. PEEK-only
// (never counts an attempt, so polling can't extend a lockout).
//
// `banned` is prove-then-tell: authorize() sets the `banflag:` marker ONLY
// after verifying the password of a banned account, so this endpoint never
// reveals ban state (or account existence) to a caller who hasn't proven
// the password within the last BAN_FLAG_WINDOW_MS. Accepted residual: a
// third party polling this endpoint for that email inside the window sees
// the flag too — it cannot be triggered without the password.
export const POST: APIRoute = async ({ request }) => {
  const json = (body: object) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) return json({ locked: false, retryAfterSec: 0, banned: false });

    const [lock, ban] = await Promise.all([
      peekRateLimit(`login:${email}`, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS),
      peekRateLimit(`banflag:${email}`, 1, BAN_FLAG_WINDOW_MS),
    ]);
    return json({
      locked: lock.limited,
      retryAfterSec: lock.limited ? lock.retryAfterSec : 0,
      banned: ban.limited,
    });
  } catch (err) {
    console.error('login-status error:', err);
    return json({ locked: false, retryAfterSec: 0, banned: false });
  }
};
