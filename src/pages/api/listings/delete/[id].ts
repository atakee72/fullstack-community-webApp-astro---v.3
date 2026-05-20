import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Listing } from '../../../../types/listing';
import { isValidObjectId } from '../../../../schemas/validation.utils';
import { canMutateListing } from '../../../../lib/listingActions';

export const DELETE: APIRoute = async ({ request, params }) => {
  try {
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Please login' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = params;

    if (!id || !isValidObjectId(id)) {
      return new Response(JSON.stringify({ error: 'Invalid listing ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;

    const db = await connectDB();
    const listingsCollection = db.collection<Listing>('listings');

    // Check if listing exists
    const existingListing = await listingsCollection.findOne({ _id: new ObjectId(id) });

    if (!existingListing) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Per plan Task 1.3.5: owners must be able to delete rejected listings
    // (they need to clean up after moderation rejects them). Drafts are also
    // freely deletable. canMutateListing still blocks pending (preserve evidence
    // while AI is mid-scan) and reserved/sold (use status endpoint to back out).
    const guard = canMutateListing(existingListing as any, userId, { allowOnRejected: true });
    if (!guard.ok) {
      const httpStatus = guard.reason === 'not_owner' ? 403 : 409;
      return new Response(
        JSON.stringify({ error: `delete_blocked_${guard.reason}` }),
        { status: httpStatus, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await listingsCollection.deleteOne({ _id: new ObjectId(id) });

    return new Response(
      JSON.stringify({ message: 'Listing deleted successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Listing deletion error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
