import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { PushSubscribeSchema } from '../../../schemas/push.schema';

/**
 * Upsert keyed on endpoint: a browser re-subscribing (or a different account
 * logging in on the same browser) takes the endpoint over — one endpoint
 * always belongs to exactly one user, matching the device's current session.
 */
export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }
  const parsed = PushSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid_subscription' }), { status: 400 });
  }
  const db = await connectDB();
  const now = new Date();
  await db.collection('pushSubscriptions').updateOne(
    { endpoint: parsed.data.endpoint },
    {
      $set: { keys: parsed.data.keys, userId: session.user.id, updatedAt: now },
      $setOnInsert: { endpoint: parsed.data.endpoint, createdAt: now },
    },
    { upsert: true },
  );
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
