import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Topic } from '../../../types';
import { TopicCreateSchema } from '../../../schemas/forum.schema';
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
    const validation = await parseRequestBody(request, TopicCreateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const { title, body, tags } = validation.data;

    // Connect to database
    const db = await connectDB();
    const topicsCollection = db.collection<Topic>('topics');

    // Create new topic
    const newTopic: Topic = {
      title,
      body,
      author: userId as any, // Save author as ID string
      tags: tags || [],
      comments: [],
      views: 0,
      likes: 0,
      likedBy: [],
      date: Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await topicsCollection.insertOne(newTopic);

    // Fetch author info to return with the created topic
    const usersCollection = db.collection('users');
    const author = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    const createdTopic = {
      ...newTopic,
      _id: result.insertedId,
      author: author || userId // Return populated author or fallback to ID
    };

    return new Response(
      JSON.stringify({
        topic: createdTopic,
        message: 'Topic created successfully'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Topic creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};