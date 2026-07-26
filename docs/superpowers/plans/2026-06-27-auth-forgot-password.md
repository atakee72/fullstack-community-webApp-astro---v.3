# Auth — Forgot Password / Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure forgot-password / reset-password flow — request a reset link by email, set a new password via a single-use time-boxed token — on the kiosk auth front door, reusing the existing Resend email infra.

**Architecture:** Two new POST endpoints (`/api/auth/forgot-password`, `/api/auth/reset-password`) backed by a server-only token library that stores only a SHA-256 hash of each token in a new `passwordResetTokens` collection (single-use via atomic claim, 30-min TTL, bound to the user). Email goes out via the existing Resend + react-email pattern, with a dev-log fallback that prints the link to the server console when `RESEND_API_KEY` is absent. Two kiosk pages on `AuthLayout`: `/forgot-password` (request → sent, anti-enumeration) and `/reset-password?token=…` (SSR token-validity check → set-new-password → done).

**Tech Stack:** Astro 5, Svelte 5 runes, MongoDB 6.3 (direct driver), Node `crypto` (`randomBytes`/`createHash`), `bcrypt`, Resend + `@react-email/render`, Zod, kiosk CSS-var tokens.

## Global Constraints

- **Anti-enumeration (non-negotiable).** `POST /api/auth/forgot-password` ALWAYS returns the same generic 200 response for known AND unknown emails — never reveals whether an account exists. The "sent" UI confirms identically in both cases. `POST /api/auth/reset-password` returns one generic error for any invalid/expired/used token.
- **Token security (verbatim from `AUTH_SCOPING.md`):** reset token is **single-use, 30 minutes, bound to the user**. Store ONLY `sha256(rawToken)` at rest — never the raw token. The raw token lives only in the emailed link. Single-use is enforced by an **atomic claim** (`findOneAndUpdate` setting `usedAt`), so two concurrent submits can't both succeed.
- **Dev-log email fallback (locked decision).** When `import.meta.env.RESEND_API_KEY` is empty, do NOT attempt to send — `console.log` the reset link to the server console so the flow is testable in dev. When the key IS present, send via Resend (same pattern as the marketplace contact relay).
- **No change to `auth.config.ts` or the sign-in flow.** Reset only rewrites `users.password` (bcrypt, salt rounds 12 — matching `register.ts`). Do NOT touch `emailVerified` here (email-verification is a separate plan).
- **Password rule = `RegisterSchema`'s:** min 8 chars, at least one lowercase, one uppercase, one digit. The new password + confirm must match.
- **Resend guard.** `createPasswordResetToken` issues at most one token per user per 60s (returns `null` if a fresh unused token exists), and invalidates the user's prior unused tokens (latest-wins). This is a light abuse guard, NOT the full login rate-limiter (separate plan).
- **Reset link base URL** = the request origin (`new URL(request.url).origin`) — works in dev and prod without extra env.
- **Kiosk conventions (same as prior auth work):** pages use `AuthLayout`; islands are Svelte 5 mounted `client:only="svelte"`; ochre accent via `var(--k-accent)`; tokens `--k-paper`/`--k-ink`/etc.; fonts `font-bricolage`/`font-dmmono`/`font-instrument`; DE+EN via `kiosk-i18n` (`$t`/`$locale`); German curly quotes `„…“` (U+201E/U+201C), never straight ASCII.
- **Testing reality:** no unit-test runner. Gates are `pnpm type-check` (baseline: only benign `Dict = typeof de` lines in kiosk-i18n.ts + pre-existing node_modules/Navbar/sync-stats errors — gate is "no NEW errors in files this task touches"), `pnpm build`, throwaway Node smoke scripts against the dev DB (create + clean up a temp user; never mutate a real account), and `curl` / playwright on :3000. Email can't actually send in dev (no `RESEND_API_KEY`) — the dev-log path is the testable path; read the server stdout from the `pnpm dev` background output file. If `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login` returns `000`, ask the user to start `pnpm dev`.
- **Never commit secrets.** Throwaway smoke scripts read `MONGODB_URI` from `.env`; delete the script after use; never print env values.

---

## File structure

**Create:**
- `src/lib/auth/passwordReset.ts` — SERVER-ONLY token lifecycle (create / find-valid / atomic-consume + set password).
- `src/lib/auth/sendResetEmail.ts` — SERVER-ONLY send helper (Resend, with dev-log fallback).
- `src/emails/PasswordResetEmail.tsx` — react-email template.
- `src/pages/api/auth/forgot-password.ts` — POST (request a reset link; anti-enum).
- `src/pages/api/auth/reset-password.ts` — POST (consume token; set new password).
- `src/pages/forgot-password.astro` — request page (AuthLayout + island).
- `src/pages/reset-password.astro` — reset page (SSR token check + AuthLayout + island).
- `src/components/auth/kiosk/AuthForgotInner.svelte` — request → sent island.
- `src/components/auth/kiosk/AuthResetInner.svelte` — set-new-password → done island.

**Modify:**
- `src/schemas/auth.schema.ts` — add `ResetPasswordSchema`.
- `src/lib/kiosk-i18n.ts` — add `auth.forgot.*` + `auth.reset.*` keys (DE+EN).
- `src/components/auth/kiosk/CLAUDE.md` — document the flow + collection.
- root `CLAUDE.md` — note the `passwordResetTokens` collection.

