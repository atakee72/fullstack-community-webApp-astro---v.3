import type { APIRoute } from 'astro';
import { ObjectId } from 'mongodb';
import { connectDB } from '../../../../lib/mongodb';
import { requireAdminSession } from '../../../../lib/auth';
import { AnnouncementCreateSchema } from '../../../../schemas/forum.schema';
import { parseRequestBody } from '../../../../schemas/validation.utils';
import type { Announcement } from '../../../../types';

// Pin duration for new official announcements: 7 days from creation.
// After expiry the doc slips into the regular feed (still official-
// styled via the `isOfficial` flag, just no longer pinned). Admin can
// re-pin via /api/admin/announcements/[id] PATCH.
const PIN_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export const POST: APIRoute = async ({ request }) => {
  const guard = await requireAdminSession(request);
  if (!guard.ok) return guard.response;
  const userId = guard.userId;

  // Validate body — same shape as community announcements (title /
  // body / tags / images). Zod strips unknown keys, so any
  // client-supplied isOfficial/pinnedUntil is silently dropped — those
  // are server-controlled.
  const validation = await parseRequestBody(request, AnnouncementCreateSchema);
  if (!validation.success) return validation.response;
  const { title, body, tags, images } = validation.data;

  try {
    const db = await connectDB();
    const announcementsCollection = db.collection<Announcement>('announcements');

    // Atomic-ish displacement: any currently-pinned official loses
    // its pin so the new one takes the slot. Runs before insert so
    // the brief window where two officials have pinnedUntil > now
    // is sub-millisecond. Single-admin app — race is negligible.
    await announcementsCollection.updateMany(
      { isOfficial: true, pinnedUntil: { $gt: new Date() } as any },
      { $set: { pinnedUntil: null } }
    );

    const now = new Date();
    const newAnnouncement: Announcement = {
      title,
      body,
      author: userId as any,
      tags: tags || [],
      images: images || [],
      comments: [],
      views: 0,
      likes: 0,
      likedBy: [],
      date: Date.now(),
      moderationStatus: 'approved', // bypass — admin is trusted
      isOfficial: true,
      pinnedUntil: new Date(now.getTime() + PIN_DURATION_MS),
      createdAt: now,
      updatedAt: now
    };

    const result = await announcementsCollection.insertOne(newAnnouncement);

    // Return with populated author so the panel can render the row
    // without a follow-up fetch.
    const usersCollection = db.collection('users');
    const author = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    return new Response(
      JSON.stringify({
        announcement: { ...newAnnouncement, _id: result.insertedId, author: author || userId },
        message: 'Official announcement published'
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin announcement creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
