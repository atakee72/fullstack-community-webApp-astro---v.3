// scripts/create-translation-indexes.ts
// Idempotent: ensures translationCache indexes. Run once per environment:
//   MONGODB_URI="..." pnpm tsx scripts/create-translation-indexes.ts
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

const NINETY_DAYS_S = 90 * 24 * 60 * 60;

async function main() {
  const client = new MongoClient(uri!);
  await client.connect();
  const db = client.db();
  console.log(`DB: ${db.databaseName}`);
  const col = db.collection('translationCache');

  await col.createIndex({ key: 1 }, { unique: true, name: 'translationCache_key_unique' });
  console.log('ensured translationCache_key_unique');

  await col.createIndex(
    { createdAt: 1 },
    { expireAfterSeconds: NINETY_DAYS_S, name: 'translationCache_createdAt_ttl' }
  );
  console.log('ensured translationCache_createdAt_ttl (90d)');

  const indexes = await col.indexes();
  console.log(JSON.stringify(indexes, null, 2));
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
