import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { postId, action } = await request.json();
    if (!postId || !['save', 'unsave'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
    }

    const db = await connectDB();
    const userId = session.user.id;

    if (action === 'save') {
      await db.collection('savedPosts').updateOne(
        { userId, postId },
        { $setOnInsert: { userId, postId, savedAt: new Date() } },
        { upsert: true }
      );
    } else {
      await db.collection('savedPosts').deleteOne({ userId, postId });
    }

    return new Response(JSON.stringify({ success: true, action }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Save post error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};

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
    const saved = await db.collection('savedPosts')
      .find({ userId: session.user.id })
      .project({ postId: 1 })
      .toArray();

    return new Response(JSON.stringify({ savedIds: saved.map(s => s.postId) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get saved posts error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
