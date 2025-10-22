import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export const GET: APIRoute = async ({ params }) => {
  try {
    const { postId } = params;

    if (!postId) {
      return new Response(JSON.stringify({ error: 'Post ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Connect to database
    const db = await connectDB();
    const commentsCollection = db.collection('comments');
    const usersCollection = db.collection('users');

    // Fetch comments for this post
    const comments = await commentsCollection
      .find({ relevantPostId: new ObjectId(postId) })
      .sort({ date: -1 })
      .toArray();

    // Populate author information for each comment
    const populatedComments = await Promise.all(
      comments.map(async (comment) => {
        const author = await usersCollection.findOne(
          { _id: comment.author },
          { projection: { password: 0 } }
        );
        return { ...comment, author };
      })
    );

    return new Response(
      JSON.stringify({
        comments: populatedComments,
        count: populatedComments.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching comments:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};