**Reference (don't change):**
- `src/pages/api/listings/[id]/contact.ts` — the Resend send + `render()` pattern to mirror.
- `src/emails/ContactConfirmationEmail.tsx` — react-email template style.
- `src/pages/api/auth/register.ts` — bcrypt salt rounds (12) + `users` shape.
- `src/schemas/auth.schema.ts` — `RegisterSchema` password rule to reuse.

**New DB collection:** `passwordResetTokens` — `{ tokenHash: string, userId: ObjectId, expiresAt: Date, usedAt: Date | null, createdAt: Date }`.

---

### Task 1: i18n keys (DE + EN)

**Files:**
- Modify: `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Produces: `auth.forgot.*`, `auth.reset.*` keys consumed by the islands (Tasks 6–7).

Add to BOTH the `de` dict and the `en` dict (near the other `auth.*` keys), matching existing `'key': 'value',` formatting.

- [ ] **Step 1: Add the DE keys**

```ts
  // ── Auth · forgot/reset password ──
  'auth.forgot.eyebrow': 'PASSWORT ZURÜCKSETZEN',
  'auth.forgot.title.a': 'Kein Problem, ',
  'auth.forgot.title.accent': 'Nachbar',
  'auth.forgot.title.b': '.',
  'auth.forgot.sub': 'Gib deine E-Mail ein — wir schicken dir einen Link zum Zurücksetzen.',
  'auth.forgot.email': 'E-Mail',
  'auth.forgot.emailPh': 'du@beispiel.de',
  'auth.forgot.cta': 'Link senden',
  'auth.forgot.ctaLoading': 'wird gesendet …',
  'auth.forgot.back': '← zurück zur Anmeldung',
  'auth.forgot.sentTitle.a': 'Link ist ',
  'auth.forgot.sentTitle.accent': 'unterwegs',
  'auth.forgot.sentTitle.b': '.',
  'auth.forgot.sentSub': 'Wenn ein Konto mit dieser Adresse existiert, haben wir einen Zurücksetz-Link geschickt an',
  'auth.forgot.sentBody': 'Der Link ist 30 Minuten gültig. Nichts da? Prüf den Spam-Ordner.',
  'auth.forgot.resend': 'Erneut senden',
  'auth.reset.eyebrow': 'NEUES PASSWORT',
  'auth.reset.title.a': 'Wähl ein ',
  'auth.reset.title.accent': 'neues',
  'auth.reset.title.b': ' Passwort.',
  'auth.reset.pw': 'Neues Passwort',
  'auth.reset.pw2': 'Wiederholen',
  'auth.reset.pwPh': 'mind. 8 Zeichen',
  'auth.reset.cta': 'Passwort speichern',
  'auth.reset.ctaLoading': 'wird gespeichert …',
  'auth.reset.doneEyebrow': 'GESPEICHERT',
  'auth.reset.doneTitle.a': 'Erledigt — ',
  'auth.reset.doneTitle.accent': 'fertig',
  'auth.reset.doneTitle.b': '.',
  'auth.reset.doneSub': 'Dein Passwort wurde geändert. Du kannst dich jetzt anmelden.',
  'auth.reset.doneCta': 'Zur Anmeldung',
  'auth.reset.invalidTitle': 'Link ungültig oder abgelaufen',
  'auth.reset.invalidBody': 'Dieser Zurücksetz-Link ist nicht mehr gültig. Fordere einen neuen an.',
  'auth.reset.invalidCta': 'Neuen Link anfordern',
  'auth.err.pwWeak': 'Zu schwach — füge Zahlen & Groß-/Kleinbuchstaben hinzu.',
  'auth.err.mismatch': 'Passwörter stimmen nicht überein.',
  'auth.err.resetFailed': 'Konnte das Passwort nicht ändern. Der Link ist evtl. abgelaufen.',
  'auth.err.generic': 'Etwas ist schiefgelaufen. Bitte versuch es erneut.',
```

NOTE: `auth.err.pwWeak`, `auth.err.mismatch`, `auth.err.generic` already exist from Phase 1 — if a key already exists in the dict, do NOT add a duplicate (a duplicate object key is a defect). Only add the ones missing (`auth.err.resetFailed` plus all the `auth.forgot.*`/`auth.reset.*`).

- [ ] **Step 2: Add the EN keys**

```ts
  // ── Auth · forgot/reset password ──
  'auth.forgot.eyebrow': 'RESET PASSWORD',
  'auth.forgot.title.a': 'No problem, ',
  'auth.forgot.title.accent': 'neighbor',
  'auth.forgot.title.b': '.',
  'auth.forgot.sub': "Enter your email — we'll send you a reset link.",
  'auth.forgot.email': 'Email',
  'auth.forgot.emailPh': 'you@example.com',
  'auth.forgot.cta': 'Send link',
  'auth.forgot.ctaLoading': 'sending …',
  'auth.forgot.back': '← back to sign in',
  'auth.forgot.sentTitle.a': 'Link is ',
  'auth.forgot.sentTitle.accent': 'on its way',
  'auth.forgot.sentTitle.b': '.',
  'auth.forgot.sentSub': 'If an account exists for this address, we sent a reset link to',
  'auth.forgot.sentBody': 'The link is valid for 30 minutes. Nothing there? Check your spam folder.',
  'auth.forgot.resend': 'Resend',
  'auth.reset.eyebrow': 'NEW PASSWORD',
  'auth.reset.title.a': 'Choose a ',
  'auth.reset.title.accent': 'new',
  'auth.reset.title.b': ' password.',
  'auth.reset.pw': 'New password',
  'auth.reset.pw2': 'Repeat',
  'auth.reset.pwPh': 'min. 8 characters',
  'auth.reset.cta': 'Save password',
  'auth.reset.ctaLoading': 'saving …',
  'auth.reset.doneEyebrow': 'SAVED',
  'auth.reset.doneTitle.a': 'Done — ',
  'auth.reset.doneTitle.accent': 'all set',
  'auth.reset.doneTitle.b': '.',
  'auth.reset.doneSub': 'Your password has been changed. You can sign in now.',
  'auth.reset.doneCta': 'To sign in',
  'auth.reset.invalidTitle': 'Link invalid or expired',
  'auth.reset.invalidBody': 'This reset link is no longer valid. Request a new one.',
  'auth.reset.invalidCta': 'Request a new link',
  'auth.err.resetFailed': "Couldn't change the password. The link may have expired.",
```

(EN already has `auth.err.pwWeak`, `auth.err.mismatch`, `auth.err.generic` — don't duplicate; only add `auth.err.resetFailed` + the forgot/reset keys.)

- [ ] **Step 3: Type-check**

Run: `pnpm type-check 2>&1 | grep "kiosk-i18n.ts" | grep -v "Dict = typeof de"` → Expected: no NEW non-baseline errors, and specifically NO "An object literal cannot have multiple properties with the same name" (that would mean a duplicate key — fix it).

- [ ] **Step 4: Commit**

```bash
git add src/lib/kiosk-i18n.ts
git commit -m "feat(auth): forgot/reset password i18n keys (de+en)"
```

---

### Task 2: Reset-token library + schema

**Files:**
- Create: `src/lib/auth/passwordReset.ts`
- Modify: `src/schemas/auth.schema.ts`

**Interfaces:**
- Produces (consumed by Tasks 4, 5, 7):
  - `createPasswordResetToken(userId: string): Promise<string | null>` — returns the RAW token (for the link), or `null` if the 60s resend-guard blocks issuance.
  - `findValidResetToken(rawToken: string): Promise<string | null>` — returns the owning `userId` string if the token is unused + unexpired, else `null`. (Read-only; for the SSR page check.)
  - `resetPasswordWithToken(rawToken: string, newPassword: string): Promise<boolean>` — atomically claims the token (single-use) and rewrites the user's bcrypt password; `true` on success, `false` for invalid/expired/used.
  - `ResetPasswordSchema` (Zod): `{ token: string; password: string; confirmPassword: string }` with the RegisterSchema password rule + a refine that `password === confirmPassword`.

- [ ] **Step 1: Add `ResetPasswordSchema` to `src/schemas/auth.schema.ts`**

Append (after the existing `ChangePasswordSchema`):

```ts
// Reset Password Schema (forgot-password flow — token + new password)
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Missing token'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
```

- [ ] **Step 2: Create `src/lib/auth/passwordReset.ts`**

```ts
// src/lib/auth/passwordReset.ts
// SERVER-ONLY (mongodb + crypto + bcrypt). Never import from a client/.svelte file.
//
// Reset tokens are stored ONLY as sha256(rawToken) — the raw token lives solely
// in the emailed link. Single-use is enforced by an atomic findOneAndUpdate claim.
import { randomBytes, createHash } from 'crypto';
import bcrypt from 'bcrypt';
import { ObjectId } from 'mongodb';
import { connectDB } from '../mongodb';

const TOKEN_TTL_MS = 30 * 60 * 1000;   // 30 minutes (AUTH_SCOPING)
const RESEND_GUARD_MS = 60 * 1000;     // at most one new token per user per 60s
const SALT_ROUNDS = 12;                // matches register.ts

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Issue a single-use reset token for a user. Invalidates the user's prior unused
 * tokens (latest-wins). Returns the RAW token to embed in the link, or null if a
 * fresh unused token was issued <60s ago (resend guard).
 */
export async function createPasswordResetToken(userId: string): Promise<string | null> {
  const db = await connectDB();
  const col = db.collection('passwordResetTokens');
  const uid = new ObjectId(userId);
  const now = Date.now();

  const recent = await col.findOne({
    userId: uid,
    usedAt: null,
    createdAt: { $gte: new Date(now - RESEND_GUARD_MS) },
  });
  if (recent) return null;

  await col.deleteMany({ userId: uid, usedAt: null });

  const raw = randomBytes(32).toString('hex');
  await col.insertOne({
    tokenHash: hashToken(raw),
    userId: uid,
    expiresAt: new Date(now + TOKEN_TTL_MS),
    usedAt: null,
    createdAt: new Date(now),
  });
  return raw;
}

/** Return the owning userId if the token is valid (unused + unexpired), else null. */
export async function findValidResetToken(rawToken: string): Promise<string | null> {
  if (!rawToken) return null;
  const db = await connectDB();
  const col = db.collection('passwordResetTokens');
  const row = await col.findOne({
    tokenHash: hashToken(rawToken),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  return row ? String(row.userId) : null;
}

/**
 * Atomically claim the token (single-use) and rewrite the user's password.
 * Returns true on success; false for invalid/expired/already-used tokens.
 */
export async function resetPasswordWithToken(rawToken: string, newPassword: string): Promise<boolean> {
  if (!rawToken) return false;
  const db = await connectDB();
  const tokens = db.collection('passwordResetTokens');

  // Atomic claim: only succeeds if the token is still unused + unexpired.
  // mongodb v6 findOneAndUpdate returns the matched document (or null) directly.
  const claimed = await tokens.findOneAndUpdate(
    { tokenHash: hashToken(rawToken), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } }
  );
  if (!claimed) return false;

  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await db.collection('users').updateOne(
    { _id: claimed.userId as ObjectId },
    { $set: { password: hashed, updatedAt: new Date().toISOString() } }
  );
  return true;
}
```

- [ ] **Step 3: Type-check + build**

Run: `pnpm type-check 2>&1 | grep -E "passwordReset|auth.schema"` → Expected: no output.
Run: `pnpm build 2>&1 | tail -2` → Expected: build completes.

- [ ] **Step 4: Smoke-test the lib against the dev DB with a TEMP user (auto-cleanup)**

Create `./.smoke-passwordReset.mjs` (in the project root so it resolves the local `mongodb`/`bcrypt`), run it, then delete it. It creates a throwaway user, exercises the full lifecycle, and cleans up — it never touches a real account.

```js
import { MongoClient, ObjectId } from 'mongodb';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
const env = Object.fromEntries(readFileSync('.env','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')];}));
const { createPasswordResetToken, findValidResetToken, resetPasswordWithToken } = await import('./src/lib/auth/passwordReset.ts').catch(async () => {
  // ts not directly importable by node — exercise the collection logic inline instead
  return {};
});
const c = new MongoClient(env.MONGODB_URI); await c.connect();
const db = c.db();
const email = `smoke-reset-${Date.now()}@example.invalid`;
const ins = await db.collection('users').insertOne({ name:'Smoke', email, password:'x', emailVerified:false, createdAt:new Date().toISOString() });
const uid = ins.insertedId.toString();
const hash = (r)=>createHash('sha256').update(r).digest('hex');
// emulate createPasswordResetToken inline (same logic) to avoid TS import:
const raw = (await import('crypto')).randomBytes(32).toString('hex');
await db.collection('passwordResetTokens').insertOne({ tokenHash:hash(raw), userId:ins.insertedId, expiresAt:new Date(Date.now()+1800000), usedAt:null, createdAt:new Date() });
const valid = await db.collection('passwordResetTokens').findOne({ tokenHash:hash(raw), usedAt:null, expiresAt:{$gt:new Date()} });
console.log('find valid (expect truthy):', !!valid);
const claim = await db.collection('passwordResetTokens').findOneAndUpdate({ tokenHash:hash(raw), usedAt:null, expiresAt:{$gt:new Date()} }, { $set:{ usedAt:new Date() } });
console.log('claim (expect truthy):', !!claim);
const reuse = await db.collection('passwordResetTokens').findOneAndUpdate({ tokenHash:hash(raw), usedAt:null, expiresAt:{$gt:new Date()} }, { $set:{ usedAt:new Date() } });
console.log('reuse (expect null):', reuse);
// cleanup
await db.collection('passwordResetTokens').deleteMany({ userId: ins.insertedId });
await db.collection('users').deleteOne({ _id: ins.insertedId });
console.log('cleaned up temp user + tokens');
await c.close();
```

Run: `node ./.smoke-passwordReset.mjs` then `rm -f ./.smoke-passwordReset.mjs`
Expected: `find valid (expect truthy): true`, `claim (expect truthy): true`, `reuse (expect null): null`, `cleaned up…`. (This proves the single-use atomic-claim + hashed-lookup semantics the lib relies on.) Remove the script before committing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/passwordReset.ts src/schemas/auth.schema.ts
git commit -m "feat(auth): password-reset token lib + ResetPasswordSchema"
```

