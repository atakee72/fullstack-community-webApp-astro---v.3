import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export const POST: APIRoute = async ({ params, request }) => {
  try {
    const eventId = params.id;

    if (!eventId || !ObjectId.isValid(eventId)) {
      return new Response(JSON.stringify({ error: 'Invalid event ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the NextAuth session
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Please login' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { action } = body;

    // Validate action
    if (action !== 'like' && action !== 'unlike') {
      return new Response(JSON.stringify({ error: 'Invalid action. Must be "like" or "unlike"' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;

    // Connect to database
    const db = await connectDB();
    const eventsCollection = db.collection('events');

    // Toggle like/unlike
    const updateOperation = action === 'like'
      ? { $addToSet: { likedBy: userId }, $inc: { likes: 1 } }
      : { $pull: { likedBy: userId }, $inc: { likes: -1 } };

    const result = await eventsCollection.updateOne(
      { _id: new ObjectId(eventId) },
      updateOperation
    );

    if (result.matchedCount === 0) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get updated event to return current like count
    const updatedEvent = await eventsCollection.findOne({ _id: new ObjectId(eventId) });

    return new Response(JSON.stringify({
      success: true,
      action,
      likeCount: updatedEvent?.likes || 0,
      isLiked: action === 'like'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error toggling event like:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
