import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';

// User's news-submission count in the rolling 24h window (quota = 5/day).
// Counts only user submissions (source: 'user_submitted'), not AI-fetched.
export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const db = await connectDB();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await db.collection('news').countDocuments({
      submittedBy: session.user.id,
      source: 'user_submitted',
      createdAt: { $gte: dayAgo },
    });
    return new Response(JSON.stringify({ count, limit: 5, remaining: Math.max(0, 5 - count), canSubmit: count < 5 }), {
      status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
