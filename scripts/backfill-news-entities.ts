// scripts/backfill-news-entities.ts
// Run (dry-run, default): pnpm tsx scripts/backfill-news-entities.ts
// Run (write):            pnpm tsx scripts/backfill-news-entities.ts --apply
//
// ONE-SHOT production backfill (shared DB): decodes HTML character references
// left in stored `news` text fields by the pre-2026-09-08 ingest (which never
// decoded numeric entities — German quotes were stored as `&#8222;`/`&#8220;`
// and rendered literally on the newsboard). Touches ONLY title / titleEN /
// description / aiSummary, and only on docs that still contain a reference.
//
// Decoding is one level deep. Run it ONCE: a value that was double-encoded
// (`&amp;lt;`) would decode a second level on a second pass. Default is
// dry-run so you can eyeball before/after first.
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { decodeHtmlEntities } from '../src/utils/decodeHtmlEntities';

const FIELDS = ['title', 'titleEN', 'description', 'aiSummary'] as const;
// Matches numeric decimal, numeric hex, and named references.
const ENTITY = /&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/;

async function main() {
  const apply = process.argv.includes('--apply');
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI missing'); process.exit(1); }
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = new URL(uri).pathname.slice(1) || 'mahalle-dev';
  const news = client.db(dbName).collection('news');
  console.log(`db=${dbName}  mode=${apply ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}`);

  const candidates = await news
    .find(
      { $or: FIELDS.map((f) => ({ [f]: { $regex: ENTITY.source } })) },
      { projection: Object.fromEntries(FIELDS.map((f) => [f, 1])) }
    )
    .toArray();
  console.log(`${candidates.length} docs with at least one entity reference`);

  let changedDocs = 0;
  let changedFields = 0;
  for (const doc of candidates) {
    const $set: Record<string, string> = {};
    for (const f of FIELDS) {
      const v = doc[f];
      if (typeof v !== 'string' || !ENTITY.test(v)) continue;
      const decoded = decodeHtmlEntities(v);
      if (decoded !== v) {
        $set[f] = decoded;
        changedFields++;
        console.log(`  ${doc._id} ${f}:`);
        console.log(`    - ${v.slice(0, 120)}`);
        console.log(`    + ${decoded.slice(0, 120)}`);
      }
    }
    if (Object.keys($set).length === 0) continue;
    changedDocs++;
    if (apply) await news.updateOne({ _id: doc._id }, { $set });
  }

  console.log(`\n${apply ? 'Updated' : 'Would update'} ${changedDocs} docs / ${changedFields} fields.`);
  if (!apply) console.log('Re-run with --apply to write.');
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
