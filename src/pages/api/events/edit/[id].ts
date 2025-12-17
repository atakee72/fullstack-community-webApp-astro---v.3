import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Event, EditHistory } from '../../../../types';
import { EventUpdateSchema } from '../../../../schemas/forum.schema';
import { parseRequestBody } from '../../../../schemas/validation.utils';
import { isOwner } from '../../../../utils/authHelpers';

export const PUT: APIRoute = async ({ request, params }) => {
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
    const eventId = params.id;

    if (!eventId || !ObjectId.isValid(eventId)) {
      return new Response(JSON.stringify({ error: 'Invalid event ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const validation = await parseRequestBody(request, EventUpdateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const { title, body, startDate, endDate, location, category, tags } = validation.data;

    const db = await connectDB();
    const eventsCollection = db.collection<Event>('events');

    const existingEvent = await eventsCollection.findOne({ _id: new ObjectId(eventId) });

    if (!existingEvent) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!isOwner(existingEvent.author, userId)) {
      return new Response(JSON.stringify({ error: 'You can only edit your own events' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const editHistoryEntry: EditHistory = {
      originalTitle: existingEvent.title,
      originalBody: existingEvent.body || '',
      editedAt: new Date(),
      editedBy: userId
    };

    // Build update object with only provided fields
    const updateFields: any = {
      isEdited: true,
      lastEditedAt: new Date(),
      updatedAt: new Date()
    };

    if (title !== undefined) updateFields.title = title;
    if (body !== undefined) updateFields.body = body;
    if (startDate !== undefined) updateFields.startDate = new Date(startDate);
    if (endDate !== undefined) updateFields.endDate = new Date(endDate);
    if (location !== undefined) updateFields.location = location;
    if (category !== undefined) updateFields.category = category;
    if (tags !== undefined) updateFields.tags = tags;

    const updateResult = await eventsCollection.findOneAndUpdate(
      { _id: new ObjectId(eventId) },
      {
        $set: updateFields,
        $push: {
          editHistory: editHistoryEntry
        }
      },
      { returnDocument: 'after' }
    );

    if (!updateResult) {
      return new Response(JSON.stringify({ error: 'Failed to update event' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Construct author object from session
    const author = {
      _id: userId,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      roleBadge: 'resident'
    };

    const updatedEvent = {
      ...updateResult,
      author
    };

    return new Response(
      JSON.stringify({
        event: updatedEvent,
        message: 'Event updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Event update error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
