import type { Collection, Document, Filter } from 'mongodb';
import { ObjectId } from 'mongodb';
import { connectDB } from './mongodb';
import {
  applyQueryOptions,
  buildFilter,
  getTotalCount,
  buildPaginationMeta,
  parseQueryParams,
} from './queryUtils';

export interface FetchCollectionResult<T> {
  items: T[];
  pagination: ReturnType<typeof buildPaginationMeta>;
}

/**
 * Build the standard moderation $or filter used by forum collections.
 * Shows approved content + legacy content + user-reported pending
 * + the current user's own pending/rejected posts.
 */
export function buildModerationFilter(currentUserId?: string) {
  return {
    $or: [
      { moderationStatus: 'approved' },
      { moderationStatus: { $exists: false } },
      { moderationStatus: 'pending', isUserReported: true },
      ...(currentUserId
        ? [
            { author: currentUserId, moderationStatus: 'pending' },
            { author: currentUserId, moderationStatus: 'rejected' },
          ]
        : []),
    ],
  };
}

/**
 * Merge a moderation filter into an existing query filter, handling the
 * $and / plain-object / empty-filter cases consistently.
 */
export function mergeModerationFilter(filter: Record<string, any>, moderationFilter: Record<string, any>) {
  if (filter.$and) {
    filter.$and.push(moderationFilter);
  } else if (Object.keys(filter).length > 0) {
    const existingFilter = { ...filter };
    Object.keys(existingFilter).forEach((key) => delete filter[key]);
    filter.$and = [existingFilter, moderationFilter];
  } else {
    Object.assign(filter, moderationFilter);
  }
  return filter;
}

/**
 * Populate authors for a batch of docs using a single $in query
 * (instead of N+1 findOne calls).
 *
 * Handles:
 *  - author already populated (object with userName) → kept as-is
 *  - author stored as ObjectId
 *  - author stored as string (valid ObjectId hex)
 */
export async function populateAuthors<T extends { author?: any }>(docs: T[]): Promise<T[]> {
  if (docs.length === 0) return docs;

  const db = await connectDB();
  const usersCollection = db.collection('users');

  // Collect unique author ids that need lookup
  const idSet = new Set<string>();
  for (const doc of docs) {
    const a = doc.author;
    if (!a) continue;
    if (typeof a === 'object' && 'userName' in a) continue; // already populated
    if (typeof a === 'string') {
      if (ObjectId.isValid(a)) idSet.add(a);
    } else if (a instanceof ObjectId) {
      idSet.add(a.toString());
    } else if (typeof a === 'object' && a._id) {
      idSet.add(a._id.toString());
    }
  }

  if (idSet.size === 0) return docs;

  const objectIds = Array.from(idSet).map((id) => new ObjectId(id));
  const users = await usersCollection
    .find({ _id: { $in: objectIds } }, { projection: { password: 0 } })
    .toArray();

  const userMap = new Map<string, any>();
  for (const u of users) userMap.set(u._id.toString(), u);

  return docs.map((doc) => {
    const a = doc.author;
    if (!a) return doc;
    if (typeof a === 'object' && 'userName' in a) return doc;

    let key: string | null = null;
    if (typeof a === 'string' && ObjectId.isValid(a)) key = a;
    else if (a instanceof ObjectId) key = a.toString();
    else if (typeof a === 'object' && a._id) key = a._id.toString();

    const author = key ? userMap.get(key) ?? null : null;
    return { ...doc, author };
  });
}

/**
 * Standard forum-collection fetch: parses query params, applies the
 * moderation filter, runs paginated find + count in parallel, and
 * batch-populates authors when not projected out.
 */
export async function fetchCollectionWithAuthors<T extends Document>(
  collection: Collection<T>,
  url: URL,
  currentUserId?: string
): Promise<FetchCollectionResult<T>> {
  const options = parseQueryParams(url);
  const filter = buildFilter(options) as Filter<T>;

  mergeModerationFilter(filter as Record<string, any>, buildModerationFilter(currentUserId));

  const [items, total] = await Promise.all([
    applyQueryOptions<T>(collection, options, filter),
    getTotalCount(collection, filter),
  ]);

  const limit = parseInt(options.limit as unknown as string) || 20;
  const offset = parseInt(options.offset as unknown as string) || 0;
  const pagination = buildPaginationMeta(total, limit, offset);

  const shouldPopulateAuthor =
    !options.fields || options.fields.length === 0 || options.fields.includes('author');

  const populated = shouldPopulateAuthor ? await populateAuthors(items as any[]) : items;

  return { items: populated as T[], pagination };
}

/**
 * Shared query options used by both SSR (index.astro) and the client
 * useTopicsQuery hook on the forum. These MUST stay identical so the
 * react-query `queryKey: [type, options]` matches exactly and initialData
 * hydrates the client cache without triggering a refetch.
 *
 * If you change this, change the matching call site in ForumContainer.tsx
 * (or better, import from here on both sides).
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

/**
 * Server-side fetch helper for hydrating the forum with initialData.
 * Builds a synthetic URL from the shared options and reuses
 * fetchCollectionWithAuthors so the shape matches the client hook's fetch.
 */
export async function fetchForumItemsForSSR(
  type: 'topics' | 'announcements' | 'recommendations',
  currentUserId: string | undefined,
  opts: { fields?: string[]; sortBy?: string; sortOrder?: string } = FORUM_QUERY_OPTIONS
) {
  const db = await connectDB();
  const collection = db.collection(type) as unknown as Collection<Document>;

  const params = new URLSearchParams();
  if (opts.fields?.length) params.set('fields', opts.fields.join(','));
  if (opts.sortBy) params.set('sortBy', opts.sortBy);
  if (opts.sortOrder) params.set('sortOrder', opts.sortOrder);

  const url = new URL(`http://ssr.local/api/${type}?${params.toString()}`);
  const result = await fetchCollectionWithAuthors(collection, url, currentUserId);
  // Serialize for client hydration: Date/ObjectId → string
  return JSON.parse(JSON.stringify(result.items));
}

