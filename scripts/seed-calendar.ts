/**
 * Seed the calendar with realistic kiosk-flavoured events for demo /
 * design review. Adapted from CD's `SEED_EVENTS` (kiosk-calendar.jsx)
 * with dates anchored on `new Date()` so every event lands in the
 * near future.
 *
 * Usage:
 *   pnpm tsx scripts/seed-calendar.ts             # insert (no wipe)
 *   pnpm tsx scripts/seed-calendar.ts --clean     # deleteMany first
 *   pnpm tsx scripts/seed-calendar.ts --dry-run   # build + log, no writes
 *
 * Environment:
 *   MONGODB_URI — required
 *
 * The script picks the first user in the DB as the author for every
 * seeded event (idempotent for repeat runs against the same DB; switch
 * authors only matters for cosmetic byline display).
 */

import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';

type Cat =
  | 'kiez'
  | 'oeffentlich'
  | 'markt'
  | 'kultur'
  | 'sport'
  | 'privat';

const isDryRun = process.argv.includes('--dry-run');
const shouldClean = process.argv.includes('--clean');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('[seed-calendar] MONGODB_URI is required.');
  process.exit(1);
}

// ─── Date helper ────────────────────────────────────────────────────
// Build a Date `daysFromNow` days ahead at the given local hour:minute.
// Anchored on the script's start `now` so all timestamps are coherent
// even if the script takes a moment to run.
const NOW = new Date();
function dateAt(daysFromNow: number, hours: number, minutes: number = 0): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

interface SeedEvent {
  title: string;
  body: string;
  startDate: Date;
  endDate: Date;
  location: string;
  category: Cat;
  capacity?: number;
  allDay?: boolean;
  tags?: string[];
}

// ─── Seed data — Schillerkiez future-relative ──────────────────────
//
// Anchored on `daysFromNow`. The mix targets:
//   - Today + tomorrow (a few near-term events to populate "this week")
//   - Multi-day spans (Tag der offenen Höfe across 4 days)
//   - One per category (kiez, oeffentlich, markt, kultur, sport, privat)
//   - Capacity values across the threshold zones (≤59% moss / 60–84%
//     ochre / ≥85% wine) so the visual capacity bar shows variation
//     once neighbours start RSVP-ing.
//
// Curly quotes per CD's warning: opener „ (U+201E) + closer “ (U+201C).
const SEED: SeedEvent[] = [
  {
    title: 'Türkenmarkt am Maybachufer',
    body:
      'Wöchentlicher Markt mit frischem Gemüse, Käse, Brot und Streetfood entlang des Maybachufers. ' +
      'Kommt früh, dann gibt es noch alles. Dienstag und Freitag.',
    startDate: dateAt(1, 8, 0),
    endDate: dateAt(1, 14, 0),
    location: 'Maybachufer',
    category: 'markt',
    capacity: undefined,
    tags: ['markt', 'lebensmittel']
  },
  {
    title: 'Hofkonzert Hertzbergstraße',
    body:
      'Selma & Kerem laden ein zum Hofkonzert: zwei Sets akustische Musik im Hinterhof. ' +
      'Selbstgebackener Kuchen, alles auf Spendenbasis. Bringt Decken mit.',
    startDate: dateAt(2, 18, 0),
    endDate: dateAt(2, 21, 0),
    location: 'Hertzbergstr. 22, Hinterhof',
    category: 'kiez',
    capacity: 40,
    tags: ['musik', 'hofkonzert']
  },
  {
    title: 'Lesung · Şenocak liest aus „Deutsche Schule“',
    body:
      'Zafer Şenocak im Café Selig — Lesung mit anschließendem Gespräch. ' +
      'Eintritt frei, Spendenhut steht bereit. Plätze begrenzt.',
    startDate: dateAt(3, 19, 30),
    endDate: dateAt(3, 21, 30),
    location: 'Café Selig, Weisestr. 49',
    category: 'kultur',
    capacity: 25,
    tags: ['lesung', 'literatur']
  },
  {
    title: 'Lauftreff Tempelhofer Feld',
    body:
      'Lockerer 5km-Lauf für Anfänger:innen. Lena führt durchs Feld; Tempo passt sich der Gruppe an. ' +
      'Treffpunkt am Eingang Oderstraße. Bei Regen drinnen Kaffee.',
    startDate: dateAt(5, 10, 0),
    endDate: dateAt(5, 11, 30),
    location: 'Tempelhofer Feld · Eingang Oderstr.',
    category: 'sport',
    capacity: 30,
    tags: ['laufen', 'sport']
  },
  {
    title: 'Tag der offenen Höfe',
    body:
      'Vier Tage lang öffnen sich Hinterhöfe im Schillerkiez. Konzerte, Werkstattbesuche, ' +
      'Flohmärkte und Kaffee. Karte mit allen Stationen am Quartiersbüro.',
    startDate: dateAt(6, 0, 0),
    endDate: dateAt(9, 23, 59),
    location: 'Schillerkiez · ganzes Viertel',
    category: 'kiez',
    allDay: true,
    capacity: undefined,
    tags: ['hof', 'fest', 'ganztägig']
  },
  {
    title: 'Bürger:innen-Versammlung Sanierung Schillerpromenade',
    body:
      'Bezirk Neukölln stellt die Pläne für die Sanierung vor. Diskussion + Q&A. ' +
      'Online-Übertragung verfügbar; Link folgt am Vortag.',
    startDate: dateAt(8, 18, 30),
    endDate: dateAt(8, 20, 30),
    location: 'Genezarethkirche · Herrfurthplatz',
    category: 'oeffentlich',
    capacity: 150,
    tags: ['versammlung', 'sanierung', 'bezirk']
  },
  {
    title: 'Kinderworkshop · Linoldruck',
    body:
      'Drucken mit Linolschnitt für Kinder ab 8. Material wird gestellt; ' +
      'jedes Kind nimmt zwei eigene Drucke mit nach Hause.',
    startDate: dateAt(10, 16, 0),
    endDate: dateAt(10, 18, 0),
    location: 'Buchladen Tucholsky',
    category: 'kultur',
    capacity: 12,
    tags: ['kinder', 'workshop', 'drucken']
  },
  {
    title: 'Geburtstag Mauro · BYO',
    body:
      'Mauros 35er — kommt vorbei, bringt was zum Trinken oder Essen mit. ' +
      'Privatadresse per DM. Kinder willkommen bis 21:00.',
    startDate: dateAt(12, 19, 0),
    endDate: dateAt(12, 23, 0),
    location: 'Privat · Adresse per DM',
    category: 'privat',
    capacity: 20,
    tags: ['geburtstag', 'privat']
  },
  {
    title: 'Straßenfest Herrfurthplatz',
    body:
      'Das jährliche Frühjahrsfest. Live-Musik, Stände vom Türkenmarkt, ' +
      'Kinderecke, Tausch-Bibliothek. Ab 18 Uhr DJ-Set Selma & Friends. BYO Geschirr.',
    startDate: dateAt(14, 14, 0),
    endDate: dateAt(14, 20, 0),
    location: 'Herrfurthplatz',
    category: 'kiez',
    capacity: 200,
    tags: ['fest', 'strassenfest', 'musik']
  },
  {
    title: 'Flohmarkt Schillerpromenade',
    body:
      'Monatlicher Flohmarkt entlang der Schillerpromenade. ' +
      'Kleidung, Bücher, Pflanzen, Kindersachen. Anmeldung Standgebühr beim Bezirk.',
    startDate: dateAt(17, 10, 0),
    endDate: dateAt(17, 16, 0),
    location: 'Schillerpromenade',
    category: 'markt',
    capacity: undefined,
    tags: ['flohmarkt', 'markt']
  }
];

