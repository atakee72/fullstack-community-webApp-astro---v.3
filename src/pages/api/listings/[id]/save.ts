import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Listing } from '../../../../types/listing';
import { isValidObjectId } from '../../../../schemas/validation.utils';

export const POST: APIRoute = async ({ request, params }) => {
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

    const listing = await listingsCollection.findOne({ _id: new ObjectId(id) });

    if (!listing) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if already saved
    const isSaved = listing.savedBy.some(savedId => savedId.toString() === userId);

    if (isSaved) {
      // Remove from saved
      await listingsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $pull: { savedBy: userId } }
      );
    } else {
      // Add to saved
      await listingsCollection.updateOne(
        { _id: new ObjectId(id) },
        { $addToSet: { savedBy: userId } }
      );
    }

    return new Response(
      JSON.stringify({
        saved: !isSaved,
        message: isSaved ? 'Listing unsaved' : 'Listing saved'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Save listing error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
