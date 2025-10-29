
import type { APIRoute } from 'astro';
import { auth } from '../../../../auth';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Announcement, EditHistory } from '../../../../types';
import { TopicCreateSchema } from '../../../../schemas/forum.schema';
import { parseRequestBody } from '../../../../schemas/validation.utils';

export const PUT: APIRoute = async ({ request, params }) => {
  try {
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
    const announcementId = params.id;

    if (!announcementId || !ObjectId.isValid(announcementId)) {
      return new Response(JSON.stringify({ error: 'Invalid announcement ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const validation = await parseRequestBody(request, TopicCreateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const { title, body, tags } = validation.data;

    const db = await connectDB();
    const announcementsCollection = db.collection<Announcement>('announcements');

    const existingAnnouncement = await announcementsCollection.findOne({ _id: new ObjectId(announcementId) });

    if (!existingAnnouncement) {
      return new Response(JSON.stringify({ error: 'Announcement not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const isAuthor =
      (typeof existingAnnouncement.author === 'string' && existingAnnouncement.author === userId) ||
      (existingAnnouncement.author && typeof existingAnnouncement.author === 'object' &&
       'betterAuthId' in existingAnnouncement.author &&
       existingAnnouncement.author.betterAuthId === userId);

    if (!isAuthor) {
      return new Response(JSON.stringify({ error: 'You can only edit your own announcements' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const editHistoryEntry: EditHistory = {
      originalTitle: existingAnnouncement.title,
      originalBody: existingAnnouncement.body || '',
      editedAt: new Date(),
      editedBy: userId
    };

    const updateResult = await announcementsCollection.findOneAndUpdate(
      { _id: new ObjectId(announcementId) },
      {
        $set: {
          title,
          body,
          description: body,
          tags: tags || [],
          isEdited: true,
          lastEditedAt: new Date(),
          updatedAt: new Date()
        },
        $push: {
          editHistory: editHistoryEntry
        }
      },
      { returnDocument: 'after' }
    );

    if (!updateResult) {
      return new Response(JSON.stringify({ error: 'Failed to update announcement' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const usersCollection = db.collection('users');
    let author = await usersCollection.findOne(
      { betterAuthId: userId },
      { projection: { password: 0 } }
    );

    if (!author) {
      const betterAuthUserCollection = db.collection('user');
      const betterAuthUser = await betterAuthUserCollection.findOne({
        _id: new ObjectId(userId)
      });

      let userName = session.user.name || session.user.email?.split('@')[0] || 'User';

      if (betterAuthUser && betterAuthUser['[object Object]']) {
        userName = betterAuthUser['[object Object]'];
      } else if (betterAuthUser?.name) {
        userName = betterAuthUser.name;
      }

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
    }

    const updatedAnnouncement = {
      ...updateResult,
      author
    };

    return new Response(
      JSON.stringify({
        announcement: updatedAnnouncement,
        message: 'Announcement updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Announcement update error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
