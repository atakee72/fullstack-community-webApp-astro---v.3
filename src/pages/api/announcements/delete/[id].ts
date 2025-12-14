import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export const DELETE: APIRoute = async ({ params, request }) => {
  try {
    const id = params.id;

    if (!id || !ObjectId.isValid(id)) {
      return new Response(JSON.stringify({ error: 'Invalid announcement ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get session from NextAuth
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Please login' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;

    const db = await connectDB();
    const announcementsCollection = db.collection('announcements');

    // First, check if the announcement exists and if the user is the author
    const announcement = await announcementsCollection.findOne({ _id: new ObjectId(id) });

    if (!announcement) {
      return new Response(JSON.stringify({ error: 'Announcement not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is the author
    // Handle both new format (NextAuth ID as string) and old format (ObjectId)
    const announcementAuthorId = typeof announcement.author === 'string'
      ? announcement.author
      : announcement.author?.toString();

    if (announcementAuthorId !== userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized - you can only delete your own announcements' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete the announcement
    const result = await announcementsCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return new Response(JSON.stringify({ error: 'Failed to delete announcement' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Also delete related comments
    const commentsCollection = db.collection('comments');
    await commentsCollection.deleteMany({ topic: new ObjectId(id) });

    return new Response(JSON.stringify({
      message: 'Announcement deleted successfully',
      id: id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete announcement error:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete announcement' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};