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
    const filter: Record<string, unknown> = {
      status: 'available',
      // Only show approved or legacy listings (backward compat)
      $or: [
        { moderationStatus: 'approved' },
        { moderationStatus: { $exists: false } }
      ]
    };

    if (filters.category && filters.category !== 'all') {
      filter.category = filters.category;
    }
    if (filters.condition && filters.condition !== 'all') {
      filter.condition = filters.condition;
    }
    // Filter by listing type (backward compat: missing = 'sell')
    if (filters.listingType && filters.listingType !== 'all') {
      if (filters.listingType === 'sell') {
        filter.$and = [
          { $or: [{ listingType: 'sell' }, { listingType: { $exists: false } }] }
        ];
      } else {
        filter.listingType = filters.listingType;
      }
    }
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      filter.price = {};
      if (filters.priceMin) (filter.price as Record<string, number>).$gte = filters.priceMin;
      if (filters.priceMax) (filter.price as Record<string, number>).$lte = filters.priceMax;
    }
    if (filters.search) {
      // Search needs to be combined with existing $or for moderation
      const searchConditions = [
        { title: { $regex: filters.search, $options: 'i' } },
        { descriptionPlainText: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i', $type: 'string' } }
      ];
      // Move moderation $or into $and to combine with search $or
      const moderationOr = filter.$or;
      delete filter.$or;
      filter.$and = [
        ...(filter.$and as any[] || []),
        { $or: moderationOr as any },
        { $or: searchConditions }
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

    // Serialize ObjectIds to strings for client-side comparison
    const serializedListings = listings.map(l => ({
      ...l,
      _id: l._id.toString(),
      sellerId: l.sellerId.toString()
    }));

    return new Response(JSON.stringify({
      listings: serializedListings,
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
