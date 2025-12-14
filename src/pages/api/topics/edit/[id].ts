import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Topic, EditHistory } from '../../../../types';
import { TopicCreateSchema } from '../../../../schemas/forum.schema';
import { parseRequestBody } from '../../../../schemas/validation.utils';
import { isOwner } from '../../../../utils/authHelpers';

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

    // Create edit history entry
    const editHistoryEntry: EditHistory = {
      originalTitle: existingTopic.title,
      originalBody: existingTopic.body,
      editedAt: new Date(),
      editedBy: userId
    };

    // Update the topic with edit history
    const updateResult = await topicsCollection.findOneAndUpdate(
      { _id: new ObjectId(topicId) },
      {
        $set: {
          title,
          body,
          tags: tags || [],
          isEdited: true,
          lastEditedAt: new Date(),
          updatedAt: new Date()
        },
        $push: {
          editHistory: editHistoryEntry
        }
      },
      { returnDocument: 'after' }
    );

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