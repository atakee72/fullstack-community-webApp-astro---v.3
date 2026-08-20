import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { PushUnsubscribeSchema } from '../../../schemas/push.schema';

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
  const parsed = PushUnsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid_body' }), { status: 400 });
  }
  const db = await connectDB();
  // userId in the filter: you can only delete your own subscription row.
  await db
    .collection('pushSubscriptions')
    .deleteOne({ endpoint: parsed.data.endpoint, userId: session.user.id });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
