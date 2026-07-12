// src/lib/profile/activityFeed.ts — SERVER-ONLY (imports mongodb)
//
// Cross-surface "Archiv" activity feed. Per-surface sub-queries (each
// sort desc + limit), merged in JS, sorted by date desc, sliced to
// `limit`. See task-3-brief.md for the full spec this file implements.

import { ObjectId } from 'mongodb';
import { connectDB } from '../mongodb';
import type { ActivityFilter, ActivityItem, ActivityKind, ActivityPage, ActivitySurface } from './profileShared';

type Strap = ActivityItem['strap'];

function strapFromModeration(moderationStatus: unknown): Strap {
  if (moderationStatus === 'pending') return 'pruefung';
  if (moderationStatus === 'rejected') return 'abgelehnt';
  return null;
}

function toIso(d: unknown): string {
  const date = d instanceof Date ? d : new Date(String(d));
  return Number.isNaN(date.getTime()) ? new Date(0).toISOString() : date.toISOString();
}

/** Internal working item — carries an optional author/seller id to resolve
 *  in one batch after all sub-queries run (gespeichert view only). */
interface WorkingItem {
  item: ActivityItem;
  resolveAuthorId?: string; // present when `by` should be filled from users.name
}

// ─── Forum surface: topics | announcements | recommendations ──────────

const FORUM_COLLECTIONS: { name: string; kind: ActivityKind; hrefPrefix: string }[] = [
  { name: 'topics', kind: 'diskussion', hrefPrefix: '/topics/' },
  { name: 'announcements', kind: 'ankuendigung', hrefPrefix: '/announcements/' },
  { name: 'recommendations', kind: 'empfehlung', hrefPrefix: '/recommendations/' },
];

