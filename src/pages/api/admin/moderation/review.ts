/**
 * Admin Review Action API
 * POST: Approve, reject, or approve with warning a flagged content item
 * Delegates to shared processReviewAction() for core logic
 */

import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { FlaggedContent } from '../../../../types';
import { ReviewActionSchema } from '../../../../schemas/moderation.schema';
import { processReviewAction } from '../../../../lib/reviewAction';

const MAX_STRIKES = 3;

// TODO: Implement ban enforcement (future feature)
// When user is banned (isBanned: true), we need to:
// 1. Check isBanned in auth callback → reject login with "Account suspended" message
// 2. Add middleware/check to content creation APIs (topics, comments, etc.)
// 3. Optionally force logout / invalidate existing sessions immediately
// 4. Show "Your account has been suspended" banner to banned users

// TODO: Add proper admin role check (same as index.ts)
const isAdmin = (userId: string): boolean => {
  const ADMIN_USER_IDS: string[] = [];
  return ADMIN_USER_IDS.length === 0 || ADMIN_USER_IDS.includes(userId);
};

export const POST: APIRoute = async ({ request }) => {
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

    // Parse and validate request body
    const body = await request.json();
    const validation = ReviewActionSchema.safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({
        error: 'Invalid request',
        details: validation.error.flatten()
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { flaggedContentId, action, notes, rejectionReason, warningText } = validation.data;

    // Connect to database
    const db = await connectDB();
    const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');

    // Find the flagged content
    const flaggedContent = await flaggedCollection.findOne({
      _id: new ObjectId(flaggedContentId)
    });

    if (!flaggedContent) {
      return new Response(JSON.stringify({ error: 'Flagged content not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process the review action using shared logic
    const result = await processReviewAction(db, flaggedContent, action, session.user.id, {
      rejectionReason,
      warningText,
      notes
    });

    // Build response message
    const isRejection = action === 'reject';
    const hasWarning = action === 'approve_with_warning';
    let message = `Content ${isRejection ? 'rejected' : 'approved'}${hasWarning ? ' with warning' : ''}`;
    if (isRejection) {
      message += `. User now has ${result.strikeCount}/${MAX_STRIKES} strikes`;
      if (result.userBanned) {
        message += ' - USER HAS BEEN BANNED';
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message,
      reviewStatus: result.reviewStatus,
      strikeCount: result.strikeCount,
      userBanned: result.userBanned
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error reviewing content:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
