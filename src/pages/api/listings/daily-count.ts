import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import type { Listing } from '../../../types/listing';

export const GET: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await connectDB();
    const listingsCollection = db.collection<Listing>('listings');
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const todayCount = await listingsCollection.countDocuments({
      sellerId: session.user.id,
      createdAt: { $gte: dayAgo },
      status: { $ne: 'draft' }
    });

    return new Response(JSON.stringify({
      count: todayCount,
      limit: 5,
      remaining: Math.max(0, 5 - todayCount),
      canCreate: todayCount < 5
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Daily count error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
