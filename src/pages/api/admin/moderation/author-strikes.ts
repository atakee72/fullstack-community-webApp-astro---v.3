import type { APIRoute } from 'astro';
import { ObjectId } from 'mongodb';
import { requireAdminSession } from '../../../../lib/auth';
import { connectDB } from '../../../../lib/mongodb';

// Ban-Bremse ledger: the reject modal escalates on a would-be 3rd strike
// and shows the author's full strike history (date · surface · content ·
// reason). strikeHistory lives on the user doc; content titles are
// resolved from the flaggedContent records referenced by contentId.
export const GET: APIRoute = async ({ request, url }) => {
  const guard = await requireAdminSession(request);
  if (!guard.ok) return guard.response;

  const authorId = url.searchParams.get('authorId') ?? '';
  if (!ObjectId.isValid(authorId)) {
    return new Response(JSON.stringify({ error: 'Invalid authorId' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  const db = await connectDB();
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(authorId) },
    { projection: { moderationStrikes: 1, isBanned: 1, strikeHistory: 1 } }
  );
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404, headers: { 'Content-Type': 'application/json' }
    });
  }

  const rawHistory: any[] = (user.strikeHistory ?? []).slice(-10).reverse();
  const contentIds = rawHistory
    .map((s) => s.contentId)
    .filter((id) => id && ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  const flagged = contentIds.length
    ? await db.collection('flaggedContent')
        .find({ contentId: { $in: contentIds.map(String) } }, { projection: { contentId: 1, title: 1 } })
        .toArray()
    : [];
  const titleByContentId = new Map(flagged.map((f) => [String(f.contentId), f.title ?? null]));

  return new Response(JSON.stringify({
    strikes: user.moderationStrikes ?? 0,
    isBanned: user.isBanned === true,
    history: rawHistory.map((s) => ({
      date: s.date,
      contentType: s.contentType ?? 'topic',
      reason: s.reason ?? '',
      title: titleByContentId.get(String(s.contentId)) ?? null,
    })),
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
