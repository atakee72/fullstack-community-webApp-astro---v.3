import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { NewsItem } from '../../../types';
import { NewsQuerySchema } from '../../../schemas/news.schema';

export const GET: APIRoute = async ({ url, request }) => {
  try {
    const session = await getSession(request);
    const currentUserId = session?.user?.id;

    const db = await connectDB();
    const newsCollection = db.collection<NewsItem>('news');

    // Parse query parameters
    const params = Object.fromEntries(url.searchParams);
    const validation = NewsQuerySchema.safeParse(params);

    if (!validation.success) {
      return new Response(JSON.stringify({ error: 'Invalid query parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { limit, offset, sortBy, sortOrder, source, search, dateFrom } = validation.data;

    // Build filter: only show approved news (+ user's own pending submissions)
    const filter: Record<string, any> = {
      $or: [
        { moderationStatus: 'approved' },
        ...(currentUserId ? [
          { submittedBy: currentUserId, moderationStatus: 'pending' },
          { submittedBy: currentUserId, moderationStatus: 'rejected' }
        ] : [])
      ]
    };

    if (source) filter.source = source;

    if (dateFrom) {
      filter.publishedAt = { $gte: new Date(dateFrom) };
    }

    if (search) {
      filter.$and = [
        { $or: filter.$or },
        {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { sourceName: { $regex: search, $options: 'i' } }
          ]
        }
      ];
      delete filter.$or;
    }

    // Fetch news
    const [items, total] = await Promise.all([
      newsCollection
        .find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1, _id: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      newsCollection.countDocuments(filter)
    ]);

    // Populate submitter info for user-submitted news
    const usersCollection = db.collection('users');
    const populatedItems = await Promise.all(
      items.map(async (item) => {
        if (item.source === 'user_submitted' && item.submittedBy && typeof item.submittedBy === 'string') {
          try {
            const submitter = await usersCollection.findOne(
              { _id: new ObjectId(item.submittedBy) },
              { projection: { password: 0 } }
            );
            return { ...item, submittedBy: submitter || item.submittedBy };
          } catch {
            return item;
          }
        }
        return item;
      })
    );

    return new Response(
      JSON.stringify({
        news: populatedItems,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + items.length < total
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching news:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch news' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
