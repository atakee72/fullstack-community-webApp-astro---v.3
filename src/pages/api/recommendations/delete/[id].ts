import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
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

    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No token provided' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, import.meta.env.JWT_SECRET || 'default-secret') as any;
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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
    if (recommendation.author.toString() !== decoded.userId) {
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