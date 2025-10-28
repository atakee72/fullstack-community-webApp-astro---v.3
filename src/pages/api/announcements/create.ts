import type { APIRoute } from 'astro';
import { auth } from '../../../auth';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Announcement } from '../../../types';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Please login' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;

    // Get announcement data from request body
    const { title, body, tags } = await request.json();

    if (!title || !body) {
      return new Response(JSON.stringify({ error: 'Title and content are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Connect to database
    const db = await connectDB();
    const announcementsCollection = db.collection<any>('announcements');

    // Create new announcement - store Better Auth user ID as string
    const newAnnouncement = {
      title,
      body,
      description: body, // Some components expect description field
      author: userId as any, // Store Better Auth user ID directly (string)
      tags: tags || [],
      comments: [],
      views: 0,
      likes: 0,
      likedBy: [],
      date: Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await announcementsCollection.insertOne(newAnnouncement);

    // Try to find the user in the old users collection first (has profile data)
    const usersCollection = db.collection('users');
    let author = await usersCollection.findOne(
      { betterAuthId: userId }, // Link by Better Auth ID
      { projection: { password: 0 } }
    );

    // If not found in old users collection, create a basic profile from Better Auth user
    if (!author) {
      const betterAuthUserCollection = db.collection('user');
      // Better Auth stores user ID as ObjectId, session has it as string
      const betterAuthUser = await betterAuthUserCollection.findOne({
        _id: new ObjectId(userId)
      });

      // Extract username - handle corrupted field name
      let userName = session.user.name || session.user.email?.split('@')[0] || 'User';

      // Check for the corrupted "[object Object]" field (this is actually the username)
      if (betterAuthUser && betterAuthUser['[object Object]']) {
        userName = betterAuthUser['[object Object]'];
      } else if (betterAuthUser?.name) {
        userName = betterAuthUser.name;
      }

      // Create a basic author object with required fields
      author = {
        _id: new ObjectId(),
        betterAuthId: userId,
        userName: userName,
        email: session.user.email || betterAuthUser?.email,
        userPicture: session.user.image || betterAuthUser?.image || '',
        roleBadge: 'resident',
        hobbies: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save this profile to users collection for future use
      await usersCollection.insertOne(author);
    }

    const createdAnnouncement = {
      ...newAnnouncement,
      _id: result.insertedId,
      author
    };

    return new Response(
      JSON.stringify({
        announcement: createdAnnouncement,
        message: 'Announcement created successfully'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Announcement creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};