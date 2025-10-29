import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import type { Announcement } from '../../../types';
import {
  parseQueryParams,
  applyQueryOptions,
  buildFilter,
  getTotalCount,
  buildPaginationMeta
} from '../../../lib/queryUtils';

export const GET: APIRoute = async ({ url }) => {
  try {
    const db = await connectDB();
    const announcementsCollection = db.collection<Announcement>('announcements');

    // Parse query parameters
    const options = parseQueryParams(url);
    const filter = buildFilter(options);

    // Get announcements with query options
    const announcements = await applyQueryOptions<Announcement>(
      announcementsCollection,
      options,
      filter
    );

    // Get total count for pagination
    const total = await getTotalCount(announcementsCollection, filter);

    // Build pagination metadata
    const limit = parseInt(options.limit as string) || 20;
    const offset = parseInt(options.offset as string) || 0;
    const pagination = buildPaginationMeta(total, limit, offset);

    // Populate author information if not excluded
    const shouldPopulateAuthor = !options.fields ||
      options.fields.length === 0 ||
      options.fields.includes('author');

    let populatedAnnouncements = announcements;
    if (shouldPopulateAuthor) {
      const usersCollection = db.collection('users');
      populatedAnnouncements = await Promise.all(
        announcements.map(async (announcement) => {
          if (announcement.author) {
            const author = await usersCollection.findOne(
              { betterAuthId: announcement.author },
              { projection: { password: 0 } }
            );
            return { ...announcement, author };
          }
          return announcement;
        })
      );
    }

    return new Response(
      JSON.stringify({
        announcements: populatedAnnouncements,
        pagination
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch announcements' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};