/**
 * Shared query options used by BOTH the SSR prefetch (listingsQuery.ts)
 * and the client-side fetch helper (useListingsQuery.ts) for the marketplace.
 *
 * This file is intentionally dependency-free so it can be imported from
 * both server (MongoDB) and client (Svelte/React) code without dragging
 * server-only modules into the browser bundle.
 */
export const LISTINGS_QUERY_OPTIONS = {
  fields: [
    '_id',
    'title',
    'description',
    'descriptionPlainText',
    'category',
    'listingType',
    'condition',
    'price',
    'originalPrice',
    'delivery',
    'specs',
    'images',
    'sellerId',
    'sellerName',
    'sellerImage',
    'status',
    'reservedAt',
    'lastBumpedAt',
    'bundleId',
    'moderationStatus',
    'isUserReported',
    'hasWarningLabel',
    'warningText',
    'rejectionReason',
    'views',
    'savedBy',
    'exchangeFor',
    'createdAt',
    'updatedAt',
  ] as const,
  sortBy: 'updatedAt' as const,
  sortOrder: 'desc' as const,
  defaultLimit: 24,
} as const;

export type ListingsQueryOptions = typeof LISTINGS_QUERY_OPTIONS;