---

### Task 3: Reset email template + send helper

**Files:**
- Create: `src/emails/PasswordResetEmail.tsx`
- Create: `src/lib/auth/sendResetEmail.ts`

**Interfaces:**
- Consumes: `Resend`, `@react-email/render`, `PasswordResetEmail`.
- Produces: `sendPasswordResetEmail(to: string, resetLink: string): Promise<void>` — sends via Resend when `RESEND_API_KEY` is set, otherwise `console.log`s the link (dev-log fallback). Never throws on a missing key.

- [ ] **Step 1: Create `src/emails/PasswordResetEmail.tsx`** (mirror `ContactConfirmationEmail.tsx` style)

```tsx
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr,
} from '@react-email/components';
import * as React from 'react';

interface PasswordResetEmailProps {
  resetLink: string;
}

export default function PasswordResetEmail({ resetLink }: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Setze dein Mahalle-Passwort zurück</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1}>Passwort zurücksetzen</Heading>
          <Text style={text}>
            Du hast angefragt, dein Passwort zurückzusetzen. Klick den Button —
            der Link ist 30 Minuten gültig und nur einmal verwendbar.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={resetLink} style={button}>Neues Passwort setzen</Button>
          </Section>
          <Text style={muted}>
            Wenn du das nicht warst, kannst du diese E-Mail ignorieren — dein
            Passwort bleibt unverändert.
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
const muted = { color: '#7a7264', fontSize: '12px', lineHeight: '1.5', margin: '8px 0 0' };
const button = { backgroundColor: '#1b1a17', color: '#f3ead8', fontSize: '15px', fontWeight: 700, padding: '12px 22px', borderRadius: '999px', textDecoration: 'none' };
const hr = { borderColor: '#c9bea3', margin: '20px 0' };
```

