/**
 * Shared review action processing logic.
 * Used by both single review (review.ts) and bulk review (bulk-review.ts) endpoints.
 */

import { ObjectId, type Db } from 'mongodb';
import type { FlaggedContent, User } from '../types';

const MAX_STRIKES = 3;

const COLLECTION_MAP: Record<string, string> = {
  topic: 'topics',
  announcement: 'announcements',
  recommendation: 'recommendations',
  comment: 'comments',
  event: 'events',
  marketplace: 'listings',
  news: 'news'
};

export interface ReviewResult {
  reviewStatus: 'approved' | 'rejected';
  strikeCount?: number;
  userBanned?: boolean;
}

export async function processReviewAction(
  db: Db,
  flaggedContent: FlaggedContent,
  action: 'approve' | 'reject' | 'approve_with_warning',
  reviewerId: string,
  options?: { rejectionReason?: string; warningText?: string; notes?: string }
): Promise<ReviewResult> {
  const flaggedCollection = db.collection<FlaggedContent>('flaggedContent');
  const usersCollection = db.collection<User>('users');

  const isRejection = action === 'reject';
  const hasWarning = action === 'approve_with_warning';
  const newReviewStatus = isRejection ? 'rejected' : 'approved';

  // Update flagged content record
  await flaggedCollection.updateOne(
    { _id: new ObjectId(flaggedContent._id as string) },
    {
      $set: {
        reviewStatus: newReviewStatus,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: options?.notes || undefined,
        rejectionReason: isRejection ? (options?.rejectionReason || undefined) : undefined,
        hasWarningLabel: hasWarning,
        warningText: hasWarning ? (options?.warningText || undefined) : undefined,
        updatedAt: new Date()
      }
    }
  );

  // Update the original content's moderation status
  let userBanned = false;
  let newStrikeCount = 0;

  if (flaggedContent.contentId && flaggedContent.contentType) {
    const collectionName = COLLECTION_MAP[flaggedContent.contentType];
    if (collectionName) {
      const contentCollection = db.collection(collectionName);

      const updateData: Record<string, any> = {
        moderationStatus: isRejection ? 'rejected' : 'approved',
        updatedAt: new Date()
      };

      // Set approvedAt timestamp and fetchDate for news items
      if (!isRejection && flaggedContent.contentType === 'news') {
        updateData.approvedAt = new Date();
        updateData.fetchDate = new Date().toISOString().split('T')[0];
      }

      if (isRejection && options?.rejectionReason) {
        updateData.rejectionReason = options.rejectionReason;
      }

      if (hasWarning) {
        updateData.hasWarningLabel = true;
        updateData.warningText = options?.warningText;
      }

      await contentCollection.updateOne(
        { _id: new ObjectId(flaggedContent.contentId) },
        {
          $set: updateData,
          $unset: { isUserReported: '' }
        }
      );

      // Handle comment array updates for parent posts
      if (flaggedContent.contentType === 'comment') {
        const flaggedAny = flaggedContent as any;

        if (!isRejection) {
          // APPROVED: Add comment to parent's comments array
          let parentPostId = flaggedAny.parentPostId;
          let parentCollection = flaggedAny.parentCollection;

          if (!parentPostId) {
            const comment = await contentCollection.findOne({ _id: new ObjectId(flaggedContent.contentId) });
            if (comment && comment.relevantPostId) {
              parentPostId = comment.relevantPostId.toString();
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
        reason: options?.rejectionReason || 'Content violated community guidelines',
        contentType: flaggedContent.contentType,
        contentId: flaggedContent.contentId,
        reviewedBy: reviewerId
      };

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

  return {
    reviewStatus: newReviewStatus,
    strikeCount: isRejection ? newStrikeCount : undefined,
    userBanned: isRejection ? userBanned : undefined
  };
}
