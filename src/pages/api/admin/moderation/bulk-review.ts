/**
 * Admin Bulk Review Action API
 * POST: Approve or reject multiple flagged content items at once
 */

import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { FlaggedContent } from '../../../../types';
import { BulkReviewActionSchema } from '../../../../schemas/moderation.schema';
import { processReviewAction } from '../../../../lib/reviewAction';

// TODO: Add proper admin role check (same as index.ts)
const isAdmin = (userId: string): boolean => {
  const ADMIN_USER_IDS: string[] = [];
  return ADMIN_USER_IDS.length === 0 || ADMIN_USER_IDS.includes(userId);
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!isAdmin(session.user.id)) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const validation = BulkReviewActionSchema.safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({
        error: 'Invalid request',
        details: validation.error.flatten()
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { flaggedContentIds, action, rejectionReason, notes } = validation.data;

    const db = await connectDB();
    const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');

    // Fetch all flagged items in one query
    const objectIds = flaggedContentIds.map(id => new ObjectId(id));
    const flaggedItems = await flaggedCollection.find({
      _id: { $in: objectIds }
    }).toArray();

    const results: Array<{
      id: string;
      status: string;
      strikeCount?: number;
      error?: string;
    }> = [];
    let bansTriggered = 0;
    let alreadyProcessed = 0;

    for (const item of flaggedItems) {
      const itemId = item._id!.toString();

      // Skip already-reviewed items
      if (item.reviewStatus !== 'pending') {
        alreadyProcessed++;
        results.push({ id: itemId, status: 'already_processed' });
        continue;
      }

      try {
        const result = await processReviewAction(db, item, action, session.user.id, {
          rejectionReason: action === 'reject'
            ? (rejectionReason || 'Content violated community guidelines')
            : undefined,
          notes
        });

        results.push({
          id: itemId,
          status: result.reviewStatus,
          strikeCount: result.strikeCount
        });

        if (result.userBanned) {
          bansTriggered++;
        }
      } catch (err) {
        console.error(`Error processing item ${itemId}:`, err);
        results.push({
          id: itemId,
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    }

    // Count results
    const succeeded = results.filter(r => r.status === 'approved' || r.status === 'rejected').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const notFound = flaggedContentIds.length - flaggedItems.length;

    const actionWord = action === 'approve' ? 'approved' : 'rejected';
    let message = `Bulk action complete: ${succeeded} ${actionWord}`;
    if (alreadyProcessed > 0) message += `, ${alreadyProcessed} already processed`;
    if (failed > 0) message += `, ${failed} failed`;
    if (notFound > 0) message += `, ${notFound} not found`;
    if (bansTriggered > 0) message += ` — ${bansTriggered} user(s) banned`;

    return new Response(JSON.stringify({
      success: true,
      message,
      results,
      bansTriggered
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in bulk review:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
