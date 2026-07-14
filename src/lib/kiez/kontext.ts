// Anwohner-Kontext (Kiez-Daten novel §04): where the Kiez talks about a
// figure, the figure points to the talk. ASYMMETRIC by design (like Kurier
// heat): this lib reads the forum; the forum knows nothing about it.
// Curated keyword map, recomputed at most every 24 h (kiezKontextCache —
// same in-code TTL pattern as chronikCache).
import { connectDB } from '../mongodb';
import type { KiezKontext, KontextChip } from './kontextTypes';

const CACHE_KEY = 'kiez-kontext-v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_AGE_MS = 60 * 60 * 1000; // spam guard: threads must be > 1 h old
const MAX_CHIPS = 3;

const KEYWORDS: Record<keyof KiezKontext, string[]> = {
  alq: ['arbeitslos', 'jobcenter', 'arbeitssuche', 'jobsuche', 'bewerbung', 'weiterbildung'],
  kinderarmut: ['kinderarmut', 'familienhilfe', 'nachbarschaftshilfe', 'mittagstisch', 'schulweg', 'kita', 'hausaufgabenhilfe'],
  transfer: ['bürgergeld', 'sozialamt', 'wohngeld', 'grundsicherung', 'beratung', 'sgb'],
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function getKiezKontext(): Promise<KiezKontext> {
  const db = await connectDB();
  const cache = db.collection('kiezKontextCache');
  const cached = await cache.findOne({ key: CACHE_KEY });
  if (cached && Date.now() - new Date(cached.computedAt).getTime() < CACHE_TTL_MS) {
    return cached.payload as KiezKontext;
  }

  const cutoff = new Date(Date.now() - MIN_AGE_MS);
  // Public gate: approved-or-absent only (the narrow two-clause slice of
  // buildModerationFilter in topicsQuery.ts) — deliberately NOT the full
  // forum moderation filter, which also admits community-reported-pending
  // and the requesting user's own pending/rejected posts. This lib has no
  // requesting user and the chips are public, so only content that has
  // cleared moderation (or predates the moderation field entirely) qualifies.
  const publicGate = {
    $or: [
      { moderationStatus: 'approved' },
      { moderationStatus: { $exists: false } },
    ],
  };
  const result: KiezKontext = { alq: [], kinderarmut: [], transfer: [] };
  for (const key of Object.keys(KEYWORDS) as (keyof KiezKontext)[]) {
    const re = new RegExp(KEYWORDS[key].map(escapeRe).join('|'), 'i');
    const docs = await db
      .collection('topics')
      .find(
        { ...publicGate, createdAt: { $lte: cutoff }, title: re },
        { projection: { title: 1 }, sort: { createdAt: -1 }, limit: MAX_CHIPS }
      )
      .toArray();
    result[key] = docs.map((d): KontextChip => ({
      id: String(d._id),
      title: d.title,
      // topics collection only (this lib never reads announcements/
      // recommendations) → detail route is always /topics/[id], same
      // fallback ForumIndexInner.svelte's detailHref() uses for
      // kind-less/discussion items.
      href: `/topics/${String(d._id)}`,
    }));
  }

  await cache.updateOne(
    { key: CACHE_KEY },
    { $set: { key: CACHE_KEY, computedAt: new Date(), payload: result } },
    { upsert: true }
  );
  return result;
}
