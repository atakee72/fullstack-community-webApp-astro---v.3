
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Recommendation, EditHistory } from '../../../../types';
import { RecommendationUpdateSchema } from '../../../../schemas/forum.schema';
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
    const recommendationId = params.id;

    if (!recommendationId || !ObjectId.isValid(recommendationId)) {
      return new Response(JSON.stringify({ error: 'Invalid recommendation ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const validation = await parseRequestBody(request, RecommendationUpdateSchema);

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

    if (!isOwner(existingRecommendation.author, userId)) {
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

    // Construct author object from session
    const author = {
      _id: userId,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      roleBadge: 'resident'
    };

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
