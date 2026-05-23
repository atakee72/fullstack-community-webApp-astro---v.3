import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { canMutateListing } from '../../../../lib/listingActions';

// A5 superseded May 2026: no rate limit on bumps. Bump is the freshness reset
// mechanism — owners need to be able to use it whenever the listing slips out
// of the public feed (>21d since last bump or createdAt). Still gated on the
// canMutateListing guards (status === 'available', moderation approved,
// not reserved/sold) so bumping a reserved/sold listing is still rejected.

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

  const db = await connectDB();
  const col = db.collection('listings');
  const listing = await col.findOne({ _id: new ObjectId(id) });
  if (!listing) {
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  }

  // canMutateListing covers: not_owner / pending_review / has_warning_label /
  // rejected / sold. reserved is also blocked by default (no allowOnReserved).
  const guard = canMutateListing(listing as any, userId);
  if (!guard.ok) {
    const httpStatus = guard.reason === 'not_owner' ? 403 : 409;
    return new Response(
      JSON.stringify({ error: `bump_blocked_${guard.reason}` }),
      { status: httpStatus },
    );
  }

  // Status must be 'available' to bump (draft is also not allowed here).
  if (listing.status !== 'available') {
    return new Response(
      JSON.stringify({ error: 'bump_blocked_by_status' }),
      { status: 409 },
    );
  }

  const now = new Date();
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { lastBumpedAt: now, updatedAt: now } },
  );

  // A5: safe to return lastBumpedAt here — caller IS the owner.
  return new Response(
    JSON.stringify({ ok: true, lastBumpedAt: now.toISOString() }),
    { status: 200 },
  );
};
