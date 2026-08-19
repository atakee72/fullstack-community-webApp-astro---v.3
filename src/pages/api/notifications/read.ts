import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { markAllRead } from '../../../lib/notifications';

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  Vary: 'Cookie',
};

// Marks ALL of the caller's unread notifications read (fired on panel open).
// Idempotent, self-scoped — no CSRF/origin guard needed.
export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  const userId = session?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS });
  }

  try {
    await markAllRead(userId);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS });
  } catch (error) {
    console.error('Notifications read error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: HEADERS });
  }
};
