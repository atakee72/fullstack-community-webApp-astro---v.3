# Auth Email-Verify (Soft Gate) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New signups get a 24h single-use email-verification link; a `/verify-email` kiosk page handles sent/resent/confirmed/invalid states; unverified logged-in users see a dismissible resend banner on all kiosk pages. Verification is a SOFT gate — login and every feature keep working unverified.

**Architecture:** Mirrors the shipped forgot-password stack 1:1 — a server-only token lib (`emailVerifyTokens` collection, sha256-at-rest, atomic single-use claim), a react-email template + Resend sender with dev-log fallback, thin API endpoints, and a kiosk Svelte island on an SSR-validating Astro page. Plus the "full nag scope": `emailVerified` propagates through the `authorize → jwt → session` chain (like `role`), and a `VerifyEmailBanner` in `KioskLayout` live-checks the DB to defeat stale JWTs.

**Tech Stack:** Astro 5 (SSR pages + API routes), Svelte 5 runes islands, MongoDB 6 direct driver, auth-astro/NextAuth (JWT strategy), Resend + `@react-email/render`, kiosk design tokens (`--k-*`), `kiosk-i18n` DE/EN store.

## Global Constraints

- **Locked decisions:** SOFT gate (nag, never block login/features) · post-register lands on `/verify-email` after auto-login · full nag scope (session flag + in-app banner) · verify-link TTL **24 hours** · dev-log link fallback when `RESEND_API_KEY` is empty.
- **Token security:** store ONLY `sha256(rawToken)` at rest; raw token exists solely in the emailed link. Single-use via atomic `findOneAndUpdate` claim. Never log the raw token in production paths (the dev-log fallback is dev-only by definition of the missing key).
- **Emailed links** are built from trusted `NEXTAUTH_URL` only — FAIL CLOSED in prod if unset (CWE-640); request-origin fallback in dev only.
- **Existing users unaffected:** existing `emailVerified: false` users get NO email blast; they only see the banner (dismissible) and can resend themselves.
- **No new dependencies.** Everything needed (resend, @react-email/*, mongodb, bcrypt) is already installed.
- **No unit-test runner in this repo.** Verification gates per task: `pnpm type-check` (baseline: pre-existing benign `Dict = typeof de` TS2322 lines in kiosk-i18n.ts + pre-existing node_modules/Navbar/sync-stats errors — no NEW errors allowed), `curl` against the dev server on `:3000`, throwaway Node smoke scripts (TEMP users/rows only, self-cleaning, deleted before commit; live in the scratchpad dir, never in the repo).
- **Commits:** simple concise messages, NO "Generated with Claude Code" signature, NO Co-Authored-By footer. Never `--no-verify` (gitleaks pre-commit must run).
- **Copy:** German is the primary language; every new UI string gets a DE + EN key in `src/lib/kiosk-i18n.ts`. Auth accent stays ochre (`[data-page="auth"]` → `--k-accent`).
- **Design source:** `design/handoffs/design_handoff_auth/jsx/kiosk-auth.jsx` `AuthVerifyBody` (states 11–13). Intentional deviations: TTL copy says **24 Std.** (not the mock's 30 min — TTL decision is 24h); the mock's "E-Mail ändern" button is DROPPED (email-change is a separate unbuilt feature — YAGNI); the drawn envelope is simplified to the proven ✉ badge from `AuthForgotInner`'s sent state.
- **DB:** new collection `emailVerifyTokens` `{ tokenHash, userId, expiresAt, usedAt, createdAt }`. `users.emailVerified` stays a **boolean** (register.ts already writes `false`); verification flips it to `true`.

---

### Task 1: i18n keys (DE + EN)

**Files:**
- Modify: `src/lib/kiosk-i18n.ts` (DE block ends at `'auth.heartbeat.air': 'Luft'` ~line 1098; EN block ends at `'auth.heartbeat.air': 'air'` ~line 2059)

**Interfaces:**
- Produces: the exact key names below, consumed by Tasks 5 and 8 via `$t['auth.verify.…']` / `$t['auth.banner.…']`. Key names must match character-for-character.

- [ ] **Step 1: Add the DE keys**

In `src/lib/kiosk-i18n.ts`, find the END of the `de` object (the `// ── Auth (Phase 2: heartbeat) ──` block). Change the last line `'auth.heartbeat.air': 'Luft'` to add a trailing comma, then insert BEFORE the closing `} as const;`:

```ts
  'auth.heartbeat.air': 'Luft',

  // ── Auth (Phase 2: email-verify) ──
  'auth.verify.eyebrow': 'FAST GESCHAFFT',
  'auth.verify.title.a': 'Schau in dein ',
  'auth.verify.title.accent': 'Postfach',
  'auth.verify.title.b': '.',
  'auth.verify.sub': 'Wir haben einen Bestätigungslink geschickt an',
  'auth.verify.body': 'Klick den Link in der Mail, um dein Konto zu aktivieren. Kein Brief da? Prüf den Spam-Ordner.',
  'auth.verify.resend': 'Link erneut senden',
  'auth.verify.resendLoading': 'sende …',
  'auth.verify.resentNote': 'Neuer Link verschickt — gültig für 24 Std.',
  'auth.verify.throttled': 'Gerade erst gesendet — warte kurz und versuch es dann nochmal.',
  'auth.verify.back': '← zurück zur Anmeldung',
  'auth.verify.confirming': 'Bestätige …',
  'auth.verify.confirmedEyebrow': 'KONTO AKTIV',
  'auth.verify.confirmedTitle': 'Bestätigt — willkommen im Kiez.',
  'auth.verify.confirmedBody': 'Dein Konto ist aktiv. Du wirst weitergeleitet …',
  'auth.verify.invalidEyebrow': 'LINK ABGELAUFEN',
  'auth.verify.invalidTitle': 'Link ungültig oder abgelaufen',
  'auth.verify.invalidBody': 'Dieser Bestätigungslink ist nicht mehr gültig. Fordere einen neuen an.',
  'auth.verify.invalidLoginCta': 'Zur Anmeldung',
  'auth.banner.verifyTitle': 'Bestätige deine E-Mail-Adresse.',
  'auth.banner.verifyBody': 'Wir haben dir einen Link geschickt — schau in dein Postfach.',
  'auth.banner.verifyResend': 'Link erneut senden',
  'auth.banner.verifySent': 'Link verschickt ✓',
  'auth.banner.verifyDismiss': 'Ausblenden'
```

- [ ] **Step 2: Add the EN keys**

Same operation at the END of the `en` object: add a trailing comma to `'auth.heartbeat.air': 'air'`, then insert before the closing `};`:

```ts
  'auth.heartbeat.air': 'air',

  // ── Auth (Phase 2: email-verify) ──
  'auth.verify.eyebrow': 'ALMOST THERE',
  'auth.verify.title.a': 'Check your ',
  'auth.verify.title.accent': 'inbox',
  'auth.verify.title.b': '.',
  'auth.verify.sub': 'We sent a confirmation link to',
  'auth.verify.body': 'Click the link in the email to activate your account. No mail? Check your spam folder.',
  'auth.verify.resend': 'Resend link',
  'auth.verify.resendLoading': 'sending …',
  'auth.verify.resentNote': 'New link sent — valid for 24 hrs.',
  'auth.verify.throttled': 'Just sent — wait a moment and try again.',
  'auth.verify.back': '← back to sign in',
  'auth.verify.confirming': 'Confirming …',
  'auth.verify.confirmedEyebrow': 'ACCOUNT ACTIVE',
  'auth.verify.confirmedTitle': 'Confirmed — welcome to the Kiez.',
  'auth.verify.confirmedBody': 'Your account is active. Redirecting you …',
  'auth.verify.invalidEyebrow': 'LINK EXPIRED',
  'auth.verify.invalidTitle': 'Link invalid or expired',
  'auth.verify.invalidBody': 'This confirmation link is no longer valid. Request a new one.',
  'auth.verify.invalidLoginCta': 'To sign in',
  'auth.banner.verifyTitle': 'Confirm your email address.',
  'auth.banner.verifyBody': 'We sent you a link — check your inbox.',
  'auth.banner.verifyResend': 'Resend link',
  'auth.banner.verifySent': 'Link sent ✓',
  'auth.banner.verifyDismiss': 'Dismiss'
```

- [ ] **Step 3: Verify**

Run: `pnpm type-check`
Expected: no NEW errors vs baseline (the `Dict = typeof de` TS2322 lines in kiosk-i18n.ts are pre-existing and benign — the `en` object must simply have the SAME keys as `de`, which Steps 1+2 guarantee).

Run: `grep -c "auth.verify\.\|auth.banner.verify" src/lib/kiosk-i18n.ts`
Expected: `48` (24 keys × 2 locales).

- [ ] **Step 4: Commit**

```bash
git add src/lib/kiosk-i18n.ts
git commit -m "feat(auth): add DE/EN i18n keys for email verification"
```

---

### Task 2: Trusted base-URL helper + email-verify token lib

**Files:**
- Create: `src/lib/auth/baseUrl.ts`
- Create: `src/lib/auth/emailVerify.ts`
- Modify: `src/pages/api/auth/forgot-password.ts:34-35` (refactor to use the new helper — behavior identical)

**Interfaces:**
- Consumes: `connectDB` from `src/lib/mongodb.ts` (returns a `Db`).
- Produces (Tasks 4, 6 rely on these exact signatures):
  - `getTrustedBaseUrl(request: Request): string` — trusted origin or `''` (prod fail-closed).
  - `createEmailVerifyToken(userId: string): Promise<string | null>` — RAW token, or `null` if the 60s resend guard hit.
  - `findValidVerifyToken(rawToken: string): Promise<string | null>` — owning userId or `null` (read-only, does NOT consume).
  - `verifyEmailWithToken(rawToken: string): Promise<boolean>` — atomically claims the token and sets `users.emailVerified: true`.

- [ ] **Step 1: Create `src/lib/auth/baseUrl.ts`**

```ts
// src/lib/auth/baseUrl.ts — SERVER-ONLY.
// Trusted absolute origin for links we EMAIL to users (password-reset, email-verify).
//
// SECURITY (CWE-640): never build emailed links from the request Host header —
// a poisoned Host would mail the victim a link pointing at an attacker domain
// (token leak → account takeover). The base comes from the configured
// NEXTAUTH_URL and FAILS CLOSED in production: if unset, this returns '' and
// the caller must SKIP sending rather than fall back to the untrusted Host.
// The request-origin fallback is allowed ONLY in dev.
export function getTrustedBaseUrl(request: Request): string {
  return (
    (import.meta.env.NEXTAUTH_URL || '').replace(/\/+$/, '') ||
    (import.meta.env.PROD ? '' : new URL(request.url).origin)
  );
}
```

- [ ] **Step 2: Refactor `forgot-password.ts` to use it**

In `src/pages/api/auth/forgot-password.ts`, add to the imports at the top:

```ts
import { getTrustedBaseUrl } from '../../../lib/auth/baseUrl';
```

Then replace the inline base computation (the big SECURITY comment block ending in the two-line `const base = …` expression, lines ~26–35) with:

```ts
        // SECURITY: trusted-base + prod fail-closed logic lives in
        // src/lib/auth/baseUrl.ts (CWE-640 — see comment there).
        const base = getTrustedBaseUrl(request);
```

Keep the `if (base) { … } else { console.error(…) }` block below it UNCHANGED — behavior is identical, the logic just moved to a shared helper.

- [ ] **Step 3: Create `src/lib/auth/emailVerify.ts`**

```ts
// src/lib/auth/emailVerify.ts
// SERVER-ONLY (mongodb + crypto). Never import from a client/.svelte file.
//
// Verify tokens are stored ONLY as sha256(rawToken) — the raw token lives solely
// in the emailed link. Single-use is enforced by an atomic findOneAndUpdate claim.
// Mirrors src/lib/auth/passwordReset.ts (same collection shape, longer TTL).
import { randomBytes, createHash } from 'crypto';
import { ObjectId } from 'mongodb';
import { connectDB } from '../mongodb';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (email-verify decision)
const RESEND_GUARD_MS = 60 * 1000;        // at most one new token per user per 60s

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Issue a single-use email-verify token for a user. Invalidates the user's prior
 * unused tokens (latest-wins). Returns the RAW token to embed in the link, or
 * null if a fresh unused token was issued <60s ago (resend guard).
 */
export async function createEmailVerifyToken(userId: string): Promise<string | null> {
  const db = await connectDB();
  const col = db.collection('emailVerifyTokens');
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
export async function findValidVerifyToken(rawToken: string): Promise<string | null> {
  if (!rawToken) return null;
  const db = await connectDB();
  const col = db.collection('emailVerifyTokens');
  const row = await col.findOne({
    tokenHash: hashToken(rawToken),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  return row ? String(row.userId) : null;
}

/**
 * Atomically claim the token (single-use) and set the user's emailVerified flag.
 * Returns true on success; false for invalid/expired/already-used tokens.
 */
export async function verifyEmailWithToken(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  const db = await connectDB();
  const tokens = db.collection('emailVerifyTokens');

  // Atomic claim: only succeeds if the token is still unused + unexpired.
  const claimed = await tokens.findOneAndUpdate(
    { tokenHash: hashToken(rawToken), usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } }
  );
  if (!claimed) return false;

  try {
    await db.collection('users').updateOne(
      { _id: claimed.userId as ObjectId },
      { $set: { emailVerified: true, updatedAt: new Date().toISOString() } }
    );
  } catch (err) {
    // The user write failed AFTER the token was claimed — roll the claim back
    // so the link stays usable and the user isn't stuck unverified.
    await tokens.updateOne({ _id: (claimed as any)._id }, { $set: { usedAt: null } })
      .catch((rollbackErr) => {
        console.error('verifyEmailWithToken: rollback ALSO failed — token may be permanently burnt:', rollbackErr);
      });
    console.error('verifyEmailWithToken: user write failed, rolled back claim:', err);
    return false;
  }

  // Flag is already flipped — clear any other unused tokens for this user.
  // Best-effort + POST-success: a failure here must NOT undo the verification.
  await tokens.deleteMany({ userId: claimed.userId, usedAt: null })
    .catch((cleanupErr) => {
      console.error('verifyEmailWithToken: sibling-token cleanup failed (verify still succeeded):', cleanupErr);
    });
  return true;
}
```

- [ ] **Step 4: Verify**

Run: `pnpm type-check`
Expected: no NEW errors vs baseline.

Run: `grep -rn "getTrustedBaseUrl\|new URL(request.url).origin" src/pages/api/auth/forgot-password.ts`
Expected: exactly one hit — the `getTrustedBaseUrl(request)` call. The inline `new URL(request.url).origin` expression must be GONE from this file.

(Runtime behavior of the lib is exercised end-to-end by the Task 4 HTTP smoke — no separate lib-level runtime test here, since the repo has no test runner and the functions are unreachable until endpoints exist.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/baseUrl.ts src/lib/auth/emailVerify.ts src/pages/api/auth/forgot-password.ts
git commit -m "feat(auth): email-verify token lib + shared trusted-base-URL helper"
```

---

### Task 3: Verification email (template + sender)

**Files:**
- Create: `src/emails/VerifyEmail.tsx`
- Create: `src/lib/auth/sendVerifyEmail.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (Tasks 4, 6 rely on this exact signature): `sendVerifyEmail(to: string, verifyLink: string): Promise<void>` — sends via Resend when `RESEND_API_KEY` is set, else `console.log`s the link (dev-log fallback).

- [ ] **Step 1: Create `src/emails/VerifyEmail.tsx`**

Same visual system as `PasswordResetEmail.tsx` (paper palette, ink border, pill button):

```tsx
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr,
} from '@react-email/components';
import * as React from 'react';

interface VerifyEmailProps {
  verifyLink: string;
}

export default function VerifyEmail({ verifyLink }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Bestätige deine E-Mail-Adresse für Mahalle</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={h1}>Willkommen im Kiez!</Heading>
          <Text style={text}>
            Nur noch ein Schritt: Bestätige deine E-Mail-Adresse, um dein
            Mahalle-Konto zu aktivieren. Der Link ist 24 Stunden gültig und
            nur einmal verwendbar.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={verifyLink} style={button}>E-Mail bestätigen</Button>
          </Section>
          <Text style={muted}>
            Wenn du dich nicht bei Mahalle registriert hast, kannst du diese
            E-Mail ignorieren.
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

- [ ] **Step 2: Create `src/lib/auth/sendVerifyEmail.ts`**

```ts
// src/lib/auth/sendVerifyEmail.ts — SERVER-ONLY.
// Sends the email-verification mail via Resend when configured; otherwise logs
// the link to the server console (dev-log fallback) so the flow is testable
// without a key. Mirrors src/lib/auth/sendResetEmail.ts.
import React from 'react';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import VerifyEmail from '../../emails/VerifyEmail';

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || '';
const SENDING_FROM = import.meta.env.SENDING_FROM_EMAIL || 'Mahalle <noreply@mahalle.berlin>';

export async function sendVerifyEmail(to: string, verifyLink: string): Promise<void> {
  if (!RESEND_API_KEY) {
    // Dev-log fallback: no key → don't send, print the link so dev can test.
    console.log(`[verify-email] (dev) verify link for ${to}: ${verifyLink}`);
    return;
  }
  const html = await render(React.createElement(VerifyEmail, { verifyLink }));
  const resend = new Resend(RESEND_API_KEY);
  await resend.emails.send({
    from: SENDING_FROM,
    to,
    subject: 'Mahalle — E-Mail bestätigen',
    html,
  });
}
```

- [ ] **Step 3: Verify**

Run: `pnpm type-check`
Expected: no NEW errors vs baseline.

- [ ] **Step 4: Commit**

```bash
git add src/emails/VerifyEmail.tsx src/lib/auth/sendVerifyEmail.ts
git commit -m "feat(auth): verification email template + sender with dev-log fallback"
```

---

### Task 4: API endpoints (consume, resend, status)

**Files:**
- Create: `src/pages/api/auth/verify-email.ts`
- Create: `src/pages/api/auth/resend-verification.ts`
- Create: `src/pages/api/auth/verification-status.ts`

**Interfaces:**
- Consumes: `verifyEmailWithToken`, `createEmailVerifyToken` from `src/lib/auth/emailVerify.ts` (Task 2); `getTrustedBaseUrl` from `src/lib/auth/baseUrl.ts` (Task 2); `sendVerifyEmail` from `src/lib/auth/sendVerifyEmail.ts` (Task 3).
- Produces (Tasks 5, 8 rely on these exact contracts):
  - `POST /api/auth/verify-email` body `{ token: string }`, NO session needed → `200 { ok: true }` | `400 { error: 'invalid_or_expired' }` | `500 { error: 'internal' }`.
  - `POST /api/auth/resend-verification` no body, session REQUIRED → `200 { ok: true }` | `200 { ok: true, alreadyVerified: true }` | `429 { error: 'throttled' }` | `401` | `500`.
  - `GET /api/auth/verification-status` session REQUIRED → `200 { verified: boolean }` | `401`.

- [ ] **Step 1: Create `src/pages/api/auth/verify-email.ts`**

```ts
import type { APIRoute } from 'astro';
import { verifyEmailWithToken } from '../../../lib/auth/emailVerify';

// Consumes a verify token (single-use) and flips users.emailVerified to true.
// No session required — the link may be opened in a different browser than the
// one that registered. POST (not GET) so email-scanner link prefetches can't
// burn the token; the /verify-email page island fires this after hydration.
export const POST: APIRoute = async ({ request }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token : '';
    // Generic error for missing/bad/expired/used tokens — no distinction leaks.
    if (!token) return json({ error: 'invalid_or_expired' }, 400);

    const ok = await verifyEmailWithToken(token);
    return ok ? json({ ok: true }, 200) : json({ error: 'invalid_or_expired' }, 400);
  } catch (err) {
    console.error('verify-email error:', err);
    return json({ error: 'internal' }, 500);
  }
};
```

- [ ] **Step 2: Create `src/pages/api/auth/resend-verification.ts`**

```ts
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { ObjectId } from 'mongodb';
import { connectDB } from '../../../lib/mongodb';
import { createEmailVerifyToken } from '../../../lib/auth/emailVerify';
import { sendVerifyEmail } from '../../../lib/auth/sendVerifyEmail';
import { getTrustedBaseUrl } from '../../../lib/auth/baseUrl';

// Re-sends the verification link for the LOGGED-IN user's own account.
// Session-gated → no enumeration surface (you can only resend to yourself).
// Abuse throttle: createEmailVerifyToken's 60s resend guard → 429.
export const POST: APIRoute = async ({ request }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const session = await getSession(request);
    if (!session?.user?.id) return json({ error: 'Unauthorized' }, 401);

    const db = await connectDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) });
    if (!user) return json({ error: 'Unauthorized' }, 401);
    if (user.emailVerified === true) return json({ ok: true, alreadyVerified: true }, 200);

    const rawToken = await createEmailVerifyToken(String(user._id));
    if (!rawToken) return json({ error: 'throttled' }, 429);

    // SECURITY: link base from trusted NEXTAUTH_URL, fail-closed in prod
    // (CWE-640 — see src/lib/auth/baseUrl.ts).
    const base = getTrustedBaseUrl(request);
    if (!base) {
      console.error('resend-verification: NEXTAUTH_URL not configured in production — refusing to build a verify link from the untrusted Host header');
      return json({ error: 'internal' }, 500);
    }

    await sendVerifyEmail(user.email, `${base}/verify-email?token=${rawToken}`);
    return json({ ok: true }, 200);
  } catch (err) {
    console.error('resend-verification error:', err);
    return json({ error: 'internal' }, 500);
  }
};
```

- [ ] **Step 3: Create `src/pages/api/auth/verification-status.ts`**

```ts
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { ObjectId } from 'mongodb';
import { connectDB } from '../../../lib/mongodb';

// Live verified-state for the LOGGED-IN user, read from the DB (not the JWT).
// The JWT snapshots emailVerified at login and goes stale the moment the user
// verifies — the VerifyEmailBanner calls this to avoid nagging verified users.
export const GET: APIRoute = async ({ request }) => {
  const json = (body: object, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  try {
    const session = await getSession(request);
    if (!session?.user?.id) return json({ error: 'Unauthorized' }, 401);

    const db = await connectDB();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { emailVerified: 1 } }
    );
    return json({ verified: user?.emailVerified === true }, 200);
  } catch (err) {
    console.error('verification-status error:', err);
    return json({ error: 'internal' }, 500);
  }
};
```

- [ ] **Step 4: Type-check + endpoint smoke (dev server on :3000)**

Run: `pnpm type-check`
Expected: no NEW errors vs baseline.

With the dev server running, quick contract checks:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/auth/verify-email -H 'Content-Type: application/json' -d '{"token":"deadbeef"}'
# Expected: 400
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/auth/resend-verification
# Expected: 401
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/auth/verification-status
# Expected: 401
```

- [ ] **Step 5: Full-loop HTTP smoke with a TEMP user (throwaway script)**

Write `<scratchpad>/verify-smoke.mjs` (scratchpad dir, NOT the repo). It must: (1) connect with `MONGODB_URI` from `.env`; (2) insert a TEMP user `{ email: 'tmp-verify-smoke@example.invalid', emailVerified: false, name: 'TmpVerifySmoke', password: 'x', createdAt/updatedAt }`; (3) insert a token row into `emailVerifyTokens` with `tokenHash = sha256(raw)` for a locally generated `raw`, `expiresAt = now+24h`, `usedAt: null`; (4) `POST /api/auth/verify-email {token: raw}` → assert 200; (5) re-read the temp user → assert `emailVerified === true`; (6) POST the SAME token again → assert 400 (single-use); (7) ALWAYS clean up (delete temp user + its `emailVerifyTokens` rows) in a `finally` block.

```js
// verify-smoke.mjs — throwaway; TEMP user only; self-cleaning. Run: node verify-smoke.mjs
import { MongoClient, ObjectId } from 'mongodb';
import { createHash, randomBytes } from 'crypto';
import { readFileSync } from 'fs';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.trim().startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]));
const client = new MongoClient(env.MONGODB_URI);
const raw = randomBytes(32).toString('hex');
const sha = createHash('sha256').update(raw).digest('hex');
let userId;
try {
  await client.connect();
  const db = client.db();
  const u = await db.collection('users').insertOne({
    name: 'TmpVerifySmoke', email: 'tmp-verify-smoke@example.invalid', password: 'x',
    image: '', emailVerified: false, roleBadge: 'resident', hobbies: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  });
  userId = u.insertedId;
  await db.collection('emailVerifyTokens').insertOne({
    tokenHash: sha, userId, expiresAt: new Date(Date.now() + 24 * 3600e3), usedAt: null, createdAt: new Date(),
  });
  const post = () => fetch('http://localhost:3000/api/auth/verify-email', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: raw }),
  });
  const r1 = await post();
  console.log('first POST:', r1.status, r1.status === 200 ? 'PASS' : 'FAIL');
  const after = await db.collection('users').findOne({ _id: userId });
  console.log('emailVerified flipped:', after.emailVerified === true ? 'PASS' : 'FAIL');
  const r2 = await post();
  console.log('second POST (single-use):', r2.status, r2.status === 400 ? 'PASS' : 'FAIL');
} finally {
  const db = client.db();
  if (userId) {
    await db.collection('emailVerifyTokens').deleteMany({ userId });
    await db.collection('users').deleteOne({ _id: userId });
  }
  await client.close();
}
```

Run: `node <scratchpad>/verify-smoke.mjs`
Expected: three `PASS` lines. Then DELETE the script (it lives in the scratchpad, so it can't be committed — but remove it anyway).

- [ ] **Step 6: Commit**

```bash
git add src/pages/api/auth/verify-email.ts src/pages/api/auth/resend-verification.ts src/pages/api/auth/verification-status.ts
git commit -m "feat(auth): verify-email, resend-verification and verification-status endpoints"
```

---

### Task 5: `/verify-email` page + `AuthVerifyInner` island

**Files:**
- Create: `src/pages/verify-email.astro`
- Create: `src/components/auth/kiosk/AuthVerifyInner.svelte`

**Interfaces:**
- Consumes: `findValidVerifyToken` (Task 2); `POST /api/auth/verify-email` + `POST /api/auth/resend-verification` (Task 4); i18n keys (Task 1); existing `AuthLayout.astro`, `AuthBanner.svelte` (`kind`, `title`, `body?` props), `connectDB`.
- Produces: the `/verify-email` route Task 6 redirects to, and the resend UX the banner (Task 8) links to.

- [ ] **Step 1: Create `src/pages/verify-email.astro`**

Follows `reset-password.astro`'s pattern (SSR read-only validation; consumption is a client POST so scanner GET-prefetches can't burn the token):

```astro
---
import { getSession } from 'auth-astro/server';
import { ObjectId } from 'mongodb';
import AuthLayout from '../layouts/AuthLayout.astro';
import AuthVerifyInner from '../components/auth/kiosk/AuthVerifyInner.svelte';
import { findValidVerifyToken } from '../lib/auth/emailVerify';
import { connectDB } from '../lib/mongodb';

