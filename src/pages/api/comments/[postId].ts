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
    const betterAuthUserCollection = db.collection('user');
    const populatedComments = await Promise.all(
      comments.map(async (comment) => {
        let author = null;

        // If author is already an object (populated), return as is
        if (typeof comment.author === 'object' && 'userName' in comment.author) {
          return comment;
        }

        // Try to find by Better Auth ID first (for new comments)
        if (typeof comment.author === 'string') {
          author = await usersCollection.findOne(
            { betterAuthId: comment.author },
            { projection: { password: 0 } }
          );

          // If not found in users collection, check Better Auth user collection
          if (!author) {
            const betterAuthUser = await betterAuthUserCollection.findOne({
              _id: new ObjectId(comment.author)
            });

            if (betterAuthUser) {
              // Extract username - handle corrupted field name
              let userName = betterAuthUser.name || betterAuthUser.email?.split('@')[0] || 'User';
              if (betterAuthUser['[object Object]']) {
                userName = betterAuthUser['[object Object]'];
              }

              // Create a minimal author object
              author = {
                _id: betterAuthUser._id,
                betterAuthId: comment.author,
                userName: userName,
                email: betterAuthUser.email,
                userPicture: betterAuthUser.image || '',
                roleBadge: 'resident'
              };
            }
          }
        } else {
          // Try old MongoDB ObjectId lookup for backwards compatibility
          author = await usersCollection.findOne(
            { _id: comment.author },
            { projection: { password: 0 } }
          );
        }

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