import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;

    if (!id || !ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: 'Invalid recommendation ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get session from NextAuth
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Please login' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;

    const db = await connectDB();
    const recommendationsCollection = db.collection('recommendations');

    // First, check if the recommendation exists and if the user is the author
    const recommendation = await recommendationsCollection.findOne({ _id: new ObjectId(id) });

    if (!recommendation) {
      return new Response(JSON.stringify({ error: 'Recommendation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is the author
    // Handle both new format (Better Auth ID as string) and old format (ObjectId)
    const recommendationAuthorId = typeof recommendation.author === 'string'
      ? recommendation.author
      : recommendation.author?.toString();

    if (recommendationAuthorId !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized - you can only delete your own recommendations' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete the recommendation
    const result = await recommendationsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return new Response(JSON.stringify({ error: 'Failed to delete recommendation' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Also delete related comments
    const commentsCollection = db.collection('comments');
    await commentsCollection.deleteMany({ topic: new ObjectId(id) });

    return new Response(JSON.stringify({
      message: 'Recommendation deleted successfully',
      id: id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete recommendation error:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete recommendation' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};