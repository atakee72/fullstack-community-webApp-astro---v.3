import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Listing } from '../../../types/listing';
import { isValidObjectId } from '../../../schemas/validation.utils';

export const GET: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id || !isValidObjectId(id)) {
      return new Response(JSON.stringify({ error: 'Invalid listing ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = await connectDB();
    const listingsCollection = db.collection<Listing>('listings');

    const listing = await listingsCollection.findOne({ _id: new ObjectId(id) });

    if (!listing) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch seller info
    const usersCollection = db.collection('users');
    const seller = await usersCollection.findOne(
      { _id: new ObjectId(listing.sellerId as string) },
      { projection: { password: 0 } }
    );

    const listingWithSeller = {
      ...listing,
      sellerName: seller?.name || 'Unknown',
      sellerEmail: seller?.email,
      sellerImage: seller?.userPicture || seller?.image
    };

    return new Response(JSON.stringify({ listing: listingWithSeller }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching listing:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch listing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
