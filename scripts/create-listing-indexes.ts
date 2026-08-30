/**
 * Idempotent index creation for marketplace collections. Run manually at deploy:
 *   pnpm tsx scripts/create-listing-indexes.ts
 *
 * Uses raw MongoClient + dotenv rather than src/lib/mongodb.ts because the
 * latter relies on Astro's import.meta.env which isn't available to plain tsx.
 * Same pattern as scripts/sync-stats.ts + scripts/migrate-legacy-categories.ts.
 * The dependency-pure src/lib/listings/contactHash is the one deliberate
 * exception (no env reads, no imports beyond node:crypto).
 *
 * Env:
 *   MONGODB_URI — required (loaded from .env via dotenv/config)
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { hashContactEmail } from '../src/lib/listings/contactHash';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required (set in .env or shell env).');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = new URL(uri).pathname.slice(1) || 'mahalle-dev';
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

  // listingContacts — rate-limit count queries (hashed buyer identity since
  // Option C, 2026-08-31) + 90d retention TTL.
  await db.collection('listingContacts').createIndex({ sentAt: -1 });
  // TTL rides its own ascending index (different key pattern than the -1
  // above, so both coexist). 90 days — all rate-limit windows are ≤24h.
  await db.collection('listingContacts').createIndex(
    { sentAt: 1 },
    { expireAfterSeconds: 7776000, name: 'listingContacts_sentAt_ttl' }
  );
  await db.collection('listingContacts').createIndex({ buyerEmailHash: 1, sentAt: -1 });
  await db.collection('listingContacts').createIndex({ senderIpHash: 1, sentAt: -1 });
  await db.collection('listingContacts').createIndex({ listingId: 1, sentAt: -1 });
  await db.collection('listingContacts').createIndex(
    { buyerEmailHash: 1, sellerId: 1, sentAt: -1 },
    { name: 'listingContacts_senderToOwner_daily_v2' }
  );
  // Old plaintext-keyed indexes: drop if present (idempotent — ignore absence).
  for (const old of ['buyerEmail_1_sentAt_-1', 'listingContacts_senderToOwner_daily']) {
    await db.collection('listingContacts').dropIndex(old).catch(() => {});
  }
  console.log('listingContacts indexes created');

  // One-time row migration (idempotent): plaintext → hash, name dropped.
  // REQUIRES the SAME CONTACT_IP_SALT the target deployment hashes with —
  // running against prod with a mismatched local salt writes hashes the
  // prod deletion sweep can never match. Fail closed if unset.
  const salt = process.env.CONTACT_IP_SALT;
  if (!salt) {
    console.error('CONTACT_IP_SALT is required (hash migration would be wrong without it).');
    process.exit(1);
  }
  const plaintextRows = await db
    .collection('listingContacts')
    .find({ buyerEmail: { $exists: true } })
    .toArray();
  for (const row of plaintextRows) {
    await db.collection('listingContacts').updateOne(
      { _id: row._id },
      {
        $set: { buyerEmailHash: hashContactEmail(String(row.buyerEmail).trim().toLowerCase(), salt) },
        $unset: { buyerEmail: '', buyerName: '' },
      }
    );
  }
  console.log(`listingContacts migrated: ${plaintextRows.length} plaintext row(s) hashed`);

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
