/**
 * Idempotent index creation for auth collections. Run manually at deploy
 * (dev DB now, prod DB when this ships):
 *   pnpm tsx scripts/create-auth-indexes.ts
 *
 * Raw MongoClient + dotenv (not src/lib/mongodb.ts) because import.meta.env
 * isn't available to plain tsx — same pattern as scripts/create-listing-indexes.ts.
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

  // Token collections: TTL hygiene (queries already filter expiresAt/usedAt —
  // this just stops dead rows accumulating) + hash-lookup index.
  await db.collection('passwordResetTokens').createIndex(
    { expiresAt: 1 }, { expireAfterSeconds: 0, name: 'prt_ttl' });
  await db.collection('passwordResetTokens').createIndex(
    { tokenHash: 1 }, { name: 'prt_tokenHash' });
  await db.collection('emailVerifyTokens').createIndex(
    { expiresAt: 1 }, { expireAfterSeconds: 0, name: 'evt_ttl' });
  await db.collection('emailVerifyTokens').createIndex(
    { tokenHash: 1 }, { name: 'evt_tokenHash' });

  // rateLimits: exact-key bucket lookup (unique — consume() handles the
  // E11000 upsert race), TTL cleanup, clear-by-baseKey.
  await db.collection('rateLimits').createIndex(
    { key: 1 }, { unique: true, name: 'rl_key' });
  await db.collection('rateLimits').createIndex(
    { expiresAt: 1 }, { expireAfterSeconds: 0, name: 'rl_ttl' });
  await db.collection('rateLimits').createIndex(
    { baseKey: 1 }, { name: 'rl_baseKey' });

  // chronikCache: 24h-cached Kiez-Chronik payload per user (src/lib/profile/chronik.ts).
  await db.collection('chronikCache').createIndex(
    { userId: 1 }, { unique: true, name: 'chronik_user' });
  await db.collection('chronikCache').createIndex(
    { expiresAt: 1 }, { expireAfterSeconds: 0, name: 'chronik_ttl' });

  console.log('Auth indexes ensured on', dbName);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
