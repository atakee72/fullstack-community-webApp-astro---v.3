import { z } from 'zod';

// ============================================================================
// MODERATION SCHEMAS
// ============================================================================

// MongoDB ObjectId validation
const ObjectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

// Moderation decision enum
export const ModerationDecisionSchema = z.enum(['approved', 'pending_review', 'urgent_review']);

// Review status enum
export const ModerationReviewStatusSchema = z.enum(['pending', 'approved', 'rejected']);

// Content type enum
export const ModeratedContentTypeSchema = z.enum([
  'topic',
  'announcement',
  'recommendation',
  'comment',
  'event',
  'marketplace'
]);

// Flagged content schema (for database)
export const FlaggedContentSchema = z.object({
  // Reference to original content
  contentType: ModeratedContentTypeSchema,
  contentId: z.string().optional(),

  // The content itself
  title: z.string().max(200).optional(),
  body: z.string().max(10000).optional(),
  imageUrls: z.array(z.string().url()).max(10).optional(),

  // Author info
  authorId: z.string().min(1, 'Author ID is required'),
  authorName: z.string().optional(),
  authorEmail: z.string().email().optional(),

  // Moderation details
  decision: ModerationDecisionSchema,
  flaggedCategories: z.array(z.string()),
  scores: z.record(z.string(), z.number().min(0).max(1)),
  highestCategory: z.string(),
  maxScore: z.number().min(0).max(1),

  // Review status
  reviewStatus: ModerationReviewStatusSchema.default('pending'),
  reviewedBy: z.string().optional(),
  reviewedAt: z.coerce.date().optional(),
  reviewNotes: z.string().max(1000).optional(),

  // Warning label
  hasWarningLabel: z.boolean().default(false),
  warningText: z.string().max(200).optional(),
});

// Schema for admin review action
export const ReviewActionSchema = z.object({
  flaggedContentId: ObjectIdSchema,
  action: z.enum(['approve', 'reject', 'approve_with_warning']),
  notes: z.string().max(1000).optional(), // Internal notes (not shown to user)
  rejectionReason: z.string().max(500).optional(), // Shown to user when rejected
  warningText: z.string().max(200).optional(),
});

// Schema for bulk review actions
export const BulkReviewActionSchema = z.object({
  flaggedContentIds: z.array(ObjectIdSchema).min(1).max(50),
  action: z.enum(['approve', 'reject']),
  notes: z.string().max(1000).optional(),
});

// Query schema for fetching flagged content
export const FlaggedContentQuerySchema = z.object({
  reviewStatus: ModerationReviewStatusSchema.optional(),
  contentType: ModeratedContentTypeSchema.optional(),
  decision: ModerationDecisionSchema.optional(),
  authorId: z.string().optional(),
  sortBy: z.enum(['createdAt', 'maxScore', 'reviewStatus']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// Type exports
export type FlaggedContentCreate = z.infer<typeof FlaggedContentSchema>;
export type ReviewAction = z.infer<typeof ReviewActionSchema>;
export type BulkReviewAction = z.infer<typeof BulkReviewActionSchema>;
export type FlaggedContentQuery = z.infer<typeof FlaggedContentQuerySchema>;
