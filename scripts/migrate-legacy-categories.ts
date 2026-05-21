/**
 * One-time backfill: legacy categories → expanded kiosk taxonomy.
 *
 * The marketplace kiosk redesign expanded the category enum from 9 → 13 keys.
 * Pre-redesign listings carry the legacy 10-key English enum
 * (furniture / electronics / clothing / books / comics / toys / handmade /
 *  home-garden / sports / other). This script maps each legacy row to a kiosk
 * key in place, fills in null `delivery` with the safe default ('abholung'),
 * and defensively renames any 'kind' row to 'kinder' (no-op for fresh DBs).
 *
 * Idempotent: rows that already have a valid kiosk category AND a non-null
 * delivery are skipped.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-legacy-categories.ts            # write
 *   pnpm tsx scripts/migrate-legacy-categories.ts --dry-run  # preview only
 *
 * Env:
 *   MONGODB_URI — required (loaded from .env via dotenv/config)
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const LEGACY_TO_KIOSK: Record<string, string> = {
  furniture:    'moebel',
  electronics:  'elektronik',
  clothing:     'kleidung',
  books:        'medien',
  comics:       'medien',
  toys:         'spielzeug',
  handmade:     'handgemacht',
  'home-garden': 'garten',
  sports:       'sport',
  other:        'sonstiges',
  // Defensive: old kiosk 'kind' key → renamed to 'kinder'.
  kind:         'kinder',
};

const KIOSK_KEYS = new Set([
  'moebel', 'garten', 'werkzeug', 'kleidung', 'medien',
  'elektronik', 'fahrrad', 'pflanze', 'kinder', 'spielzeug',
  'handgemacht', 'sport', 'sonstiges',
]);

const DEFAULT_DELIVERY = 'abholung';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required (set in .env or shell env).');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  // Derive DB name from URI path (defaults to 'CommunityWebApp-test' per project memory).
  const dbName = new URL(uri).pathname.slice(1) || 'CommunityWebApp-test';
  const db = client.db(dbName);
  const col = db.collection('listings');

  const cursor = col.find({}, { projection: { _id: 1, title: 1, category: 1, delivery: 1 } });

  let scanned = 0;
  let categoryRemapped = 0;
  let deliveryFilled = 0;
  let kindRenamed = 0;
  let skipped = 0;
  const previews: string[] = [];

  for await (const doc of cursor) {
    scanned++;
    const update: Record<string, unknown> = {};
    const currentCategory: string | undefined = doc.category;
    const currentDelivery: string | null | undefined = doc.delivery;

    // Category remap
    if (typeof currentCategory === 'string') {
      if (currentCategory === 'kind') {
        update.category = 'kinder';
        kindRenamed++;
      } else if (!KIOSK_KEYS.has(currentCategory)) {
        const mapped = LEGACY_TO_KIOSK[currentCategory];
        if (mapped) {
          update.category = mapped;
          categoryRemapped++;
        }
        // If no mapping found, leave as-is (would surface via DB sanity check
        // — better to fail loud than silently coerce to 'sonstiges' here).
      }
    }

    // Delivery default
    if (currentDelivery == null) {
      update.delivery = DEFAULT_DELIVERY;
      deliveryFilled++;
    }

    if (Object.keys(update).length === 0) {
      skipped++;
      continue;
    }

    const title = (doc.title as string | undefined)?.slice(0, 40) ?? '(no title)';
    previews.push(
      `  · ${String(doc._id)} "${title}"  ${currentCategory ?? '∅'} → ${update.category ?? currentCategory}  delivery: ${currentDelivery ?? '∅'} → ${update.delivery ?? currentDelivery}`,
    );

    if (!dryRun) {
      update.updatedAt = new Date();
      await col.updateOne({ _id: doc._id }, { $set: update });
    }
  }

  const totalUpdates = categoryRemapped + deliveryFilled + kindRenamed;

  console.log('\n── migrate-legacy-categories ──────────────────────');
  console.log(`mode:             ${dryRun ? 'DRY-RUN (no writes)' : 'WRITE'}`);
  console.log(`scanned:          ${scanned}`);
  console.log(`category remapped: ${categoryRemapped}`);
  console.log(`delivery filled:   ${deliveryFilled}`);
  console.log(`kind→kinder:       ${kindRenamed}`);
  console.log(`skipped (clean):   ${skipped}`);
  console.log(`total updates:     ${totalUpdates}`);
  if (previews.length > 0) {
    console.log('\nrows touched:');
    for (const p of previews) console.log(p);
  }
  console.log('────────────────────────────────────────────────────\n');

  await client.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