const token = new URL(Astro.request.url).searchParams.get('token') ?? '';
const session = await getSession(Astro.request);

// Token mode works WITHOUT a session (the link may be opened in a different
// browser than the one that registered). Read-only check here — the island
// consumes the token via POST /api/auth/verify-email after hydration.
const tokenValid = token ? (await findValidVerifyToken(token)) !== null : false;

// Sent mode (no token) shows "check your inbox" for the logged-in user.
if (!token) {
  if (!session?.user?.id) return Astro.redirect('/login');
  const db = await connectDB();
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(session.user.id) },
    { projection: { emailVerified: 1 } }
  );
  // Already verified → nothing to do here.
  if (user?.emailVerified === true) return Astro.redirect('/');
}

Astro.response.headers.set('Cache-Control', 'no-store, must-revalidate');
---

<AuthLayout title="E-Mail bestätigen">
  <AuthVerifyInner
    client:only="svelte"
    token={token}
    tokenValid={tokenValid}
    email={session?.user?.email ?? ''}
    hasSession={!!session?.user}
  />
</AuthLayout>
```

- [ ] **Step 2: Create `src/components/auth/kiosk/AuthVerifyInner.svelte`**

States: `sent` (post-register / direct visit) → `resent` (after resend) · `confirming` → `confirmed` (valid token, auto-consumed on mount, then redirect) · `invalid` (bad/expired token — resend if logged in, login CTA otherwise). Card + eyebrow + carved-italic title match `AuthForgotInner`; the ✉ badge is reused from its sent state; confirmed uses the ✓ badge on `--k-success` per the design mock ("KONTO AKTIV").

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../../lib/kiosk-i18n';
  import AuthBanner from './primitives/AuthBanner.svelte';
  import AuthPrimaryBtn from './primitives/AuthPrimaryBtn.svelte';

  let { token = '', tokenValid = false, email = '', hasSession = false }: {
    token?: string; tokenValid?: boolean; email?: string; hasSession?: boolean;
  } = $props();

  type Stage = 'sent' | 'resent' | 'confirming' | 'confirmed' | 'invalid';
  let stage = $state<Stage>(token ? (tokenValid ? 'confirming' : 'invalid') : 'sent');
  let resendLoading = $state(false);
  let resendErr = $state<string | null>(null);

  onMount(() => {
    if (stage !== 'confirming') return;
    (async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) { stage = 'invalid'; return; }
        stage = 'confirmed';
        // JWT still says unverified until re-login; the banner live-checks the
        // DB, so landing on / immediately shows NO nag. Login-less browsers
        // (link opened elsewhere) go to /login instead.
        setTimeout(() => { window.location.href = hasSession ? '/' : '/login'; }, 2500);
      } catch {
        stage = 'invalid';
      }
    })();
  });

  async function resend() {
    resendErr = null;
    resendLoading = true;
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      if (res.status === 429) resendErr = $t['auth.verify.throttled'];
      else if (!res.ok) resendErr = $t['auth.err.generic'];
      else stage = 'resent';
    } catch {
      resendErr = $t['auth.err.generic'];
    }
    resendLoading = false;
  }
</script>

<div class="auth-card">
  {#if stage === 'confirmed'}
    <div style="text-align:center;">
      <div class="flex justify-center" style="margin-bottom:16px;">
        <div class="flex items-center justify-center" style="width:64px; height:64px; border-radius:50%; background:var(--k-success); border:2px solid var(--k-ink); box-shadow:3px 3px 0 var(--k-ink); color:var(--k-paper); font-size:30px; transform:rotate(-4deg);">✓</div>
      </div>
      <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-success); font-weight:600;">{$t['auth.verify.confirmedEyebrow']}</div>
      <h1 class="font-bricolage" style="font-weight:800; font-size:30px; letter-spacing:-0.03em; line-height:1.05; margin:8px 0 8px; color:var(--k-ink);">{$t['auth.verify.confirmedTitle']}</h1>
      <p class="font-instrument" style="font-style:italic; font-size:16px; color:var(--k-ink-soft); margin:0;">{$t['auth.verify.confirmedBody']}</p>
    </div>
  {:else if stage === 'confirming'}
    <div style="text-align:center; padding:24px 0;">
      <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-accent); font-weight:600;">{$t['auth.verify.eyebrow']}</div>
      <p class="font-instrument" style="font-style:italic; font-size:16px; color:var(--k-ink-soft); margin:12px 0 0;">{$t['auth.verify.confirming']}</p>
    </div>
  {:else if stage === 'invalid'}
    <div style="text-align:center;">
      <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-danger); font-weight:600;">{$t['auth.verify.invalidEyebrow']}</div>
      <h1 class="font-bricolage" style="font-weight:800; font-size:26px; letter-spacing:-0.03em; line-height:1.1; margin:8px 0 10px; color:var(--k-ink);">{$t['auth.verify.invalidTitle']}</h1>
      <p class="font-instrument" style="font-style:italic; font-size:15px; color:var(--k-ink-soft); margin:0 0 20px;">{$t['auth.verify.invalidBody']}</p>
      {#if hasSession}
        {#if resendErr}
          <p class="font-bricolage" style="font-size:12.5px; color:var(--k-danger); margin:0 0 10px;">{resendErr}</p>
        {/if}
        <AuthPrimaryBtn loading={resendLoading} onclick={resend} type="button">
          {resendLoading ? $t['auth.verify.resendLoading'] : $t['auth.verify.resend']}
        </AuthPrimaryBtn>
      {:else}
        <a href="/login" class="no-underline font-bricolage" style="display:inline-block; background:var(--k-ink); color:var(--k-paper); font-weight:700; font-size:15px; padding:13px 22px; border-radius:999px; border:1.5px solid var(--k-ink); box-shadow:3px 3px 0 var(--k-accent);">{$t['auth.verify.invalidLoginCta']}</a>
      {/if}
    </div>
  {:else}
    <!-- sent / resent -->
    <div class="flex justify-center" style="margin-bottom:16px;">
      <div class="flex items-center justify-center" style="width:60px; height:60px; border-radius:50%; background:var(--k-accent); border:2px solid var(--k-ink); box-shadow:3px 3px 0 var(--k-ink); font-size:26px; transform:rotate(-4deg);">✉</div>
    </div>
    <div style="text-align:center;">
      <div class="font-dmmono" style="font-size:11px; letter-spacing:0.18em; color:var(--k-accent); font-weight:600;">{$t['auth.verify.eyebrow']}</div>
      <h1 class="font-bricolage" style="font-weight:800; font-size:30px; letter-spacing:-0.03em; line-height:1.05; margin:8px 0 10px; color:var(--k-ink);">
        {$t['auth.verify.title.a']}<span class="font-instrument" style="font-style:italic; font-weight:400; color:var(--k-accent);">{$t['auth.verify.title.accent']}</span>{$t['auth.verify.title.b']}
      </h1>
      <p class="font-bricolage" style="font-size:13.5px; color:var(--k-ink-soft); margin:0 0 4px;">{$t['auth.verify.sub']}</p>
      <div class="font-dmmono" style="font-size:13px; font-weight:600; color:var(--k-ink); padding:5px 0;">{email}</div>
      <p class="font-bricolage" style="font-size:12.5px; color:var(--k-ink-soft); line-height:1.5; max-width:340px; margin:8px auto 0;">{$t['auth.verify.body']}</p>
    </div>

    {#if stage === 'resent'}
      <AuthBanner kind="success" title={$t['auth.verify.resentNote']} />
    {/if}
    {#if resendErr}
      <p class="font-bricolage" style="text-align:center; font-size:12.5px; color:var(--k-danger); margin:12px 0 0;">{resendErr}</p>
    {/if}

    <div style="margin-top:22px;">
      <AuthPrimaryBtn loading={resendLoading} onclick={resend} type="button">
        {resendLoading ? $t['auth.verify.resendLoading'] : $t['auth.verify.resend']}
      </AuthPrimaryBtn>
    </div>
    <div style="text-align:center; margin-top:16px;">
      <a href="/login" class="font-dmmono no-underline" style="font-size:11px; color:var(--k-ink-soft); border-bottom:1px dashed var(--k-ink-mute);">{$t['auth.verify.back']}</a>
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

**Implementation note:** `AuthPrimaryBtn.svelte` already accepts `type?: 'submit' | 'button'` and `onclick?: () => void` (verified) — use them as shown above; no primitive changes needed. `AuthBanner` accepts a title-only call (`body` is optional) and carries its own `margin-top: 18px`.

- [ ] **Step 3: Verify (dev server on :3000)**

Run: `pnpm type-check` → no NEW errors vs baseline.

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/verify-email
# Expected: 302 …/login   (no token + no session → redirect)
curl -s 'http://localhost:3000/verify-email?token=deadbeef' | grep -o 'astro-island' | head -1
# Expected: astro-island   (token mode renders without session; island will show invalid state)
```