async function queryForum(db: any, userId: string, before: Date | null, limit: number) {
  const out: WorkingItem[] = [];
  let anyFull = false;

  await Promise.all(
    FORUM_COLLECTIONS.map(async ({ name, kind, hrefPrefix }) => {
      const query: Record<string, unknown> = { author: userId };
      if (before) query.createdAt = { $lt: before };
      const docs = await db
        .collection(name)
        .find(query, { projection: { title: 1, createdAt: 1, moderationStatus: 1, likes: 1, comments: 1 } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
      if (docs.length === limit) anyFull = true;
      for (const doc of docs) {
        out.push({
          item: {
            id: String(doc._id),
            surface: 'forum',
            kind,
            title: String(doc.title ?? ''),
            date: toIso(doc.createdAt),
            strap: strapFromModeration(doc.moderationStatus),
            saved: false,
            by: null,
            href: `${hrefPrefix}${doc._id}`,
            meta: {
              likes: doc.likes ?? 0,
              comments: Array.isArray(doc.comments) ? doc.comments.length : 0,
            },
          },
        });
      }
    })
  );

  return { items: out, anyFull };
}

// ─── Markt surface: listings authored by the user ──────────────────────

async function queryMarkt(db: any, userId: string, before: Date | null, limit: number) {
  const query: Record<string, unknown> = { sellerId: userId, status: { $ne: 'draft' } };
  if (before) query.createdAt = { $lt: before };
  const docs = await db
    .collection('listings')
    .find(query, { projection: { title: 1, createdAt: 1, price: 1, listingType: 1, status: 1, moderationStatus: 1 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const items: WorkingItem[] = docs.map((doc: any) => {
    // Moderation strap wins over reserviert.
    const modStrap = strapFromModeration(doc.moderationStatus);
    const strap: Strap = modStrap ?? (doc.status === 'reserved' ? 'reserviert' : null);
    return {
      item: {
        id: String(doc._id),
        surface: 'markt' as ActivitySurface,
        kind: 'anzeige' as ActivityKind,
        title: String(doc.title ?? ''),
        date: toIso(doc.createdAt),
        strap,
        saved: false,
        by: null,
        href: `/marketplace/${doc._id}`,
        meta: { price: doc.price ?? null, listingType: doc.listingType },
      },
    };
  });

  return { items, anyFull: docs.length === limit };
}

// ─── Kalender surface: events created + RSVP'd (zusage) ────────────────

async function queryKalenderCreated(db: any, userId: string, before: Date | null, limit: number) {
  const query: Record<string, unknown> = { author: userId };
  if (before) query.createdAt = { $lt: before };
  const docs = await db
    .collection('events')
    .find(query, { projection: { title: 1, createdAt: 1, startDate: 1, moderationStatus: 1, rsvps: 1 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const items: WorkingItem[] = docs.map((doc: any) => ({
    item: {
      id: String(doc._id),
      surface: 'kalender' as ActivitySurface,
      kind: 'termin' as ActivityKind,
      title: String(doc.title ?? ''),
      date: toIso(doc.createdAt),
      strap: strapFromModeration(doc.moderationStatus),
      saved: false,
      by: null,
      href: '/calendar',
      meta: { eventDate: toIso(doc.startDate), going: doc.rsvps?.going?.length ?? 0 },
    },
  }));

  return { items, anyFull: docs.length === limit };
}

async function queryKalenderZusagen(db: any, userId: string, before: Date | null, limit: number) {
  // `before` applies to startDate for this sub-query (Decision 6 in the brief).
  const query: Record<string, unknown> = { 'rsvps.going': userId, author: { $ne: userId }, moderationStatus: { $ne: 'rejected' } };
  // rejected events must not surface in others' feeds.
  if (before) query.startDate = { $lt: before };
  const docs = await db
    .collection('events')
    .find(query, { projection: { title: 1, startDate: 1 } })
    .sort({ startDate: -1 })
    .limit(limit)
    .toArray();

  const items: WorkingItem[] = docs.map((doc: any) => ({
    item: {
      id: String(doc._id),
      surface: 'kalender' as ActivitySurface,
      kind: 'zusage' as ActivityKind,
      title: String(doc.title ?? ''),
      date: toIso(doc.startDate),
      strap: null,
      saved: false,
      by: null,
      href: '/calendar',
      meta: { eventDate: toIso(doc.startDate) },
    },
  }));

  return { items, anyFull: docs.length === limit };
}

// ─── Kurier surface: user-submitted news ────────────────────────────────

async function queryKurier(db: any, userId: string, before: Date | null, limit: number) {
  const query: Record<string, unknown> = { submittedBy: userId, source: 'user_submitted' };
  if (before) query.createdAt = { $lt: before };
  const docs = await db
    .collection('news')
    .find(query, { projection: { title: 1, createdAt: 1, moderationStatus: 1, sourceName: 1 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const items: WorkingItem[] = docs.map((doc: any) => ({
    item: {
      id: String(doc._id),
      surface: 'kurier' as ActivitySurface,
      kind: 'news' as ActivityKind,
      title: String(doc.title ?? ''),
      date: toIso(doc.createdAt),
      strap: strapFromModeration(doc.moderationStatus),
      saved: false,
      by: doc.sourceName ?? null,
      href: `/newsboard/${doc._id}`,
      meta: {},
    },
  }));

  return { items, anyFull: docs.length === limit };
}

// ─── Gespeichert: saved items across all surfaces ───────────────────────

function validObjectIds(ids: string[]): ObjectId[] {
  return ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
}

async function queryGespeichertPosts(db: any, userId: string, before: Date | null, limit: number) {
  const query: Record<string, unknown> = { userId };
  if (before) query.savedAt = { $lt: before };
  const saves = await db
    .collection('savedPosts')
    .find(query, { projection: { postId: 1, savedAt: 1 } })
    .sort({ savedAt: -1 })
    .limit(limit)
    .toArray();

  const savedAtById = new Map<string, Date>();
  for (const s of saves) savedAtById.set(String(s.postId), s.savedAt);

  const idList = validObjectIds(saves.map((s: any) => String(s.postId)));
  const resolvedIds = new Set<string>();
  const out: WorkingItem[] = [];

  const forumProbe: { name: string; kind: ActivityKind; hrefPrefix: string }[] = FORUM_COLLECTIONS;
  for (const { name, kind, hrefPrefix } of forumProbe) {
    const remaining = idList.filter((id) => !resolvedIds.has(String(id)));
    if (remaining.length === 0) break;
    const docs = await db
      .collection(name)
      .find({ _id: { $in: remaining } }, { projection: { title: 1, author: 1, moderationStatus: 1 } })
      .toArray();
    for (const doc of docs) {
      resolvedIds.add(String(doc._id));
      if (doc.moderationStatus === 'rejected') continue;
      const savedAt = savedAtById.get(String(doc._id)) ?? new Date();
      out.push({
        item: {
          id: String(doc._id),
          surface: 'forum',
          kind,
          title: String(doc.title ?? ''),
          date: toIso(savedAt),
          strap: strapFromModeration(doc.moderationStatus),
          saved: true,
          by: null,
          href: `${hrefPrefix}${doc._id}`,
          meta: {},
        },
        resolveAuthorId: typeof doc.author === 'string' ? doc.author : undefined,
      });
    }
  }

  return { items: out, anyFull: saves.length === limit };
}

async function queryGespeichertNews(db: any, userId: string, before: Date | null, limit: number) {
  const query: Record<string, unknown> = { userId };
  if (before) query.savedAt = { $lt: before };
  const saves = await db
    .collection('savedNews')
    .find(query, { projection: { newsId: 1, savedAt: 1 } })
    .sort({ savedAt: -1 })
    .limit(limit)
    .toArray();

  const savedAtById = new Map<string, Date>();
  for (const s of saves) savedAtById.set(String(s.newsId), s.savedAt);
  const idList = validObjectIds(saves.map((s: any) => String(s.newsId)));
  if (idList.length === 0) return { items: [], anyFull: saves.length === limit };

  const docs = await db
    .collection('news')
    .find({ _id: { $in: idList } }, { projection: { title: 1, moderationStatus: 1, sourceName: 1 } })
    .toArray();

  const items: WorkingItem[] = [];
  for (const doc of docs) {
    if (doc.moderationStatus === 'rejected') continue;
    const savedAt = savedAtById.get(String(doc._id)) ?? new Date();
    items.push({
      item: {
        id: String(doc._id),
        surface: 'kurier',
        kind: 'artikel',
        title: String(doc.title ?? ''),
        date: toIso(savedAt),
        strap: strapFromModeration(doc.moderationStatus),
        saved: true,
        by: doc.sourceName ?? null,
        href: `/newsboard/${doc._id}`,
        meta: {},
      },
    });
  }

  return { items, anyFull: saves.length === limit };
}

async function queryGespeichertEvents(db: any, userId: string, before: Date | null, limit: number) {
  const query: Record<string, unknown> = { userId };
  if (before) query.savedAt = { $lt: before };
  const saves = await db
    .collection('savedEvents')
    .find(query, { projection: { eventId: 1, savedAt: 1 } })
    .sort({ savedAt: -1 })
    .limit(limit)
    .toArray();

  const savedAtById = new Map<string, Date>();
  for (const s of saves) savedAtById.set(String(s.eventId), s.savedAt);
  const idList = validObjectIds(saves.map((s: any) => String(s.eventId)));
  if (idList.length === 0) return { items: [], anyFull: saves.length === limit };

  const docs = await db
    .collection('events')
    .find({ _id: { $in: idList } }, { projection: { title: 1, moderationStatus: 1, author: 1, startDate: 1 } })
    .toArray();

  const items: WorkingItem[] = [];
  for (const doc of docs) {
    if (doc.moderationStatus === 'rejected') continue;
    const savedAt = savedAtById.get(String(doc._id)) ?? new Date();
    items.push({
      item: {
        id: String(doc._id),
        surface: 'kalender',
        kind: 'termin',
        title: String(doc.title ?? ''),
        date: toIso(savedAt),
        strap: strapFromModeration(doc.moderationStatus),
        saved: true,
        by: null,
        href: '/calendar',
        meta: { eventDate: toIso(doc.startDate) },
      },
      resolveAuthorId: typeof doc.author === 'string' ? doc.author : undefined,
    });
  }

  return { items, anyFull: saves.length === limit };
}

async function queryGespeichertListings(db: any, userId: string, before: Date | null, limit: number) {
  // savedBy has no per-save timestamp — date falls back to the listing's
  // own createdAt (documented deviation from the other gespeichert sources).
  const query: Record<string, unknown> = { savedBy: userId };
  if (before) query.createdAt = { $lt: before };
  const docs = await db
    .collection('listings')
    .find(query, { projection: { title: 1, createdAt: 1, price: 1, listingType: 1, moderationStatus: 1, sellerId: 1 } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const items: WorkingItem[] = [];
  for (const doc of docs) {
    if (doc.moderationStatus === 'rejected') continue;
    items.push({
      item: {
        id: String(doc._id),
        surface: 'markt',
        kind: 'anzeige',
        title: String(doc.title ?? ''),
        date: toIso(doc.createdAt),
        strap: strapFromModeration(doc.moderationStatus),
        saved: true,
        by: null,
        href: `/marketplace/${doc._id}`,
        meta: { price: doc.price ?? null, listingType: doc.listingType },
      },
      resolveAuthorId: typeof doc.sellerId === 'string' ? doc.sellerId : undefined,
    });
  }

  return { items, anyFull: docs.length === limit };
}

async function queryGespeichert(db: any, userId: string, before: Date | null, limit: number) {
  const [posts, news, events, listings] = await Promise.all([
    queryGespeichertPosts(db, userId, before, limit),
    queryGespeichertNews(db, userId, before, limit),
    queryGespeichertEvents(db, userId, before, limit),
    queryGespeichertListings(db, userId, before, limit),
  ]);

  const items = [...posts.items, ...news.items, ...events.items, ...listings.items];
  const anyFull = posts.anyFull || news.anyFull || events.anyFull || listings.anyFull;

  // Batch-resolve author/seller display names in one query.
  const authorIds = Array.from(
    new Set(items.map((w) => w.resolveAuthorId).filter((id): id is string => typeof id === 'string'))
  );
  if (authorIds.length > 0) {
    const users = await db
      .collection('users')
      .find({ _id: { $in: validObjectIds(authorIds) } }, { projection: { name: 1 } })
      .toArray();
    const nameById = new Map<string, string>();
    for (const u of users) nameById.set(String(u._id), String(u.name ?? ''));
    for (const w of items) {
      if (w.resolveAuthorId) w.item.by = nameById.get(w.resolveAuthorId) ?? null;
    }
  }

  return { items, anyFull };
}

// ─── Entry point ─────────────────────────────────────────────────────

export async function fetchActivityPage(
  userId: string,
  filter: ActivityFilter,
  before: Date | null,
  limit: number
): Promise<ActivityPage> {
  const db = await connectDB();

  let working: WorkingItem[] = [];
  let anyFull = false;

  if (filter === 'gespeichert') {
    const res = await queryGespeichert(db, userId, before, limit);
    working = res.items;
    anyFull = res.anyFull;
  } else {
    const runners: Promise<{ items: WorkingItem[]; anyFull: boolean }>[] = [];
    if (filter === 'alle' || filter === 'forum') runners.push(queryForum(db, userId, before, limit));
    if (filter === 'alle' || filter === 'markt') runners.push(queryMarkt(db, userId, before, limit));
    if (filter === 'alle' || filter === 'kalender') {
      runners.push(queryKalenderCreated(db, userId, before, limit));
      runners.push(queryKalenderZusagen(db, userId, before, limit));
    }
    if (filter === 'alle' || filter === 'kurier') runners.push(queryKurier(db, userId, before, limit));

    const results = await Promise.all(runners);
    for (const r of results) {
      working.push(...r.items);
      if (r.anyFull) anyFull = true;
    }
  }

  working.sort((a, b) => (a.item.date < b.item.date ? 1 : a.item.date > b.item.date ? -1 : 0));

  const overflow = working.length > limit;
  const page = working.slice(0, limit).map((w) => w.item);
  const nextBefore = overflow || anyFull ? page[page.length - 1]?.date ?? null : null;

  return { items: page, nextBefore };
}