async function main() {
  if (isDryRun) {
    console.log(`[seed-calendar] DRY RUN — anchored on ${NOW.toISOString()}`);
    for (const ev of SEED) {
      console.log(
        `  · ${ev.startDate.toISOString().slice(0, 16)} ${ev.allDay ? 'all-day' : ''} [${ev.category}] ${ev.title}`
      );
    }
    return;
  }

  const client = new MongoClient(MONGODB_URI!);
  await client.connect();
  try {
    const db = client.db();
    const events = db.collection('events');
    const users = db.collection('users');

    if (shouldClean) {
      const result = await events.deleteMany({});
      console.log(`[seed-calendar] --clean: removed ${result.deletedCount} existing events.`);
    }

    // Pick the first user as author. (Could be smarter — e.g. admin
    // role — but for demo seeding any real id keeps the byline rendering
    // correctly.)
    const firstUser = await users.findOne({}, { projection: { _id: 1, name: 1 } });
    if (!firstUser) {
      console.error('[seed-calendar] No users in DB — register one first.');
      process.exit(1);
    }
    const authorId = String(firstUser._id);
    console.log(`[seed-calendar] author = ${firstUser.name ?? authorId}`);

    const docs = SEED.map((ev) => ({
      title: ev.title,
      body: ev.body,
      author: authorId,
      startDate: ev.startDate,
      endDate: ev.endDate,
      location: ev.location,
      category: ev.category,
      capacity: ev.capacity ?? null,
      allDay: ev.allDay ?? false,
      tags: ev.tags ?? [],
      comments: [],
      views: 0,
      likes: 0,
      likedBy: [],
      rsvps: { going: [], maybe: [] },
      date: Date.now(),
      moderationStatus: 'approved' as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const result = await events.insertMany(docs);
    console.log(
      `[seed-calendar] inserted ${result.insertedCount} events (anchored on ${NOW.toISOString().slice(0, 10)}).`
    );
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('[seed-calendar] failed:', err);
  process.exit(1);
});
