import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import type { Listing, ListingStats } from '../../../types/listing';

export const GET: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Please login' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;

    const db = await connectDB();
    const listingsCollection = db.collection<Listing>('listings');

    // Fetch user's listings
    const listings = await listingsCollection
      .find({ sellerId: userId })
      .sort({ createdAt: -1 })
      .toArray();

    // Separate drafts from published listings
    const drafts = listings.filter(l => l.status === 'draft');
    const published = listings.filter(l => l.status !== 'draft');

    // Calculate stats (exclude drafts)
    const stats: ListingStats = {
      totalListings: published.length,
      activeListings: published.filter(l => l.status === 'available').length,
      soldItems: published.filter(l => l.status === 'sold').length,
      totalEarnings: published
        .filter(l => l.status === 'sold')
        .reduce((sum, l) => sum + l.price, 0)
    };

    return new Response(JSON.stringify({ listings: published, drafts, stats }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error fetching user listings:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch listings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
