/**
 * Admin Moderation Queue API
 * GET: List flagged content for review
 * POST: Not used here (flagged content is created automatically during content submission)
 */

import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import type { FlaggedContent } from '../../../../types';
import { FlaggedContentQuerySchema } from '../../../../schemas/moderation.schema';

// TODO: Add proper admin role check
const isAdmin = (userId: string): boolean => {
  // For now, you can hardcode your admin user ID or check a role field
  // This should be updated to check user.role === 'admin' from database
  const ADMIN_USER_IDS = [
    // Add your admin user IDs here
  ];
  return ADMIN_USER_IDS.length === 0 || ADMIN_USER_IDS.includes(userId);
};

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Check authentication
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    if (!isAdmin(session.user.id)) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse query parameters
    const params = Object.fromEntries(url.searchParams);
    const validation = FlaggedContentQuerySchema.safeParse(params);

    if (!validation.success) {
      return new Response(JSON.stringify({
        error: 'Invalid query parameters',
        details: validation.error.flatten()
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { reviewStatus, contentType, decision, authorId, sortBy, sortOrder, limit, offset } = validation.data;

    // Build filter
    const filter: Record<string, any> = {};
    if (reviewStatus === 'reviewed') {
      // Special filter: show only reviewed items (approved OR rejected, NOT pending)
      filter.reviewStatus = { $in: ['approved', 'rejected'] };
    } else if (reviewStatus) {
      filter.reviewStatus = reviewStatus;
    }
    if (contentType) filter.contentType = contentType;
    if (decision) filter.decision = decision;
    if (authorId) filter.authorId = authorId;

    // Connect to database
    const db = await connectDB();
    const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');

    // Get flagged content with pagination
    const [items, total] = await Promise.all([
      flaggedCollection
        .find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      flaggedCollection.countDocuments(filter)
    ]);

    // Get counts by status for dashboard
    const [pendingCount, approvedCount, rejectedCount, urgentCount] = await Promise.all([
      flaggedCollection.countDocuments({ reviewStatus: 'pending' }),
      flaggedCollection.countDocuments({ reviewStatus: 'approved' }),
      flaggedCollection.countDocuments({ reviewStatus: 'rejected' }),
      flaggedCollection.countDocuments({ reviewStatus: 'pending', decision: 'urgent_review' })
    ]);

    return new Response(JSON.stringify({
      items,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + items.length < total
      },
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        urgent: urgentCount
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching flagged content:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