- [ ] **Step 2: Create `src/lib/auth/sendResetEmail.ts`**

```ts
// src/lib/auth/sendResetEmail.ts — SERVER-ONLY.
// Sends the reset email via Resend when configured; otherwise logs the link to
// the server console (dev-log fallback) so the flow is testable without a key.
import React from 'react';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import PasswordResetEmail from '../../emails/PasswordResetEmail';

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || '';
const SENDING_FROM = import.meta.env.SENDING_FROM_EMAIL || 'Mahalle <noreply@mahalle.berlin>';

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  if (!RESEND_API_KEY) {
    // Dev-log fallback: no key → don't send, print the link so dev can test.
    console.log(`[forgot-password] (dev) reset link for ${to}: ${resetLink}`);
    return;
  }
  const html = await render(React.createElement(PasswordResetEmail, { resetLink }));
  const resend = new Resend(RESEND_API_KEY);
  await resend.emails.send({
    from: SENDING_FROM,
    to,
    subject: 'Mahalle — Passwort zurücksetzen',
    html,
  });
}
```

- [ ] **Step 3: Type-check + build**

Run: `pnpm type-check 2>&1 | grep -E "PasswordResetEmail|sendResetEmail"` → Expected: no output.
Run: `pnpm build 2>&1 | tail -2` → Expected: build completes (confirms the react-email template + Resend import compile).

- [ ] **Step 4: Commit**

```bash
git add src/emails/PasswordResetEmail.tsx src/lib/auth/sendResetEmail.ts
git commit -m "feat(auth): password-reset email template + dev-log send helper"
```

---

### Task 4: `POST /api/auth/forgot-password`

**Files:**
- Create: `src/pages/api/auth/forgot-password.ts`

**Interfaces:**
- Consumes: `PasswordResetSchema` (existing, `{ email }`); `createPasswordResetToken` (Task 2); `sendPasswordResetEmail` (Task 3); `connectDB`.
- Produces: POST endpoint — body `{ email }` → ALWAYS `200 { ok: true }` (anti-enum). On a real user, issues a token + sends/logs the link.

- [ ] **Step 1: Create `src/pages/api/auth/forgot-password.ts`**

```ts
import type { APIRoute } from 'astro';
import { connectDB } from '../../../lib/mongodb';
import { PasswordResetSchema } from '../../../schemas/auth.schema';
import { createPasswordResetToken } from '../../../lib/auth/passwordReset';
import { sendPasswordResetEmail } from '../../../lib/auth/sendResetEmail';

// Anti-enumeration: this endpoint ALWAYS returns the same generic 200 — it never
// reveals whether an account exists for the given email.
export const POST: APIRoute = async ({ request }) => {
  const generic = () =>
    new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = PasswordResetSchema.safeParse(body);
    // Even a malformed email returns the generic response (no enumeration / probing signal).
    if (!parsed.success) return generic();

    const email = parsed.data.email;
    const db = await connectDB();
    const user = await db.collection('users').findOne({ email });

    if (user) {
      const rawToken = await createPasswordResetToken(user._id.toString());
      if (rawToken) {
        const origin = new URL(request.url).origin;
        const link = `${origin}/reset-password?token=${rawToken}`;
        await sendPasswordResetEmail(email, link);
      }
      // rawToken === null → resend guard hit; silently succeed (still generic).
    }

    return generic();
  } catch (err) {
    console.error('forgot-password error:', err);
    // Still generic on internal error — don't leak anything.
    return generic();
  }
};
```

- [ ] **Step 2: Type-check + build**

Run: `pnpm type-check 2>&1 | grep "forgot-password"` → Expected: no output.
Run: `pnpm build 2>&1 | tail -2` → Expected: build completes.

- [ ] **Step 3: Live-verify anti-enumeration + dev-log (dev server on :3000)**

Precheck: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login` → if `000`, ask the user to start `pnpm dev`. Note the `pnpm dev` background output file path (the dev-log line prints there).

```bash
# unknown email → generic 200, no token created, no link logged
curl -s -o /dev/null -w "unknown: %{http_code}\n" -X POST http://localhost:3000/api/auth/forgot-password \
  -H 'Content-Type: application/json' -d '{"email":"nobody-xyz@example.invalid"}'
# known email (use an existing account) → generic 200 + a dev-log link appears in server stdout
curl -s -o /dev/null -w "known: %{http_code}\n" -X POST http://localhost:3000/api/auth/forgot-password \
  -H 'Content-Type: application/json' -d '{"email":"known-user@example.invalid"}'
