import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { ObjectId } from 'mongodb';
import { connectDB } from '../../../lib/mongodb';

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  const userId = (session?.user as any)?.id;
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const db = await connectDB();
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(userId) },
    { projection: { moderationStrikes: 1, isBanned: 1, bannedAt: 1 } }
  );
  if (!user) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  const rejectedDocs = await db.collection('flaggedContent')
    .find(
      { authorId: userId, reviewStatus: 'rejected' },
      { projection: { contentType: 1, title: 1, rejectionReason: 1, reviewedAt: 1, updatedAt: 1 } }
    )
    .sort({ reviewedAt: -1 })
    .limit(20)
    .toArray();

  return new Response(JSON.stringify({
    strikes: user.moderationStrikes ?? 0,
    isBanned: user.isBanned === true,
    bannedAt: user.bannedAt ? new Date(user.bannedAt).toISOString() : null,
    rejected: rejectedDocs.map((d) => ({
      date: new Date(d.reviewedAt ?? d.updatedAt ?? Date.now()).toISOString(),
      contentType: d.contentType,
      title: d.title ?? '—',
      reason: d.rejectionReason ?? '',
    })),
  }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
};
