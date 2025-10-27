import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;

    if (!id || !ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: 'Invalid topic ID' }), {
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
    const topicsCollection = db.collection('topics');

    // First, check if the topic exists and if the user is the author
    const topic = await topicsCollection.findOne({ _id: new ObjectId(id) });

    if (!topic) {
      return new Response(JSON.stringify({ error: 'Topic not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is the author
    if (topic.author.toString() !== decoded.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized - you can only delete your own topics' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete the topic
    const result = await topicsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return new Response(JSON.stringify({ error: 'Failed to delete topic' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Also delete related comments
    const commentsCollection = db.collection('comments');
    await commentsCollection.deleteMany({ topic: new ObjectId(id) });

    return new Response(JSON.stringify({
      message: 'Topic deleted successfully',
      id: id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete topic error:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete topic' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};