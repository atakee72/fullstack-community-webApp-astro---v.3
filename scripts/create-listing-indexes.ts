import { connectDB } from '../src/lib/mongodb';

async function main() {
  const db = await connectDB();
  // Match actual query predicate (lastBumpedAt is a real Date), not just $exists,
  // so explicit nulls from create paths don't bloat the index.
  await db.collection('listings').createIndex(
    { lastBumpedAt: -1 },
    { partialFilterExpression: { lastBumpedAt: { $type: 'date' } }, name: 'listings_lastBumpedAt_partial' }
  );
  await db.collection('listings').createIndex(
    { bundleId: 1 },
    { partialFilterExpression: { bundleId: { $type: 'objectId' } }, name: 'listings_bundleId_partial' }
  );
  console.log('listings indexes created');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
