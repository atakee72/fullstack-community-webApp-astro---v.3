import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import type { FlaggedContent } from '../../../types';

/**
 * Check if the current user has already reported specific content
 * GET /api/reports/check?contentId=xxx&contentType=topic|comment
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contentId = url.searchParams.get('contentId');
    const contentType = url.searchParams.get('contentType');

    if (!contentId || !contentType) {
      return new Response(JSON.stringify({ error: 'Missing contentId or contentType' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await connectDB();
    const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');

    // Check if user is in the reporterUserIds array OR is the original reporter
    const existingReport = await flaggedCollection.findOne({
      contentId,
      contentType,
      source: 'user_report',
      reviewStatus: 'pending',
      $or: [
        { reporterUserIds: session.user.id },
        { reporterUserId: session.user.id }
      ]
    });

    return new Response(JSON.stringify({
      alreadyReported: !!existingReport
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Report check error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
