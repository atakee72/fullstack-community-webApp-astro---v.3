/**
 * Shared query options used by BOTH the SSR prefetch (index.astro →
 * lib/topicsQuery.ts) and the client useTopicsQuery hook on the forum.
 * Must stay identical so react-query's `queryKey: [type, options]` matches
 * exactly and SSR initialData hydrates without triggering a refetch.
 *
 * This file is intentionally dependency-free so it can be imported from
 * both server (MongoDB) and client (React) code without dragging server-only
 * modules into the browser bundle.
 */
export const FORUM_QUERY_OPTIONS = {
  fields: [
    '_id',
    'title',
    'body',
    'description',
    'author',
    'tags',
    'images',
    'comments',
    'date',
    'likes',
    'likedBy',
    'views',
    'moderationStatus',
    'isUserReported',
    'rejectionReason',
    'hasWarningLabel',
    'warningText',
  ],
  sortBy: 'date' as const,
  sortOrder: 'desc' as const,
};
