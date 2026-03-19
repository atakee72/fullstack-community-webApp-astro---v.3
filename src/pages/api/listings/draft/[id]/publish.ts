import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { Listing } from '../../../../../types/listing';
import type { FlaggedContent } from '../../../../../types';
import { isValidObjectId } from '../../../../../schemas/validation.utils';
import { moderatePost, checkSpamWithGPT, checkImagesWithGPT, createFlaggedContentRecord, mergeModerationResults } from '../../../../../lib/moderation';

export const POST: APIRoute = async ({ request, params }) => {
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
      return new Response(JSON.stringify({ error: 'Invalid draft ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;
    const db = await connectDB();
    const listingsCollection = db.collection<Listing>('listings');

    // Fetch the draft
    const draft = await listingsCollection.findOne({ _id: new ObjectId(id) });

    if (!draft) {
      return new Response(JSON.stringify({ error: 'Draft not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (draft.sellerId.toString() !== userId) {
      return new Response(JSON.stringify({ error: 'Not authorized to publish this draft' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (draft.status !== 'draft') {
      return new Response(JSON.stringify({ error: 'This listing has already been published' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate draft has all required fields for publishing
    if (!draft.title || !draft.descriptionPlainText || !draft.category || !draft.condition || !draft.images?.length) {
      const missing = [];
      if (!draft.title) missing.push('title');
      if (!draft.descriptionPlainText) missing.push('description');
      if (!draft.category) missing.push('category');
      if (!draft.condition) missing.push('condition');
      if (!draft.images?.length) missing.push('at least one image');
      if (draft.listingType !== 'exchange' && (!draft.price || draft.price <= 0)) missing.push('price');

      return new Response(JSON.stringify({
        error: 'Draft is incomplete',
        message: `Please complete the following before publishing: ${missing.join(', ')}`,
        missingFields: missing
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check daily limit (publishing counts toward limit)
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayCount = await listingsCollection.countDocuments({
      sellerId: userId,
      createdAt: { $gte: dayAgo },
      status: { $ne: 'draft' }
    });

    if (todayCount >= 5) {
      return new Response(JSON.stringify({
        error: 'Daily listing limit reached',
        message: 'You can publish up to 5 listings per day. Please try again tomorrow.',
        dailyLimit: 5,
        currentCount: todayCount
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Run full moderation pipeline
    const contentText = `${draft.title}\n\n${draft.descriptionPlainText}`;
    const [moderationResult, spamResult, imageResult] = await Promise.all([
      moderatePost(contentText, draft.images),
      checkSpamWithGPT(contentText, 'neighborhood marketplace listing'),
      checkImagesWithGPT(draft.images)
    ]);

    const moderationStatus = (moderationResult.canPublish && spamResult.canPublish && imageResult.canPublish) ? 'approved' : 'pending';

    // Update draft → published
    await listingsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status: 'available',
          moderationStatus,
          updatedAt: new Date()
        }
      }
    );

    // Create flagged content record if any check failed
    const mergedResult = mergeModerationResults(moderationResult, spamResult, imageResult);
    if (mergedResult) {
      const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');
      const authorInfo = {
        id: userId,
        name: session.user.name || undefined,
        email: session.user.email || undefined
      };
      const contentInfo = { title: draft.title, body: draft.descriptionPlainText, imageUrls: draft.images };
      const flaggedRecord = createFlaggedContentRecord('marketplace', contentInfo, authorInfo, mergedResult);
      flaggedRecord.contentId = id;
      await flaggedCollection.insertOne(flaggedRecord as FlaggedContent);
    }

    return new Response(
      JSON.stringify({
        message: moderationStatus === 'pending'
          ? 'Your listing has been submitted and is under review.'
          : 'Listing published successfully!',
        moderationStatus
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Draft publish error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
