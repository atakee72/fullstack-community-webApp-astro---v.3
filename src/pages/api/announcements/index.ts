import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import type { Announcement } from '../../../types';
import { fetchCollectionWithAuthors } from '../../../lib/topicsQuery';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    const session = await getSession(request);
    const currentUserId = session?.user?.id;

    const db = await connectDB();
    const announcementsCollection = db.collection<Announcement>('announcements');

    const { items, pagination } = await fetchCollectionWithAuthors(
      announcementsCollection,
      url,
      currentUserId
    );

    return new Response(
      JSON.stringify({
        announcements: items,
        pagination,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch announcements' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
