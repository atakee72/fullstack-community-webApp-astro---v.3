
import type { APIRoute } from 'astro';
import { auth } from '../../../../auth';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Recommendation, EditHistory } from '../../../../types';
import { TopicCreateSchema } from '../../../../schemas/forum.schema';
import { parseRequestBody } from '../../../../schemas/validation.utils';

export const PUT: APIRoute = async ({ request, params }) => {
  try {
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
    const recommendationId = params.id;

    if (!recommendationId || !ObjectId.isValid(recommendationId)) {
      return new Response(JSON.stringify({ error: 'Invalid recommendation ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const validation = await parseRequestBody(request, TopicCreateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const { title, body, tags } = validation.data;

    const db = await connectDB();
    const recommendationsCollection = db.collection<Recommendation>('recommendations');

    const existingRecommendation = await recommendationsCollection.findOne({ _id: new ObjectId(recommendationId) });

    if (!existingRecommendation) {
      return new Response(JSON.stringify({ error: 'Recommendation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isAuthor =
      (typeof existingRecommendation.author === 'string' && existingRecommendation.author === userId) ||
      (existingRecommendation.author && typeof existingRecommendation.author === 'object' &&
       'betterAuthId' in existingRecommendation.author &&
       existingRecommendation.author.betterAuthId === userId);

    if (!isAuthor) {
      return new Response(JSON.stringify({ error: 'You can only edit your own recommendations' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const editHistoryEntry: EditHistory = {
      originalTitle: existingRecommendation.title,
      originalBody: existingRecommendation.body || '',
      editedAt: new Date(),
      editedBy: userId
    };

    const updateResult = await recommendationsCollection.findOneAndUpdate(
      { _id: new ObjectId(recommendationId) },
      {
        $set: {
          title,
          body,
          description: body,
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
      return new Response(JSON.stringify({ error: 'Failed to update recommendation' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

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

    const updatedRecommendation = {
      ...updateResult,
      author
    };

    return new Response(
      JSON.stringify({
        recommendation: updatedRecommendation,
        message: 'Recommendation updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Recommendation update error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
