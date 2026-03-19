import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Listing } from '../../../types/listing';
import { ListingDraftSchema } from '../../../schemas/listing.schema';
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

    // Validate with relaxed draft schema (only title required)
    const validation = await parseRequestBody(request, ListingDraftSchema);

    if (!validation.success) {
      return validation.response;
    }

    const { draftId, title, description, descriptionPlainText, listingType, exchangeFor, category, condition, price, originalPrice, images } = validation.data;

    const db = await connectDB();
    const listingsCollection = db.collection<Listing>('listings');

    // If draftId provided, update existing draft
    if (draftId) {
      const existing = await listingsCollection.findOne({ _id: new ObjectId(draftId) });

      if (!existing) {
        return new Response(JSON.stringify({ error: 'Draft not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (existing.sellerId.toString() !== userId) {
        return new Response(JSON.stringify({ error: 'Not authorized to edit this draft' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (existing.status !== 'draft') {
        return new Response(JSON.stringify({ error: 'This listing is not a draft' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await listingsCollection.updateOne(
        { _id: new ObjectId(draftId) },
        {
          $set: {
            title,
            ...(description && { description }),
            ...(descriptionPlainText && { descriptionPlainText }),
            listingType: listingType || 'sell',
            ...(exchangeFor && { exchangeFor }),
            ...(category && { category }),
            ...(condition && { condition }),
            ...(price !== undefined && { price }),
            ...(originalPrice !== undefined && { originalPrice }),
            images: images || [],
            updatedAt: new Date()
          }
        }
      );

      return new Response(
        JSON.stringify({ draftId, message: 'Draft updated successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create new draft — no moderation, no daily limit
    const newDraft: Omit<Listing, '_id'> = {
      title,
      description: description || '',
      descriptionPlainText: descriptionPlainText || '',
      listingType: listingType || 'sell',
      exchangeFor: listingType === 'exchange' ? (exchangeFor || undefined) : undefined,
      category: category || ('' as any),
      condition: condition || ('' as any),
      price: price || 0,
      originalPrice: originalPrice || undefined,
      images: images || [],
      sellerId: userId,
      status: 'draft',
      views: 0,
      savedBy: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await listingsCollection.insertOne(newDraft as Listing);

    return new Response(
      JSON.stringify({ draftId: result.insertedId.toString(), message: 'Draft saved successfully' }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Draft save error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
