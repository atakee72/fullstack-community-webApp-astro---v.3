import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

// RSVP status the client can request. v1 supports two affirmative
// states (Going, Maybe) plus an explicit cancel — there is no
// "Not going" by design (CD spec).
type RsvpStatus = 'going' | 'maybe' | 'cancel';

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const eventId = params.id;

    if (!eventId || !ObjectId.isValid(eventId)) {
      return new Response(JSON.stringify({ error: 'Invalid event ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = await getSession(request);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Please login' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const status = body?.status as RsvpStatus | undefined;

    if (status !== 'going' && status !== 'maybe' && status !== 'cancel') {
      return new Response(
        JSON.stringify({ error: 'Invalid status. Must be "going", "maybe", or "cancel"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = session.user.id;
    const db = await connectDB();
    const eventsCollection = db.collection('events');

    // Atomic update strategy:
    //  - 'going'  : remove user from 'maybe', then add to 'going'
    //  - 'maybe'  : remove user from 'going', then add to 'maybe'
    //  - 'cancel' : remove from both
    // MongoDB allows mixing $pull on one field and $addToSet on another
    // in the same update doc, so all three branches are single ops.
    let updateOp: Record<string, any>;
    if (status === 'going') {
      updateOp = {
        $pull: { 'rsvps.maybe': userId },
        $addToSet: { 'rsvps.going': userId }
      };
    } else if (status === 'maybe') {
      updateOp = {
        $pull: { 'rsvps.going': userId },
        $addToSet: { 'rsvps.maybe': userId }
      };
    } else {
      updateOp = {
        $pull: { 'rsvps.going': userId, 'rsvps.maybe': userId }
      };
    }

    const result = await eventsCollection.findOneAndUpdate(
      { _id: new ObjectId(eventId) },
      updateOp,
      { returnDocument: 'after' }
    );

    if (!result) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const rsvps = (result as any).rsvps ?? { going: [], maybe: [] };
    const myStatus: 'going' | 'maybe' | null = rsvps.going?.includes(userId)
      ? 'going'
      : rsvps.maybe?.includes(userId)
      ? 'maybe'
      : null;

    return new Response(
      JSON.stringify({
        success: true,
        status: myStatus,
        rsvps: {
          going: rsvps.going ?? [],
          maybe: rsvps.maybe ?? [],
          goingCount: rsvps.going?.length ?? 0,
          maybeCount: rsvps.maybe?.length ?? 0
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0'
        }
      }
    );
  } catch (error) {
    console.error('Error toggling event RSVP:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
