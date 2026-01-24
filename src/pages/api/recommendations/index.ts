import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Recommendation } from '../../../types';
import {
  parseQueryParams,
  applyQueryOptions,
  buildFilter,
  getTotalCount,
  buildPaginationMeta
} from '../../../lib/queryUtils';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    // Get current user (optional - for showing their pending content)
    const session = await getSession(request);
    const currentUserId = session?.user?.id;

    const db = await connectDB();
    const recommendationsCollection = db.collection<Recommendation>('recommendations');

    // Parse query parameters
    const options = parseQueryParams(url);
    const filter = buildFilter(options);

    // Add moderation filter: show approved content OR user's own pending/rejected content
    // Also show content without moderationStatus (legacy content)
    // Authors can see their own pending and rejected posts (with notices)
    // User-reported content stays visible to everyone (unlike AI-flagged which hides until approved)
    const moderationFilter = {
      $or: [
        { moderationStatus: 'approved' },
        { moderationStatus: { $exists: false } }, // Legacy content without moderation
        { moderationStatus: 'pending', isUserReported: true }, // User-reported content stays visible
        ...(currentUserId ? [
          { author: currentUserId, moderationStatus: 'pending' },
          { author: currentUserId, moderationStatus: 'rejected' }
        ] : [])
      ]
    };

    // Merge with existing filter
    if (filter.$and) {
      filter.$and.push(moderationFilter);
    } else if (Object.keys(filter).length > 0) {
      const existingFilter = { ...filter };
      Object.keys(existingFilter).forEach(key => delete filter[key]);
      filter.$and = [existingFilter, moderationFilter];
    } else {
      Object.assign(filter, moderationFilter);
    }

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
            let author = null;

            // If author is already an object (populated), return as is
            if (typeof recommendation.author === 'object' && 'userName' in recommendation.author) {
              return recommendation;
            }

            // Try to find author by ID (string or ObjectId)
            if (typeof recommendation.author === 'string') {
              // Try as ObjectId
              try {
                author = await usersCollection.findOne(
                  { _id: new ObjectId(recommendation.author) },
                  { projection: { password: 0 } }
                );
              } catch {
                // If not valid ObjectId, skip
                author = null;
              }
            } else {
              // Old MongoDB ObjectId lookup
              author = await usersCollection.findOne(
                { _id: recommendation.author },
                { projection: { password: 0 } }
              );
            }

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