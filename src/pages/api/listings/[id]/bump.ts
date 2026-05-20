import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { canMutateListing } from '../../../../lib/listingActions';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

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

  // 7-day rate limit per A5 (bumps are visible to the community —
  // capping cadence prevents spammy "fresh" straps every day).
  if (listing.lastBumpedAt) {
    const since = Date.now() - new Date(listing.lastBumpedAt).getTime();
    if (since < ONE_WEEK) {
      const retryAt = new Date(new Date(listing.lastBumpedAt).getTime() + ONE_WEEK);
      return new Response(
        JSON.stringify({ error: 'bump_rate_limited', retryAt: retryAt.toISOString() }),
        { status: 429 },
      );
    }
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
