import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Announcement } from '../../../types';
import {
  parseQueryParams,
  applyQueryOptions,
  buildFilter,
  getTotalCount,
  buildPaginationMeta
} from '../../../lib/queryUtils';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    // Get current user (optional - for showing their pending content)
    const session = await getSession(request);
    const currentUserId = session?.user?.id;

    const db = await connectDB();
    const announcementsCollection = db.collection<Announcement>('announcements');

    // Parse query parameters
    const options = parseQueryParams(url);
    const filter = buildFilter(options);

    // Add moderation filter: show approved content OR user's own pending/rejected content
    // Also show content without moderationStatus (legacy content)
    // Authors can see their own pending and rejected posts (with notices)
    // User-reported content stays visible to everyone (unlike AI-flagged which hides until approved)
    const moderationFilter = {
      $or: [
        { moderationStatus: 'approved' },
        { moderationStatus: { $exists: false } }, // Legacy content without moderation
        { moderationStatus: 'pending', isUserReported: true }, // User-reported content stays visible
        ...(currentUserId ? [
          { author: currentUserId, moderationStatus: 'pending' },
          { author: currentUserId, moderationStatus: 'rejected' }
        ] : [])
      ]
    };

    // Merge with existing filter
    if (filter.$and) {
      filter.$and.push(moderationFilter);
    } else if (Object.keys(filter).length > 0) {
      const existingFilter = { ...filter };
      Object.keys(existingFilter).forEach(key => delete filter[key]);
      filter.$and = [existingFilter, moderationFilter];
    } else {
      Object.assign(filter, moderationFilter);
    }

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
            let author = null;

            // If author is already an object (populated), return as is
            if (typeof announcement.author === 'object' && 'userName' in announcement.author) {
              return announcement;
            }

            // Try to find author by ID (string or ObjectId)
            if (typeof announcement.author === 'string') {
              // Try as ObjectId
              try {
                author = await usersCollection.findOne(
                  { _id: new ObjectId(announcement.author) },
                  { projection: { password: 0 } }
                );
              } catch {
                // If not valid ObjectId, skip
                author = null;
              }
            } else {
              // Old MongoDB ObjectId lookup
              author = await usersCollection.findOne(
                { _id: announcement.author },
                { projection: { password: 0 } }
              );
            }

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
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
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