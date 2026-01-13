import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import { ListingFilterSchema } from '../../../schemas/listing.schema';
import type { Listing } from '../../../types/listing';

export const GET: APIRoute = async ({ url }) => {
  try {
    const db = await connectDB();
    const listingsCollection = db.collection<Listing>('listings');

    // Parse and validate query params
    const params = Object.fromEntries(url.searchParams);
    const parseResult = ListingFilterSchema.safeParse(params);

    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: 'Invalid filter parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const filters = parseResult.data;

    // Build MongoDB filter
    const filter: Record<string, unknown> = { status: 'available' };

    if (filters.category && filters.category !== 'all') {
      filter.category = filters.category;
    }
    if (filters.condition && filters.condition !== 'all') {
      filter.condition = filters.condition;
    }
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      filter.price = {};
      if (filters.priceMin) (filter.price as Record<string, number>).$gte = filters.priceMin;
      if (filters.priceMax) (filter.price as Record<string, number>).$lte = filters.priceMax;
    }
    if (filters.search) {
      // Search in title and descriptionPlainText (new) or description (legacy plain text)
      filter.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { descriptionPlainText: { $regex: filters.search, $options: 'i' } },
        // Fallback for legacy listings with plain text description
        { description: { $regex: filters.search, $options: 'i', $type: 'string' } }
      ];
    }

    // Sort options
    const sortMap: Record<string, Record<string, 1 | -1>> = {
      'newest': { createdAt: -1 },
      'oldest': { createdAt: 1 },
      'price-asc': { price: 1 },
      'price-desc': { price: -1 }
    };

    const listings = await listingsCollection
      .find(filter)
      .sort(sortMap[filters.sortBy])
      .skip(filters.offset)
      .limit(filters.limit)
      .toArray();

    const total = await listingsCollection.countDocuments(filter);

    return new Response(JSON.stringify({
      listings,
      pagination: {
        total,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + listings.length < total
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch listings' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
