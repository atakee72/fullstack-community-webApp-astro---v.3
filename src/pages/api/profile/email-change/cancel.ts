import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { cancelEmailChange } from '../../../../lib/auth/emailChange';

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// Cancels any pending email change: drops tokens + clears pendingEmail.
// Idempotent — always 200, even if there was nothing pending.
export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    await cancelEmailChange(userId);
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('email-change/cancel error:', err);
    return json({ error: 'internal' }, 500);
  }
};
