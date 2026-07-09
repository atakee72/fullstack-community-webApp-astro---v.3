import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { isUserBanned } from '../../../lib/auth/banGuard';

// Live ban state for the session user. Mirrors verification-status: the JWT
// can't be trusted (bans happen mid-session), so the SuspendedBanner asks
// the DB. Session-gated — reveals nothing about other accounts.
export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const banned = await isUserBanned(session.user.id);
  return new Response(JSON.stringify({ banned }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
