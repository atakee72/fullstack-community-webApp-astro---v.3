import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Topic, FlaggedContent } from '../../../types';
import { TopicCreateSchema } from '../../../schemas/forum.schema';
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
    const validation = await parseRequestBody(request, TopicCreateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const { title, body, tags } = validation.data;

    // Run content moderation (FAIL-SAFE: queues for review on any error)
    // Include title, body, AND tags to catch inappropriate content in all fields
    const tagsText = tags?.length ? `\nTags: ${tags.join(', ')}` : '';
    const moderationResult = await moderateText(`${title}\n\n${body}${tagsText}`);

    // Connect to database
    const db = await connectDB();
    const topicsCollection = db.collection<Topic>('topics');

    // Determine moderation status
    const moderationStatus = moderationResult.canPublish ? 'approved' : 'pending';

    // Create new topic
    const newTopic: Topic = {
      title,
      body,
      author: userId as any, // Save author as ID string
      tags: tags || [],
      comments: [],
      views: 0,
      likes: 0,
      likedBy: [],
      date: Date.now(),
      moderationStatus,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await topicsCollection.insertOne(newTopic);

    // If content needs review, create a flagged content record
    if (moderationResult.needsReview) {
      const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');
      const flaggedRecord = createFlaggedContentRecord(
        'topic',
        { title, body, tags },
        {
          id: userId,
          name: session.user.name || undefined,
          email: session.user.email || undefined
        },
        moderationResult
      );
      flaggedRecord.contentId = result.insertedId.toString();
      await flaggedCollection.insertOne(flaggedRecord as FlaggedContent);
    }

    // Fetch author info to return with the created topic
    const usersCollection = db.collection('users');
    const author = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    const createdTopic = {
      ...newTopic,
      _id: result.insertedId,
      author: author || userId // Return populated author or fallback to ID
    };

    // Return appropriate response based on moderation result
    if (moderationResult.needsReview) {
      return new Response(
        JSON.stringify({
          topic: createdTopic,
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
        topic: createdTopic,
        message: 'Topic created successfully'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Topic creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};