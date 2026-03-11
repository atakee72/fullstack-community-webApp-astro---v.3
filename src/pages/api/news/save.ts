import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { newsId, action } = await request.json();
    if (!newsId || !['save', 'unsave'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
    }

    const db = await connectDB();
    const userId = session.user.id;

    if (action === 'save') {
      await db.collection('savedNews').updateOne(
        { userId, newsId },
        { $setOnInsert: { userId, newsId, savedAt: new Date() } },
        { upsert: true }
      );
    } else {
      await db.collection('savedNews').deleteOne({ userId, newsId });
    }

    return new Response(JSON.stringify({ success: true, action }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Save news error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};

// GET: Fetch user's saved news IDs
export const GET: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ savedIds: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = await connectDB();
    const saved = await db.collection('savedNews')
      .find({ userId: session.user.id })
      .project({ newsId: 1 })
      .toArray();

    return new Response(JSON.stringify({ savedIds: saved.map(s => s.newsId) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get saved news error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
