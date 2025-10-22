import { z } from 'zod';

// MongoDB ObjectId validation
export const ObjectIdSchema = z.string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid MongoDB ObjectId');

// Base Forum Post Schema (shared fields)
const BasePostSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  body: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(5000, 'Content must be less than 5000 characters')
    .trim(),
  tags: z.array(z.string().max(30))
    .max(5, 'Maximum 5 tags allowed')
    .default([])
});

// Topic Schema
export const TopicCreateSchema = BasePostSchema.extend({
  type: z.literal('topic').optional()
});

export const TopicUpdateSchema = BasePostSchema.partial().refine(
  data => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// Announcement Schema
export const AnnouncementCreateSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must be less than 5000 characters')
    .trim(),
  tags: z.array(z.string().max(30))
    .max(5, 'Maximum 5 tags allowed')
    .default([]),
  type: z.literal('announcement').optional()
});

export const AnnouncementUpdateSchema = AnnouncementCreateSchema.partial().refine(
  data => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// Recommendation Schema
export const RecommendationCreateSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  body: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(5000, 'Content must be less than 5000 characters')
    .trim(),
  category: z.enum([
    'restaurant',
    'shop',
    'service',
    'event',
    'place',
    'activity',
    'other'
  ]).optional().default('other'),
  tags: z.array(z.string().max(30))
    .max(5, 'Maximum 5 tags allowed')
    .default([]),
  type: z.literal('recommendation').optional()
});

export const RecommendationUpdateSchema = RecommendationCreateSchema.partial().refine(
  data => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// Like/Unlike Schema
export const LikeActionSchema = z.object({
  postId: ObjectIdSchema,
  action: z.enum(['like', 'unlike'])
});

// View Count Schema
export const ViewCountSchema = z.object({
  postId: ObjectIdSchema
});

// Search/Filter Schema
export const SearchFilterSchema = z.object({
  query: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: ObjectIdSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sortBy: z.enum(['date', 'likes', 'views', 'comments']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0)
});

// Type exports
export type TopicCreate = z.infer<typeof TopicCreateSchema>;
export type TopicUpdate = z.infer<typeof TopicUpdateSchema>;
export type AnnouncementCreate = z.infer<typeof AnnouncementCreateSchema>;
export type AnnouncementUpdate = z.infer<typeof AnnouncementUpdateSchema>;
export type RecommendationCreate = z.infer<typeof RecommendationCreateSchema>;
export type RecommendationUpdate = z.infer<typeof RecommendationUpdateSchema>;
export type LikeAction = z.infer<typeof LikeActionSchema>;
export type ViewCount = z.infer<typeof ViewCountSchema>;
export type SearchFilter = z.infer<typeof SearchFilterSchema>;