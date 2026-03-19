import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Listing } from '../../../types/listing';
import type { FlaggedContent } from '../../../types';
import { ListingCreateSchema } from '../../../schemas/listing.schema';
import { parseRequestBody } from '../../../schemas/validation.utils';
import { moderatePost, checkSpamWithGPT, checkImagesWithGPT, createFlaggedContentRecord, mergeModerationResults } from '../../../lib/moderation';

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

    // Check daily listing limit (5 per rolling 24h)
    const db = await connectDB();
    const listingsCollection = db.collection<Listing>('listings');
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayCount = await listingsCollection.countDocuments({
      sellerId: userId,
      createdAt: { $gte: dayAgo },
      status: { $ne: 'draft' }
    });

    if (todayCount >= 5) {
      return new Response(JSON.stringify({
        error: 'Daily listing limit reached',
        message: 'You can create up to 5 listings per day. Please try again tomorrow or save as a draft.',
        dailyLimit: 5,
        currentCount: todayCount
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate request body with Zod
    const validation = await parseRequestBody(request, ListingCreateSchema);

    if (!validation.success) {
      return validation.response;
    }

    const { title, description, descriptionPlainText, listingType, exchangeFor, category, condition, price, originalPrice, images } = validation.data;

    // Force price=0 for exchange listings
    const finalPrice = listingType === 'exchange' ? 0 : price;
    const finalOriginalPrice = listingType === 'exchange' ? undefined : (originalPrice || undefined);

    // Run all moderation checks in parallel: text safety, spam check, and image safety (GPT-4o vision)
    const contentText = `${title}\n\n${descriptionPlainText}`;
    const [moderationResult, spamResult, imageResult] = await Promise.all([
      moderatePost(contentText, images),
      checkSpamWithGPT(contentText, 'neighborhood marketplace listing'),
      checkImagesWithGPT(images)
    ]);

    // All checks must pass for auto-approval
    const moderationStatus = (moderationResult.canPublish && spamResult.canPublish && imageResult.canPublish) ? 'approved' : 'pending';

    // Create new listing
    const newListing: Omit<Listing, '_id'> = {
      title,
      description,
      descriptionPlainText, // Plain text version for search
      listingType: listingType || 'sell',
      exchangeFor: listingType === 'exchange' ? (exchangeFor || undefined) : undefined,
      category,
      condition,
      price: finalPrice,
      originalPrice: finalOriginalPrice,
      images,
      sellerId: userId,
      status: 'available',
      moderationStatus,
      views: 0,
      savedBy: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await listingsCollection.insertOne(newListing as Listing);

    // Create a single combined flagged content record if any check failed
    const mergedResult = mergeModerationResults(moderationResult, spamResult, imageResult);
    if (mergedResult) {
      const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');
      const authorInfo = {
        id: userId,
        name: session.user.name || undefined,
        email: session.user.email || undefined
      };
      const contentInfo = { title, body: descriptionPlainText, imageUrls: images };
      const flaggedRecord = createFlaggedContentRecord('marketplace', contentInfo, authorInfo, mergedResult);
      flaggedRecord.contentId = result.insertedId.toString();
      await flaggedCollection.insertOne(flaggedRecord as FlaggedContent);
    }

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

    // Return appropriate response based on moderation results
    if (mergedResult) {
      return new Response(
        JSON.stringify({
          listing: createdListing,
          message: moderationResult.userMessage,
          moderationStatus: 'pending'
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

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
