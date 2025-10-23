import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Comment } from '../../../types';
import { CommentCreateSchema } from '../../../schemas/comment.schema';
import { parseRequestBody } from '../../../schemas/validation.utils';

export const POST: APIRoute = async ({ request }) => {
  try {
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

    // Validate request body with Zod
    const validation = await parseRequestBody(request, CommentCreateSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { body, topicId, collectionType } = validation.data;

    // Connect to database
    const db = await connectDB();
    const commentsCollection = db.collection<Comment>('comments');

    // Create new comment
    const newComment: Comment = {
      body,
      author: new ObjectId(decoded.userId),
      relevantPostId: new ObjectId(topicId),
      date: Date.now(),
      upvotes: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await commentsCollection.insertOne(newComment);

    // Update the parent post's comments array
    const collection = collectionType === 'announcements'
      ? 'announcements'
      : collectionType === 'recommendations'
      ? 'recommendations'
      : 'topics';

    const postsCollection = db.collection(collection);
    await postsCollection.updateOne(
      { _id: new ObjectId(topicId) },
      {
        $push: { comments: result.insertedId },
        $set: { updatedAt: new Date() }
      }
    );

    // Fetch the created comment with populated author
    const usersCollection = db.collection('users');
    const author = await usersCollection.findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    );

    const createdComment = {
      ...newComment,
      _id: result.insertedId,
      author
    };

    return new Response(
      JSON.stringify({
        comment: createdComment,
        message: 'Comment added successfully'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Comment creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};