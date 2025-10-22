import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import type { Recommendation } from '../../../types';

export const GET: APIRoute = async () => {
  try {
    const db = await connectDB();
    const recommendationsCollection = db.collection<Recommendation>('recommendations');

    const recommendations = await recommendationsCollection
      .find({})
      .sort({ date: -1 })
      .limit(50)
      .toArray();

    // Populate author information
    const usersCollection = db.collection('users');
    const populatedRecommendations = await Promise.all(
      recommendations.map(async (recommendation) => {
        const author = await usersCollection.findOne(
          { _id: recommendation.author },
          { projection: { password: 0 } }
        );
        return { ...recommendation, author };
      })
    );

    return new Response(
      JSON.stringify({
        number: populatedRecommendations.length,
        requestedRecommendations: populatedRecommendations
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return new Response(
      JSON.stringify({
        msg: 'Something went wrong in the server!',
        error: error instanceof Error ? error.message : 'Failed to fetch recommendations'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};