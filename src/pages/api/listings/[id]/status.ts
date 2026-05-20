import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { canMutateListing } from '../../../../lib/listingActions';

const StatusPayloadSchema = z.object({
  status: z.enum(['available', 'reserved', 'sold']),
});

// A7 transition matrix
const VALID_TRANSITIONS: Record<string, string[]> = {
  available: ['reserved', 'sold'],
  reserved:  ['available', 'sold'], // sold-from-reserved is the one-click skip
  sold:      ['available'],         // un-mark (rare but allowed)
  // draft, exchanged: no transitions via this endpoint
};

export const POST: APIRoute = async ({ params, request }) => {
  const session = await getSession(request);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const { id } = params;
  if (!id || !ObjectId.isValid(id)) {
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = StatusPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid' }), { status: 400 });
  }

  const db = await connectDB();
  const col = db.collection('listings');
  const listing = await col.findOne({ _id: new ObjectId(id) });
  if (!listing) {
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  }

  // allowOnReserved: true — status transitions are HOW owners exit reserved.
  const guard = canMutateListing(listing as any, userId, { allowOnReserved: true });
  if (!guard.ok) {
    const httpStatus = guard.reason === 'not_owner' ? 403 : 409;
    return new Response(
      JSON.stringify({ error: `status_blocked_${guard.reason}` }),
      { status: httpStatus },
    );
  }

  const current = listing.status as string;
  const target = parsed.data.status;

  if (!VALID_TRANSITIONS[current]?.includes(target)) {
    return new Response(
      JSON.stringify({ error: 'invalid_transition' }),
      { status: 400 },
    );
  }

  const now = new Date();
  const update: Record<string, unknown> = { status: target, updatedAt: now };
  if (target === 'reserved') update.reservedAt = now;
  if (current === 'reserved' && target !== 'reserved') update.reservedAt = null;

  await col.updateOne({ _id: new ObjectId(id) }, { $set: update });

  return new Response(
    JSON.stringify({ ok: true, status: target }),
    { status: 200 },
  );
};
