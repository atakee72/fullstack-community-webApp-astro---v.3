/**
 * Admin Moderation Queue API
 * GET: List flagged content for review
 * POST: Not used here (flagged content is created automatically during content submission)
 */

import type { APIRoute } from 'astro';
import { ObjectId } from 'mongodb';
import { connectDB } from '../../../../lib/mongodb';
import type { FlaggedContent } from '../../../../types';
import { FlaggedContentQuerySchema } from '../../../../schemas/moderation.schema';
import { requireAdminSession } from '../../../../lib/auth';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Admin gate: session + role === 'admin' (no fallback — see src/lib/auth.ts)
    const guard = await requireAdminSession(request);
    if (!guard.ok) return guard.response;

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

    const { reviewStatus, contentType, decision, source, authorId, sortBy, sortOrder, limit, offset, urgentFirst } = validation.data;

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
    if (source) filter.source = source;
    if (authorId) filter.authorId = authorId;

    // Connect to database
    const db = await connectDB();
    const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');

    const sortDir = sortOrder === 'asc' ? 1 : -1;
    // urgentFirst: 'urgent_review' > 'pending_review' > 'approved'
    // lexicographically, so a descending sort on `decision` floats urgent
    // items above everything on every page (design: urgent always on top).
    const sort: Record<string, 1 | -1> = urgentFirst
      ? { decision: -1, [sortBy]: sortDir }
      : { [sortBy]: sortDir };

    // Get flagged content with pagination
    const [items, total] = await Promise.all([
      flaggedCollection
        .find(filter)
        .sort(sort)
        .skip(offset)
        .limit(limit)
        .toArray(),
      flaggedCollection.countDocuments(filter)
    ]);

    // Get counts by status for dashboard
    const [pendingCount, approvedCount, approvedWithWarningCount, rejectedCount, urgentCount] = await Promise.all([
      flaggedCollection.countDocuments({ reviewStatus: 'pending' }),
      flaggedCollection.countDocuments({ reviewStatus: 'approved' }),
      flaggedCollection.countDocuments({ reviewStatus: 'approved', hasWarningLabel: true }),
      flaggedCollection.countDocuments({ reviewStatus: 'rejected' }),
      flaggedCollection.countDocuments({ reviewStatus: 'pending', decision: 'urgent_review' })
    ]);

    // Join author strike counts for the queue cards (strike dots ●●○ +
    // the 2-strike "Ablehnung = Sperre (3/3)" flag). authorId may be
    // 'system' (AI-fetched news) or stale — those get 0/false.
    const authorIds = [...new Set(items.map((i: any) => i.authorId).filter((id: string) => id && ObjectId.isValid(id)))];
    const authors = authorIds.length
      ? await db.collection('users')
          .find({ _id: { $in: authorIds.map((id) => new ObjectId(id)) } },
                { projection: { moderationStrikes: 1, isBanned: 1 } })
          .toArray()
      : [];
    const byId = new Map(authors.map((a) => [a._id.toString(), a]));
    const enriched = items.map((i: any) => ({
      ...i,
      authorStrikes: byId.get(i.authorId)?.moderationStrikes ?? 0,
      authorIsBanned: byId.get(i.authorId)?.isBanned === true,
    }));

    return new Response(JSON.stringify({
      items: enriched,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + items.length < total
      },
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        approvedWithWarning: approvedWithWarningCount,
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
