import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Listing } from '../../../../types/listing';
import type { FlaggedContent } from '../../../../types';
import { ListingUpdateSchema } from '../../../../schemas/listing.schema';
import { parseRequestBody, isValidObjectId } from '../../../../schemas/validation.utils';
import { moderatePost, checkSpamWithGPT, checkImagesWithGPT, createFlaggedContentRecord, mergeModerationResults } from '../../../../lib/moderation';

export const PUT: APIRoute = async ({ request, params }) => {
  try {
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Please login' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = params;

    if (!id || !isValidObjectId(id)) {
      return new Response(JSON.stringify({ error: 'Invalid listing ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;

    const db = await connectDB();
    const listingsCollection = db.collection<Listing>('listings');

    // Check if listing exists and belongs to user
    const existingListing = await listingsCollection.findOne({ _id: new ObjectId(id) });

    if (!existingListing) {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (existingListing.sellerId.toString() !== userId) {
      return new Response(JSON.stringify({ error: 'Not authorized to edit this listing' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate request body
    const validation = await parseRequestBody(request, ListingUpdateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const updateData: Record<string, any> = {
      ...validation.data,
      updatedAt: new Date()
    };

    // If changing to exchange, force price=0 and keep exchangeFor
    if (updateData.listingType === 'exchange') {
      updateData.price = 0;
      updateData.originalPrice = undefined;
    } else if (updateData.listingType === 'sell') {
      updateData.exchangeFor = undefined;
    }

    // Re-run moderation if content or images changed
    const contentChanged = updateData.title || updateData.description || updateData.descriptionPlainText || updateData.images;
    if (contentChanged) {
      const title = updateData.title || existingListing.title;
      const plainText = updateData.descriptionPlainText || existingListing.descriptionPlainText || '';
      const images = updateData.images || existingListing.images;
      const contentText = `${title}\n\n${plainText}`;

      // Run all moderation checks in parallel: text safety, spam check, and image safety
      const [moderationResult, spamResult, imageResult] = await Promise.all([
        moderatePost(contentText, images),
        checkSpamWithGPT(contentText, 'neighborhood marketplace listing'),
        checkImagesWithGPT(images)
      ]);

      const authorInfo = {
        id: userId,
        name: session.user.name || undefined,
        email: session.user.email || undefined
      };
      const contentInfo = { title, body: plainText, imageUrls: images };

      const mergedResult = mergeModerationResults(moderationResult, spamResult, imageResult);
      if (mergedResult) {
        updateData.moderationStatus = 'pending';

        const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');
        const flaggedRecord = createFlaggedContentRecord('marketplace', contentInfo, authorInfo, mergedResult);
        flaggedRecord.contentId = id;
        await flaggedCollection.insertOne(flaggedRecord as FlaggedContent);
      } else {
        updateData.moderationStatus = 'approved';
      }
    }

    await listingsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    const updatedListing = await listingsCollection.findOne({ _id: new ObjectId(id) });

    return new Response(
      JSON.stringify({
        listing: updatedListing,
        message: 'Listing updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Listing update error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
