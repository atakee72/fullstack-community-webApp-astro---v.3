/**
 * Idempotent index creation for marketplace collections. Run manually at deploy:
 *   pnpm tsx scripts/create-listing-indexes.ts
 *
 * Uses raw MongoClient + dotenv rather than src/lib/mongodb.ts because the
 * latter relies on Astro's import.meta.env which isn't available to plain tsx.
 * Same pattern as scripts/sync-stats.ts + scripts/migrate-legacy-categories.ts.
 *
 * Env:
 *   MONGODB_URI — required (loaded from .env via dotenv/config)
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required (set in .env or shell env).');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = new URL(uri).pathname.slice(1) || 'CommunityWebApp-test';
  const db = client.db(dbName);
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

  // listingContacts — rate-limit count queries
  await db.collection('listingContacts').createIndex({ sentAt: -1 });
  await db.collection('listingContacts').createIndex({ buyerEmail: 1, sentAt: -1 });
  await db.collection('listingContacts').createIndex({ senderIpHash: 1, sentAt: -1 });
  await db.collection('listingContacts').createIndex({ listingId: 1, sentAt: -1 });
  await db.collection('listingContacts').createIndex(
    { buyerEmail: 1, sellerId: 1, sentAt: -1 },
    { name: 'listingContacts_senderToOwner_daily' }
  );
  console.log('listingContacts indexes created');

  // listingAuditTrail — audit-history queries by listing
  await db.collection('listingAuditTrail').createIndex(
    { listingId: 1, createdAt: -1 },
    { name: 'listingAuditTrail_listingId_createdAt' },
  );
  console.log('listingAuditTrail indexes created');

  await client.close();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