```
Expected: both print `200`. In the dev server stdout (the `pnpm dev` output file), a line `[forgot-password] (dev) reset link for known-user@example.invalid: http://localhost:3000/reset-password?token=…` appears for the KNOWN email only, and NOT for the unknown one. Grep the dev output file to confirm:
`grep "reset link for" <pnpm-dev-output-file>` → one match (the known email).

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/auth/forgot-password.ts
git commit -m "feat(auth): forgot-password endpoint (anti-enum, issues reset token)"
```

---

### Task 5: `POST /api/auth/reset-password`

**Files:**
- Create: `src/pages/api/auth/reset-password.ts`

**Interfaces:**
- Consumes: `ResetPasswordSchema` (Task 2); `resetPasswordWithToken` (Task 2).
- Produces: POST endpoint — body `{ token, password, confirmPassword }` → `200 { ok: true }` on success; `400 { error }` for validation failures (weak pw / mismatch) and a generic `400 { error: 'invalid_or_expired' }` for a bad/expired/used token.

- [ ] **Step 1: Create `src/pages/api/auth/reset-password.ts`**

```ts
import type { APIRoute } from 'astro';
import { ResetPasswordSchema } from '../../../schemas/auth.schema';
import { resetPasswordWithToken } from '../../../lib/auth/passwordReset';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = ResetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      const reason = fields.password ? 'weak_password' : fields.confirmPassword ? 'mismatch' : 'invalid_input';
      return new Response(JSON.stringify({ error: reason }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const ok = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    if (!ok) {
      // Generic — never reveal whether the token was unknown, expired, or already used.
      return new Response(JSON.stringify({ error: 'invalid_or_expired' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('reset-password error:', err);
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
```

- [ ] **Step 2: Type-check + build**

Run: `pnpm type-check 2>&1 | grep "reset-password"` → Expected: no output.
Run: `pnpm build 2>&1 | tail -2` → Expected: build completes.

- [ ] **Step 3: Live-verify (bad token + validation)**

```bash
# bad token → generic 400 invalid_or_expired
curl -s -w "\nbadtoken: %{http_code}\n" -X POST http://localhost:3000/api/auth/reset-password \
  -H 'Content-Type: application/json' -d '{"token":"deadbeef","password":"example-pw-123456","confirmPassword":"example-pw-123456"}'
# weak password → 400 weak_password
curl -s -w "\nweak: %{http_code}\n" -X POST http://localhost:3000/api/auth/reset-password \
  -H 'Content-Type: application/json' -d '{"token":"deadbeef","password":"abc","confirmPassword":"abc"}'
# mismatch → 400 mismatch
curl -s -w "\nmismatch: %{http_code}\n" -X POST http://localhost:3000/api/auth/reset-password \
  -H 'Content-Type: application/json' -d '{"token":"deadbeef","password":"example-pw-123456","confirmPassword":"example-pw-654321"}'
```
Expected: `badtoken: 400` with `{"error":"invalid_or_expired"}`; `weak: 400` `weak_password`; `mismatch: 400` `mismatch`. (The happy path is verified end-to-end in Task 7 with a real temp account + a real token.)

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/auth/reset-password.ts
git commit -m "feat(auth): reset-password endpoint (atomic single-use consume)"
```

---

### Task 6: `/forgot-password` page + request island

**Files:**
- Create: `src/components/auth/kiosk/AuthForgotInner.svelte`
- Create: `src/pages/forgot-password.astro`

**Interfaces:**
- Consumes: `AuthField`, `AuthPrimaryBtn`, `AuthBanner` (Phase 1 primitives); `t` store; `PasswordResetSchema`; `POST /api/auth/forgot-password`.
- Produces: `/forgot-password` page — request form → "sent" confirmation (anti-enum identical for any email). The Phase-1 login page already links here.

- [ ] **Step 1: Create `AuthForgotInner.svelte`**

```svelte
<script lang="ts">
  import { t } from '../../../lib/kiosk-i18n';
  import { PasswordResetSchema } from '../../../schemas/auth.schema';
  import AuthField from './primitives/AuthField.svelte';
  import AuthPrimaryBtn from './primitives/AuthPrimaryBtn.svelte';

  let email = $state('');
  let emailErr = $state<string | null>(null);
  let stage = $state<'request' | 'sent'>('request');
  let loading = $state(false);

  async function submit(e: Event) {
    e.preventDefault();
    emailErr = null;
    const parsed = PasswordResetSchema.safeParse({ email });
    if (!parsed.success) { emailErr = $t['auth.err.emailInvalid']; return; }
    loading = true;
    try {
      // Anti-enum: response is always generic 200; we advance to "sent" regardless.
      await fetch('/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: parsed.data.email }),
      });
    } catch { /* still show sent — never reveal anything */ }
    loading = false;
    stage = 'sent';
  }
</script>

<div class="auth-card">
  {#if stage === 'request'}
    <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-accent); font-weight:600;">{$t['auth.forgot.eyebrow']}</div>
    <h1 class="font-bricolage" style="font-weight:800; font-size:34px; letter-spacing:-0.035em; line-height:1.05; margin:8px 0 0; color:var(--k-ink);">
      {$t['auth.forgot.title.a']}<span class="font-instrument" style="font-style:italic; font-weight:400; color:var(--k-accent);">{$t['auth.forgot.title.accent']}</span>{$t['auth.forgot.title.b']}
    </h1>
    <p class="font-instrument" style="font-style:italic; font-size:15px; color:var(--k-ink-soft); margin:10px 0 20px;">{$t['auth.forgot.sub']}</p>
    <form onsubmit={submit} style="display:flex; flex-direction:column; gap:16px;">
      <AuthField label={$t['auth.forgot.email']} placeholder={$t['auth.forgot.emailPh']}
        type="email" name="email" autocomplete="email" value={email} error={emailErr}
        oninput={(v) => (email = v)} />
      <AuthPrimaryBtn loading={loading}>{loading ? $t['auth.forgot.ctaLoading'] : $t['auth.forgot.cta']}</AuthPrimaryBtn>
    </form>
    <div style="text-align:center; margin-top:16px;">
      <a href="/login" class="font-dmmono no-underline" style="font-size:11px; color:var(--k-ink-soft); border-bottom:1px dashed var(--k-ink-mute);">{$t['auth.forgot.back']}</a>
    </div>
  {:else}
    <div class="flex justify-center" style="margin-bottom:16px;">
      <div class="flex items-center justify-center" style="width:60px; height:60px; border-radius:50%; background:var(--k-accent); border:2px solid var(--k-ink); box-shadow:3px 3px 0 var(--k-ink); font-size:26px; transform:rotate(-4deg);">✉</div>
    </div>
    <div style="text-align:center;">
      <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-accent); font-weight:600;">{$t['auth.forgot.eyebrow']}</div>
      <h1 class="font-bricolage" style="font-weight:800; font-size:30px; letter-spacing:-0.03em; line-height:1.05; margin:8px 0 10px; color:var(--k-ink);">
        {$t['auth.forgot.sentTitle.a']}<span class="font-instrument" style="font-style:italic; font-weight:400; color:var(--k-accent);">{$t['auth.forgot.sentTitle.accent']}</span>{$t['auth.forgot.sentTitle.b']}
      </h1>
      <p class="font-bricolage" style="font-size:13.5px; color:var(--k-ink-soft); margin:0 0 4px;">{$t['auth.forgot.sentSub']}</p>
      <div class="font-dmmono" style="font-size:13px; font-weight:600; color:var(--k-ink); padding:5px 0;">{email}</div>
      <p class="font-bricolage" style="font-size:12.5px; color:var(--k-ink-soft); line-height:1.5; max-width:330px; margin:8px auto 0;">{$t['auth.forgot.sentBody']}</p>
    </div>
    <div style="text-align:center; margin-top:20px;">
      <a href="/login" class="font-dmmono no-underline" style="font-size:11px; color:var(--k-ink-soft); border-bottom:1px dashed var(--k-ink-mute);">{$t['auth.forgot.back']}</a>
    </div>
  {/if}
</div>

<style>
  .auth-card {
    background: var(--k-paper-warm);
    border: 1.5px solid var(--k-ink);
    border-top: 4px solid var(--k-accent);
    border-radius: 22px;
    box-shadow: 3px 3px 0 var(--k-ink);
    padding: 30px;
  }
</style>
```

NOTE: `auth.err.emailInvalid` already exists (Phase 1). The "resend" button from the design is intentionally omitted in v1 (the back-to-login link suffices; re-requesting just means revisiting the form) — keeps the island simple. Flag if the design owner wants the resend button.

- [ ] **Step 2: Create `src/pages/forgot-password.astro`**

```astro
---
import AuthLayout from '../layouts/AuthLayout.astro';
import AuthForgotInner from '../components/auth/kiosk/AuthForgotInner.svelte';
---

<AuthLayout title="Passwort zurücksetzen">
  <AuthForgotInner client:only="svelte" />
</AuthLayout>
```

- [ ] **Step 3: Type-check + build**

Run: `pnpm type-check 2>&1 | grep -E "AuthForgotInner|forgot-password.astro"` → Expected: no output.
Run: `pnpm build 2>&1 | tail -2` → Expected: build completes.

- [ ] **Step 4: Live-verify**

```bash
playwright-cli open "http://localhost:3000/forgot-password"
playwright-cli run-code "page.waitForSelector('input[name=email]', { timeout: 12000 })"
playwright-cli console
playwright-cli fill "input[name=email]" "known-user@example.invalid"
playwright-cli click "button[type=submit]"
playwright-cli run-code "page.waitForTimeout(1200)"
playwright-cli snapshot
playwright-cli close
```
Expected: page renders the kiosk request card (ochre "PASSWORT ZURÜCKSETZEN" eyebrow, email field, "Link senden", back link), 0 console errors; after submit it swaps to the "Link ist unterwegs" sent confirmation showing the email + 30-min note. (Submitting an unknown email shows the identical sent confirmation — anti-enum.)

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/kiosk/AuthForgotInner.svelte src/pages/forgot-password.astro
git commit -m "feat(auth): forgot-password request page (kiosk island)"
```

---

### Task 7: `/reset-password` page + reset island (end-to-end)

**Files:**
- Create: `src/components/auth/kiosk/AuthResetInner.svelte`
- Create: `src/pages/reset-password.astro`

**Interfaces:**
- Consumes: `findValidResetToken` (Task 2, SSR check); `AuthField`, `AuthPrimaryBtn`, `AuthStrength`, `AuthBanner`; `ResetPasswordSchema`; `POST /api/auth/reset-password`.
- Produces: `/reset-password?token=…` — SSR validates the token; if invalid/expired, renders an "invalid link" card; if valid, mounts the set-new-password island (reset → done).

- [ ] **Step 1: Create `AuthResetInner.svelte`**

```svelte
<script lang="ts">
  import { t } from '../../../lib/kiosk-i18n';
  import { ResetPasswordSchema } from '../../../schemas/auth.schema';
  import AuthField from './primitives/AuthField.svelte';
  import AuthPrimaryBtn from './primitives/AuthPrimaryBtn.svelte';
  import AuthStrength from './primitives/AuthStrength.svelte';
  import AuthBanner from './primitives/AuthBanner.svelte';

  let { token }: { token: string } = $props();

  let password = $state('');
  let password2 = $state('');
  let pwErr = $state<string | null>(null);
  let pw2Err = $state<string | null>(null);
  let formErr = $state<string | null>(null);
  let stage = $state<'reset' | 'done'>('reset');
  let loading = $state(false);

  function scorePw(pw: string): 0 | 1 | 2 | 3 | 4 {
    if (pw.length < 8) return pw.length === 0 ? 0 : 1;
    let c = 0;
    if (/[a-z]/.test(pw)) c++;
    if (/[A-Z]/.test(pw)) c++;
    if (/\d/.test(pw)) c++;
    if (/[^A-Za-z0-9]/.test(pw)) c++;
    if (c <= 1) return 1; if (c === 2) return 2; if (c === 3) return 3; return 4;
  }
  const pwScore = $derived(scorePw(password));
  const pwOk = $derived(password.length >= 8 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password));

  async function submit(e: Event) {
    e.preventDefault();
    pwErr = null; pw2Err = null; formErr = null;
    let bad = false;
    if (!pwOk) { pwErr = $t['auth.err.pwWeak']; bad = true; }
    if (password2 !== password || !password2) { pw2Err = $t['auth.err.mismatch']; bad = true; }
    if (bad) return;

    const parsed = ResetPasswordSchema.safeParse({ token, password, confirmPassword: password2 });
    if (!parsed.success) { formErr = $t['auth.err.generic']; return; }

    loading = true;
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) { formErr = $t['auth.err.resetFailed']; loading = false; return; }
      stage = 'done';
    } catch {
      formErr = $t['auth.err.generic'];
    }
    loading = false;
  }
</script>

<div class="auth-card">
  {#if stage === 'reset'}
    <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-accent); font-weight:600;">{$t['auth.reset.eyebrow']}</div>
    <h1 class="font-bricolage" style="font-weight:800; font-size:34px; letter-spacing:-0.035em; line-height:1.05; margin:8px 0 14px; color:var(--k-ink);">
      {$t['auth.reset.title.a']}<span class="font-instrument" style="font-style:italic; font-weight:400; color:var(--k-accent);">{$t['auth.reset.title.accent']}</span>{$t['auth.reset.title.b']}
    </h1>
    {#if formErr}<AuthBanner kind="danger" title={formErr} />{/if}
    <form onsubmit={submit} style="display:flex; flex-direction:column; gap:16px; margin-top:6px;">
      <div>
        <AuthField label={$t['auth.reset.pw']} placeholder={$t['auth.reset.pwPh']}
          type="password" name="password" autocomplete="new-password" value={password}
          error={pwErr} showToggle oninput={(v) => (password = v)} />
        {#if password}<AuthStrength score={pwScore} />{/if}
      </div>
      <AuthField label={$t['auth.reset.pw2']} placeholder={$t['auth.reset.pwPh']}
        type="password" name="password2" autocomplete="new-password" value={password2}
        error={pw2Err} success={!!password2 && password2 === password} oninput={(v) => (password2 = v)} />
      <AuthPrimaryBtn loading={loading}>{loading ? $t['auth.reset.ctaLoading'] : $t['auth.reset.cta']}</AuthPrimaryBtn>
    </form>
  {:else}
    <div style="text-align:center;">
      <div class="flex justify-center" style="margin-bottom:16px;">
        <div class="flex items-center justify-center" style="width:64px; height:64px; border-radius:50%; background:var(--k-success); border:2px solid var(--k-ink); box-shadow:3px 3px 0 var(--k-ink); color:var(--k-paper); font-size:30px; transform:rotate(-4deg);">✓</div>
      </div>
      <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-success); font-weight:600;">{$t['auth.reset.doneEyebrow']}</div>
      <h1 class="font-bricolage" style="font-weight:800; font-size:30px; letter-spacing:-0.03em; line-height:1.05; margin:8px 0 8px; color:var(--k-ink);">
        {$t['auth.reset.doneTitle.a']}<span class="font-instrument" style="font-style:italic; font-weight:400; color:var(--k-accent);">{$t['auth.reset.doneTitle.accent']}</span>{$t['auth.reset.doneTitle.b']}
      </h1>
      <p class="font-instrument" style="font-style:italic; font-size:15px; color:var(--k-ink-soft); margin:0 0 22px;">{$t['auth.reset.doneSub']}</p>
      <a href="/login" class="no-underline"><AuthPrimaryBtn type="button">{$t['auth.reset.doneCta']}</AuthPrimaryBtn></a>
    </div>
  {/if}
</div>

<style>
  .auth-card {
    background: var(--k-paper-warm);
    border: 1.5px solid var(--k-ink);
    border-top: 4px solid var(--k-accent);
    border-radius: 22px;
    box-shadow: 3px 3px 0 var(--k-ink);
    padding: 30px;
  }
</style>
```

- [ ] **Step 2: Create `src/pages/reset-password.astro`** (SSR token-validity check)

```astro
---
import AuthLayout from '../layouts/AuthLayout.astro';
import AuthResetInner from '../components/auth/kiosk/AuthResetInner.svelte';
import { findValidResetToken } from '../lib/auth/passwordReset';

const token = new URL(Astro.request.url).searchParams.get('token') ?? '';
// Validate the token server-side (read-only; does NOT consume it) so an
// invalid/expired link shows the "invalid" state instead of a dead form.
const valid = token ? (await findValidResetToken(token)) !== null : false;

Astro.response.headers.set('Cache-Control', 'no-store, must-revalidate');
---

<AuthLayout title="Neues Passwort">
  {valid ? (
    <AuthResetInner client:only="svelte" token={token} />
  ) : (
    <div style="background:var(--k-paper-warm); border:1.5px solid var(--k-ink); border-top:4px solid var(--k-danger); border-radius:22px; box-shadow:3px 3px 0 var(--k-ink); padding:30px; text-align:center;">
      <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-danger); font-weight:600;">RESET</div>
      <h1 class="font-bricolage" style="font-weight:800; font-size:26px; letter-spacing:-0.03em; line-height:1.1; margin:8px 0 10px; color:var(--k-ink);">Link ungültig oder abgelaufen</h1>
      <p class="font-instrument" style="font-style:italic; font-size:15px; color:var(--k-ink-soft); margin:0 0 20px;">Dieser Zurücksetz-Link ist nicht mehr gültig. Fordere einen neuen an.</p>
      <a href="/forgot-password" class="no-underline font-bricolage" style="display:inline-block; background:var(--k-ink); color:var(--k-paper); font-weight:700; font-size:15px; padding:13px 22px; border-radius:999px; border:1.5px solid var(--k-ink); box-shadow:3px 3px 0 var(--k-accent);">Neuen Link anfordern</a>
    </div>
  )}
</AuthLayout>
```

NOTE: the invalid-link card uses hardcoded German copy (it's SSR, pre-hydration — the kiosk `$t` store is client-only). This mirrors the splash's pre-hydration copy decision; acceptable for an error fallback. (The valid path's island is fully DE/EN via `$t`.)

- [ ] **Step 3: Type-check + build**

Run: `pnpm type-check 2>&1 | grep -E "AuthResetInner|reset-password.astro"` → Expected: no output.
Run: `pnpm build 2>&1 | tail -2` → Expected: build completes.

- [ ] **Step 4: End-to-end live verification with a TEMP account (auto-cleanup)**

This exercises the whole chain with a throwaway account, then deletes it. Run from the project root.

1. Create a temp user via the real register endpoint:
```bash
TMP="reset-e2e-$(date +%s)@example.invalid"
curl -s -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' \
  -d "{\"name\":\"Reset E2E\",\"email\":\"$TMP\",\"password\":\"OldPass123\"}" -o /dev/null -w "register: %{http_code}\n"
echo "TMP=$TMP"
```
Expected: `register: 201`.

2. Request a reset + grab the dev-logged link from the dev server stdout (replace `<DEVOUT>` with the `pnpm dev` background output file path):
```bash
curl -s -X POST http://localhost:3000/api/auth/forgot-password -H 'Content-Type: application/json' -d "{\"email\":\"$TMP\"}" -o /dev/null -w "forgot: %{http_code}\n"
sleep 1
LINK=$(grep "reset link for $TMP" <DEVOUT> | tail -1 | grep -oE 'http://localhost:3000/reset-password\?token=[a-f0-9]+')
echo "LINK=$LINK"; TOKEN=$(echo "$LINK" | grep -oE 'token=[a-f0-9]+' | cut -d= -f2)
```
Expected: `forgot: 200`, `LINK=http://localhost:3000/reset-password?token=…`.

3. Reset-page SSR shows the form for a valid token (and the invalid card for a junk token):
```bash
curl -s "$LINK" | grep -c "NEUES PASSWORT\|new-password\|reset" ; curl -s "http://localhost:3000/reset-password?token=deadbeef" | grep -c "ungültig oder abgelaufen"
```
Expected: first `>=1` (form present), second `1` (invalid card).

4. Consume the token (set new password) + verify single-use:
```bash
curl -s -w "\nreset1: %{http_code}\n" -X POST http://localhost:3000/api/auth/reset-password -H 'Content-Type: application/json' \
  -d "{\"token\":\"$TOKEN\",\"password\":\"NewPass456\",\"confirmPassword\":\"NewPass456\"}"
curl -s -w "\nreset2(reuse): %{http_code}\n" -X POST http://localhost:3000/api/auth/reset-password -H 'Content-Type: application/json' \
  -d "{\"token\":\"$TOKEN\",\"password\":\"NewPass456\",\"confirmPassword\":\"NewPass456\"}"
```
Expected: `reset1: 200`; `reset2(reuse): 400` `invalid_or_expired` (single-use enforced).

5. Confirm the password actually changed — playwright login with the NEW password:
```bash
playwright-cli open "http://localhost:3000/login"
playwright-cli run-code "page.waitForSelector('input[name=email]', { timeout: 12000 })"
playwright-cli fill "input[name=email]" "$TMP"
playwright-cli fill "input[name=password]" "NewPass456"
playwright-cli click "button[type=submit]"
playwright-cli run-code "page.waitForTimeout(1800)"
playwright-cli eval "() => location.pathname"
playwright-cli close
```
Expected: redirected to `/` (login succeeded with the new password).

6. Cleanup the temp user + its tokens (root-dir node script, then delete it):
```bash
cat > ./.cleanup-reset-e2e.mjs <<'EOF'
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
const env = Object.fromEntries(readFileSync('.env','utf8').split('\n').filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')];}));
const TMP = process.argv[2];
const c = new MongoClient(env.MONGODB_URI); await c.connect();
const db = c.db();
const u = await db.collection('users').findOne({ email: TMP });
if (u) { await db.collection('passwordResetTokens').deleteMany({ userId: u._id }); await db.collection('users').deleteOne({ _id: u._id }); }
console.log('cleaned up', TMP, !!u);
await c.close();
EOF
node ./.cleanup-reset-e2e.mjs "$TMP"; rm -f ./.cleanup-reset-e2e.mjs
```
Expected: `cleaned up reset-e2e-… true`. Confirm no `reset-e2e-` users remain.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/kiosk/AuthResetInner.svelte src/pages/reset-password.astro
git commit -m "feat(auth): reset-password page (SSR token check + set-new-password)"
```

---

### Task 8: Docs

**Files:**
- Modify: `src/components/auth/kiosk/CLAUDE.md`
- Modify: root `CLAUDE.md`

- [ ] **Step 1: Append a forgot-password section to `src/components/auth/kiosk/CLAUDE.md`** (before "Phase 1 scope / deferred")

```markdown
## Forgot / reset password (shipped, 2026-06-27)

Net-new secure backend, kiosk front-end. Reuses the existing Resend + `src/emails/`
react-email pattern.

- **Token lib** `src/lib/auth/passwordReset.ts` (SERVER-ONLY): `createPasswordResetToken`
  (single-use, 30-min, latest-wins + 60s resend guard, returns RAW token),
  `findValidResetToken` (read-only, for the SSR page check), `resetPasswordWithToken`
  (atomic `findOneAndUpdate` claim → bcrypt-12 rewrite of `users.password`). Tokens are
  stored ONLY as `sha256(raw)` in the new **`passwordResetTokens`** collection
  (`{ tokenHash, userId, expiresAt, usedAt, createdAt }`); the raw token lives only in
  the emailed link.
- **Email** `src/lib/auth/sendResetEmail.ts` + `src/emails/PasswordResetEmail.tsx`.
  Dev-log fallback: when `RESEND_API_KEY` is empty it `console.log`s the link instead of
  sending (so the flow is testable in dev) — read the dev server stdout to get the link.
- **Endpoints**: `POST /api/auth/forgot-password` (ALWAYS generic 200 — anti-enumeration;
  issues token + sends/logs link for real users only); `POST /api/auth/reset-password`
  (`ResetPasswordSchema` validation; generic `invalid_or_expired` for bad/expired/used
  tokens). Does NOT touch `emailVerified` (that's the verify plan).
- **Pages**: `/forgot-password` (`AuthForgotInner` request→sent, anti-enum identical
  confirm) and `/reset-password?token=…` (`reset-password.astro` SSR-validates the token
  → `AuthResetInner` reset→done, or a hardcoded-DE "invalid link" card). The Phase-1 login
  "Passwort vergessen?" link now resolves.
```

- [ ] **Step 2: Note the new collection in root `CLAUDE.md`**

In the "## Database Collections" list, add:

```markdown
- `passwordResetTokens` - Single-use password-reset tokens (`{ tokenHash (sha256 of raw), userId, expiresAt, usedAt, createdAt }`); raw token only in the emailed link. 30-min TTL, atomic single-use consume. See `src/lib/auth/passwordReset.ts`.
```

- [ ] **Step 3: Build sanity + commit**

Run: `pnpm build 2>&1 | tail -2` → Expected: build completes.
```bash
git add src/components/auth/kiosk/CLAUDE.md CLAUDE.md
git commit -m "docs(auth): document forgot/reset password flow + tokens collection"
```

---

## Self-review

**Spec coverage (AUTH_SCOPING forgot-password + design 4 stages):**
- Request stage (01) → Task 6 ✓; Sent stage (02), anti-enum identical confirm → Task 6 + Task 4 ✓; Reset stage (03) → Task 7 ✓; Done stage (04) → Task 7 ✓.
- Single-use, 30-min, bound-to-user token → Task 2 (`createPasswordResetToken` + atomic consume) ✓.
- Token stored hashed (sha256), raw only in link → Task 2 ✓.
- Anti-enumeration on request (always generic 200) → Task 4 ✓; generic error on bad token → Task 5 ✓.
- Email via Resend + dev-log fallback (locked decision) → Task 3 ✓.
- Password rule = RegisterSchema's; confirm match → Task 2 (`ResetPasswordSchema`) + Tasks 5/7 ✓.
- Resend guard (light abuse limit, not the full login rate-limiter) → Task 2 ✓.
- No change to `auth.config.ts`; `emailVerified` untouched → Global Constraints + Tasks 5/2 ✓.

**Placeholder scan:** every code step has complete code (lib, schema, endpoints, email template, both pages, both islands, i18n blocks). Verification uses real commands with expected output. No TBD/"add validation"/"similar to".

**Type consistency:** `createPasswordResetToken(userId): Promise<string|null>`, `findValidResetToken(rawToken): Promise<string|null>`, `resetPasswordWithToken(rawToken,newPassword): Promise<boolean>` — names + signatures match across Tasks 2/4/5/7. `ResetPasswordSchema` fields `{token,password,confirmPassword}` match the reset endpoint body and the island's POST. `AuthResetInner` consumes `token` prop, passed by `reset-password.astro`. i18n keys referenced in Tasks 6/7 are all defined in Task 1 (and the pre-existing `auth.err.emailInvalid`/`pwWeak`/`mismatch`/`generic` are reused, not redefined). Primitives (`AuthField`/`AuthPrimaryBtn`/`AuthStrength`/`AuthBanner`) are the Phase-1 components with matching prop contracts.

**Known intentional scope notes (flag at audit):** the design's "resend" button on the sent stage is omitted in v1 (back-to-login covers it). The invalid-reset-link card is hardcoded German (SSR pre-hydration, like the splash). `emailVerified` is deliberately not flipped on reset (kept for the verify plan). Login rate-limit (state 05) is out of scope — only the light per-user 60s resend guard is included.