Playwright check of the invalid state: `playwright-cli open http://localhost:3000/verify-email?token=deadbeef`, wait for hydration, snapshot → expect the "Link ungültig oder abgelaufen" card (island `client:only` — re-snapshot after hydration per the known caveat). `playwright-cli close` when done.

- [ ] **Step 4: Commit**

```bash
git add src/pages/verify-email.astro src/components/auth/kiosk/AuthVerifyInner.svelte
git commit -m "feat(auth): /verify-email page with sent/resent/confirmed/invalid states"
```

---

### Task 6: Send on register + post-register redirect

**Files:**
- Modify: `src/pages/api/auth/register.ts` (send verify email after insert, best-effort)
- Modify: `src/components/auth/kiosk/AuthRegisterInner.svelte:72` (redirect `/` → `/verify-email`)

**Interfaces:**
- Consumes: `createEmailVerifyToken` (Task 2), `sendVerifyEmail` (Task 3), `getTrustedBaseUrl` (Task 2), `/verify-email` route (Task 5).
- Produces: every new registration triggers exactly one verification email (or dev-log line) and lands on `/verify-email`.

- [ ] **Step 1: Wire sending into `register.ts`**

Add imports at the top of `src/pages/api/auth/register.ts`:

```ts
import { createEmailVerifyToken } from "../../../lib/auth/emailVerify";
import { sendVerifyEmail } from "../../../lib/auth/sendVerifyEmail";
import { getTrustedBaseUrl } from "../../../lib/auth/baseUrl";
```

