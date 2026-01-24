import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Event } from '../../../types';
import {
  parseQueryParams,
  applyQueryOptions,
  buildFilter,
  getTotalCount,
  buildPaginationMeta
} from '../../../lib/queryUtils';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    // Get current user for moderation filtering
    const session = await getSession(request);
    const currentUserId = session?.user?.id;

    const db = await connectDB();
    const eventsCollection = db.collection<Event>('events');

    // Parse query parameters
    const options = parseQueryParams(url);
    const filter = buildFilter(options);

    // Add moderation filter: show approved content OR user's own pending/rejected content
    // Also show content without moderationStatus (legacy content)
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

    // Merge moderation filter with existing filter
    if (filter.$and) {
      filter.$and.push(moderationFilter);
    } else if (Object.keys(filter).length > 0) {
      const existingFilter = { ...filter };
      Object.keys(existingFilter).forEach(key => delete filter[key]);
      filter.$and = [existingFilter, moderationFilter];
    } else {
      Object.assign(filter, moderationFilter);
    }

    // Get events with query options
    const events = await applyQueryOptions<Event>(
      eventsCollection,
      options,
      filter
    );

    // Get total count for pagination
    const total = await getTotalCount(eventsCollection, filter);

    // Build pagination metadata
    const limit = parseInt(options.limit as string) || 20;
    const offset = parseInt(options.offset as string) || 0;
    const pagination = buildPaginationMeta(total, limit, offset);

    // Populate author information if not excluded
    const shouldPopulateAuthor = !options.fields ||
      options.fields.length === 0 ||
      options.fields.includes('author');

    let populatedEvents = events;
    if (shouldPopulateAuthor) {
      const usersCollection = db.collection('users');
      const commentsCollection = db.collection('comments');

      populatedEvents = await Promise.all(
        events.map(async (event) => {
          let author = null;

          // Populate event author
          if (event.author) {
            // If author is already an object (populated), keep as is
            if (typeof event.author === 'object' && ('userName' in event.author || 'name' in event.author)) {
              author = event.author;
            } else {
              // Try to find author by ID (string or ObjectId)
              if (typeof event.author === 'string') {
                // Try as ObjectId
                try {
                  author = await usersCollection.findOne(
                    { _id: new ObjectId(event.author) },
                    { projection: { password: 0 } }
                  );
                } catch {
                  // If not valid ObjectId, skip
                  author = null;
                }
              } else {
                // Old MongoDB ObjectId lookup
                author = await usersCollection.findOne(
                  { _id: event.author },
                  { projection: { password: 0 } }
                );
              }
            }
          }

          // Populate comments with author information (with moderation filtering)
          let populatedComments: any[] = [];

          // Helper to populate a comment's author
          const populateCommentAuthor = async (comment: any) => {
            if (!comment.author) return comment;
            let commentAuthor = null;
            if (typeof comment.author === 'string') {
              try {
                commentAuthor = await usersCollection.findOne(
                  { _id: new ObjectId(comment.author) },
                  { projection: { password: 0 } }
                );
              } catch {
                commentAuthor = null;
              }
            } else {
              commentAuthor = await usersCollection.findOne(
                { _id: comment.author },
                { projection: { password: 0 } }
              );
            }
            return { ...comment, author: commentAuthor || comment.author };
          };

          // Fetch comments from event.comments array
          if (event.comments && Array.isArray(event.comments) && event.comments.length > 0) {
            const arrayComments = await Promise.all(
              event.comments.map(async (commentId: any) => {
                const comment = await commentsCollection.findOne({ _id: new ObjectId(commentId) });
                if (!comment) return null;

                // Apply moderation filter
                const status = comment.moderationStatus;
                const isAuthor = currentUserId && comment.author?.toString() === currentUserId;
                const isApproved = status === 'approved' || !status;
                const isUserReported = status === 'pending' && comment.isUserReported;

                if (!isApproved && !isUserReported && !isAuthor) {
                  return null;
                }

                return populateCommentAuthor(comment);
              })
            );
            populatedComments = arrayComments.filter(c => c !== null);
          }

          // Also fetch user's own rejected comments (removed from array when rejected)
          if (currentUserId) {
            const rejectedComments = await commentsCollection.find({
              relevantPostId: event._id,
              author: currentUserId,
              moderationStatus: 'rejected'
            }).toArray();

            // Add rejected comments that aren't already in the list
            const existingIds = new Set(populatedComments.map(c => c._id.toString()));
            for (const comment of rejectedComments) {
              if (!existingIds.has(comment._id.toString())) {
                populatedComments.push(await populateCommentAuthor(comment));
              }
            }
          }

          // Sort comments by date (oldest first, UI reverses for newest-on-top)
          populatedComments.sort((a, b) => {
            const dateA = a.date || a.createdAt?.getTime() || 0;
            const dateB = b.date || b.createdAt?.getTime() || 0;
            return dateA - dateB;
          });

          return { ...event, author, comments: populatedComments };
        })
      );
    }

    return new Response(
      JSON.stringify({
        events: populatedEvents,
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
    console.error('Error fetching events:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch events' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
