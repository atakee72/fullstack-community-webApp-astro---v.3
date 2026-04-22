import type { Collection, Document, Filter } from 'mongodb';
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

/**
 * Standard events-collection fetch: parses query params, applies the
 * moderation filter, runs paginated find + count in parallel, and
 * batch-populates authors. Comments are NOT populated here — the list
 * endpoint ships raw ObjectId arrays (so `.length` still works for count
 * display on cards). Full comment objects are fetched lazily when the
 * EventViewModal opens, via useCommentsQuery → /api/comments/:postId.
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
    // Comment BODIES/AUTHORS are no longer populated on the list endpoint.
    // We leave `comments` as the raw ObjectId array so `.length` still works
    // for count display on cards. Full comment objects are fetched lazily
    // by EventViewModal via /api/comments/:postId when a card is clicked.
    // This cut the response payload from ~316 KB → ~20 KB for a typical
    // month and halved SSR TTFB.
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