Then insert BETWEEN the `insertOne` call and the `201` response:

```ts
        // Send the verification email (best-effort — registration must succeed
        // even if this fails; the user can resend from /verify-email).
        try {
            const rawToken = await createEmailVerifyToken(result.insertedId.toString());
            if (rawToken) {
                // SECURITY: link base from trusted NEXTAUTH_URL, fail-closed in
                // prod (CWE-640 — see src/lib/auth/baseUrl.ts).
                const base = getTrustedBaseUrl(request);
                if (base) {
                    await sendVerifyEmail(email, `${base}/verify-email?token=${rawToken}`);
                } else {
                    console.error('register: NEXTAUTH_URL not configured in production — skipping verification email (user can resend once configured)');
                }
            }
        } catch (err) {
            console.error('register: verification email failed (registration still succeeded):', err);
        }
```

- [ ] **Step 2: Repoint the post-register redirect**

In `src/components/auth/kiosk/AuthRegisterInner.svelte`, the success branch of `submit()` currently reads:

```ts
      status = 'success';
      window.location.href = '/';
```

Change to:

```ts
      status = 'success';
      window.location.href = '/verify-email';
```

- [ ] **Step 3: Verify end-to-end in dev (temp user, dev-log fallback)**

`pnpm type-check` → no NEW errors vs baseline.

