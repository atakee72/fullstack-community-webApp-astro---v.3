import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import type { Announcement } from '../../../types';

export const GET: APIRoute = async () => {
  try {
    const db = await connectDB();
    const announcementsCollection = db.collection<Announcement>('announcements');

    const announcements = await announcementsCollection
      .find({})
      .sort({ date: -1 })
      .limit(50)
      .toArray();

    // Populate author information
    const usersCollection = db.collection('users');
    const populatedAnnouncements = await Promise.all(
      announcements.map(async (announcement) => {
        const author = await usersCollection.findOne(
          { _id: announcement.author },
          { projection: { password: 0 } }
        );
        return { ...announcement, author };
      })
    );

    return new Response(
      JSON.stringify({
        number: populatedAnnouncements.length,
        requestedAnnouncements: populatedAnnouncements
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return new Response(
      JSON.stringify({
        msg: 'Something went wrong in the server!',
        error: error instanceof Error ? error.message : 'Failed to fetch announcements'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};