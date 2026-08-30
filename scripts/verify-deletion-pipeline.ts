/**
 * Integration check for the account-deletion pipeline. DEV ONLY.
 *
 *   pnpm tsx scripts/verify-deletion-pipeline.ts --seed
 *   curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/process-deletions
 *   pnpm tsx scripts/verify-deletion-pipeline.ts --assert
 *   pnpm tsx scripts/verify-deletion-pipeline.ts --cleanup
 *
 * SAFETY INTERLOCK: refuses any DB whose name lacks "dev" (same rule as
 * seed-dev-db.ts). Deliberately imports nothing from src/ — those modules
 * read import.meta.env (Vite-only); the pipeline itself runs inside the
 * dev server via the cron endpoint, exercising the real code path.
 */
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';

const DOOMED_EMAIL = 'doomed@mahalle-dev.test';
const MARK = 'verify-deletion-pipeline';

async function cleanup(db: any): Promise<void> {
  // Clean any previous run.
  const prev = await db.collection('users').findOne({ email: DOOMED_EMAIL });
  const prevId = prev ? String(prev._id) : null;
  await db.collection('users').deleteMany({ email: DOOMED_EMAIL });
  await db.collection('users').deleteMany({ name: 'Ehemaliges Mitglied', anonymized: true, [`meta_${MARK}`]: true } as any);
  for (const c of ['topics', 'events', 'listings', 'listingContacts', 'rateLimits']) {
    await db.collection(c).deleteMany({ [MARK]: true } as any);
  }
  if (prevId) {
    for (const c of ['topics', 'announcements', 'recommendations', 'events']) {
      await db.collection(c).updateMany({ likedBy: prevId }, { $pull: { likedBy: prevId } } as any);
    }
  }
}

async function main(): Promise<void> {
  const mode = process.argv[2];

  // Check mode before connecting to DB.
  if (!mode || (mode !== '--seed' && mode !== '--assert' && mode !== '--cleanup')) {
    console.error('Usage: --seed | --assert | --cleanup');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI required'); process.exit(1); }
  const dbName = new URL(uri).pathname.slice(1);
  if (!/dev/i.test(dbName)) {
    console.error(`Refusing "${dbName}" — db name must contain "dev".`);
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  if (mode === '--seed') {
    await cleanup(db);

    const uid = new ObjectId();
    const userId = String(uid);
    await db.collection('users').insertOne({
      _id: uid, name: 'Doomed Testuser', handle: 'doomed_test', email: DOOMED_EMAIL,
      password: 'x', emailVerified: true,
      tours: { forum: new Date() }, tourHelloDismissedAt: new Date(),
      deletionScheduledAt: new Date(Date.now() - 1000),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      [`meta_${MARK}`]: true,
    } as any);

    // Artifact 1: a topic the doomed user LIKED (someone else's).
    await db.collection('topics').insertOne({
      title: 'Verify-Pipeline-Topic', body: 'x', author: 'someoneelse', tags: [],
      comments: [], views: 0, likes: 1, likedBy: [userId],
      moderationStatus: 'approved', createdAt: new Date(), updatedAt: new Date(),
      [MARK]: true,
    } as any);
    // Artifact 2: a listing they SELL + a contact row on it.
    const listing = await db.collection('listings').insertOne({
      title: 'Verify-Pipeline-Listing', description: 'x', category: 'household',
      condition: 'good', price: 1, images: [], sellerId: userId, status: 'available',
      views: 0, savedBy: [], delivery: 'pickup', listingKind: 'sell',
      moderationStatus: 'approved', createdAt: new Date(), updatedAt: new Date(),
      lastBumpedAt: new Date(), [MARK]: true,
    } as any);
    await db.collection('listingContacts').insertOne({
      listingId: String(listing.insertedId), sellerId: userId,
      buyerName: 'Käufer', buyerEmail: 'buyer@mahalle-dev.test',
      senderIpHash: 'x', sentAt: new Date(), [MARK]: true,
    } as any);
    // Artifact 3: a contact row where the doomed user was the BUYER.
    await db.collection('listingContacts').insertOne({
      listingId: 'someotherlisting', sellerId: 'someoneelse',
      buyerName: 'Doomed', buyerEmail: DOOMED_EMAIL,
      senderIpHash: 'x', sentAt: new Date(), [MARK]: true,
    } as any);
    // Artifact 4: email-keyed + userId-keyed rateLimit buckets.
    const exp = new Date(Date.now() + 3600_000);
    await db.collection('rateLimits').insertMany([
      { key: `login:${DOOMED_EMAIL}#w`, baseKey: `login:${DOOMED_EMAIL}`, count: 1, expiresAt: exp, [MARK]: true },
      { key: `fp:email:${DOOMED_EMAIL}#w`, baseKey: `fp:email:${DOOMED_EMAIL}`, count: 1, expiresAt: exp, [MARK]: true },
      { key: `pwch:${userId}#w`, baseKey: `pwch:${userId}`, count: 1, expiresAt: exp, [MARK]: true },
    ] as any[]);

    console.log(`Seeded doomed user ${userId} (${DOOMED_EMAIL}). Now run the cron endpoint, then --assert.`);
  } else if (mode === '--assert') {
    const failures: string[] = [];
    const user = await db.collection('users').findOne({ [`meta_${MARK}`]: true } as any);
    if (!user) failures.push('doomed user doc not found at all');
    else {
      if (user.anonymized !== true) failures.push('user not anonymized');
      if (user.email) failures.push('email survived tombstone');
      if (user.tours) failures.push('tours survived tombstone');
      if (user.tourHelloDismissedAt) failures.push('tourHelloDismissedAt survived tombstone');
      if (user.deletionClaimedAt) failures.push('deletionClaimedAt survived tombstone');
    }
    const userId = user ? String(user._id) : '___none___';
    const topic = await db.collection('topics').findOne({ [MARK]: true } as any);
    if (!topic) failures.push('liked topic missing (should be KEPT)');
    else {
      if ((topic.likedBy ?? []).includes(userId)) failures.push('likedBy not pruned');
      if (topic.likes !== 0) failures.push(`likes counter not decremented (is ${topic.likes})`);
    }
    if (await db.collection('listings').findOne({ [MARK]: true } as any))
      failures.push('seller listing survived');
    const contacts = await db.collection('listingContacts').countDocuments({ [MARK]: true } as any);
    if (contacts !== 0) failures.push(`${contacts} listingContacts rows survived (seller+buyer sweeps)`);
    const rl = await db.collection('rateLimits').countDocuments({ [MARK]: true } as any);
    if (rl !== 0) failures.push(`${rl} rateLimit buckets survived (email + userId families)`);

    if (failures.length) {
      console.error('FAIL:\n  - ' + failures.join('\n  - '));
      process.exit(1);
    }
    console.log('PASS: all deletion-pipeline assertions hold.');
  } else if (mode === '--cleanup') {
    await cleanup(db);
    console.log('Cleaned up all verify-deletion-pipeline marked docs.');
  }
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
