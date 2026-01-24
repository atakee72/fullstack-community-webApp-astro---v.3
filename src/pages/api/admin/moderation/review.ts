/**
 * Admin Review Action API
 * POST: Approve, reject, or approve with warning a flagged content item
 * Handles strike system: 3 strikes = user ban
 */

import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { connectDB } from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';
import type { FlaggedContent, User } from '../../../../types';
import { ReviewActionSchema } from '../../../../schemas/moderation.schema';

const MAX_STRIKES = 3;

// TODO: Implement ban enforcement (future feature)
// When user is banned (isBanned: true), we need to:
// 1. Check isBanned in auth callback → reject login with "Account suspended" message
// 2. Add middleware/check to content creation APIs (topics, comments, etc.)
// 3. Optionally force logout / invalidate existing sessions immediately
// 4. Show "Your account has been suspended" banner to banned users

// TODO: Add proper admin role check (same as index.ts)
const isAdmin = (userId: string): boolean => {
  const ADMIN_USER_IDS: string[] = [];
  return ADMIN_USER_IDS.length === 0 || ADMIN_USER_IDS.includes(userId);
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check authentication
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    if (!isAdmin(session.user.id)) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = ReviewActionSchema.safeParse(body);

    if (!validation.success) {
      return new Response(JSON.stringify({
        error: 'Invalid request',
        details: validation.error.flatten()
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { flaggedContentId, action, notes, rejectionReason, warningText } = validation.data;

    // Connect to database
    const db = await connectDB();
    const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');
    const usersCollection = db.collection<User>('users');

    // Find the flagged content
    const flaggedContent = await flaggedCollection.findOne({
      _id: new ObjectId(flaggedContentId)
    });

    if (!flaggedContent) {
      return new Response(JSON.stringify({ error: 'Flagged content not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determine new review status
    const newReviewStatus = action === 'reject' ? 'rejected' : 'approved';
    const hasWarning = action === 'approve_with_warning';
    const isRejection = action === 'reject';

    // Update flagged content record
    await flaggedCollection.updateOne(
      { _id: new ObjectId(flaggedContentId) },
      {
        $set: {
          reviewStatus: newReviewStatus,
          reviewedBy: session.user.id,
          reviewedAt: new Date(),
          reviewNotes: notes || undefined,
          rejectionReason: isRejection ? rejectionReason : undefined,
          hasWarningLabel: hasWarning,
          warningText: hasWarning ? warningText : undefined,
          updatedAt: new Date()
        }
      }
    );

    // Update the original content's moderation status
    let userBanned = false;
    let newStrikeCount = 0;

    if (flaggedContent.contentId && flaggedContent.contentType) {
      const collectionMap: Record<string, string> = {
        topic: 'topics',
        announcement: 'announcements',
        recommendation: 'recommendations',
        comment: 'comments',
        event: 'events',
        marketplace: 'marketplace'
      };

      const collectionName = collectionMap[flaggedContent.contentType];
      if (collectionName) {
        const contentCollection = db.collection(collectionName);

        const updateData: Record<string, any> = {
          moderationStatus: isRejection ? 'rejected' : 'approved',
          updatedAt: new Date()
        };

        if (isRejection && rejectionReason) {
          updateData.rejectionReason = rejectionReason;
        }

        if (hasWarning) {
          updateData.hasWarningLabel = true;
          updateData.warningText = warningText;
        }

        await contentCollection.updateOne(
          { _id: new ObjectId(flaggedContent.contentId) },
          {
            $set: updateData,
            $unset: { isUserReported: '' }  // Clear user reported flag after review
          }
        );

        // Handle comment array updates for parent posts
        if (flaggedContent.contentType === 'comment') {
          const flaggedAny = flaggedContent as any;

          if (!isRejection) {
            // APPROVED: Add comment to parent's comments array (if not already there)
            // Use stored parent info from AI flagging, or fetch from comment itself
            let parentPostId = flaggedAny.parentPostId;
            let parentCollection = flaggedAny.parentCollection;

            if (!parentPostId) {
              // User-reported comment - get parent info from the comment document
              const comment = await contentCollection.findOne({ _id: new ObjectId(flaggedContent.contentId) });
              if (comment && comment.relevantPostId) {
                parentPostId = comment.relevantPostId.toString();
                // Determine collection from context (default to topics)
                parentCollection = 'topics';
              }
            }

            if (parentPostId && parentCollection) {
              const parentCollectionRef = db.collection(parentCollection);
              await parentCollectionRef.updateOne(
                { _id: new ObjectId(parentPostId) },
                {
                  $addToSet: { comments: new ObjectId(flaggedContent.contentId) },
                  $set: { updatedAt: new Date() }
                }
              );
            }
          } else {
            // REJECTED: Remove comment from parent's comments array
            const comment = await contentCollection.findOne({ _id: new ObjectId(flaggedContent.contentId) });
            if (comment && comment.relevantPostId) {
              // Try to remove from all possible parent collections
              const parentCollections = ['topics', 'announcements', 'recommendations', 'events'];
              for (const pc of parentCollections) {
                await db.collection(pc).updateOne(
                  { _id: comment.relevantPostId },
                  { $pull: { comments: new ObjectId(flaggedContent.contentId) } }
                );
              }
            }
          }
        }
      }

      // Handle strike system on rejection
      if (isRejection && flaggedContent.authorId) {
        const strikeRecord = {
          date: new Date(),
          reason: rejectionReason || 'Content violated community guidelines',
          contentType: flaggedContent.contentType,
          contentId: flaggedContent.contentId,
          reviewedBy: session.user.id
        };

        // Increment strike count and add to history
        const userUpdate = await usersCollection.findOneAndUpdate(
          { _id: new ObjectId(flaggedContent.authorId) },
          {
            $inc: { moderationStrikes: 1 },
            $push: { strikeHistory: strikeRecord },
            $set: { updatedAt: new Date() }
          },
          { returnDocument: 'after' }
        );

        if (userUpdate) {
          newStrikeCount = userUpdate.moderationStrikes || 1;

          // Ban user if they hit max strikes
          if (newStrikeCount >= MAX_STRIKES) {
            await usersCollection.updateOne(
              { _id: new ObjectId(flaggedContent.authorId) },
              {
                $set: {
                  isBanned: true,
                  bannedAt: new Date(),
                  bannedReason: `Automatically banned after ${MAX_STRIKES} content violations`,
                  updatedAt: new Date()
                }
              }
            );
            userBanned = true;
          }
        }
      }
    }

    // Build response message
    let message = `Content ${isRejection ? 'rejected' : 'approved'}${hasWarning ? ' with warning' : ''}`;
    if (isRejection) {
      message += `. User now has ${newStrikeCount}/${MAX_STRIKES} strikes`;
      if (userBanned) {
        message += ' - USER HAS BEEN BANNED';
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message,
      reviewStatus: newReviewStatus,
      strikeCount: isRejection ? newStrikeCount : undefined,
      userBanned: isRejection ? userBanned : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error reviewing content:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
