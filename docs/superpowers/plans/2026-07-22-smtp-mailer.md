# SMTP Mailer (mailbox.org relay) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all outgoing app email (verify, password-reset, email-change, account-deletion, marketplace contact relay) actually send in production by adding an SMTP transport (mailbox.org, borrowed sender `noreply@ercan-atak.de`) behind one shared mailer, while fixing the pre-existing silent-failure bug in the Resend path.

**Architecture:** One new server-only module `src/lib/email/mailer.ts` chooses the transport: SMTP (nodemailer) when `SMTP_*` vars are set → Resend when `RESEND_API_KEY` is set (kept for the future own-domain switch) → neither means "not configured" and callers keep their existing per-flow dev-log fallbacks. `sendMail()` throws on every failure (including Resend's `{ error }` return, which its SDK does **not** throw on) and captures to Sentry with `flush(2000)` before rethrowing, so best-effort callers that swallow the error still leave a trace. The 5 existing send sites are rewired mechanically; only the contact relay gets a behavior change (honest 503 when no transport is configured in prod).

**Tech Stack:** nodemailer 7.x (+ `@types/nodemailer`), existing `resend` SDK (kept), `@react-email/render` (unchanged), `@sentry/astro` (already installed).

## Global Constraints

- **Secrets:** never print `SMTP_PASS` or any token to stdout/chat; the app password lands in `.env` typed by the user themself. `.env` is gitignored — verify nothing secret is staged before every commit (gitleaks pre-commit is armed; never `--no-verify`).
- **Shared prod DB:** local dev and production share MongoDB `CommunityWebApp-test`. Any smoke test that writes (register creates a user) MUST be followed by the cleanup step included in that task.
- **Dev server:** never touch the user's dev server on port 3000. Smoke tests start their own on **port 4399** (`pnpm dev --port 4399`) and kill it afterwards.
- **Type-check baseline:** `pnpm type-check` has a pre-existing baseline of **29 errors**. Success = error count ≤ 29 and none of the new errors mention files touched by this plan.
- **Env access convention:** `import.meta.env.*` in all `src/` files (never `process.env` — that's sanctioned only in `astro.config.mjs`).
- **Server-only imports:** `src/lib/email/mailer.ts` imports nodemailer + Sentry and must never be imported from client components (React/Svelte islands). All call sites in this plan are API routes or server libs.
- **Copy rule:** email subjects and dev-log message formats are preserved byte-for-byte from the current modules (listed verbatim in each task).
- **From-address rule:** the mailer never invents a From — it always uses `SENDING_FROM_EMAIL`. mailbox.org rejects sends from addresses not registered as alias; the value is set at go-live (manual section), not hardcoded in source. The in-code default stays the existing `'Mahalle <noreply@mahalle.berlin>'` (unchanged legacy default, documented as "must override via env for SMTP").
- **Commits:** simple concise messages, no Claude signature/footer, commit only what each task stages.

## Decisions (from the pre-plan audit)

1. **Transport order** SMTP → Resend → not-configured. SMTP is checked first so the borrowed-domain setup wins while a (currently absent) Resend key can't shadow it.
2. **Resend `{ error }` bug fixed in the same pass** — the SDK resolves successfully on API errors; every existing call site ignored that. The mailer throws on `error`.
3. **Sentry capture lives inside `sendMail()`** (capture + `await flush(2000)` + rethrow). All 7 call sites were verified to catch mail errors themselves (register + schedule.ts swallow-and-continue; forgot-password swallows into its anti-enumeration `generic()` 200; email-change start/resend catch and return 500 `send_failed`; contact.ts's outer catch returns its own 500) — nothing rethrows to the middleware, so this is a single capture point with no duplicates, and for forgot-password it is the ONLY visibility a mail failure gets. Flush is mandatory — Vercel freezes the instance when the response leaves (same lesson as `src/middleware.ts`).
4. **Serverless timeouts:** `connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000`, `requireTLS: true`, port 587 STARTTLS. Nodemailer defaults would hold a hung function for ~2 min.
5. **Contact relay honesty:** with no transport configured, prod returns `503 email_unavailable` **before** consuming rate limits or inserting metadata (today it silently "succeeds"). Dev logs the would-be mails and continues, keeping the flow testable.
6. **Per-flow dev-log fallbacks stay in the send modules** (they print the actionable *link*, which a generic mailer log would bury inside HTML). They now key off `isMailerConfigured()`.
7. **Vercel scope: Production only** for `SMTP_*` — Preview deploys never email real users. Precisely (because `import.meta.env.PROD` is `true` on Preview builds too): auth mails take the dev-log path (links appear in function logs only), while the contact relay **fails closed with 503** on Preview — honest, since its whole job is sending.
8. **No test framework exists in this repo** — verification is `pnpm type-check` (baseline rule above) + live dev-server smokes on :4399 + the manual go-live smoke.
9. **Transporter is a lazy module-level singleton** with pooling left off (nodemailer default): reused on warm instances, one fresh SMTP connection per send, no half-dead pooled sockets across freezes.

## File Structure

- **Create** `src/lib/email/mailer.ts` — transport chooser + `sendMail` + `isMailerConfigured` (single responsibility: how mail leaves the app).
- **Modify** `src/lib/auth/sendVerifyEmail.ts`, `sendResetEmail.ts`, `sendEmailChangeEmails.ts`, `sendDeletionEmails.ts` — mechanical rewire (what mail says stays here).
- **Modify** `src/pages/api/listings/[id]/contact.ts` — rewire + 503 guard.
- **Create** `docs/runbooks/smtp-mailer-smoke.md`; **Modify** `CLAUDE.md` (env section), `.env` (commented SMTP scaffold).

---

### Task 1: Shared mailer module

**Files:**
- Create: `src/lib/email/mailer.ts`
- Modify: `package.json` (via pnpm add)

**Interfaces:**
- Consumes: nothing from this plan (first task).
- Produces (used verbatim by Tasks 2–3):
  - `isMailerConfigured(): boolean`
  - `sendMail(input: { to: string; subject: string; html: string; replyTo?: string }): Promise<void>` — resolves on success, throws on any failure; must not be called when `isMailerConfigured()` is false (throws).

- [ ] **Step 1: Install dependencies**

```bash
pnpm add nodemailer && pnpm add -D @types/nodemailer
```

Expected: both appear in `package.json` (`nodemailer` in dependencies, `@types/nodemailer` in devDependencies), lockfile updated.

- [ ] **Step 2: Create `src/lib/email/mailer.ts`**

```typescript
// src/lib/email/mailer.ts — SERVER-ONLY (imports nodemailer + @sentry/astro;
// never import from client components/islands).
//
// Single transport chooser for ALL outgoing app email:
//   1. SMTP (mailbox.org relay) when SMTP_HOST + SMTP_USER + SMTP_PASS are set
//   2. Resend when RESEND_API_KEY is set (legacy path, kept for the future
//      own-domain switch — flipping back is a pure env change)
//   3. neither → isMailerConfigured() is false; callers keep their per-flow
//      dev-log fallbacks (they print the actionable LINK, not raw HTML).
//
// sendMail() THROWS on any failure — including Resend's { error } return,
// which its SDK does NOT throw on (this silently ate every failed send
// until July 2026). Failures are captured to Sentry WITH flush before the
// rethrow: several callers are deliberately best-effort and swallow the
// throw (register, forgot-password), and Vercel freezes the instance the
// moment the response leaves (same lesson as src/middleware.ts) — without
// the flush those captures never leave the building.
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import * as Sentry from '@sentry/astro';

const SMTP_HOST = import.meta.env.SMTP_HOST || '';
const SMTP_PORT = Number(import.meta.env.SMTP_PORT || '587');
const SMTP_USER = import.meta.env.SMTP_USER || '';
const SMTP_PASS = import.meta.env.SMTP_PASS || '';
const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || '';
// For SMTP this MUST be overridden via env to the alias registered at the
// SMTP provider (mailbox.org refuses unregistered From addresses). The
// default only preserves legacy Resend behavior.
const SENDING_FROM = import.meta.env.SENDING_FROM_EMAIL || 'Mahalle <noreply@mahalle.berlin>';

const smtpConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

export function isMailerConfigured(): boolean {
  return smtpConfigured || Boolean(RESEND_API_KEY);
}

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

// Lazy module-level singleton — reused on warm serverless instances.
// Pooling stays off (nodemailer default): one connection per send, no
// half-dead pooled sockets surviving a freeze/thaw cycle.
let transporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // 587 = STARTTLS
      requireTLS: true, // never fall back to plaintext
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      // Serverless: fail fast instead of holding the function open
      // (nodemailer defaults wait up to ~2 min).
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
}

export async function sendMail(input: MailInput): Promise<void> {
  try {
    if (smtpConfigured) {
      await getTransporter().sendMail({
        from: SENDING_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      });
      return;
    }
    if (RESEND_API_KEY) {
      const resend = new Resend(RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from: SENDING_FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      });
      if (error) {
        throw new Error(`Resend send failed: ${error.name}: ${error.message}`);
      }
      return;
    }
    throw new Error(
      'sendMail called with no mail transport configured — gate calls with isMailerConfigured()'
    );
  } catch (err) {
    Sentry.captureException(err, {
      tags: { component: 'mailer', transport: smtpConfigured ? 'smtp' : RESEND_API_KEY ? 'resend' : 'none' },
    });
    await Sentry.flush(2000);
    throw err;
  }
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check 2>&1 | tail -5`
Expected: error count ≤ 29, no errors in `src/lib/email/mailer.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/email/mailer.ts package.json pnpm-lock.yaml
git commit -m "feat(email): shared mailer with SMTP transport, Resend fallback, Sentry capture"
```

---

### Task 2: Rewire the four auth send modules

**Files:**
- Modify: `src/lib/auth/sendVerifyEmail.ts` (whole file)
- Modify: `src/lib/auth/sendResetEmail.ts` (whole file)
- Modify: `src/lib/auth/sendEmailChangeEmails.ts` (whole file)
- Modify: `src/lib/auth/sendDeletionEmails.ts` (whole file)

**Interfaces:**
- Consumes: `isMailerConfigured()`, `sendMail({ to, subject, html })` from `src/lib/email/mailer.ts` (Task 1).
- Produces: the four exported function signatures are UNCHANGED (`sendVerifyEmail(to, verifyLink)`, `sendPasswordResetEmail(to, resetLink)`, `sendEmailChangeVerify(to, verifyLink, newEmail)`, `sendEmailChangeNotice(to, newEmailMasked, profileLink)`, `sendAccountDeletionScheduled(to, deletionDate, undoLink)`) — no call-site route changes anywhere in this task.

Subjects and dev-log lines are copied byte-for-byte from the current files (they are restated in full below — do not re-word them).

- [ ] **Step 1: Replace `src/lib/auth/sendVerifyEmail.ts` with:**

```typescript
// src/lib/auth/sendVerifyEmail.ts — SERVER-ONLY.
// Renders the email-verification mail and hands it to the shared mailer
// (src/lib/email/mailer.ts — SMTP or Resend); with no transport configured
// it logs the link to the server console (dev-log fallback) so the flow is
// testable without credentials. Mirrors src/lib/auth/sendResetEmail.ts.
import React from 'react';
import { render } from '@react-email/render';
import VerifyEmail from '../../emails/VerifyEmail';
import { isMailerConfigured, sendMail } from '../email/mailer';

export async function sendVerifyEmail(to: string, verifyLink: string): Promise<void> {
  if (!isMailerConfigured()) {
    // Dev-log fallback: no transport → don't send, print the link so dev can test.
    console.log(`[verify-email] (dev) verify link for ${to}: ${verifyLink}`);
    return;
  }
  const html = await render(React.createElement(VerifyEmail, { verifyLink }));
  await sendMail({ to, subject: 'Mahalle — E-Mail bestätigen', html });
}
```

- [ ] **Step 2: Replace `src/lib/auth/sendResetEmail.ts` with:**

```typescript
// src/lib/auth/sendResetEmail.ts — SERVER-ONLY.
// Renders the reset mail and hands it to the shared mailer
// (src/lib/email/mailer.ts); with no transport configured it logs the link
// to the server console (dev-log fallback) so the flow is testable.
import React from 'react';
import { render } from '@react-email/render';
import PasswordResetEmail from '../../emails/PasswordResetEmail';
import { isMailerConfigured, sendMail } from '../email/mailer';

export async function sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
  if (!isMailerConfigured()) {
    // Dev-log fallback: no transport → don't send, print the link so dev can test.
    console.log(`[forgot-password] (dev) reset link for ${to}: ${resetLink}`);
    return;
  }
  const html = await render(React.createElement(PasswordResetEmail, { resetLink }));
  await sendMail({ to, subject: 'Mahalle — Passwort zurücksetzen', html });
}
```

- [ ] **Step 3: Replace `src/lib/auth/sendEmailChangeEmails.ts` with:**

```typescript
// src/lib/auth/sendEmailChangeEmails.ts — SERVER-ONLY.
// Renders the two email-change mails and hands them to the shared mailer
// (src/lib/email/mailer.ts); with no transport configured it logs to the
// server console (dev-log fallback). Mirrors src/lib/auth/sendVerifyEmail.ts.
import React from 'react';
import { render } from '@react-email/render';
import EmailChangeVerify from '../../emails/EmailChangeVerify';
import EmailChangeNotice from '../../emails/EmailChangeNotice';
import { isMailerConfigured, sendMail } from '../email/mailer';

/** Sent to the NEW address — must be confirmed before the swap takes effect. */
export async function sendEmailChangeVerify(to: string, verifyLink: string, newEmail: string): Promise<void> {
  if (!isMailerConfigured()) {
    console.log(`[email-change] (dev) verify link for ${to} (new email ${newEmail}): ${verifyLink}`);
    return;
  }
  const html = await render(React.createElement(EmailChangeVerify, { verifyLink, newEmail }));
  await sendMail({ to, subject: 'Mahalle — neue E-Mail-Adresse bestätigen', html });
}

/** Sent to the OLD address — heads-up only, no token/link except a plain profile pointer. */
export async function sendEmailChangeNotice(to: string, newEmailMasked: string, profileLink: string): Promise<void> {
  if (!isMailerConfigured()) {
    console.log(`[email-change] (dev) notice mail to ${to}: change requested to ${newEmailMasked} (${profileLink})`);
    return;
  }
  const html = await render(React.createElement(EmailChangeNotice, { newEmailMasked, profileLink }));
  await sendMail({ to, subject: 'Mahalle — E-Mail-Änderung angefordert', html });
}
```

- [ ] **Step 4: Replace `src/lib/auth/sendDeletionEmails.ts` with:**

```typescript
// src/lib/auth/sendDeletionEmails.ts — SERVER-ONLY.
// Renders the account-deletion-scheduled mail and hands it to the shared
// mailer (src/lib/email/mailer.ts); with no transport configured it logs to
// the server console (dev-log fallback). Mirrors src/lib/auth/sendEmailChangeEmails.ts.
import React from 'react';
import { render } from '@react-email/render';
import AccountDeletionScheduled from '../../emails/AccountDeletionScheduled';
import { isMailerConfigured, sendMail } from '../email/mailer';

/** Sent when a deletion is first scheduled — carries the undo link. */
export async function sendAccountDeletionScheduled(
  to: string,
  deletionDate: Date,
  undoLink: string
): Promise<void> {
  if (!isMailerConfigured()) {
    console.log(
      `[account-deletion] (dev) scheduled for ${to}, deletion at ${deletionDate.toISOString()}, undo link: ${undoLink}`
    );
    return;
  }
  const html = await render(
    React.createElement(AccountDeletionScheduled, { deletionDate: deletionDate.toISOString(), undoLink })
  );
  await sendMail({ to, subject: 'Mahalle — Konto-Löschung vorgemerkt', html });
}
```

- [ ] **Step 5: Confirm no `resend` import remains in `src/lib/auth/`**

Run: `grep -rn "from 'resend'" src/lib/auth/`
Expected: no output.

- [ ] **Step 6: Type-check**

Run: `pnpm type-check 2>&1 | tail -5`
Expected: error count ≤ 29, none in the four touched files.

- [ ] **Step 7: Live dev-log smoke (register flow, e2e through the real route)**

Local `.env` has neither `SMTP_*` nor `RESEND_API_KEY`, so this proves the `isMailerConfigured() === false` path end-to-end. **Do NOT use port 3000.**

```bash
pnpm dev --port 4399 > /tmp/mailer-smoke-dev.log 2>&1 &
DEV_PID=$!
until curl -sf http://localhost:4399/ > /dev/null; do sleep 1; done
curl -s -X POST http://localhost:4399/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Mailer Smoketest","email":"mailer-smoke-task2@example.com","password":"smoke-test-pw-123"}'
sleep 2
grep "verify link for mailer-smoke-task2@example.com" /tmp/mailer-smoke-dev.log
kill $DEV_PID
```

Expected: register returns `{"success":true,...}` and the grep prints the `[verify-email] (dev) verify link …` line.

- [ ] **Step 8: MANDATORY cleanup (shared prod DB!)**

```bash
node --env-file=.env -e "
const { MongoClient } = require('mongodb');
(async () => {
  const c = await MongoClient.connect(process.env.MONGODB_URI);
  const db = c.db();
  const u = await db.collection('users').findOne({ email: 'mailer-smoke-task2@example.com' });
  if (u) {
    await db.collection('emailVerifyTokens').deleteMany({ userId: u._id });
    await db.collection('emailVerifyTokens').deleteMany({ userId: u._id.toString() });
    const r = await db.collection('users').deleteOne({ _id: u._id });
    console.log('deleted user:', r.deletedCount === 1);
  } else console.log('no smoke user found');
  await c.close();
})().catch(e => { console.error(e.message); process.exit(1); });
"
```

Expected: `deleted user: true`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/auth/sendVerifyEmail.ts src/lib/auth/sendResetEmail.ts src/lib/auth/sendEmailChangeEmails.ts src/lib/auth/sendDeletionEmails.ts
git commit -m "refactor(email): auth send modules use shared mailer"
```

---

### Task 3: Contact relay on the shared mailer + honest 503

**Files:**
- Modify: `src/pages/api/listings/[id]/contact.ts`

**Interfaces:**
- Consumes: `isMailerConfigured()`, `sendMail({ to, subject, html, replyTo? })` from `src/lib/email/mailer.ts` (Task 1).
- Produces: route response contract gains one case: `503 {"error":"email_unavailable"}` when no transport is configured in prod. Everything else unchanged.

Context for the implementer: this route today (a) can never see a Resend failure because the SDK doesn't throw — its "owner email MUST succeed" comment is currently false — and (b) with no key configured it silently pretends success. Both end here.

- [ ] **Step 1: Replace the env block (lines ~22–26)**

Old:
```typescript
const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || '';
if (!RESEND_API_KEY && import.meta.env.PROD) {
  console.error('[contact] RESEND_API_KEY is required in production');
}
const SENDING_FROM = import.meta.env.SENDING_FROM_EMAIL || 'Mahalle <noreply@mahalle.berlin>';
```

New:
```typescript
// Mail transport (SMTP or Resend) comes from the shared mailer — see
// src/lib/email/mailer.ts. Without one, prod fails closed (503 below):
// this route's whole job is sending mail, pretending success would eat
// buyer messages silently (it did, until July 2026).
```

- [ ] **Step 2: Swap imports**

Old (line 6): `import { Resend } from 'resend';`
New: `import { isMailerConfigured, sendMail } from '../../../../lib/email/mailer';`

- [ ] **Step 3: Add the fail-closed guard directly after the origin CSRF check (step "2." in the route, ~line 71)**

```typescript
  // 2b. Mail transport must exist in prod — fail closed BEFORE consuming
  // rate limits or writing metadata. Dev continues (dev-log at the send step).
  if (!isMailerConfigured() && import.meta.env.PROD) {
    return jsonErr('email_unavailable', 503);
  }
```

- [ ] **Step 4: Replace the send block (section "15." — owner email + confirmation email)**

Old:
```typescript
    const resend = new Resend(RESEND_API_KEY);

    // (a) Owner email MUST succeed — if it throws the catch returns 500.
    await resend.emails.send({
      from: SENDING_FROM,
      to: seller.email,
      replyTo: email,
      subject: `Nachricht zu deiner Anzeige „${safeTitle}"`,
      html: ownerHtml,
    });
```

New:
```typescript
    // (a) Owner email MUST succeed — sendMail throws on failure (real
    // failures now actually throw, unlike the old SDK path) and the
    // outer catch returns 500. Dev without transport: log instead.
    if (isMailerConfigured()) {
      await sendMail({
        to: seller.email,
        replyTo: email,
        subject: `Nachricht zu deiner Anzeige „${safeTitle}"`,
        html: ownerHtml,
      });
    } else {
      console.log(`[contact] (dev) owner mail to ${seller.email} (replyTo ${email}) for listing "${safeTitle}"`);
    }
```

Old (confirmation, inside its existing try/catch):
```typescript
      await resend.emails.send({
        from: SENDING_FROM,
        to: email,
        subject: `Bestätigung: Nachricht zu „${safeTitle}" gesendet`,
        html: confirmHtml,
      });
```

New:
```typescript
      if (isMailerConfigured()) {
        await sendMail({
          to: email,
          subject: `Bestätigung: Nachricht zu „${safeTitle}" gesendet`,
          html: confirmHtml,
        });
      } else {
        console.log(`[contact] (dev) confirmation mail to ${email} for listing "${safeTitle}"`);
      }
```

The `console.warn('[contact] confirmation send failed (owner email succeeded):', e)` catch stays as-is (Sentry capture already happened inside `sendMail`).

- [ ] **Step 5: Verify nothing else references the removed consts**

Run: `grep -n "RESEND_API_KEY\|SENDING_FROM\|Resend" 'src/pages/api/listings/[id]/contact.ts'`
Expected: no output (the comment from Step 1 contains none of these tokens).

- [ ] **Step 6: Type-check**

Run: `pnpm type-check 2>&1 | tail -5`
Expected: error count ≤ 29, none in `contact.ts`.

- [ ] **Step 7: Route-loads smoke (no DB writes)**

The full relay e2e would write rate-limit + metadata records into the shared prod DB; the transport plumbing is already proven by Task 2's smoke, so here we only prove the module graph still loads and validates:

```bash
pnpm dev --port 4399 > /tmp/contact-smoke-dev.log 2>&1 &
DEV_PID=$!
until curl -sf http://localhost:4399/ > /dev/null; do sleep 1; done
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:4399/api/listings/000000000000000000000000/contact \
  -H 'Content-Type: application/json' -d '{}'
kill $DEV_PID
```

Expected: `400` (Zod/body validation reached → imports resolved, no 500 from a broken module graph). Also confirm `/tmp/contact-smoke-dev.log` shows no import/SSR errors for the route.

- [ ] **Step 8: Commit**

```bash
git add 'src/pages/api/listings/[id]/contact.ts'
git commit -m "refactor(email): contact relay uses shared mailer, fails closed without transport"
```

---

### Task 4: Docs, env scaffold, go-live runbook

**Files:**
- Modify: `CLAUDE.md` (Environment Variables section)
- Modify: `.env` (append commented scaffold — contains NO secret values)
- Create: `docs/runbooks/smtp-mailer-smoke.md`

**Interfaces:**
- Consumes: knowledge of Tasks 1–3 (documented behavior).
- Produces: nothing consumed by code.

- [ ] **Step 1: Update `CLAUDE.md` env section**

In the `## Environment Variables` block, replace these two lines:

```
RESEND_API_KEY=         # Resend.com API key (marketplace contact relay)
SENDING_FROM_EMAIL=     # e.g. "Mahalle <noreply@mahalle.berlin>" (contact relay sender)
```

with:

```
SMTP_HOST=              # SMTP relay host (currently smtp.mailbox.org). With SMTP_USER+SMTP_PASS set, SMTP is the active mail transport (wins over Resend).
SMTP_PORT=              # 587 (STARTTLS; 465 = implicit TLS also supported)
SMTP_USER=              # SMTP login (mailbox.org account, e.g. atakee@mailbox.org)
SMTP_PASS=              # mailbox.org APP password (not the account password). Secret.
RESEND_API_KEY=         # Resend.com API key — legacy/fallback transport, used only when no SMTP_* is set. Kept for the future own-domain switch.
SENDING_FROM_EMAIL=     # e.g. "Mahalle <noreply@ercan-atak.de>". For SMTP this MUST be an address registered at the provider (mailbox.org "Externes Alias") or sends are rejected. All app email (auth + contact relay) uses it.
```

Then insert a new `###` subsection into `## Key Architecture Patterns`, immediately after the `### API Routes` subsection:

```markdown
### Outgoing Email (shared mailer)
- **One transport chooser**: `src/lib/email/mailer.ts` (SERVER-ONLY) — SMTP (nodemailer, mailbox.org) when `SMTP_HOST/USER/PASS` set, else Resend when `RESEND_API_KEY` set, else "not configured" and each send module dev-logs its link instead of sending. `sendMail()` THROWS on failure — including Resend's `{ error }` return, which the SDK does not throw on — and captures to Sentry with `flush(2000)` before rethrowing (best-effort callers swallow the throw; Vercel freeze would eat an unflushed capture).
- **Send modules** (`src/lib/auth/send*.ts`, contact relay) own copy + dev-log fallbacks; the mailer owns transport, From (`SENDING_FROM_EMAIL`), timeouts (10s connect, `requireTLS`).
- **Contact relay fails closed**: `POST /api/listings/[id]/contact` returns `503 email_unavailable` in prod when no transport is configured (before rate-limit/metadata writes).
- **Vercel scope**: `SMTP_*` in Production only — Preview deploys never email real users (auth mails dev-log into function logs; the contact relay 503s there since `import.meta.env.PROD` is true on Preview builds too). Runbook: `docs/runbooks/smtp-mailer-smoke.md`.
```

- [ ] **Step 2: Append the scaffold to `.env`** (comments only, no secrets):

```bash
cat >> .env << 'EOF'

# ─── Outgoing email (SMTP via mailbox.org — see docs/runbooks/smtp-mailer-smoke.md)
# SMTP_HOST=smtp.mailbox.org
# SMTP_PORT=587
# SMTP_USER=atakee@mailbox.org
# mailbox.org APP password — user fills in themself; NEVER commit/echo it.
# Keep the value alone on the line (no inline comment — the runbook pipes it to Vercel).
# SMTP_PASS=
# SENDING_FROM_EMAIL=Mahalle <noreply@ercan-atak.de>
EOF
```

- [ ] **Step 3: Create `docs/runbooks/smtp-mailer-smoke.md`**

```markdown
# SMTP mailer go-live runbook

Prereq (manual, account owner): `noreply@ercan-atak.de` registered as
"Externes Alias" at mailbox.org; an APP password created (Settings →
Security → App passwords). Transactional mail only — no bulk/newsletters
(personal mail host). Never put a `@mailbox.org` From through third-party
SMTP (DMARC p=reject) — always send from the alias.

## 1. Local real-send smoke
1. Uncomment + fill the `SMTP_*`/`SENDING_FROM_EMAIL` block in `.env`
   (app password typed by the account owner, never echoed).
2. Restart dev server, trigger a forgot-password for YOUR OWN test account
   → mail arrives from "Mahalle <noreply@ercan-atak.de>"; check spam
   folder + that the verify/reset link points at the right origin.
3. On failure: the thrown error is in the dev-server console AND in Sentry
   (tag `component:mailer`). Typical: 535 = wrong app password;
   "sender address rejected" = alias not registered / SENDING_FROM_EMAIL
   mismatch.

## 2. Vercel (Production scope ONLY — by design Preview never emails real
users: auth mails dev-log into function logs, the contact relay 503s)
    printf '%s' "smtp.mailbox.org" | vercel env add SMTP_HOST production
    printf '%s' "587"              | vercel env add SMTP_PORT production
    printf '%s' "atakee@mailbox.org" | vercel env add SMTP_USER production
    # SMTP_PASS: pipe from .env so the value never appears in a terminal:
    grep '^SMTP_PASS=' .env | cut -d= -f2- | tr -d '\n' | vercel env add SMTP_PASS production
    printf '%s' "Mahalle <noreply@ercan-atak.de>" | vercel env add SENDING_FROM_EMAIL production
Then redeploy (`git push` or `vercel redeploy`).

## 3. Prod smoke
1. Forgot-password on prod for your own account → mail arrives.
2. Marketplace contact form on a test listing → owner mail + confirmation
   arrive (delete the `listingContacts` metadata row afterwards if it was
   a pure test).
3. Sentry: no new `component:mailer` events.

## 4. Later: own domain
Register the new alias at mailbox.org (dashboard, account owner), change
`SENDING_FROM_EMAIL` in `.env` + Vercel — no code change. Moving back to
Resend one day: set `RESEND_API_KEY`, remove `SMTP_*` — also no code change.
```

- [ ] **Step 4: Verify no secret staged**

Run: `git diff --cached --stat; git status --short .env`
Expected: `.env` shows as modified but MUST NOT be staged (`.env` is gitignored — if it appears in the diff, STOP).

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/runbooks/smtp-mailer-smoke.md
git commit -m "docs(email): SMTP mailer env vars + go-live runbook"
```

---

## Post-plan (manual, with the user)

1. User fills `SMTP_PASS` (+ uncomments the block) in `.env` — runbook §1 local smoke together.
2. Runbook §2 Vercel env + deploy, §3 prod smoke.
3. Merge decision + push per user instruction (never auto-push).
