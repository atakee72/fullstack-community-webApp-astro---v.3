import type { APIRoute } from 'astro';
import { auth } from '../../../auth';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Comment } from '../../../types';
import { CommentCreateSchema } from '../../../schemas/comment.schema';
import { parseRequestBody } from '../../../schemas/validation.utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
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

    // Create new comment - store Better Auth user ID as string
    const newComment: Comment = {
      body,
      author: userId as any, // Store Better Auth user ID directly (string)
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

    // Try to find the user in the old users collection first (has profile data)
    const usersCollection = db.collection('users');
    let author = await usersCollection.findOne(
      { betterAuthId: userId }, // Link by Better Auth ID
      { projection: { password: 0 } }
    );

    // If not found in old users collection, create a basic profile from Better Auth user
    if (!author) {
      const betterAuthUserCollection = db.collection('user');
      // Better Auth stores user ID as ObjectId, session has it as string
      const betterAuthUser = await betterAuthUserCollection.findOne({
        _id: new ObjectId(userId)
      });

      // Extract username - handle corrupted field name
      let userName = session.user.name || session.user.email?.split('@')[0] || 'User';

      // Check for the corrupted "[object Object]" field (this is actually the username)
      if (betterAuthUser && betterAuthUser['[object Object]']) {
        userName = betterAuthUser['[object Object]'];
      } else if (betterAuthUser?.name) {
        userName = betterAuthUser.name;
      }

      // Create a basic author object with required fields
      author = {
        _id: new ObjectId(),
        betterAuthId: userId,
        userName: userName,
        email: session.user.email || betterAuthUser?.email,
        userPicture: session.user.image || betterAuthUser?.image || '',
        roleBadge: 'resident',
        hobbies: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save this profile to users collection for future use
      await usersCollection.insertOne(author);
    }

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