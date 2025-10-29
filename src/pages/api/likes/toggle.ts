import type { APIRoute } from 'astro';
import { auth } from '../../../auth';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get the Better Auth session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { postId, collectionType, action } = body;

    if (!postId || !collectionType || !action) {
      return new Response(JSON.stringify({ error: 'Post ID, collection type, and action are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate collection type
    const validCollections = ['topics', 'announcements', 'recommendations'];
    if (!validCollections.includes(collectionType)) {
      return new Response(JSON.stringify({ error: 'Invalid collection type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
    const collection = db.collection(collectionType);

    // Toggle like/unlike
    const updateOperation = action === 'like'
      ? { $addToSet: { likedBy: userId }, $inc: { likes: 1 } }
      : { $pull: { likedBy: userId }, $inc: { likes: -1 } };

    const result = await collection.updateOne(
      { _id: new ObjectId(postId) },
      updateOperation
    );

    if (result.matchedCount === 0) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get updated post to return current like count
    const updatedPost = await collection.findOne({ _id: new ObjectId(postId) });

    return new Response(JSON.stringify({
      success: true,
      action,
      likeCount: updatedPost?.likes || 0,
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
    console.error('Error toggling like:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};