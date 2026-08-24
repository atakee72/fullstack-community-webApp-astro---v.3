# Gründungsnachbar:innen Phase-0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Phase-0 onboarding kit for the first real neighbors: a welcome email that fires when a user confirms their email address (option 2 — decided in chat 2026-08-24), a guide blog post, and the pinned-announcement copy the admin pastes into `/admin/announcements`.

**Architecture:** The welcome email reuses the existing mail stack unchanged (React Email template + send module + shared `mailer.ts`); the only logic change is `verifyEmailWithToken` reporting the false→true `emailVerified` transition so the endpoint can send exactly once, best-effort, awaited inside the request window (Vercel freeze). The blog post is a normal MDX entry in the `blog` content collection, shipped as `draft: true` for user review. The announcement is a copy-paste doc, not code.

**Tech Stack:** React Email (`@react-email/components`, `@react-email/render`), shared mailer (`src/lib/email/mailer.ts`), MongoDB driver, Astro content collections (MDX).

**Spec:** No formal spec file — decisions from chat 2026-08-24: option 2 = welcome email sent on verification confirm (not at registration, not a second immediate email); Phase-0 content = blog post + pinned announcement + welcome message, DE-primary with short EN section. Rollout roadmap lives in project memory (`project_launch.md`).

## Global Constraints

