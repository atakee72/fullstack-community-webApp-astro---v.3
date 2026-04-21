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
import { buildModerationFilter, mergeModerationFilter, populateAuthors } from './topicsQuery';
import { getDefaultCalendarQueryOptions } from './calendarQueryOptions';

export interface FetchEventsResult<T> {
  events: T[];
  pagination: ReturnType<typeof buildPaginationMeta>;
}

function commentIdToString(cid: any): string | null {
  if (!cid) return null;
  if (typeof cid === 'string') return ObjectId.isValid(cid) ? cid : null;
  if (cid instanceof ObjectId) return cid.toString();
  if (typeof cid === 'object' && cid._id) return cid._id.toString();
  return null;
}

function commentAuthorId(c: any): string | null {
  const a = c?.author;
  if (!a) return null;
  if (typeof a === 'string') return a;
  if (a instanceof ObjectId) return a.toString();
  if (typeof a === 'object' && a._id) return a._id.toString();
  return null;
}

/**
 * Batch-populate comments for a set of events in bounded DB queries:
 *   - 1 $in on `comments` to fetch every referenced comment doc
 *   - 1 find for the current user's rejected comments (if logged in)
 *   - 1 $in on `users` (via populateAuthors) to populate authors
 *
 * Applies the comment moderation filter in memory BEFORE populating
 * authors, so the isAuthor check uses the raw author id.
 */
async function populateEventComments<T extends { _id: any; comments?: any }>(
  events: T[],
  currentUserId?: string
): Promise<T[]> {
  if (events.length === 0) return events;

  const db = await connectDB();
  const commentsCollection = db.collection('comments');

  // 1. Collect referenced comment ids
  const commentIdStrs = new Set<string>();
  for (const ev of events) {
    if (!Array.isArray(ev.comments)) continue;
    for (const cid of ev.comments) {
      const s = commentIdToString(cid);
      if (s) commentIdStrs.add(s);
    }
  }
  const commentObjectIds = Array.from(commentIdStrs).map((id) => new ObjectId(id));

  // 2. Fetch all referenced comments + user's rejected-own comments in parallel
  const eventObjectIds = events
    .map((e) => (e._id instanceof ObjectId ? e._id : ObjectId.isValid(String(e._id)) ? new ObjectId(String(e._id)) : null))
    .filter((x): x is ObjectId => x !== null);

  const [referencedComments, rejectedOwn] = await Promise.all([
    commentObjectIds.length
      ? commentsCollection.find({ _id: { $in: commentObjectIds } }).toArray()
      : Promise.resolve([]),
    currentUserId && eventObjectIds.length
      ? commentsCollection
          .find({
            relevantPostId: { $in: eventObjectIds },
            author: currentUserId,
            moderationStatus: 'rejected',
          })
          .toArray()
      : Promise.resolve([]),
  ]);

  // 3. Build map of comments by id (referenced + rejected-own)
  const commentsById = new Map<string, any>();
  for (const c of referencedComments) commentsById.set(c._id.toString(), c);
  for (const c of rejectedOwn) commentsById.set(c._id.toString(), c);

  // 4. Apply moderation filter on RAW comments (before author is mutated)
  //    Surviving set is the union of: ref-comments-that-pass + rejected-own
  const survivingIds = new Set<string>();
  for (const c of referencedComments) {
    const status = c.moderationStatus;
    const isApproved = status === 'approved' || !status;
    const isUserReported = status === 'pending' && c.isUserReported;
    const isAuthor = currentUserId && commentAuthorId(c) === currentUserId;
    if (isApproved || isUserReported || isAuthor) {
      survivingIds.add(c._id.toString());
    }
  }
  for (const c of rejectedOwn) survivingIds.add(c._id.toString());

  // 5. Batch-populate authors on survivors only
  const survivors = Array.from(survivingIds)
    .map((id) => commentsById.get(id))
    .filter(Boolean);
  const populated = await populateAuthors(survivors);
  const populatedById = new Map<string, any>();
  for (const c of populated) populatedById.set(c._id.toString(), c);

  // 6. Attach per-event: collect surviving comment ids (ref + own rejected),
  //    sort oldest-first (UI reverses for newest-on-top).
  return events.map((ev) => {
    const evIdStr = ev._id?.toString?.() ?? String(ev._id);
    const refIds: string[] = Array.isArray(ev.comments)
      ? (ev.comments.map(commentIdToString).filter((x: string | null): x is string => !!x) as string[])
      : [];

    const out: any[] = [];
    const seen = new Set<string>();

    for (const id of refIds) {
      if (seen.has(id)) continue;
      const c = populatedById.get(id);
      if (!c) continue;
      out.push(c);
      seen.add(id);
    }

    if (currentUserId) {
      for (const c of rejectedOwn) {
        const idStr = c._id.toString();
        if (seen.has(idStr)) continue;
        if (c.relevantPostId?.toString() !== evIdStr) continue;
        const p = populatedById.get(idStr) ?? c;
        out.push(p);
        seen.add(idStr);
      }
    }

    out.sort((a, b) => {
      const da = a.date || a.createdAt?.getTime?.() || 0;
      const db = b.date || b.createdAt?.getTime?.() || 0;
      return da - db;
    });

    return { ...ev, comments: out };
  });
}

/**
 * Standard events-collection fetch: parses query params, applies the
 * moderation filter, runs paginated find + count in parallel, and
 * batch-populates authors + comments.
 */
export async function fetchEventsWithAuthors<T extends Document>(
  collection: Collection<T>,
  url: URL,
  currentUserId?: string
): Promise<FetchEventsResult<T>> {
  const options = parseQueryParams(url);
  const filter = buildFilter(options) as Filter<T>;

  mergeModerationFilter(filter as Record<string, any>, buildModerationFilter(currentUserId));

  const [events, total] = await Promise.all([
    applyQueryOptions<T>(collection, options, filter),
    getTotalCount(collection, filter),
  ]);

  const limit = parseInt(options.limit as unknown as string) || 20;
  const offset = parseInt(options.offset as unknown as string) || 0;
  const pagination = buildPaginationMeta(total, limit, offset);

  const shouldPopulateAuthor =
    !options.fields || options.fields.length === 0 || options.fields.includes('author');

  let populated = events as any[];
  if (shouldPopulateAuthor) {
    populated = await populateAuthors(populated);
    populated = await populateEventComments(populated, currentUserId);
  }

  return { events: populated as T[], pagination };
}

/**
 * Server-side fetch helper for hydrating the calendar with initialEvents.
 * Builds a synthetic URL matching the default client queryOptions so
 * react-query's `queryKey: ['events', options]` matches byte-for-byte.
 */
export async function fetchEventsForSSR(currentUserId: string | undefined) {
  const db = await connectDB();
  const collection = db.collection('events') as unknown as Collection<Document>;

  const opts = getDefaultCalendarQueryOptions();
  const params = new URLSearchParams();
  params.set('sortBy', opts.sortBy);
  params.set('sortOrder', opts.sortOrder);
  params.set('dateFrom', opts.dateFrom.toISOString());
  params.set('dateTo', opts.dateTo.toISOString());

  const url = new URL(`http://ssr.local/api/events?${params.toString()}`);
  const result = await fetchEventsWithAuthors(collection, url, currentUserId);
  return JSON.parse(JSON.stringify(result.events));
}
