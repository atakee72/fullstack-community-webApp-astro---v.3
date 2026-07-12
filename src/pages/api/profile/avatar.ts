import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { v2 as cloudinary } from 'cloudinary';
import { ObjectId } from 'mongodb';
import { connectDB } from '../../../lib/mongodb';
import { rejectIfBanned } from '../../../lib/auth/banGuard';
import { AVATAR_MAX_BYTES, AVATAR_ACCEPTED_TYPES } from '../../../lib/profile/profileShared';

// Configure Cloudinary
cloudinary.config({
  cloud_name: import.meta.env.CLOUD_NAME,
  api_key: import.meta.env.CLOUDINARY_API_KEY,
  api_secret: import.meta.env.CLOUDINARY_API_SECRET
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = (session.user as any).id as string;

    // Ban enforcement: banned accounts are read-only (3-strike Sperre).
    const bannedRes = await rejectIfBanned(userId);
    if (bannedRes) return bannedRes;

    const formData = await request.formData();
    const image = formData.get('image') as File | null;

    if (!image || !(image instanceof File) || image.size === 0) {
      return new Response(JSON.stringify({ error: 'no_file' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!AVATAR_ACCEPTED_TYPES.includes(image.type as (typeof AVATAR_ACCEPTED_TYPES)[number])) {
      return new Response(JSON.stringify({ error: 'bad_type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (image.size > AVATAR_MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'file_too_large' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Convert File to base64 data URI
    const buffer = await image.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUri = `data:${image.type};base64,${base64}`;

    let secureUrl: string;
    try {
      const uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: 'mahalle/profile',
        public_id: `${userId}_${Date.now()}`,
        transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }],
        quality: 'auto:good'
      });
      secureUrl = uploadResult.secure_url;
    } catch (uploadError) {
      console.error('Avatar Cloudinary upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'upload_failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await connectDB();
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { userPicture: secureUrl, updatedAt: new Date().toISOString() } }
    );

    return new Response(JSON.stringify({ url: secureUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
