import type { APIRoute } from 'astro';
import { HANDLE_REGEX } from '../../../lib/profile/handle';
import { fetchPublicActivityPage } from '../../../lib/profile/activityFeed';
import { resolvePublicUserIdByHandle } from '../../../lib/profile/publicProfile';
import type { ActivityFilter } from '../../../lib/profile/profileShared';
import { ACTIVITY_PAGE_SIZE } from '../../../lib/profile/profileShared';

// Public "Nachbarn" activity feed — NO session gate, mirrors
// /api/users/profiles (already-public author lookups). 'gespeichert' is
// intentionally excluded from VALID_FILTERS (Decision 11: no saved-items
// branch is ever exposed publicly), so it falls through to the generic
// Invalid filter 400 below.
type PublicFilter = Exclude<ActivityFilter, 'gespeichert'>;
const VALID_FILTERS: PublicFilter[] = ['alle', 'forum', 'markt', 'kalender', 'kurier'];

export const GET: APIRoute = async ({ url }) => {
  let handleParam = url.searchParams.get('handle') ?? '';
  if (handleParam.startsWith('@')) handleParam = handleParam.slice(1);
  handleParam = handleParam.toLowerCase();
  if (!HANDLE_REGEX.test(handleParam)) {
    return new Response(JSON.stringify({ error: 'bad_handle' }), { status: 400 });
  }

  const filterParam = url.searchParams.get('filter') ?? 'alle';
  if (!VALID_FILTERS.includes(filterParam as PublicFilter)) {
    return new Response(JSON.stringify({ error: 'Invalid filter' }), { status: 400 });
  }
  const filter = filterParam as PublicFilter;

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

  const userId = await resolvePublicUserIdByHandle(handleParam);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  }

  const page = await fetchPublicActivityPage(userId, filter, before, limit);

  return new Response(JSON.stringify(page), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
