import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export const POST: APIRoute = async ({ request }) => {
  console.log('Hit /api/likes/toggle endpoint');
  try {
    // Get the NextAuth session
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { postId, collectionType, action } = body;
    console.log('Toggle Like Request:', { postId, collectionType, action, userId: session.user.id });

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

    const userId = session.user.id; // NextAuth user ID

    // Connect to database
    const client = await clientPromise;
    const dbName = new URL(import.meta.env.MONGODB_URI).pathname.substring(1);
    const db = client.db(dbName);
    const collection = db.collection(collectionType);

    console.log('DB Connection:', {
      dbName: db.databaseName,
      collection: collectionType,
      postId,
      userId
    });

    // Toggle like/unlike
    // Note: We store userId in likedBy array.
    // NextAuth IDs might be different from BetterAuth IDs if not migrated perfectly,
    // but we are using the ID from the session.
    const updateOperation = action === 'like'
      ? { $addToSet: { likedBy: userId }, $inc: { likes: 1 } }
      : { $pull: { likedBy: userId }, $inc: { likes: -1 } };

    const result = await collection.updateOne(
      { _id: new ObjectId(postId) },
      updateOperation
    );

    console.log('Update Result:', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      acknowledged: result.acknowledged
    });

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