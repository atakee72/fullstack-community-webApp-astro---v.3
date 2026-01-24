import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Announcement, FlaggedContent } from '../../../types';
import { AnnouncementCreateSchema } from '../../../schemas/forum.schema';
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
    const validation = await parseRequestBody(request, AnnouncementCreateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const { title, body, tags } = validation.data;

    // Run content moderation (FAIL-SAFE: queues for review on any error)
    // Moderate main content (title + body)
    const mainModerationResult = await moderateText(`${title}\n\n${body}`);

    // Moderate tags SEPARATELY to catch profanity that might get diluted in main content
    let tagsModerationResult = null;
    if (tags?.length) {
      tagsModerationResult = await moderateText(tags.join(' '));
    }

    // Combine results: flag if EITHER main content OR tags need review
    const needsReview = mainModerationResult.needsReview || (tagsModerationResult?.needsReview ?? false);
    const moderationResult = needsReview
      ? (tagsModerationResult?.needsReview ? tagsModerationResult : mainModerationResult)
      : mainModerationResult;

    // Connect to database
    const db = await connectDB();
    const announcementsCollection = db.collection<Announcement>('announcements');

    // Determine moderation status
    const moderationStatus = moderationResult.canPublish ? 'approved' : 'pending';

    // Create new announcement
    const newAnnouncement: Announcement = {
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

    const result = await announcementsCollection.insertOne(newAnnouncement);

    // If content needs review, create a flagged content record
    if (moderationResult.needsReview) {
      const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');
      const flaggedRecord = createFlaggedContentRecord(
        'announcement',
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

    // Fetch author info to return with the created announcement
    const usersCollection = db.collection('users');
    const author = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    const createdAnnouncement = {
      ...newAnnouncement,
      _id: result.insertedId,
      author: author || userId // Return populated author or fallback to ID
    };

    // Return appropriate response based on moderation result
    if (moderationResult.needsReview) {
      return new Response(
        JSON.stringify({
          announcement: createdAnnouncement,
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
        announcement: createdAnnouncement,
        message: 'Announcement created successfully'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Announcement creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};