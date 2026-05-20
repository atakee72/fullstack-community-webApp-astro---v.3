import { connectDB } from '../src/lib/mongodb';

async function main() {
  const db = await connectDB();
  await db.collection('listings').createIndex(
    { lastBumpedAt: -1 },
    { partialFilterExpression: { lastBumpedAt: { $exists: true } }, name: 'listings_lastBumpedAt_partial' }
  );
  await db.collection('listings').createIndex(
    { bundleId: 1 },
    { partialFilterExpression: { bundleId: { $exists: true } }, name: 'listings_bundleId_partial' }
  );
  console.log('listings indexes created');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
