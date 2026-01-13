import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Listing } from '../../../types/listing';
import { ListingCreateSchema } from '../../../schemas/listing.schema';
import { parseRequestBody } from '../../../schemas/validation.utils';

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Please login' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;

    // Validate request body with Zod
    const validation = await parseRequestBody(request, ListingCreateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const { title, description, category, condition, price, originalPrice, images } = validation.data;

    const db = await connectDB();
    const listingsCollection = db.collection<Listing>('listings');

    // Create new listing
    const newListing: Omit<Listing, '_id'> = {
      title,
      description,
      category,
      condition,
      price,
      originalPrice: originalPrice || undefined,
      images,
      sellerId: userId,
      status: 'available',
      views: 0,
      savedBy: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await listingsCollection.insertOne(newListing as Listing);

    // Fetch seller info
    const usersCollection = db.collection('users');
    const seller = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    const createdListing = {
      ...newListing,
      _id: result.insertedId,
      sellerName: seller?.name || 'Unknown',
      sellerEmail: seller?.email,
      sellerImage: seller?.userPicture || seller?.image
    };

    return new Response(
      JSON.stringify({
        listing: createdListing,
        message: 'Listing created successfully'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Listing creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
