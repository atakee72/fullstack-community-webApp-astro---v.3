import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import type { FlaggedContent } from '../../../types';

/**
 * Return the IDs of all content the current user has reported.
 * Used to eager-load the "already reported" state of flag buttons on page mount,
 * so the flag renders filled-red immediately (like save/like do) instead of
 * only after a click via /api/reports/check.
 *
 * Filter mirrors /api/reports/check: source=user_report + reviewStatus=pending.
 * Once a report is reviewed by an admin, the flag unfills — matches existing behavior.
 *
 * Returns contentIds across all contentTypes (topic, comment, announcement, recommendation,
 * event, listing, news) in one flat array. Callers that need type-specific filtering
 * can request contentType=xxx.
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

    const db = await connectDB();
    const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');

    const contentTypeFilter = url.searchParams.get('contentType');

    const query: any = {
      source: 'user_report',
      reviewStatus: 'pending',
      $or: [
        { reporterUserIds: session.user.id },
        { reporterUserId: session.user.id }
      ]
    };
    if (contentTypeFilter) {
      query.contentType = contentTypeFilter;
    }

    const docs = await flaggedCollection
      .find(query, { projection: { contentId: 1 } })
      .toArray();

    // Dedup — a user could conceivably appear in multiple reports for the same content
    const reportedIds = Array.from(new Set(docs.map(d => String((d as any).contentId))));

    return new Response(JSON.stringify({ reportedIds }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store'
      }
    });
  } catch (error) {
    console.error('my-reported-ids error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
