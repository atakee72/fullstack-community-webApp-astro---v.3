import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Recommendation } from '../../../types';
import { RecommendationCreateSchema } from '../../../schemas/forum.schema';
import { parseRequestBody } from '../../../schemas/validation.utils';

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
    const validation = await parseRequestBody(request, RecommendationCreateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const { title, body, tags, category } = validation.data;

    // Connect to database
    const db = await connectDB();
    const recommendationsCollection = db.collection<any>('recommendations');

    // Create new recommendation
    const newRecommendation = {
      title,
      body,
      author: userId, // Save author as ID string
      category: category || 'other',
      tags: tags || [],
      comments: [],
      views: 0,
      likes: 0,
      likedBy: [],
      date: Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await recommendationsCollection.insertOne(newRecommendation);

    const createdRecommendation = {
      ...newRecommendation,
      _id: result.insertedId
    };

    return new Response(
      JSON.stringify({
        recommendation: createdRecommendation,
        message: 'Recommendation created successfully'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Recommendation creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};