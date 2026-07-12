import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { fetchActivityPage } from '../../../lib/profile/activityFeed';
import type { ActivityFilter } from '../../../lib/profile/profileShared';
import { ACTIVITY_PAGE_SIZE } from '../../../lib/profile/profileShared';

const VALID_FILTERS: ActivityFilter[] = ['alle', 'forum', 'markt', 'kalender', 'kurier', 'gespeichert'];

export const GET: APIRoute = async ({ request, url }) => {
  const session = await getSession(request);
  const userId = (session?.user as any)?.id;
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const filterParam = url.searchParams.get('filter') ?? 'alle';
  if (!VALID_FILTERS.includes(filterParam as ActivityFilter)) {
    return new Response(JSON.stringify({ error: 'Invalid filter' }), { status: 400 });
  }
  const filter = filterParam as ActivityFilter;

  let before: Date | null = null;
  const beforeParam = url.searchParams.get('before');
  if (beforeParam) {
    const parsed = new Date(beforeParam);
    if (Number.isNaN(parsed.getTime())) {
      return new Response(JSON.stringify({ error: 'Invalid before' }), { status: 400 });
    }
    before = parsed;
  }

  const limitParam = Number(url.searchParams.get('limit'));
  const limit = Math.max(1, Math.min(limitParam || ACTIVITY_PAGE_SIZE, 50));

  const page = await fetchActivityPage(userId, filter, before, limit);

  return new Response(JSON.stringify(page), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
