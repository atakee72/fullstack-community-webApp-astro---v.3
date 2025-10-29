import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import type { Recommendation } from '../../../types';
import {
  parseQueryParams,
  applyQueryOptions,
  buildFilter,
  getTotalCount,
  buildPaginationMeta
} from '../../../lib/queryUtils';

export const GET: APIRoute = async ({ url }) => {
  try {
    const db = await connectDB();
    const recommendationsCollection = db.collection<Recommendation>('recommendations');

    // Parse query parameters
    const options = parseQueryParams(url);
    const filter = buildFilter(options);

    // Get recommendations with query options
    const recommendations = await applyQueryOptions<Recommendation>(
      recommendationsCollection,
      options,
      filter
    );

    // Get total count for pagination
    const total = await getTotalCount(recommendationsCollection, filter);

    // Build pagination metadata
    const limit = parseInt(options.limit as string) || 20;
    const offset = parseInt(options.offset as string) || 0;
    const pagination = buildPaginationMeta(total, limit, offset);

    // Populate author information if not excluded
    const shouldPopulateAuthor = !options.fields ||
      options.fields.length === 0 ||
      options.fields.includes('author');

    let populatedRecommendations = recommendations;
    if (shouldPopulateAuthor) {
      const usersCollection = db.collection('users');
      populatedRecommendations = await Promise.all(
        recommendations.map(async (recommendation) => {
          if (recommendation.author) {
            const author = await usersCollection.findOne(
              { betterAuthId: recommendation.author },
              { projection: { password: 0 } }
            );
            return { ...recommendation, author };
          }
          return recommendation;
        })
      );
    }

    return new Response(
      JSON.stringify({
        recommendations: populatedRecommendations,
        pagination
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch recommendations' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};