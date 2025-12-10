import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const { commentId } = params;

    if (!commentId) {
      return new Response(JSON.stringify({ error: 'Comment ID is required' }), {
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

    // Connect to database
    const db = await connectDB();
    const commentsCollection = db.collection('comments');

    // Find the comment to verify ownership
    const comment = await commentsCollection.findOne({ _id: new ObjectId(commentId) });

    if (!comment) {
      return new Response(JSON.stringify({ error: 'Comment not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is the author of the comment
    // Handle both new format (NextAuth ID as string) and old format (ObjectId)
    const commentAuthorId = typeof comment.author === 'string'
      ? comment.author
      : comment.author?.toString();

    // Note: This comparison assumes the comment.author field stores the same ID format as session.user.id
    // If comments were created with BetterAuth, they might have BetterAuth IDs.
    // If created with NextAuth, they have NextAuth IDs.
    // Since we migrated users, the IDs should hopefully match or be compatible if we kept the _id.
    if (commentAuthorId !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized to delete this comment' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete the comment
    await commentsCollection.deleteOne({ _id: new ObjectId(commentId) });

    // Remove comment reference from the parent post
    // We need to check all collections since we don't know the parent type
    const collections = ['topics', 'announcements', 'recommendations'];
    for (const coll of collections) {
      await db.collection(coll).updateMany(
        { comments: new ObjectId(commentId) },
        { $pull: { comments: new ObjectId(commentId) } }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Comment deleted successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Comment deletion error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};