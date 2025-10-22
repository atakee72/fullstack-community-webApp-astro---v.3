import type { APIRoute } from 'astro';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';

// Configure Cloudinary
cloudinary.config({
  cloud_name: import.meta.env.CLOUD_NAME,
  api_key: import.meta.env.CLOUDINARY_API_KEY,
  api_secret: import.meta.env.CLOUDINARY_API_SECRET
});

export const POST: APIRoute = async ({ request }) => {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'No token provided' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, import.meta.env.JWT_SECRET || 'default-secret') as any;
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the form data
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const uploadType = formData.get('type') as string || 'profile'; // profile, post, etc.

    if (!image) {
      return new Response(JSON.stringify({ error: 'No image provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Convert File to base64
    const buffer = await image.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const base64 = Buffer.from(bytes).toString('base64');
    const dataUri = `data:${image.type};base64,${base64}`;

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: `mahalle/${uploadType}`,
      public_id: `${decoded.userId}_${Date.now()}`,
      transformation: [
        {
          width: uploadType === 'profile' ? 300 : 1200,
          height: uploadType === 'profile' ? 300 : 800,
          crop: uploadType === 'profile' ? 'fill' : 'limit',
          quality: 'auto:good'
        }
      ]
    });

    // If this is a profile picture update, save it to the user
    if (uploadType === 'profile') {
      const db = await connectDB();
      const usersCollection = db.collection('users');

      await usersCollection.updateOne(
        { _id: new ObjectId(decoded.userId) },
        {
          $set: {
            userPicture: uploadResult.secure_url,
            updatedAt: new Date()
          }
        }
      );
    }

    return new Response(
      JSON.stringify({
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        message: 'Image uploaded successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ error: 'Failed to upload image' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Configure maximum request size for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};