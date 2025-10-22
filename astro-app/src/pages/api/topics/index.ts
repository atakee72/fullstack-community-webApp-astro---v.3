import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import type { Topic } from '../../../types';
import { verifyToken } from '../../../lib/auth';
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
    const topicsCollection = db.collection<Topic>('topics');

    // Parse query parameters
    const options = parseQueryParams(url);
    const filter = buildFilter(options);

    // Get topics with query options
    const topics = await applyQueryOptions<Topic>(
      topicsCollection,
      options,
      filter
    );

    // Get total count for pagination
    const total = await getTotalCount(topicsCollection, filter);

    // Build pagination metadata
    const limit = parseInt(options.limit as string) || 20;
    const offset = parseInt(options.offset as string) || 0;
    const pagination = buildPaginationMeta(total, limit, offset);

    // Populate author information if not excluded
    const shouldPopulateAuthor = !options.fields ||
      options.fields.length === 0 ||
      options.fields.includes('author');

    let populatedTopics = topics;
    if (shouldPopulateAuthor) {
      const usersCollection = db.collection('users');
      populatedTopics = await Promise.all(
        topics.map(async (topic) => {
          if (topic.author) {
            const author = await usersCollection.findOne(
              { _id: topic.author },
              { projection: { password: 0 } }
            );
            return { ...topic, author };
          }
          return topic;
        })
      );
    }

    return new Response(
      JSON.stringify({
        topics: populatedTopics,
        pagination
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching topics:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch topics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Verify authentication
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { title, description, tags = [] } = body;

    if (!title || !description) {
      return new Response(JSON.stringify({ error: 'Title and description are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await connectDB();
    const topicsCollection = db.collection<Topic>('topics');

    const newTopic: Partial<Topic> = {
      title,
      description,
      tags,
      author: decoded.userId,
      date: new Date(),
      comments: [],
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await topicsCollection.insertOne(newTopic as Topic);

    // Fetch the created topic with author info
    const usersCollection = db.collection('users');
    const author = await usersCollection.findOne(
      { _id: decoded.userId },
      { projection: { password: 0 } }
    );

    return new Response(
      JSON.stringify({
        topic: { ...newTopic, _id: result.insertedId, author }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating topic:', error);
    return new Response(JSON.stringify({ error: 'Failed to create topic' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};