With the dev server on :3000 and no `RESEND_API_KEY` change needed (if a key IS set locally, temporarily note that the mail really sends — use an address you own or unset the key for the test):

```bash
curl -s -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Tmp Verify","email":"tmp-verify-e2e@example.invalid","password":"Abcdef12"}'
# Expected: {"success":true,"userId":"…"}
```

Check the dev-server stdout for: `[verify-email] (dev) verify link for tmp-verify-e2e@example.invalid: http://localhost:3000/verify-email?token=…`

Open that exact link in playwright-cli → expect "Bestätige …" then the ✓ "Bestätigt — willkommen im Kiez." card. Confirm in mongo that the temp user's `emailVerified` is now `true`, then DELETE the temp user and any of its `emailVerifyTokens` rows (one-off mongo/node cleanup — temp data never stays).

Browser register flow (optional but preferred): register a second temp user through the `/register` UI → should auto-login and land on `/verify-email` showing the "Schau in dein Postfach." card with the user's email. Clean up that temp user too.

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/auth/register.ts src/components/auth/kiosk/AuthRegisterInner.svelte
git commit -m "feat(auth): send verification email on register, land on /verify-email"
```

---

### Task 7: Propagate `emailVerified` into JWT + session

**Files:**
- Modify: `auth.config.ts` (authorize return, `jwt` + `session` callbacks)
- Modify: `src/types/next-auth.d.ts` (type augmentation)

**Interfaces:**
- Consumes: nothing new.
- Produces: `session.user.emailVerified?: boolean` available on every API route + page (same chain as `role`). Task 8's layout gate reads exactly this. **Known staleness:** the JWT snapshots the flag at login — a user who verifies mid-session keeps a stale `false` until re-login; Task 8's banner compensates with the live `verification-status` check.

- [ ] **Step 1: Extend `authorize` return in `auth.config.ts`**

In the `authorize` callback, extend the returned user object (after the `role` line):

```ts
                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name || user.userName || '',
                    image: user.image || user.userPicture || '',
                    role: (user.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
                    // Boolean-normalized: legacy docs may hold false/null/Date.
                    emailVerified: user.emailVerified === true,
                };
