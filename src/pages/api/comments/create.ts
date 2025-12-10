import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Comment } from '../../../types';
import { CommentCreateSchema } from '../../../schemas/comment.schema';
import { parseRequestBody } from '../../../schemas/validation.utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get session from NextAuth
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Please login' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;

    // Validate request body with Zod
    const validation = await parseRequestBody(request, CommentCreateSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { body, topicId, collectionType } = validation.data;

    // Connect to database
    const db = await connectDB();
    const commentsCollection = db.collection<Comment>('comments');

    // Construct author object
    const author = {
      id: userId,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      roleBadge: 'resident'
    };

    // Create new comment
    const newComment: Comment = {
      body,
      author: author as any, // Save full object
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

    const createdComment = {
      ...newComment,
      _id: result.insertedId
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