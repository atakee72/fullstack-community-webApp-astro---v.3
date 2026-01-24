import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Comment, FlaggedContent } from '../../../types';
import { CommentCreateSchema } from '../../../schemas/comment.schema';
import { parseRequestBody } from '../../../schemas/validation.utils';
import { moderateText, createFlaggedContentRecord } from '../../../lib/moderation';

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

    // Run AI content moderation
    const moderationResult = await moderateText(body);
    const moderationStatus = moderationResult.canPublish ? 'approved' : 'pending';

    // Connect to database
    const db = await connectDB();
    const commentsCollection = db.collection<Comment>('comments');

    // Create new comment
    const newComment: Comment = {
      body,
      author: userId as any, // Save author as ID string
      relevantPostId: new ObjectId(topicId),
      date: Date.now(),
      upvotes: 0,
      moderationStatus,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await commentsCollection.insertOne(newComment);

    // Determine parent collection name
    const parentCollection = collectionType === 'announcements'
      ? 'announcements'
      : collectionType === 'recommendations'
        ? 'recommendations'
        : collectionType === 'events'
          ? 'events'
          : 'topics';

    // If content needs review, create a flagged content record
    // Don't add to parent's comments array yet - will be added when approved
    if (moderationResult.needsReview) {
      const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');
      const flaggedRecord = createFlaggedContentRecord(
        'comment',
        { body },
        {
          id: userId,
          name: session.user.name || undefined,
          email: session.user.email || undefined
        },
        moderationResult
      );
      flaggedRecord.contentId = result.insertedId.toString();
      // Store parent info so we can add to comments array when approved
      (flaggedRecord as any).parentPostId = topicId;
      (flaggedRecord as any).parentCollection = parentCollection;
      await flaggedCollection.insertOne(flaggedRecord as FlaggedContent);
    } else {
      // Only add to parent's comments array if approved immediately
      const postsCollection = db.collection(parentCollection);
      await postsCollection.updateOne(
        { _id: new ObjectId(topicId) },
        {
          $push: { comments: result.insertedId },
          $set: { updatedAt: new Date() }
        }
      );
    }

    // Fetch author info to return with the created comment
    const usersCollection = db.collection('users');
    const author = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    const createdComment = {
      ...newComment,
      _id: result.insertedId,
      author: author || userId // Return populated author or fallback to ID
    };

    // Return appropriate response based on moderation result
    if (moderationResult.needsReview) {
      return new Response(
        JSON.stringify({
          comment: createdComment,
          message: moderationResult.userMessage,
          moderationStatus: 'pending'
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

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