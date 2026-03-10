import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../lib/mongodb';
import type { NewsItem, FlaggedContent } from '../../../types';
import { NewsSubmitSchema } from '../../../schemas/news.schema';
import { parseRequestBody } from '../../../schemas/validation.utils';
import { moderateText, createFlaggedContentRecord } from '../../../lib/moderation';

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

    // Validate request body
    const validation = await parseRequestBody(request, NewsSubmitSchema);

    if (!validation.success) {
      return validation.response;
    }

    const { title, description, sourceUrl, sourceName, imageUrl, submitterComment } = validation.data;

    // Check for duplicate URL
    const db = await connectDB();
    const newsCollection = db.collection<NewsItem>('news');

    const existing = await newsCollection.findOne({ sourceUrl });
    if (existing) {
      return new Response(JSON.stringify({ error: 'This news article has already been submitted' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Run content moderation on title + description + comment
    const textToModerate = `${title}\n\n${description}${submitterComment ? `\n\n${submitterComment}` : ''}`;
    const moderationResult = await moderateText(textToModerate);

    // All user-submitted news goes to moderation queue regardless of AI result
    // This ensures admin reviews every submission before it appears on the newsboard
    const moderationStatus = 'pending';

    const newNewsItem: NewsItem = {
      source: 'user_submitted',
      title,
      description,
      imageUrl: imageUrl || undefined,
      sourceUrl,
      sourceName,
      submittedBy: userId as any,
      submitterComment: submitterComment || undefined,
      moderationStatus,
      viewCount: 0,
      publishedAt: new Date(),
      fetchedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await newsCollection.insertOne(newNewsItem);

    // Create flagged content record for admin review
    const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');

    if (moderationResult.needsReview) {
      // AI flagged — create record with AI details
      const flaggedRecord = createFlaggedContentRecord(
        'news',
        { title, body: description },
        {
          id: userId,
          name: session.user.name || undefined,
          email: session.user.email || undefined
        },
        moderationResult
      );
      flaggedRecord.contentId = result.insertedId.toString();
      await flaggedCollection.insertOne(flaggedRecord as FlaggedContent);
    } else {
      // Not AI-flagged, but still needs admin approval — create a simple pending record
      await flaggedCollection.insertOne({
        source: 'ai_moderation',
        contentType: 'news',
        contentId: result.insertedId.toString(),
        title,
        body: description,
        authorId: userId,
        authorName: session.user.name || undefined,
        authorEmail: session.user.email || undefined,
        decision: 'pending_review',
        flaggedCategories: [],
        scores: {},
        highestCategory: 'user_submission',
        maxScore: 0,
        reviewStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      } as FlaggedContent);
    }

    return new Response(
      JSON.stringify({
        news: { ...newNewsItem, _id: result.insertedId },
        message: 'News submitted successfully. It will appear on the newsboard after admin approval.',
        moderationStatus: 'pending'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('News submission error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
