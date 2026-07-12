import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { getProfileMe } from '../../../lib/profile/profileQuery';

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const profile = await getProfileMe(userId);
  if (!profile) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ profile }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
