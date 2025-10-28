import type { APIRoute } from 'astro';
import { auth } from '../../../../auth';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Topic, EditHistory } from '../../../../types';
import { TopicCreateSchema } from '../../../../schemas/forum.schema';
import { parseRequestBody } from '../../../../schemas/validation.utils';

export const PUT: APIRoute = async ({ request, params }) => {
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
    // Need to handle both old MongoDB ObjectId authors and new Better Auth string IDs
    const isAuthor =
      (typeof existingTopic.author === 'string' && existingTopic.author === userId) ||
      (existingTopic.author && typeof existingTopic.author === 'object' &&
       'betterAuthId' in existingTopic.author &&
       existingTopic.author.betterAuthId === userId);

    if (!isAuthor) {
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

    // Get author information for response
    const usersCollection = db.collection('users');
    let author = await usersCollection.findOne(
      { betterAuthId: userId },
      { projection: { password: 0 } }
    );

    if (!author) {
      const betterAuthUserCollection = db.collection('user');
      const betterAuthUser = await betterAuthUserCollection.findOne({
        _id: new ObjectId(userId)
      });

      let userName = session.user.name || session.user.email?.split('@')[0] || 'User';

      if (betterAuthUser && betterAuthUser['[object Object]']) {
        userName = betterAuthUser['[object Object]'];
      } else if (betterAuthUser?.name) {
        userName = betterAuthUser.name;
      }

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
    }

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