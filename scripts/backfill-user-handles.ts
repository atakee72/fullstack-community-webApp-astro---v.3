// scripts/backfill-user-handles.ts
// Run: pnpm tsx scripts/backfill-user-handles.ts
// ADDITIVE production migration (shared DB): sets users.handle where missing,
// then creates a PARTIAL unique index. Never modifies any other field.
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { slugifyHandle } from '../src/lib/profile/handle';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI missing'); process.exit(1); }
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = new URL(uri).pathname.slice(1) || 'CommunityWebApp-test';
  const users = client.db(dbName).collection('users');

  const taken = new Set<string>(
    (await users.find({ handle: { $type: 'string' } }, { projection: { handle: 1 } }).toArray())
      .map((u) => u.handle as string)
  );

  const missing = await users
    .find({ handle: { $exists: false } }, { projection: { name: 1 } })
    .toArray();
  console.log(`${missing.length} users without handle, ${taken.size} handles taken`);

  for (const u of missing) {
    const base = slugifyHandle(String(u.name ?? ''));
    let handle = base;
    for (let n = 2; taken.has(handle); n++) {
      const suffix = String(n);
      handle = base.slice(0, 20 - suffix.length) + suffix;
    }
    taken.add(handle);
    await users.updateOne({ _id: u._id, handle: { $exists: false } }, { $set: { handle } });
    console.log(`  ${u._id} -> ${handle}`);
  }

  // PARTIAL index: users created by the currently-deployed prod code have no
  // handle; a full unique index would treat those as duplicate nulls and break
  // prod registration. Partial index only constrains docs that HAVE a handle.
  await users.createIndex(
    { handle: 1 },
    { unique: true, partialFilterExpression: { handle: { $type: 'string' } }, name: 'users_handle_unique' }
  );
  console.log('users_handle_unique index ensured');
  await client.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
