import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Topic, EditHistory, FlaggedContent } from '../../../../types';
import { TopicCreateSchema } from '../../../../schemas/forum.schema';
import { parseRequestBody } from '../../../../schemas/validation.utils';
import { isOwner } from '../../../../utils/authHelpers';
import { moderateText, createFlaggedContentRecord } from '../../../../lib/moderation';

export const PUT: APIRoute = async ({ request, params }) => {
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
    const topicId = params.id;

    if (!topicId || !ObjectId.isValid(topicId)) {
      return new Response(JSON.stringify({ error: 'Invalid topic ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate request body with Zod
    const validation = await parseRequestBody(request, TopicCreateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const { title, body, tags } = validation.data;

    // Build moderation text including title, body, and tags
    const tagsText = tags?.length ? `\nTags: ${tags.join(', ')}` : '';

    // Connect to database
    const db = await connectDB();
    const topicsCollection = db.collection<Topic>('topics');

    // Find the existing topic
    const existingTopic = await topicsCollection.findOne({ _id: new ObjectId(topicId) });

    if (!existingTopic) {
      return new Response(JSON.stringify({ error: 'Topic not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is the author
    if (!isOwner(existingTopic.author, userId)) {
      return new Response(JSON.stringify({ error: 'You can only edit your own topics' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Run content moderation on edited content (FAIL-SAFE: queues for review on any error)
    // Include title, body, AND tags to catch inappropriate content in all fields
    const moderationResult = await moderateText(`${title}\n\n${body}${tagsText}`);

    // Determine new moderation status
    // If content is flagged, it goes back to pending regardless of previous status
    const newModerationStatus = moderationResult.canPublish
      ? existingTopic.moderationStatus || 'approved' // Keep existing status if clean
      : 'pending'; // Reset to pending if flagged

    // Create edit history entry
    const editHistoryEntry: EditHistory = {
      originalTitle: existingTopic.title,
      originalBody: existingTopic.body,
      editedAt: new Date(),
      editedBy: userId
    };

    // Build update data
    const updateData: Record<string, any> = {
      title,
      body,
      tags: tags || [],
      isEdited: true,
      lastEditedAt: new Date(),
      updatedAt: new Date(),
      moderationStatus: newModerationStatus
    };

    // Clear rejection reason if going back to pending (new review needed)
    if (newModerationStatus === 'pending') {
      updateData.rejectionReason = null;
    }

    // Update the topic with edit history
    const updateResult = await topicsCollection.findOneAndUpdate(
      { _id: new ObjectId(topicId) },
      {
        $set: updateData,
        $push: {
          editHistory: editHistoryEntry
        }
      },
      { returnDocument: 'after' }
    );

    // If content was flagged during edit, create a new flagged content record
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
      flaggedRecord.contentId = topicId;
      await flaggedCollection.insertOne(flaggedRecord as FlaggedContent);
    }

    if (!updateResult) {
      return new Response(JSON.stringify({ error: 'Failed to update topic' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Construct author object from session
    const author = {
      _id: userId,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      roleBadge: 'resident'
    };

    const updatedTopic = {
      ...updateResult,
      author
    };

    // Return appropriate response based on moderation result
    if (moderationResult.needsReview) {
      return new Response(
        JSON.stringify({
          topic: updatedTopic,
          message: moderationResult.userMessage,
          moderationStatus: 'pending'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        topic: updatedTopic,
        message: 'Topic updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Topic update error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};