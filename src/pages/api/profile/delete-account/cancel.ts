import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { cancelDeletion } from '../../../../lib/auth/accountDeletion';

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// In-app "Widerrufen": cancels any pending deletion for the caller's own
// account. Idempotent — always 200, even if nothing was scheduled.
export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    await cancelDeletion(userId);
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('delete-account/cancel error:', err);
    return json({ error: 'internal' }, 500);
  }
};