- Commit messages simple/concise, NO "Generated with Claude Code" signature, NO "Co-Authored-By: Claude" footer.
- Never stage secrets; nothing in this plan touches `.env`.
- The welcome send must be `await`ed inside the request handler and wrapped in try/catch — a failed send must NEVER fail the verification response (and fire-and-forget dies at Vercel's function freeze).
- `sendMail()` already throws on failure and captures to Sentry with flush — the caller's catch only logs; do not add a second Sentry capture.
- Dev server for testing: port **4655 only** (`pnpm astro dev --port 4655`), never port 3000 (user's own server). Free it afterwards with `fuser -k 4655/tcp`.
- All DB testing against **mahalle-dev** (local `MONGODB_URI` already points there). Never the prod db `mahalle`.
- `pnpm type-check` baseline is 29 pre-existing errors — the gate is "no NEW errors mentioning the touched files", not zero.
- German copy uses typographic quotes („…") and real apostrophes — files are written whole via the Write tool, so no heredoc quoting hazard, but keep the characters intact.
- No `.svelte` files are touched → no browser-render gate needed; the E2E in Task 1 uses curl only.
- Local dev has SMTP configured, so the Task 1 E2E may really attempt an SMTP send to a `@mahalle-dev.test` address; that either throws fast (caught by the endpoint's try/catch — which is itself part of what we verify) or produces one harmless bounce notice to the sender mailbox. Both outcomes are acceptable and expected.

---

### Task 1: Welcome email on first verification

**Files:**
- Create: `src/emails/WelcomeEmail.tsx`
- Create: `src/lib/auth/sendWelcomeEmail.ts`
- Modify: `src/lib/auth/emailVerify.ts` (return type of `verifyEmailWithToken`, lines 62–101)
- Modify: `src/pages/api/auth/verify-email.ts` (the only caller — verified by grep, no other caller exists)
- Modify: `CLAUDE.md` (root — "Outgoing Email" send-modules line)

**Interfaces:**
- Consumes: `sendMail({to, subject, html})` + `isMailerConfigured()` from `src/lib/email/mailer.ts`; `render` from `@react-email/render`.
- Produces: `verifyEmailWithToken(rawToken: string): Promise<VerifyEmailResult>` where `type VerifyEmailResult = { ok: false } | { ok: true; welcome: { email: string; name: string } | null }` (`welcome` non-null ONLY on the first false→true transition of `users.emailVerified`); `sendWelcomeEmail(to: string, name: string, forumLink: string): Promise<void>`. The endpoint builds `forumLink` via the existing `getTrustedBaseUrl(request)` from `src/lib/auth/baseUrl.ts` (NEXTAUTH_URL in prod, request origin in dev).

- [ ] **Step 1: Create the email template**

Write `src/emails/WelcomeEmail.tsx` exactly:

```tsx
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  name: string;
  /** Absolute forum URL, built by the caller via getTrustedBaseUrl() — never hardcode the domain here. */
  forumLink: string;
}

// Sent ONCE, when the user confirms their email address (first
// emailVerified false→true transition) — see /api/auth/verify-email.
// Deliberately not sent at registration: the verify mail arrives there,
// and two emails within seconds read as spam on a young domain.
export default function WelcomeEmail({ name, forumLink }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Schön, dass du da bist — deine ersten Schritte im Kiez</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1}>Schön, dass du da bist, {name}!</Heading>
          <Text style={text}>
            Deine E-Mail ist bestätigt — willkommen bei Mahalle, der
            Nachbarschaftsplattform für den Schillerkiez. Kein Konzern, keine
            Werbung, kein Algorithmus: Das hier gehört dem Kiez.
          </Text>
          <Text style={text}>Ein paar gute erste Schritte:</Text>
          <Text style={listItem}>🖊️ <strong>Steckbrief ausfüllen</strong> — zeig den Nachbar:innen, wer du bist.</Text>
          <Text style={listItem}>🧭 <strong>Die Führung mitmachen</strong> — die kleine Tour startet von selbst und zeigt dir alles Wichtige.</Text>
          <Text style={listItem}>💬 <strong>Im Forum vorbeischauen</strong> — stell dich kurz vor oder stöbere einfach.</Text>
          <Text style={listItem}>📅 <strong>In den Kalender gucken</strong> — was ist demnächst im Kiez los?</Text>
          <Text style={listItem}>🔔 <strong>Mitteilungen aktivieren</strong> — über die Glocke im Forum, damit du nichts verpasst.</Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={forumLink} style={button}>Zum Forum</Button>
          </Section>
          <Text style={text}>
            Du gehörst zu den Ersten hier — deine Meinung formt die Plattform.
            Wenn etwas hakt oder fehlt: Schreib uns an admin@mahalle.digital.
          </Text>
          <Hr style={hr} />
          <Text style={muted}>
            <em>English:</em> Your email is confirmed — welcome to Mahalle,
            the Schillerkiez neighborhood platform. Fill in your profile, take
            the little tour, and say hi in the forum. If anything feels off,
            write to admin@mahalle.digital.
          </Text>
          <Hr style={hr} />
          <Text style={muted}>Mahalle · Schillerkiez · Neukölln</Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = { backgroundColor: '#f3ead8', fontFamily: 'Georgia, serif', padding: '24px' };
const containerStyle = { backgroundColor: '#f7f0de', border: '1.5px solid #1b1a17', borderRadius: '12px', padding: '32px', maxWidth: '480px' };
const h1 = { color: '#1b1a17', fontSize: '22px', fontWeight: 700, margin: '0 0 12px' };
const text = { color: '#3a362e', fontSize: '15px', lineHeight: '1.5', margin: '0 0 12px' };
const listItem = { color: '#3a362e', fontSize: '15px', lineHeight: '1.6', margin: '0 0 8px' };
const muted = { color: '#7a7264', fontSize: '12px', lineHeight: '1.5', margin: '8px 0 0' };
const button = { backgroundColor: '#1b1a17', color: '#f3ead8', fontSize: '15px', fontWeight: 700, padding: '12px 22px', borderRadius: '999px', textDecoration: 'none' };
const hr = { borderColor: '#c9bea3', margin: '20px 0' };
```

Style constants are copied from `src/emails/VerifyEmail.tsx` on purpose — same visual family.

- [ ] **Step 2: Create the send module**

Write `src/lib/auth/sendWelcomeEmail.ts` exactly:

```ts
// src/lib/auth/sendWelcomeEmail.ts — SERVER-ONLY.
// Renders the post-verification welcome mail and hands it to the shared
// mailer (src/lib/email/mailer.ts). Fired best-effort from
// /api/auth/verify-email on the FIRST emailVerified false→true transition
// only — never at registration (the verify mail arrives there).
// Mirrors src/lib/auth/sendVerifyEmail.ts.
import React from 'react';
import { render } from '@react-email/render';
import WelcomeEmail from '../../emails/WelcomeEmail';
import { isMailerConfigured, sendMail } from '../email/mailer';

export async function sendWelcomeEmail(to: string, name: string, forumLink: string): Promise<void> {
  if (!isMailerConfigured()) {
    // Dev-log fallback: no transport → don't send, just note it.
    console.log(`[welcome-email] (dev) would send welcome mail to ${to}`);
    return;
  }
  const html = await render(React.createElement(WelcomeEmail, { name, forumLink }));
  await sendMail({ to, subject: 'Mahalle — Schön, dass du da bist!', html });
}
```

- [ ] **Step 3: Render smoke test (pure, no transport)**

The test file must live INSIDE the project (Node resolves `@react-email/render` by walking up from the importing file — from `/tmp` it would miss the project's `node_modules`):

```bash
cat > welcome-render-test.tsx <<'TSX'
import { render } from '@react-email/render';
import React from 'react';
import WelcomeEmail from './src/emails/WelcomeEmail';
const html = await render(React.createElement(WelcomeEmail, { name: 'Ayşe', forumLink: 'http://localhost:4655/forum' }));
console.log(html.includes('Ayşe') && html.includes('Schön, dass du da bist') && html.includes('localhost:4655/forum') ? 'RENDER_OK' : 'RENDER_BROKEN');
TSX
npx tsx welcome-render-test.tsx
rm welcome-render-test.tsx
```

Expected: `RENDER_OK`. Delete the file afterwards (shown above) — it must never be committed. (The heredoc feeds tsx, not python, but the delimiter is quoted anyway — house rule.)

- [ ] **Step 4: Change `verifyEmailWithToken` to report the first transition**

In `src/lib/auth/emailVerify.ts`, add above `verifyEmailWithToken`:

```ts
export type VerifyEmailResult =
  | { ok: false }
  | { ok: true; welcome: { email: string; name: string } | null };
```

Replace the whole `verifyEmailWithToken` function (keep its doc comment, update the `@returns` sentence) with:

```ts
/**
 * Atomically claim the token (single-use) and set the user's emailVerified flag.
 * Returns { ok: true, welcome } on success — `welcome` carries the user's
 * email + display name ONLY on the first false→true transition (so the
 * caller can send the one-time welcome mail), else null.
 * Returns { ok: false } for invalid/expired/already-used tokens.
 */
export async function verifyEmailWithToken(rawToken: string): Promise<VerifyEmailResult> {
  if (!rawToken) return { ok: false };
  const db = await connectDB();
  const tokens = db.collection('emailVerifyTokens');

  // Atomic claim: only succeeds if the token is still unused + unexpired.
  const claimed = await tokens.findOneAndUpdate(
    { tokenHash: hashToken(rawToken), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } }
  );
  if (!claimed) return { ok: false };

  let welcome: { email: string; name: string } | null = null;
  try {
    // returnDocument 'before' → we see the PRE-update emailVerified value,
    // which is what makes the welcome mail exactly-once.
    const before = await db.collection('users').findOneAndUpdate(
      { _id: claimed.userId as ObjectId },
      { $set: { emailVerified: true, updatedAt: new Date().toISOString() } },
      { returnDocument: 'before' }
    );
    if (before && before.emailVerified !== true && typeof before.email === 'string') {
      welcome = { email: before.email, name: typeof before.name === 'string' && before.name ? before.name : 'Nachbar:in' };
    }
  } catch (err) {
    // The user write failed AFTER the token was claimed — roll the claim back
    // so the link stays usable and the user isn't stuck unverified.
    await tokens.updateOne({ _id: (claimed as any)._id }, { $set: { usedAt: null } })
      .catch((rollbackErr) => {
        console.error('verifyEmailWithToken: rollback ALSO failed — token may be permanently burnt:', rollbackErr);
      });
    console.error('verifyEmailWithToken: user write failed, rolled back claim:', err);
    return { ok: false };
  }

  // Flag is already flipped — clear any other unused tokens for this user.
  // Best-effort + POST-success: a failure here must NOT undo the verification.
  await tokens.deleteMany({ userId: claimed.userId, usedAt: null })
    .catch((cleanupErr) => {
      console.error('verifyEmailWithToken: sibling-token cleanup failed (verify still succeeded):', cleanupErr);
    });
  return { ok: true, welcome };
}
```

Note the semantics preserved from the old version: a missing user doc (tombstoned account) is still `ok: true` with no user write — `findOneAndUpdate` returning null without throwing takes that path, `welcome` stays null.

- [ ] **Step 5: Fire the welcome mail from the endpoint**

In `src/pages/api/auth/verify-email.ts`, add the import:

```ts
import { sendWelcomeEmail } from '../../../lib/auth/sendWelcomeEmail';
import { getTrustedBaseUrl } from '../../../lib/auth/baseUrl';
```

and replace the two lines

```ts
    const ok = await verifyEmailWithToken(token);
    return ok ? json({ ok: true }, 200) : json({ error: 'invalid_or_expired' }, 400);
```

with:

```ts
    const result = await verifyEmailWithToken(token);
    if (result.ok && result.welcome) {
      // One-time welcome mail on the first verification. Best-effort and
      // AWAITED inside the request window (Vercel freezes the function the
      // moment the response leaves — fire-and-forget would silently die);
      // a send failure must never fail the verification itself.
      try {
        const base = getTrustedBaseUrl(request);
        await sendWelcomeEmail(result.welcome.email, result.welcome.name, `${base}/forum`);
        console.log('[welcome-email] sent');
      } catch (err) {
        console.error('[welcome-email] send failed (verify still ok):', err);
      }
    }
    return result.ok ? json({ ok: true }, 200) : json({ error: 'invalid_or_expired' }, 400);
```

- [ ] **Step 6: Type-check + build**

Run: `pnpm type-check 2>&1 | grep -iE "emailVerify|verify-email|WelcomeEmail|sendWelcome"` → empty (baseline errors elsewhere are fine).
Run: `pnpm build 2>&1 | tail -3` → build completes without error.

- [ ] **Step 7: E2E against mahalle-dev on port 4655**

Start the dev server (never port 3000):

```bash
ss -tlnp | grep -q 4655 && echo BUSY && exit 1
(pnpm astro dev --port 4655 > /tmp/dev-4655.log 2>&1 &)
for i in $(seq 1 30); do sleep 1; curl -s -o /dev/null http://localhost:4655/ && break; done
```

Seed a verify token directly (raw MongoClient + dotenv — `src/lib/mongodb.ts` needs `import.meta.env` and can't run under tsx; same pattern as `scripts/create-auth-indexes.ts`):

```bash
cat > /tmp/seed-verify-token.ts <<'TS'
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
import { randomBytes, createHash } from 'crypto';

// Usage: npx tsx /tmp/seed-verify-token.ts [userId] [verifiedState]
//   userId        — reuse this exact user (round 2 MUST pass round 1's userId;
//                   an unpinned findOne could grab a DIFFERENT, unverified user
//                   and falsely re-fire the welcome)
//   verifiedState — 'true' to leave the user verified (round 2), default 'false'
const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();
const db = client.db(); // db name rides in the URI path → mahalle-dev
if (!db.databaseName.includes('dev')) throw new Error(`refusing non-dev db: ${db.databaseName}`);

const pinnedId = process.argv[2];
const user = pinnedId
  ? await db.collection('users').findOne({ _id: new ObjectId(pinnedId) })
  : await db.collection('users').findOne({ role: { $ne: 'admin' } });
if (!user) throw new Error('no dev user found');
const verified = process.argv[3] === 'true';
await db.collection('users').updateOne({ _id: user._id }, { $set: { emailVerified: verified } });

const raw = randomBytes(32).toString('hex');
await db.collection('emailVerifyTokens').insertOne({
  tokenHash: createHash('sha256').update(raw).digest('hex'),
  userId: user._id,
  expiresAt: new Date(Date.now() + 3600_000),
  usedAt: null,
  createdAt: new Date(),
});
console.log(JSON.stringify({ token: raw, userId: String(user._id) }));
await client.close();
TS
npx tsx /tmp/seed-verify-token.ts
```

Round 1 — first verification (expect welcome attempt):

```bash
curl -s -X POST http://localhost:4655/api/auth/verify-email \
  -H 'Content-Type: application/json' -d '{"token":"<raw token from seed>"}'
```

Expected: `{"ok":true}` — even though the SMTP send to the `@mahalle-dev.test` address may fail (that failure exercises the try/catch envelope). Then check the log:

```bash
grep -E "\[welcome-email\]" /tmp/dev-4655.log
```

Expected: exactly one line — either `[welcome-email] sent` or `[welcome-email] send failed (verify still ok): …`. Either proves the transition fired and the response stayed `ok:true`.

Round 2 — already-verified user (expect NO welcome attempt): re-run the seed script pinned to the SAME user, leaving them verified — `npx tsx /tmp/seed-verify-token.ts <userId from round 1> true` — then POST the new token the same way.

Expected: `{"ok":true}` and `grep -c "\[welcome-email\]" /tmp/dev-4655.log` still returns `1` (no second attempt).

Also confirm in the DB that the user ended verified:

```bash
cat > /tmp/check-verified.ts <<'TS'
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';
const client = new MongoClient(process.env.MONGODB_URI!);
await client.connect();
const u = await client.db().collection('users').findOne({ _id: new ObjectId(process.argv[2]) });
console.log('emailVerified:', u?.emailVerified);
await client.close();
TS
npx tsx /tmp/check-verified.ts <userId from seed>
```

Expected: `emailVerified: true`.

Teardown: `fuser -k 4655/tcp; rm /tmp/seed-verify-token.ts /tmp/check-verified.ts /tmp/dev-4655.log`. (The render-test file was already deleted in Step 3; the dev user is left verified — harmless in the seeded dev DB.)

- [ ] **Step 8: Docs**

In root `CLAUDE.md`, "Outgoing Email (shared mailer)" section, "Send modules" line: mention the new module — after "(`src/lib/auth/send*.ts`, contact relay)" no structural change is needed, but append a sentence to that bullet:

```
`sendWelcomeEmail.ts` fires from `/api/auth/verify-email` on the FIRST `emailVerified` false→true transition only (exactly-once via `findOneAndUpdate` returnDocument 'before'), awaited best-effort inside the request window — never at registration (deliberate: no double mail on signup).
```

- [ ] **Step 9: Commit**

```bash
git add src/emails/WelcomeEmail.tsx src/lib/auth/sendWelcomeEmail.ts src/lib/auth/emailVerify.ts src/pages/api/auth/verify-email.ts CLAUDE.md
git commit -m "auth: one-time welcome email on first email verification"
```

---

### Task 2: Guide blog post („Dein Start als Gründungsnachbar:in")

**Files:**
- Create: `src/content/blog/gruendungsnachbarn-guide.mdx`

**Interfaces:**
- Consumes: the `blog` content collection schema in `src/content.config.ts` (fields used: title, description, pubDate, author, postLayout, tags, draft — no cover, which is optional).
- Produces: nothing downstream. Ships `draft: true`; the user flips to `false` after reviewing — and should bump `pubDate` to the actual publish date at that moment (it's the sort key and the visible date line).

- [ ] **Step 1: Write the post**

Write `src/content/blog/gruendungsnachbarn-guide.mdx` exactly:

```mdx
---
title: "Dein Start als Gründungsnachbar:in — der kleine Wegweiser"
description: "Du gehörst zu den Ersten auf Mahalle. Hier steht, was es zu entdecken gibt, wie du mitmachst — und wie dein Feedback die Plattform formt."
pubDate: 2026-08-24
author: "Mahalle Team"
postLayout: "standard"
tags: ["gründungsnachbarn", "mitmachen", "guide"]
draft: true
---

Du bist früh dran — und genau das ist der Punkt. Mahalle ist gerade frisch
für den Schillerkiez gestartet, und die ersten Nachbar:innen prägen, was
daraus wird. Kein Konzern, keine Werbung, kein Algorithmus (warum, steht im
[Manifest](/blog/das-mahalle-manifest)) — nur wir hier im Kiez.

## Was es gibt

- **Forum** — das Wohnzimmer: Fragen, Diskussionen, Ankündigungen, Empfehlungen.
- **Kalender** — was im Kiez los ist. Zusagen, speichern, eigene Events eintragen.
- **Marktplatz** — verkaufen, tauschen, verschenken. Von Nachbar:in zu Nachbar:in.
- **Kurier** — täglich frische Kiez- und Bezirksnachrichten, zum Lesen und Merken.
- **Kiez-Daten** — Zahlen und Fakten über den Schillerkiez, verständlich aufbereitet.
- **Die Beilage** — dieser Blog hier.

## Gute erste Schritte

1. **Steckbrief ausfüllen** — unter *Profil*. Ein Foto und zwei Sätze reichen; Gesichter machen aus einer Website eine Nachbarschaft.
2. **Die Führung mitmachen** — die kleine Tour startet von selbst auf jeder Seite und zeigt dir in ein paar Schritten, was wo ist.
3. **Stell dich im Forum vor** — ein kurzes Hallo genügt. Niemand erwartet Essays.
4. **In den Kalender schauen** — und wenn dich was anspricht: zusagen und hingehen. Darum geht's ja.
5. **Mitteilungen aktivieren** — über die 🔔 Glocke im Forum. Dann verpasst du keine Antworten und keine offiziellen Ankündigungen.

## Du bist Gründungsnachbar:in — dein Feedback zählt doppelt

Die Plattform ist neu, und du wirst Ecken und Kanten finden. Genau dafür
bist du hier. Wenn etwas hakt, komisch aussieht oder fehlt, sag es uns —
am liebsten so:

> **Was wolltest du tun?** · **Was hast du erwartet?** · **Was ist
> stattdessen passiert?** · **Womit warst du unterwegs?** (Handy/Laptop,
> Browser)

Zwei Wege: antworte unter der angepinnten Ankündigung im Forum, oder
schreib an **admin@mahalle.digital**. Beides landet direkt beim Team, und
was daraus wird, erfährst du hier im Blog.

Auch Nicht-Fehler sind Gold: „Das war umständlich", „Das habe ich nicht
gefunden", „Das wünsche ich mir" — her damit.

## Ein paar Spielregeln, kurz

Freundlich bleiben, echte Nachbarschaft eben. Beiträge werden automatisch
auf Spam und Beleidigungen geprüft; im Zweifel schaut ein Mensch drauf.
Und: Bis zu fünf Beiträge pro Tag und Sorte — Qualität vor Menge.

---

## In English, briefly

You're one of the first neighbors on Mahalle — a non-commercial platform
for the Schillerkiez. Fill in your profile, take the little guided tour,
say hi in the forum, check the calendar, and turn on notifications via the
🔔 bell. Found something broken or confusing? Reply under the pinned
announcement in the forum or email **admin@mahalle.digital** — tell us
what you tried, what you expected, what happened instead, and what device
you were on. Your feedback shapes what this becomes.

*Schön, dass du da bist.*
```

- [ ] **Step 2: Build + render check**

Run: `pnpm build 2>&1 | tail -3` → completes without error (the MDX parses against the schema).

Because `draft: true`, the post must NOT appear on the public index. Verify both sides on a quick dev run:

```bash
ss -tlnp | grep -q 4655 && echo BUSY && exit 1
(pnpm astro dev --port 4655 > /tmp/dev-4655.log 2>&1 &)
for i in $(seq 1 30); do sleep 1; curl -s -o /dev/null http://localhost:4655/ && break; done
curl -s http://localhost:4655/blog | grep -c "Gründungsnachbar" 
```

Expected: `0` if the blog index hides drafts in dev, or ≥1 if drafts are dev-visible — check `src/components/blog/CLAUDE.md`'s draft-gating note for which is correct and record the observed behavior in the task report; the hard requirement is only the prod side, which `draft: true` guarantees by the collection's existing gating. Teardown: `fuser -k 4655/tcp`.

- [ ] **Step 3: Commit**

```bash
git add src/content/blog/gruendungsnachbarn-guide.mdx
git commit -m "blog: Gründungsnachbar:innen onboarding guide (draft)"
```

---

### Task 3: Pinned-announcement copy (paste-ready doc)

**Files:**
- Create: `docs/launch/gruendungsnachbarn-announcement.md`

**Interfaces:**
- Consumes: nothing.
- Produces: copy the user pastes into `/admin/announcements` (title field + body field). Not rendered by any code.

- [ ] **Step 1: Write the doc**

Write `docs/launch/gruendungsnachbarn-announcement.md` exactly:

```markdown
# Pinned announcement — Gründungsnachbar:innen (paste-ready)

Paste into `/admin/announcements` (official, pins for 7 days; re-pin
weekly while onboarding runs). Post AFTER the guide blog post is
published (flip its `draft: true` to `false` and bump `pubDate` first) —
the body links to it.

## Titel

Willkommen, Gründungsnachbar:innen! 🌻

## Text

Schön, dass ihr hier seid — ihr gehört zu den allerersten Nachbar:innen
auf Mahalle, und eure Meinung formt die Plattform.

Für den Einstieg: Der kleine Wegweiser in der Beilage zeigt, was es gibt
und wo man am besten anfängt → https://mahalle.digital/blog/gruendungsnachbarn-guide

Wenn etwas hakt, fehlt oder komisch aussieht: Schreibt es einfach hier in
die Kommentare (was wolltet ihr tun, was habt ihr erwartet, was ist
passiert, Handy oder Laptop?) — oder an admin@mahalle.digital. Alles wird
gelesen, und was daraus wird, erfahrt ihr im Blog.

— English: You're among Mahalle's very first neighbors. Start with the
guide (link above), and report anything broken or confusing in the
comments here or to admin@mahalle.digital. Your feedback shapes the
platform.
```

- [ ] **Step 2: Sanity check the linked slug**

Run: `ls src/content/blog/ | grep gruendungsnachbarn-guide` → the MDX from Task 2 exists, so the URL `/blog/gruendungsnachbarn-guide` in the body will resolve once the post's `draft` flips to `false`.

- [ ] **Step 3: Commit**

```bash
git add docs/launch/gruendungsnachbarn-announcement.md
git commit -m "docs: paste-ready Gründungsnachbar:innen announcement copy"
```
