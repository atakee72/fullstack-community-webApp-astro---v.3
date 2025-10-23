import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import type { Topic } from '../../../types';

export const GET: APIRoute = async () => {
  try {
    const db = await connectDB();
    const topicsCollection = db.collection<Topic>('topics');

    const topics = await topicsCollection
      .find({})
      .sort({ date: -1 })
      .limit(50)
      .toArray();

    // Populate author information
    const usersCollection = db.collection('users');
    const populatedTopics = await Promise.all(
      topics.map(async (topic) => {
        const author = await usersCollection.findOne(
          { _id: topic.author },
          { projection: { password: 0 } }
        );
        return { ...topic, author };
      })
    );

    return new Response(
      JSON.stringify({
        number: populatedTopics.length,
        requestedTopics: populatedTopics
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching topics:', error);
    return new Response(
      JSON.stringify({
        msg: 'Something went wrong in the server!',
        error: error instanceof Error ? error.message : 'Failed to fetch topics'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};