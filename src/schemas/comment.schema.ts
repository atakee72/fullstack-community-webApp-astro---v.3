import { z } from 'zod';
import { ObjectIdSchema } from './forum.schema';

// Comment Create Schema
export const CommentCreateSchema = z.object({
  body: z.string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be less than 1000 characters')
    .trim(),
  topicId: ObjectIdSchema,
  collectionType: z.enum(['topics', 'announcements', 'recommendations'])
});

// Comment Update Schema
export const CommentUpdateSchema = z.object({
  body: z.string()
    .min(1, 'Comment cannot be empty')
    .max(1000, 'Comment must be less than 1000 characters')
    .trim()
});

// Comment Delete Schema
export const CommentDeleteSchema = z.object({
  commentId: ObjectIdSchema
});

// Comment Upvote Schema
export const CommentUpvoteSchema = z.object({
  commentId: ObjectIdSchema,
  action: z.enum(['upvote', 'remove'])
});

// Comment Query Schema
export const CommentQuerySchema = z.object({
  postId: ObjectIdSchema.optional(),
  author: ObjectIdSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  sortBy: z.enum(['date', 'upvotes']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

// Type exports
export type CommentCreate = z.infer<typeof CommentCreateSchema>;
export type CommentUpdate = z.infer<typeof CommentUpdateSchema>;
export type CommentDelete = z.infer<typeof CommentDeleteSchema>;
export type CommentUpvote = z.infer<typeof CommentUpvoteSchema>;
export type CommentQuery = z.infer<typeof CommentQuerySchema>;