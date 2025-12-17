import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Event } from '../../../types';
import { EventCreateSchema } from '../../../schemas/forum.schema';
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
    const validation = await parseRequestBody(request, EventCreateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const { title, body, startDate, endDate, location, category, tags } = validation.data;

    // Connect to database
    const db = await connectDB();
    const eventsCollection = db.collection<any>('events');

    // Create new event
    const newEvent = {
      title,
      body,
      author: userId, // Save author as ID string
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      location: location || null,
      category: category || 'other',
      tags: tags || [],
      comments: [],
      views: 0,
      likes: 0,
      likedBy: [],
      date: Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await eventsCollection.insertOne(newEvent);

    // Fetch author info to return with the created event
    const usersCollection = db.collection('users');
    const author = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    const createdEvent = {
      ...newEvent,
      _id: result.insertedId,
      author: author || userId // Return populated author or fallback to ID
    };

    return new Response(
      JSON.stringify({
        event: createdEvent,
        message: 'Event created successfully'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Event creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
