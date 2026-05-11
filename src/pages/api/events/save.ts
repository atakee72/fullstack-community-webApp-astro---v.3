import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { eventId, action } = await request.json();
    if (!eventId || !['save', 'unsave'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
    }

    const db = await connectDB();
    const userId = session.user.id;

    if (action === 'save') {
      await db.collection('savedEvents').updateOne(
        { userId, eventId },
        { $setOnInsert: { userId, eventId, savedAt: new Date() } },
        { upsert: true }
      );
    } else {
      await db.collection('savedEvents').deleteOne({ userId, eventId });
    }

    return new Response(JSON.stringify({ success: true, action }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Save event error:', error);
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
    const saved = await db.collection('savedEvents')
      .find({ userId: session.user.id })
      .project({ eventId: 1 })
      .toArray();

    return new Response(JSON.stringify({ savedIds: saved.map(s => s.eventId) }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Get saved events error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
};
