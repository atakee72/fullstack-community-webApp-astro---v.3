import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { postId, collectionType } = body;

    if (!postId || !collectionType) {
      return new Response(JSON.stringify({ error: 'Post ID and collection type are required' }), {
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

    // Connect to database
    const db = await connectDB();
    const collection = db.collection(collectionType);

    // Increment views
    let result = await collection.updateOne(
      { _id: new ObjectId(postId) },
      { $inc: { views: 1 } }
    );

    // If not found with ObjectId, try with string ID
    if (result.matchedCount === 0) {
      result = await collection.updateOne(
        { _id: postId as any },
        { $inc: { views: 1 } }
      );
    }

    if (result.matchedCount === 0) {
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, message: 'View count incremented' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error incrementing view count:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};