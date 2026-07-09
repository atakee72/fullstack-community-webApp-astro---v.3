/**
 * Admin Review Action API
 * POST: Approve, reject, or approve with warning a flagged content item
 * Delegates to shared processReviewAction() for core logic
 */

import type { APIRoute } from 'astro';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { FlaggedContent } from '../../../../types';
import { ReviewActionSchema } from '../../../../schemas/moderation.schema';
import { processReviewAction } from '../../../../lib/reviewAction';
import { requireAdminSession } from '../../../../lib/auth';

const MAX_STRIKES = 3;

// Ban enforcement lives in auth.config.ts (login block), src/lib/auth/banGuard.ts
// (write-API guard + compose-page SSR gate) and SuspendedBanner (user-facing).

export const POST: APIRoute = async ({ request }) => {
  try {
    // Admin gate: session + role === 'admin' (no fallback — see src/lib/auth.ts)
    const guard = await requireAdminSession(request);
    if (!guard.ok) return guard.response;

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
    const result = await processReviewAction(db, flaggedContent, action, guard.userId, {
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
