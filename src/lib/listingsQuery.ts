/**
 * SERVER-ONLY: imports connectDB (MongoDB). Never import this from a
 * client Svelte / React component — it will pull Node built-ins into the
 * browser bundle and silently break hydration.
 *
 * Pure constants live in marketplaceQueryOptions.ts for cross-boundary import.
 */
import type { Filter } from 'mongodb';
import { connectDB } from './mongodb';
import { LISTINGS_QUERY_OPTIONS } from './marketplaceQueryOptions';
import type { Listing } from '../types/listing';

/**
 * Build the combined moderation + marketplace-status visibility filter.
 *
 * Moderation visibility (mirrors forum/calendar precedent):
 *   - approved and legacy (no moderationStatus) → visible to all
 *   - pending + isUserReported=true → visible to all (anti-abuse: reporter
 *     can't hide content by flagging it)
 *   - own pending/rejected → visible only to seller
 *
 * Marketplace status visibility (per A7 + Issue 7):
 *   - available / reserved → visible to everyone
 *   - sold / exchanged / draft → owner-only (surfaces in their 'mine' view)
 */
export function buildListingsFilter(userId: string | null): Filter<any> {
  const modOr = [
    { moderationStatus: 'approved' },
    { moderationStatus: { $exists: false } },
    { moderationStatus: 'pending', isUserReported: true },
    ...(userId
      ? [
          { sellerId: userId, moderationStatus: 'pending' },
          { sellerId: userId, moderationStatus: 'rejected' },
        ]
      : []),
  ];

  const statusFilter: Filter<any> = userId
    ? {
        $or: [
          { status: { $in: ['available', 'reserved'] } },
          { sellerId: userId }, // owner sees their own at any status
        ],
      }
    : { status: { $in: ['available', 'reserved'] } };

  return {
    $and: [{ $or: modOr }, statusFilter],
  };
}

export interface ListingsFetchInput {
  /** 'sell' | 'exchange' | 'gift' — omit or 'all' to show everything */
  kind?: 'sell' | 'exchange' | 'gift' | 'all';
  /** category slug — omit or 'all' to show all categories */
  category?: string | 'all';
  /** full-text search across title + descriptionPlainText */
  search?: string;
  /** 'mine' = seller's own listings; 'saved' = listings savedBy userId */
  view?: 'mine' | 'saved' | null;
  limit?: number;
  offset?: number;
}

export interface ListingsFetchResult {
  items: Listing[];
  total: number;
}

export async function fetchListingsForSSR(
  input: ListingsFetchInput,
  userId: string | null,
): Promise<ListingsFetchResult> {
  const db = await connectDB();
  const col = db.collection<Listing>('listings');

  const baseFilter = buildListingsFilter(userId);
  const extra: Filter<any>[] = [];

  if (input.kind && input.kind !== 'all') {
    extra.push({ listingType: input.kind });
  }
  if (input.category && input.category !== 'all') {
    extra.push({ category: input.category });
  }
  if (input.search) {
    const q = input.search.trim();
    if (q) {
      // Escape regex special chars before constructing the pattern
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      extra.push({
        $or: [
          { title: { $regex: safe, $options: 'i' } },
          { descriptionPlainText: { $regex: safe, $options: 'i' } },
        ],
      });
    }
  }
  if (input.view === 'mine' && userId) {
    extra.push({ sellerId: userId });
  }
  if (input.view === 'saved' && userId) {
    extra.push({ savedBy: userId });
  }

  // Merge extra filters into the base $and array
  const filter: Filter<any> = extra.length
    ? { $and: [...(baseFilter.$and ?? [baseFilter]), ...extra] }
    : baseFilter;

  const projection = Object.fromEntries(
    LISTINGS_QUERY_OPTIONS.fields.map((f) => [f, 1]),
  );

  const limit = input.limit ?? LISTINGS_QUERY_OPTIONS.defaultLimit;
  const offset = input.offset ?? 0;

  const [rawItems, total] = await Promise.all([
    col
      .find(filter, { projection })
      .sort({
        [LISTINGS_QUERY_OPTIONS.sortBy]:
          LISTINGS_QUERY_OPTIONS.sortOrder === 'desc' ? -1 : 1,
      })
      .skip(offset)
      .limit(limit)
      .toArray(),
    col.countDocuments(filter),
  ]);

  // Serialize ObjectIds + Dates to plain strings for SSR transport (forum pattern).
  const items = rawItems.map((it: any) => ({
    ...it,
    _id: it._id?.toString(),
    sellerId:
      typeof it.sellerId === 'object' ? it.sellerId.toString() : it.sellerId,
    bundleId: it.bundleId
      ? typeof it.bundleId === 'object'
        ? it.bundleId.toString()
        : it.bundleId
      : null,
    createdAt:
      it.createdAt instanceof Date ? it.createdAt.toISOString() : it.createdAt,
    updatedAt:
      it.updatedAt instanceof Date ? it.updatedAt.toISOString() : it.updatedAt,
    reservedAt:
      it.reservedAt instanceof Date
        ? it.reservedAt.toISOString()
        : it.reservedAt,
    lastBumpedAt:
      it.lastBumpedAt instanceof Date
        ? it.lastBumpedAt.toISOString()
        : it.lastBumpedAt,
  })) as Listing[];

  return { items, total };
}
