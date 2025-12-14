import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Announcement } from '../../../types';
import { AnnouncementCreateSchema } from '../../../schemas/forum.schema';
import { parseRequestBody } from '../../../schemas/validation.utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get session from NextAuth
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Please login' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;

    // Validate request body with Zod
    const validation = await parseRequestBody(request, AnnouncementCreateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const { title, body, tags } = validation.data;

    // Connect to database
    const db = await connectDB();
    const announcementsCollection = db.collection<any>('announcements');

    // Create new announcement
    const newAnnouncement = {
      title,
      body,
      author: userId, // Save author as ID string
      tags: tags || [],
      comments: [],
      views: 0,
      likes: 0,
      likedBy: [],
      date: Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await announcementsCollection.insertOne(newAnnouncement);

    const createdAnnouncement = {
      ...newAnnouncement,
      _id: result.insertedId
    };

    return new Response(
      JSON.stringify({
        announcement: createdAnnouncement,
        message: 'Announcement created successfully'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Announcement creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};