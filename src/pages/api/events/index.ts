import type { APIRoute } from 'astro';
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

export const GET: APIRoute = async ({ url }) => {
  try {
    const db = await connectDB();
    const eventsCollection = db.collection<Event>('events');

    // Parse query parameters
    const options = parseQueryParams(url);
    const filter = buildFilter(options);

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

      populatedEvents = await Promise.all(
        events.map(async (event) => {
          if (event.author) {
            let author = null;

            // If author is already an object (populated), return as is
            if (typeof event.author === 'object' && 'userName' in event.author) {
              return event;
            }

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

            return { ...event, author };
          }
          return event;
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
