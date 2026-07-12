// src/lib/profile/chronik.ts — SERVER-ONLY. Derived tenure timeline, cached 24h.
import { ObjectId } from 'mongodb';
import { connectDB } from '../mongodb';
import type { ChronikData, ChronikStop } from './profileShared';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const DANKE_THRESHOLD = 100;

async function oldest(db: any, coll: string, filter: Record<string, unknown>): Promise<Date | null> {
  const doc = await db.collection(coll).find(filter, { projection: { createdAt: 1 } })
    .sort({ createdAt: 1 }).limit(1).next();
  return doc?.createdAt ? new Date(doc.createdAt) : null;
}
async function newest(db: any, coll: string, filter: Record<string, unknown>): Promise<Date | null> {
  const doc = await db.collection(coll).find(filter, { projection: { createdAt: 1 } })
    .sort({ createdAt: -1 }).limit(1).next();
  return doc?.createdAt ? new Date(doc.createdAt) : null;
}

export async function getChronik(userId: string): Promise<ChronikData> {
  const db = await connectDB();
  const _id = new ObjectId(userId);

  const cached = await db.collection('chronikCache').findOne({ userId: _id });
  if (cached && Date.now() - new Date(cached.computedAt).getTime() < CACHE_TTL_MS) {
    return cached.payload as ChronikData;
  }

  const user = await db.collection('users').findOne(
    { _id }, { projection: { createdAt: 1, dankeCrossedAt: 1 } }
  );
  if (!user) return { stops: [] };

  // Milestone gate: exclude only REJECTED content ($ne — deliberately includes
  // pending, which is usually approved shortly after; a milestone is just a date).
  const approvedGate = { moderationStatus: { $ne: 'rejected' } };
  const [firstTopic, firstListing, firstEvent] = await Promise.all([
    oldest(db, 'topics', { author: userId, ...approvedGate }),
    oldest(db, 'listings', { sellerId: userId, status: { $ne: 'draft' }, ...approvedGate }),
    oldest(db, 'events', { author: userId, ...approvedGate }),
  ]);

  // danke total (same aggregation as getProfileMe) — stamp-on-first-observation (Decision 2)
  let dankeCrossedAt: Date | null = user.dankeCrossedAt ? new Date(user.dankeCrossedAt) : null;
  if (!dankeCrossedAt) {
    const sums = await Promise.all(
      ['topics', 'announcements', 'recommendations', 'events'].map((c) =>
        db.collection(c).aggregate([
          { $match: { author: userId } },
          { $group: { _id: null, total: { $sum: { $ifNull: ['$likes', 0] } } } },
        ]).toArray()
      )
    );
    const total = sums.reduce((s, r) => s + (r[0]?.total ?? 0), 0);
    if (total >= DANKE_THRESHOLD) {
      dankeCrossedAt = new Date();
      await db.collection('users').updateOne(
        { _id, dankeCrossedAt: { $exists: false } }, { $set: { dankeCrossedAt } }
      );
    }
  }

  const latest = await Promise.all([
    newest(db, 'topics', { author: userId }), newest(db, 'listings', { sellerId: userId }),
    newest(db, 'events', { author: userId }), newest(db, 'news', { submittedBy: userId }),
  ]);
  const lastActive = latest.filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null;
  const active = lastActive != null && Date.now() - lastActive.getTime() < ACTIVE_WINDOW_MS;

  const created = user.createdAt instanceof Date ? user.createdAt : new Date(String(user.createdAt));
  const middle: ChronikStop[] = [
    firstTopic && { kind: 'erstesThema' as const, date: firstTopic.toISOString() },
    firstListing && { kind: 'ersteAnzeige' as const, date: firstListing.toISOString() },
    firstEvent && { kind: 'ersterTermin' as const, date: firstEvent.toISOString() },
    dankeCrossedAt && { kind: 'danke100' as const, date: dankeCrossedAt.toISOString() },
  ].filter(Boolean) as ChronikStop[];
  middle.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

  // max 5 stops total incl. dabei + heute → keep the 3 earliest middle stops
  const stops: ChronikStop[] = [
    { kind: 'dabei', date: Number.isNaN(created.getTime()) ? null : created.toISOString() },
    ...middle.slice(0, 3),
    { kind: 'heute', date: null, active },
  ];
  const payload: ChronikData = { stops };

  const now = new Date();
  await db.collection('chronikCache').updateOne(
    { userId: _id },
    { $set: { payload, computedAt: now, expiresAt: new Date(now.getTime() + CACHE_TTL_MS) } },
    { upsert: true }
  );
  return payload;
}
