import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { countUnread, listNotifications } from '../../../lib/notifications';

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  Vary: 'Cookie',
};

export const GET: APIRoute = async ({ request, url }) => {
  const session = await getSession(request);
  const userId = session?.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS });
  }

  try {
    // ?count=1 — the 90s polling target: one indexed countDocuments, no list.
    if (url.searchParams.get('count') === '1') {
      const unreadCount = await countUnread(userId);
      return new Response(JSON.stringify({ unreadCount }), { status: 200, headers: HEADERS });
    }

    const [items, unreadCount] = await Promise.all([
      listNotifications(userId),
      countUnread(userId),
    ]);
    return new Response(JSON.stringify({ items, unreadCount }), { status: 200, headers: HEADERS });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: HEADERS });
  }
};
