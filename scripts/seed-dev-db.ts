/**
 * Seed the DEV database with fake accounts and sample content.
 *   MONGODB_URI="<uri ending in /mahalle-dev>" pnpm tsx scripts/seed-dev-db.ts
 *
 * SAFETY INTERLOCK: refuses to run unless the URI's database name contains
 * "dev" — this script drops and rewrites content collections, and prod/dev
 * share one Atlas cluster, so a pasted prod URI must hard-fail.
 *
 * Seeds: 3 users (1 admin), topics/events/announcements/recommendations/
 * listings (mostly approved, one pending for moderation-queue testing).
 * Field shapes mirror production docs: users._id is a hex24 STRING (legacy
 * from the Mongoose era — auth.config.ts stringifies it either way), and
 * author/sellerId store that string.
 *
 * The seed password is RANDOM per run and printed at the end (override with
 * DEV_SEED_PASSWORD=... for a stable local one). Never hardcode it here — a
 * committed literal lands in the public repo and trips secret scanners
 * (GitGuardian incident, 2026-08-14), and preview deployments point at the
 * dev DB these accounts live in.
 */
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const DEV_PASSWORD = process.env.DEV_SEED_PASSWORD || randomBytes(9).toString('base64url');

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required (set in .env or shell env).');
    process.exit(1);
  }
  const dbName = new URL(uri).pathname.slice(1);
  if (!/dev/i.test(dbName)) {
    console.error(`Refusing to seed "${dbName}" — database name must contain "dev".`);
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const hash = await bcrypt.hash(DEV_PASSWORD, 10);
  const now = new Date();
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
  const daysAhead = (n: number) => new Date(Date.now() + n * 86_400_000);
  const uid = () => new ObjectId().toHexString(); // hex24 string, matching prod's string _ids

  const [admin, ayse, jonas] = [uid(), uid(), uid()];
  const users = [
    { _id: admin, name: 'Dev Admin', handle: 'dev_admin', email: 'admin@mahalle-dev.test', password: hash, role: 'admin', emailVerified: true, createdAt: daysAgo(90), updatedAt: now },
    { _id: ayse, name: 'Ayşe Test', handle: 'ayse_test', email: 'ayse@mahalle-dev.test', password: hash, emailVerified: true, createdAt: daysAgo(60), updatedAt: now },
    { _id: jonas, name: 'Jonas Test', handle: 'jonas_test', email: 'jonas@mahalle-dev.test', password: hash, emailVerified: false, createdAt: daysAgo(30), updatedAt: now },
  ];

  const post = (author: string, title: string, body: string, tags: string[], extra: Record<string, unknown> = {}) => ({
    title, body, author, tags,
    comments: [], views: 0, likes: 0, likedBy: [],
    date: Date.now(), moderationStatus: 'approved',
    createdAt: daysAgo(Math.floor(Math.random() * 20)), updatedAt: now,
    ...extra,
  });

  const topics = [
    post(ayse, 'Willkommen im Dev-Forum', 'Erster Testbeitrag im Entwicklungs-Forum. Alles hier ist Fake-Inhalt.', ['neu-hier']),
    post(jonas, 'Fahrrad-Reparatur im Kiez?', 'Kennt jemand eine gute Werkstatt in der Nähe? (Dev-Testdaten)', ['frage', 'fahrrad']),
    post(admin, 'Test: Beitrag mit langem Text', 'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat. '.repeat(5), ['test']),
    post(ayse, 'Pending-Beispiel für die Moderation', 'Dieser Beitrag steht absichtlich auf pending, um die Admin-Queue zu testen.', ['test'], { moderationStatus: 'pending' }),
  ];

  const events = [
    { ...post(ayse, 'Dev-Kiezfest', 'Testevent in der Zukunft.', ['fest']), startDate: daysAhead(7), endDate: daysAhead(7), location: 'Herrfurthplatz (Test)', category: 'Nachbarschaft', capacity: null, allDay: false, rsvps: {} },
    { ...post(jonas, 'Flohmarkt (Testdaten)', 'Noch ein Testevent.', ['markt']), startDate: daysAhead(14), endDate: daysAhead(14), location: 'Schillerpromenade (Test)', category: 'Markt', capacity: null, allDay: true, rsvps: {} },
    { ...post(admin, 'Vergangenes Event', 'Liegt in der Vergangenheit — testet die Vergangenheits-Ansicht.', ['test']), startDate: daysAgo(10), endDate: daysAgo(10), location: 'Kiezraum (Test)', category: 'Nachbarschaft', capacity: null, allDay: false, rsvps: {} },
  ];

  const announcements = [
    { ...post(admin, 'Dev-Ankündigung (offiziell)', 'Offizielle Test-Ankündigung mit Pin.', ['info']), description: 'Test', isOfficial: true, pinnedUntil: daysAhead(7) },
    { ...post(ayse, 'Community-Ankündigung', 'Nicht-offizielle Test-Ankündigung.', ['info']), description: 'Test' },
  ];

  const recommendations = [
    { ...post(jonas, 'Café-Empfehlung (Test)', 'Fake-Empfehlung für die Dev-Datenbank.', ['café']), category: 'Essen & Trinken', description: 'Test' },
  ];

  const listing = (sellerId: string, title: string, extra: Record<string, unknown> = {}) => ({
    title, description: 'Dev-Testinserat — kein echter Artikel.', category: 'household', condition: 'good',
    price: 10, images: [], sellerId, status: 'available', views: 0, savedBy: [],
    delivery: 'pickup', listingKind: 'sell', moderationStatus: 'approved',
    createdAt: daysAgo(2), updatedAt: now, lastBumpedAt: now,
    ...extra,
  });

  const listings = [
    listing(ayse, 'Bücherregal (Testdaten)'),
    listing(jonas, 'Zimmerpflanze zu verschenken', { listingKind: 'gift', price: 0 }),
    listing(admin, 'Entwurf-Beispiel', { status: 'draft', moderationStatus: 'pending' }),
  ];

  const collections: Record<string, unknown[]> = {
    users, topics, events, announcements, recommendations, listings,
  };

  for (const [name, docs] of Object.entries(collections)) {
    await db.collection(name).deleteMany({});
    if (docs.length) await db.collection(name).insertMany(docs as any[]);
    console.log(`  ${name}: ${docs.length} seeded`);
  }

  console.log(`\nSeeded "${dbName}". Logins (password for all: ${DEV_PASSWORD}):`);
  for (const u of users) console.log(`  ${u.email}${'role' in u ? ' (admin)' : ''}`);
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