```

- [ ] **Step 2: Extend the `jwt` and `session` callbacks**

```ts
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as any).role ?? 'user';
                // Snapshot at login — goes stale if the user verifies mid-session;
                // VerifyEmailBanner live-checks /api/auth/verification-status.
                token.emailVerified = (user as any).emailVerified === true;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = (token as any).role ?? 'user';
                session.user.emailVerified = (token as any).emailVerified === true;
            }
            return session;
        }
    },
```

- [ ] **Step 3: Augment the types in `src/types/next-auth.d.ts`**

Add `emailVerified` to all three interfaces. **Important:** the `User` augmentation must stay assignable from `@auth/core`'s `AdapterUser` (which declares `emailVerified: Date | null`) — so the `User` field is the wide union, while `Session`/`JWT` (fully ours) use plain `boolean`:

```ts
declare module '@auth/core/types' {
  interface Session {
    user: {
      id: string;
      role?: 'user' | 'admin';
      emailVerified?: boolean;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id?: string;
    role?: 'user' | 'admin';
    // Wide union: AdapterUser narrows this to Date | null; our credentials
    // authorize() returns a boolean. Keep all three assignable.
    emailVerified?: boolean | Date | null;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    id?: string;
    role?: 'user' | 'admin';
    emailVerified?: boolean;
  }
}
```

(Show the full file after edit — the header comment block at the top of the file stays as-is.)

- [ ] **Step 4: Verify**

Run: `pnpm type-check` → no NEW errors vs baseline. Specifically confirm NO new TS2430 (`interface incorrectly extends`) from `@auth/core` — that would mean the `User.emailVerified` union is wrong.

Runtime check (dev server, one browser login): log in as any existing dev user in playwright-cli or a normal browser, then:

```bash
curl -s http://localhost:3000/api/auth/session -H "Cookie: <session cookie>" | python3 -m json.tool
# Expected: "user" contains "emailVerified": false (or true for a verified user)
```

(Cookie workflow per `reference_playwright_auth` memory; any logged-in request works.)

- [ ] **Step 5: Commit**

```bash
git add auth.config.ts src/types/next-auth.d.ts
git commit -m "feat(auth): propagate emailVerified through jwt/session callbacks"
```

---

### Task 8: Dismissible verify banner in `KioskLayout`

**Files:**
- Create: `src/components/auth/kiosk/VerifyEmailBanner.svelte`
- Modify: `src/layouts/KioskLayout.astro` (import + conditional mount between `<KioskNav>` and `<main>`)

**Interfaces:**
- Consumes: `session.user.emailVerified` (Task 7), `GET /api/auth/verification-status` + `POST /api/auth/resend-verification` (Task 4), banner i18n keys (Task 1).
- Produces: the app-wide soft-gate nag. Dismissal key: `sessionStorage['mahalle-verify-banner-dismissed']` (once per browser session — reappears next session until verified, matching the splash's sessionStorage pattern).

- [ ] **Step 1: Create `src/components/auth/kiosk/VerifyEmailBanner.svelte`**

Starts hidden; only becomes visible after (a) the sessionStorage dismiss check and (b) a LIVE DB check confirm the user is really unverified. The live check is what defeats the stale-JWT problem: a user who just verified stops seeing the banner immediately, no re-login needed. sessionStorage access is try/catch-wrapped (private-mode lesson from the splash work).

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../../lib/kiosk-i18n';

  const DISMISS_KEY = 'mahalle-verify-banner-dismissed';

  let visible = $state(false);
  let resendState = $state<'idle' | 'loading' | 'sent'>('idle');
  let resendErr = $state<string | null>(null);

  onMount(async () => {
    // sessionStorage can throw (private mode / storage disabled) — treat as not dismissed.
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch { /* fall through */ }
    // Live check beats the stale JWT: only nag if the DB really says unverified.
    try {
      const res = await fetch('/api/auth/verification-status');
      if (!res.ok) return; // no session / error → never nag
      const data = await res.json();
      visible = data?.verified === false;
    } catch { /* network error → don't nag */ }
  });

  function dismiss() {
    visible = false;
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* best-effort */ }
  }

  async function resend() {
    resendErr = null;
    resendState = 'loading';
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      if (res.status === 429) { resendErr = $t['auth.verify.throttled']; resendState = 'idle'; }
      else if (!res.ok) { resendErr = $t['auth.err.generic']; resendState = 'idle'; }
      else { resendState = 'sent'; }
    } catch {
      resendErr = $t['auth.err.generic'];
      resendState = 'idle';
    }
  }
</script>

{#if visible}
  <div class="verify-banner" role="status">
    <div class="verify-banner-inner">
      <span class="font-dmmono verify-banner-dot" aria-hidden="true">✉</span>
      <span class="font-bricolage verify-banner-text">
        <strong>{$t['auth.banner.verifyTitle']}</strong>
        <span class="verify-banner-body">{$t['auth.banner.verifyBody']}</span>
        {#if resendErr}<span class="verify-banner-err">{resendErr}</span>{/if}
      </span>
      <button type="button" class="font-bricolage verify-banner-resend" onclick={resend} disabled={resendState !== 'idle'}>
        {resendState === 'sent' ? $t['auth.banner.verifySent']
          : resendState === 'loading' ? $t['auth.verify.resendLoading']
          : $t['auth.banner.verifyResend']}
      </button>
      <button type="button" class="verify-banner-dismiss" onclick={dismiss} aria-label={$t['auth.banner.verifyDismiss']}>×</button>
    </div>
  </div>
{/if}

<style>
  .verify-banner {
    background: var(--k-paper-warm);
    border-bottom: 1.5px solid var(--k-ink);
    border-top: 3px solid var(--k-ochre);
  }
  .verify-banner-inner {
    max-width: 80rem;
    margin: 0 auto;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .verify-banner-dot { font-size: 14px; color: var(--k-ochre); flex-shrink: 0; }
  .verify-banner-text { font-size: 13px; color: var(--k-ink-soft); line-height: 1.4; flex: 1; min-width: 0; }
  .verify-banner-text strong { color: var(--k-ink); font-weight: 700; margin-right: 6px; }
  .verify-banner-err { display: block; color: var(--k-danger); font-size: 12px; }
  .verify-banner-resend {
    flex-shrink: 0;
    background: var(--k-ink);
    color: var(--k-paper);
    font-size: 12px;
    font-weight: 700;
    padding: 6px 14px;
    border-radius: 999px;
    border: 1.5px solid var(--k-ink);
    box-shadow: 2px 2px 0 var(--k-ochre);
    cursor: pointer;
  }
  .verify-banner-resend:disabled { opacity: 0.75; cursor: default; }
  .verify-banner-dismiss {
    flex-shrink: 0;
    background: transparent;
    border: none;
    color: var(--k-ink-mute);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    padding: 2px 6px;
  }
  @media (max-width: 640px) {
    .verify-banner-body { display: none; } /* keep the strip one line on mobile */
  }
</style>
```

- [ ] **Step 2: Mount in `KioskLayout.astro`**

Add the import in the frontmatter (below the `KioskFooter` import):

```ts
import VerifyEmailBanner from '../components/auth/kiosk/VerifyEmailBanner.svelte';
```

Then in the body, directly AFTER `<KioskNav … />`:

```astro
    <KioskNav client:load currentPath={currentPath} user={session?.user ?? null} />
    {session?.user && session.user.emailVerified !== true && <VerifyEmailBanner client:load />}
    <ToastProvider client:load />
```

Gate rationale (`!== true`, not `=== false`): JWTs issued BEFORE Task 7 shipped carry no `emailVerified` claim — the Task 7 session callback coerces that to `false`, but `!== true` stays correct even if a code path ever leaves it `undefined`. Legacy sessions of already-verified users therefore DO mount the banner — and its live status check immediately hides it (that's the check's job). Logged-out visitors never mount it; verified users with fresh JWTs skip even the component load.

- [ ] **Step 3: Verify (dev server on :3000)**

`pnpm type-check` → no NEW errors vs baseline.

Playwright, logged in as an UNVERIFIED temp user (register one via the UI, stay logged in — do NOT click the verify link yet):
1. Go to `/` (forum, kiosk page) → banner visible under the nav: "Bestätige deine E-Mail-Adresse." + resend + ×.
2. Click resend → button flips to "Link verschickt ✓"; dev-server stdout shows a `[verify-email] (dev)` link. Click resend again quickly in a fresh page-load → throttled note (429 path).
3. Click × → banner gone; reload → still gone (sessionStorage). New browser context → banner back.
4. Open the logged verify link → confirmed card → back on `/` the banner does NOT reappear even though the JWT is stale (live-check path proven).
5. Log in as a normal verified dev user → no banner. Logged out → no banner.
Clean up the temp user + token rows. `playwright-cli close`.

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/kiosk/VerifyEmailBanner.svelte src/layouts/KioskLayout.astro
git commit -m "feat(auth): dismissible email-verify banner on kiosk pages"
```

---

### Task 9: Docs + final E2E sweep

**Files:**
- Modify: `src/components/auth/kiosk/CLAUDE.md` (email-verify section; fix the stale "Phase 1 scope / deferred" lines)
- Modify: `CLAUDE.md` (root — `emailVerifyTokens` collection entry; auth-flow note)

**Interfaces:** none — documentation + verification only.

- [ ] **Step 1: Update `src/components/auth/kiosk/CLAUDE.md`**

Add after the "Forgot / reset password" section:

```markdown
## Email verify — soft gate (shipped, <use the actual date of the docs commit, e.g. 2026-07-02>)

SOFT gate: login and all features work unverified — verification only drives
the nag surfaces. Mirrors the forgot-password stack.

- **Token lib** `src/lib/auth/emailVerify.ts` (SERVER-ONLY): `createEmailVerifyToken`
  (single-use, **24h** TTL, latest-wins + 60s resend guard, returns RAW token),
  `findValidVerifyToken` (read-only, SSR page check), `verifyEmailWithToken`
  (atomic claim → sets `users.emailVerified: true`, rollback on write failure).
  Tokens stored ONLY as `sha256(raw)` in **`emailVerifyTokens`**
  (`{ tokenHash, userId, expiresAt, usedAt, createdAt }`).
- **Base URL**: emailed links use `getTrustedBaseUrl()` from `src/lib/auth/baseUrl.ts`
  (extracted from forgot-password; NEXTAUTH_URL, prod fail-closed, CWE-640).
- **Email** `src/lib/auth/sendVerifyEmail.ts` + `src/emails/VerifyEmail.tsx`;
  dev-log fallback when `RESEND_API_KEY` is empty (link in dev-server stdout).
- **Endpoints**: `POST /api/auth/verify-email` ({token}, sessionless — link may open
  in another browser; POST-not-GET so scanner prefetches can't burn tokens);
  `POST /api/auth/resend-verification` (session-gated own-account, 429 on 60s guard);
  `GET /api/auth/verification-status` (session-gated LIVE DB read — beats stale JWT).
- **Page** `/verify-email` (`AuthVerifyInner`): no token → "sent" card (session
  required, redirects `/login`; already-verified redirects `/`); `?token=` →
  SSR read-only validate, island auto-POSTs to consume → confirmed card →
  redirect `/` (or `/login` if sessionless). Invalid/expired → resend (if logged
  in) or login CTA. Register now lands here after auto-login.
- **Session flag**: `emailVerified` propagates `authorize → jwt → session` (like
  `role`; augmentation in `src/types/next-auth.d.ts` — `User` side is
  `boolean | Date | null` to stay assignable from AdapterUser). **Stale-JWT
  gotcha**: the flag snapshots at login; anything that must be CURRENT reads
  `/api/auth/verification-status`, not the session.
- **Banner** `VerifyEmailBanner.svelte`, mounted in `KioskLayout` for sessions
  with `emailVerified !== true`. Hidden until a live status check confirms
  unverified; dismiss = `sessionStorage['mahalle-verify-banner-dismissed']`
  (per browser session). Design deviations from the mock: 24h copy (not 30 min),
  no "E-Mail ändern" button (email-change feature doesn't exist).
- Existing `emailVerified: false` users got NO email blast — banner + self-resend only.
```

Also UPDATE the stale trailing lines of the existing "Phase 2A" + "Phase 1 scope / deferred" sections: email-verify moves from "deferred" to shipped; remaining deferred = rate-limit (state 05).

- [ ] **Step 2: Update root `CLAUDE.md`**

In **Database Collections**, after the `passwordResetTokens` entry, add:

```markdown
- `emailVerifyTokens` - Single-use email-verification tokens (`{ tokenHash (sha256 of raw), userId, expiresAt, usedAt, createdAt }`); raw token only in the emailed link. 24h TTL, atomic single-use consume, sets `users.emailVerified: true`. See `src/lib/auth/emailVerify.ts`.
```

In the **Authentication Flow** section, extend the `role` propagation bullet's neighborhood with:

```markdown
- **emailVerified (soft gate)**: propagated through the same `authorize` → `jwt` → `session` chain as `role`, so `session.user.emailVerified` exists everywhere — but it SNAPSHOTS at login (JWT). For live truth use `GET /api/auth/verification-status`. Verification never blocks login or features; it only drives `/verify-email` + the `VerifyEmailBanner` nag in `KioskLayout`. Emailed links (reset + verify) build their base URL via `getTrustedBaseUrl()` (`src/lib/auth/baseUrl.ts`, NEXTAUTH_URL, prod fail-closed).
```

- [ ] **Step 3: Final E2E sweep (dev server on :3000)**

1. `pnpm type-check` AND `pnpm build` → green (baseline-only errors).
2. Fresh registration (temp user, UI): register → lands on `/verify-email` "sent" card → dev-log link in stdout → open link → confirmed → redirected → NO banner on `/`.
3. Second fresh temp user: register, DON'T verify → banner on `/`, `/calendar`, `/marketplace` → resend works (new dev-log link, old link now dead = latest-wins) → dismiss persists per session → verify via the NEW link → banner gone without re-login.
4. Token reuse: consumed link opened again → invalid card.
5. Sessionless link: open a fresh verify link in a clean browser context (no cookies) → confirms → redirects to `/login`.
6. Existing user regression: log in as a pre-existing verified dev user → no banner, no behavior change; forgot-password flow still works end-to-end (baseUrl refactor regression check).
7. Clean up ALL temp users + their `emailVerifyTokens`/`passwordResetTokens` rows; confirm no throwaway scripts remain anywhere in the repo (`git status` clean except intended changes).

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/kiosk/CLAUDE.md CLAUDE.md
git commit -m "docs(auth): record email-verify soft gate (tokens, endpoints, banner)"
```

---

## Deferred / explicitly out of scope

- **Rate-limit (state 05)** — needs a persistent store; separate plan (also covers the forgot-password timing side-channel CWE-208).
- **CSRF/origin check on `POST /api/auth/resend-verification`** — cookie-authed state-changing POST without an origin check; a cross-site page could trigger a resend. Accepted for now: worst case is one email to the victim's OWN address per 60s (resend guard bounds it). Fold an `ALLOWED_ORIGINS`-style check (as in the contact relay) into the rate-limit/hardening plan.
- **"E-Mail ändern"** on the verify screen — email-change is an unbuilt account feature.
- **TTL indexes** on `emailVerifyTokens`/`passwordResetTokens` (expired rows are harmless and filtered by query; a cleanup index is an ops nicety, together with the email case-normalization quirk).
- **Hard gate / feature blocking for unverified users** — decided against (soft gate).
- **Email blast to existing unverified users** — decided against.
