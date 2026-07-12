import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { z } from 'zod';
import clientPromise from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import { rejectIfBanned } from '../../../lib/auth/banGuard';
import { checkNameProfanity } from '../../../lib/moderation';
import { PROFILE_NAME_REGEX, HOBBY_MAX_COUNT, HOBBY_MAX_LEN } from '../../../lib/profile/profileShared';

const BodySchema = z.object({
  name: z.string().regex(PROFILE_NAME_REGEX, 'Invalid display name').optional(),
  hobbies: z.array(z.string().trim().min(1).max(HOBBY_MAX_LEN)).max(HOBBY_MAX_COUNT).optional(),
}).refine((d) => d.name !== undefined || d.hobbies !== undefined, { message: 'Nothing to update' });

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ban enforcement: banned accounts are read-only (3-strike Sperre).
    const bannedRes = await rejectIfBanned(session.user.id);
    if (bannedRes) return bannedRes;

    const body = await request.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message || 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const { name, hobbies } = parsed.data;

    if (name !== undefined) {
      const nameCheck = await checkNameProfanity(name);
      if (!nameCheck.clean) {
        return new Response(JSON.stringify({ error: nameCheck.reason || 'Invalid display name' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    const client = await clientPromise;
    const db = client.db();
    const users = db.collection('users');

    const result = await users.findOneAndUpdate(
      { _id: new ObjectId(session.user.id) },
      {
        $set: {
          ...(name !== undefined && { name }),
          ...(hobbies !== undefined && { hobbies }),
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after', projection: { name: 1, hobbies: 1 } }
    );

    if (!result) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      name: result.name,
      hobbies: Array.isArray(result.hobbies) ? result.hobbies : [],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
