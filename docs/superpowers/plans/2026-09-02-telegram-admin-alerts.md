# Telegram Admin Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every relevant app event pings the single admin on Telegram (full firehose), the admin-action subset also mirrors to email, and Sentry issue alerts forward to Telegram via a secret-guarded webhook.

**Architecture:** One new server-only module `src/lib/adminAlerts.ts` owns transport (raw Telegram Bot API POST + existing `sendMail`) and per-kind message builders; existing write endpoints each gain one awaited never-throw builder call after their successful write. A new public endpoint `/api/hooks/sentry` (middleware-allowlisted, constant-time secret check) bridges Sentry alert-rule webhooks to Telegram.

**Tech Stack:** Astro API routes (TypeScript), fetch + AbortController (no Telegram SDK), existing `src/lib/email/mailer.ts`, `@sentry/astro` capture helpers.

**Spec:** `docs/superpowers/specs/2026-09-02-telegram-admin-alerts-design.md` — the binding authority; conflicts resolve against it.

## Global Constraints

- `sendAdminAlert` is **never-throw**: all failures → static `Sentry.captureMessage('admin alert delivery failed', ...)` with details in `extra` (NEVER a variable message string) + `await Sentry.flush(2000)`.
- Callers **await** the alert call (best-effort inside the request window) — never `void`-dropped; Vercel freeze eats un-awaited work.
- Telegram leg: 10s AbortController timeout; plain text (`disable_web_page_preview: true`, no `parse_mode`).
- Email leg fires ONLY for kinds `member_new` | `moderation_flagged` | `report_new`, to `ADMIN_ALERT_EMAIL`, and its own try/catch (the mailer THROWS by design; here it must not, and must not prevent the Telegram leg, which runs first). `sentry_issue` never emails.
- Config gates: unset `TELEGRAM_BOT_TOKEN`/`TELEGRAM_ADMIN_CHAT_ID` ⇒ TG leg no-op; unset `ADMIN_ALERT_EMAIL` ⇒ email leg no-op; `/api/hooks/sentry` with unset `SENTRY_WEBHOOK_SECRET` ⇒ always 401 (fail-closed).
- **Self-suppression**: no alert for events the admin causes himself. On create/edit sites reuse the existing `skipModeration` const (`session.user.role === 'admin'`); on reports/contact check `session.user.role !== 'admin'`.
- **No double-fire**: per creation, EITHER `content_new` (clean → approved) OR `moderation_flagged` (a flagged record was written) — never both. News submit sends `moderation_flagged` only (every non-admin submission gets a queue record).
- Alert failures must never change any endpoint's response or status.
- Response JSON shapes of touched endpoints must not change.
- Links in messages: absolute `https://mahalle.digital/...` via the module const `ALERT_BASE_URL` (NOT `getTrustedBaseUrl()` — that is auth-flow-specific and fail-closed).
- Budgets (ratchet): `pnpm type-check` ≤27 errors, `npx -y svelte-check@4` ≤94 — run type-check after every task.
- No unit-test framework exists; per-task gate = type-check, end-to-end = Task 5.
- Commits: simple concise messages, NO Claude signature, NO Co-Authored-By footer. Never stage secrets — all four new env values live in `.env`/Vercel only.
- **Import-path depth varies per file** — count directories from the editing file to `src/lib/adminAlerts`, don't copy a fixed relative path: `api/<x>/create.ts` → `../../../lib/adminAlerts`; `api/auth/register.ts`, `api/comments/create.ts`, `api/reports/submit.ts` → `../../../lib/adminAlerts`; `api/<x>/edit/[id].ts` and `api/listings/[id]/contact.ts` → `../../../../lib/adminAlerts`; `api/listings/draft/[id]/publish.ts` → `../../../../../lib/adminAlerts`. A wrong depth is a tsc error (caught by the ≤27 budget check) but wastes a fix round.

---

### Task 1: Alert core module + env docs

**Files:**
- Create: `src/lib/adminAlerts.ts`
- Modify: `CLAUDE.md` (Environment Variables block)

**Interfaces:**
- Consumes: `sendMail`, `isMailerConfigured` from `src/lib/email/mailer.ts`; `* as Sentry` from `@sentry/astro`.
- Produces (used verbatim by Tasks 2–4):
  - `alertNewMember(p: { name: string; handle: string }): Promise<void>`
  - `alertModerationFlagged(p: { contentType: string; title: string; authorName?: string | null }): Promise<void>`
  - `alertReport(p: { contentType: string; title?: string; reason: string }): Promise<void>`
  - `alertContentNew(p: { type: string; title: string; authorName?: string | null; pending: boolean }): Promise<void>`
  - `alertComment(p: { authorName?: string | null; parentTitle: string }): Promise<void>`
  - `alertContactRelay(p: { listingTitle: string }): Promise<void>`
  - `alertSentryIssue(p: { title: string; url?: string }): Promise<void>`

- [ ] **Step 1: Write the module**

```typescript
// src/lib/adminAlerts.ts — SERVER-ONLY. One-way operational alerts to the
// single admin: Telegram (all kinds) + email mirror (admin-action kinds).
// Contract: never throws, never blocks a user request beyond its 10s cap,
// silent no-op when env is unset (dev + preview deploys stay quiet).
import * as Sentry from '@sentry/astro';
import { isMailerConfigured, sendMail } from './email/mailer';

type AdminAlertKind =
  | 'member_new'
  | 'moderation_flagged'
  | 'report_new'
  | 'content_new'
  | 'comment_new'
  | 'contact_relay'
  | 'sentry_issue';

const EMAIL_KINDS: ReadonlySet<AdminAlertKind> = new Set([
  'member_new',
  'moderation_flagged',
  'report_new',
]);

const ALERT_BASE_URL = 'https://mahalle.digital';
const MOD_QUEUE_URL = `${ALERT_BASE_URL}/admin/moderation`;

function trunc(s: string, n = 80): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

export async function sendAdminAlert(alert: { kind: AdminAlertKind; text: string }): Promise<void> {
  try {
    // Telegram leg first (primary channel).
    const token = import.meta.env.TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.TELEGRAM_ADMIN_CHAT_ID;
    if (token && chatId) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: alert.text,
            disable_web_page_preview: true,
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          Sentry.captureMessage('admin alert delivery failed', {
            level: 'warning',
            extra: { leg: 'telegram', kind: alert.kind, status: res.status },
          });
          await Sentry.flush(2000);
        }
      } finally {
        clearTimeout(timer);
      }
    }

    // Email mirror — admin-action kinds only.
    const mirrorTo = import.meta.env.ADMIN_ALERT_EMAIL;
    if (mirrorTo && EMAIL_KINDS.has(alert.kind) && isMailerConfigured()) {
      try {
        await sendMail({
          to: mirrorTo,
          subject: `[Mahalle] ${alert.text.split('\n')[0].slice(0, 100)}`,
          html: `<p>${alert.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`,
        });
      } catch (e) {
        Sentry.captureMessage('admin alert delivery failed', {
          level: 'warning',
          extra: { leg: 'email', kind: alert.kind, error: String(e) },
        });
        await Sentry.flush(2000);
      }
    }
  } catch (e) {
    // Belt and suspenders: nothing escapes to the caller.
    Sentry.captureMessage('admin alert delivery failed', {
      level: 'warning',
      extra: { leg: 'outer', kind: alert.kind, error: String(e) },
    });
    await Sentry.flush(2000);
  }
}

// --- Per-kind builders: call sites stay one-liners. Terse German copy. ---

export function alertNewMember(p: { name: string; handle: string }): Promise<void> {
  return sendAdminAlert({
    kind: 'member_new',
    text: `🆕 Neues Mitglied: ${trunc(p.name)} (@${p.handle})`,
  });
}

export function alertModerationFlagged(p: { contentType: string; title: string; authorName?: string | null }): Promise<void> {
  const von = p.authorName ? ` von ${trunc(p.authorName, 40)}` : '';
  return sendAdminAlert({
    kind: 'moderation_flagged',
    text: `🚩 Moderation (${p.contentType}): „${trunc(p.title)}"${von}\n→ ${MOD_QUEUE_URL}`,
  });
}

export function alertReport(p: { contentType: string; title?: string; reason: string }): Promise<void> {
  const titel = p.title ? ` „${trunc(p.title)}"` : '';
  return sendAdminAlert({
    kind: 'report_new',
    text: `⚠️ Meldung (${p.contentType})${titel} — Grund: ${trunc(p.reason, 60)}\n→ ${MOD_QUEUE_URL}`,
  });
}

export function alertContentNew(p: { type: string; title: string; authorName?: string | null; pending: boolean }): Promise<void> {
  const von = p.authorName ? ` von ${trunc(p.authorName, 40)}` : '';
  return sendAdminAlert({
    kind: 'content_new',
    text: `📝 Neu (${p.type}): „${trunc(p.title)}"${von} — ${p.pending ? 'wartet auf Freigabe' : 'live'}`,
  });
}

export function alertComment(p: { authorName?: string | null; parentTitle: string }): Promise<void> {
  const von = p.authorName ? ` von ${trunc(p.authorName, 40)}` : '';
  return sendAdminAlert({
    kind: 'comment_new',
    text: `💬 Kommentar${von} zu „${trunc(p.parentTitle)}"`,
  });
}

export function alertContactRelay(p: { listingTitle: string }): Promise<void> {
  return sendAdminAlert({
    kind: 'contact_relay',
    text: `📬 Marktplatz-Kontakt zu „${trunc(p.listingTitle)}"`,
  });
}

export function alertSentryIssue(p: { title: string; url?: string }): Promise<void> {
  return sendAdminAlert({
    kind: 'sentry_issue',
    text: `🔴 Sentry: ${trunc(p.title, 120)}${p.url ? `\n→ ${p.url}` : ''}`,
  });
}
```

NOTE: check `isMailerConfigured` is exported from `src/lib/email/mailer.ts` (it is — used by `contact.ts`). If `import.meta.env` typing complains for the new vars, that matches existing untyped envs (e.g. `CRON_SECRET`) — access via `import.meta.env.X` is fine untyped; do NOT add an env.d.ts entry unless type-check errors exceed budget.

- [ ] **Step 2: No-op smoke (env unset)**

Run: `npx tsx --eval "import('./src/lib/adminAlerts.ts').then(async m => { await m.alertNewMember({name:'T',handle:'t'}); console.log('no-throw OK'); })"`
Expected: prints `no-throw OK` (import.meta.env is inert under plain tsx — that IS the unset case). If tsx chokes on `import.meta.env`, skip this step; Task 5's E2E covers it.

- [ ] **Step 3: Env docs**

In `CLAUDE.md`'s Environment Variables block, append after the `IMPRESSUM_ZIP_CITY=` line:

```
TELEGRAM_BOT_TOKEN=     # BotFather token for the admin-alerts bot. SERVER-ONLY secret (Vercel Sensitive). Unset ⇒ Telegram alerts silently no-op (dev/preview default).
TELEGRAM_ADMIN_CHAT_ID= # Numeric chat id of the admin↔bot DM (from getUpdates after /start). Server-only.
ADMIN_ALERT_EMAIL=      # Email mirror recipient for admin-action alerts (member/moderation/report). Unset ⇒ email leg no-op.
SENTRY_WEBHOOK_SECRET=  # Random 32+ chars guarding POST /api/hooks/sentry. Unset ⇒ endpoint fail-closed 401.
```

- [ ] **Step 4: Verify budget**

Run: `pnpm type-check 2>&1 | grep -cE "error ts|error TS"`
Expected: ≤27.

- [ ] **Step 5: Commit**

```bash
git add src/lib/adminAlerts.ts CLAUDE.md
git commit -m "feat: admin alerts core (telegram + email mirror)"
```

---

### Task 2: Hooks on create/publish sites (content_new / moderation_flagged)

**Files (Modify):**
- `src/pages/api/topics/create.ts`
- `src/pages/api/events/create.ts`
- `src/pages/api/announcements/create.ts`
- `src/pages/api/recommendations/create.ts`
- `src/pages/api/listings/create.ts`
- `src/pages/api/listings/draft/[id]/publish.ts`
- `src/pages/api/news/submit.ts`
- `src/pages/api/comments/create.ts`

**Interfaces:**
- Consumes: `alertContentNew`, `alertModerationFlagged`, `alertComment` from Task 1.

All eight files already carry `const skipModeration = session.user.role === 'admin';` and a `mergedResult` that is non-null exactly when a flagged record was written (admin ⇒ always null). That gives the either/or rule for free.

- [ ] **Step 1: topics/create.ts** — import `{ alertContentNew, alertModerationFlagged }` from `'../../../lib/moderation'`-adjacent path `'../../../lib/adminAlerts'`. Immediately BEFORE the final response block (after the flagged-record `if (mergedResult) {...}` block and the author fetch), add:

```typescript
    // Operational admin alert (never-throw, no-op without env). Admin's own
    // posts are exempt from moderation AND from self-alerting.
    if (!skipModeration) {
      if (mergedResult) {
        await alertModerationFlagged({ contentType: 'topic', title, authorName: session.user.name });
      } else {
        await alertContentNew({ type: 'topic', title, authorName: session.user.name, pending: false });
      }
    }
```

- [ ] **Step 2: events/create.ts** — same insertion point and shape, with `contentType: 'event'` / `type: 'event'` and the event's `title` variable.

- [ ] **Step 3: announcements/create.ts** — same, `'announcement'`.

- [ ] **Step 4: recommendations/create.ts** — same, `'recommendation'`.

- [ ] **Step 5: listings/create.ts** — same pattern after its flagged-record block, but the clean branch keys off `moderationStatus` (admins and clean listings are both `'approved'`):

```typescript
    if (!skipModeration) {
      if (mergedResult) {
        await alertModerationFlagged({ contentType: 'marketplace', title, authorName: session.user.name });
      } else {
        await alertContentNew({ type: 'marketplace', title, authorName: session.user.name, pending: moderationStatus === 'pending' });
      }
    }
```
(`pending` is always false when `mergedResult` is null here — keep the expression anyway, it is self-documenting and immune to future status logic drift.)

- [ ] **Step 6: listings/draft/[id]/publish.ts** — same as Step 5 with `title: draft.title`.

- [ ] **Step 7: news/submit.ts** — news is special: every non-admin submission goes to the editorial queue (clean or flagged), so it sends `moderation_flagged` ONLY, never `content_new`:

```typescript
    if (!skipModeration) {
      await alertModerationFlagged({ contentType: 'news', title, authorName: session.user.name });
    }
```
Place it after the queue-record block (inside or right after the existing `if (!skipModeration) { ... }` that writes the queue record — appending it as the last statement INSIDE that existing gate is cleanest).
ACCEPTED copy nuance: a CLEAN non-admin news submission still routes to the editorial queue and thus sends `🚩 Moderation (news)` — slightly alarmist for unflagged content, but it IS a queue item awaiting review, which is what the admin needs to know. Left as-is (spec defines `moderation_flagged` as "new item in the moderation queue"). Do not add a separate news-clean copy.

- [ ] **Step 8: comments/create.ts** — two branches already exist. In the flagged branch (inside `if (mergedResult) {...}`, after `flaggedCollection.insertOne`), add:

```typescript
      await alertModerationFlagged({ contentType: 'comment', title: body.slice(0, 80), authorName: session.user.name });
```
In the clean branch: `parentDoc` is declared INSIDE the `else { ... }` block, and the existing `notify(...)` sits in a nested `if (parentDoc?.author)`. Place the alert inside the else-block but AFTER the closing brace of that inner `if` (so a parent without an author still alerts):

```typescript
      if (!skipModeration) {
        await alertComment({ authorName: session.user.name, parentTitle: parentDoc?.title ?? '' });
      }
```
(The flagged branch needs no `skipModeration` guard — `mergedResult` is always null for admins.)

- [ ] **Step 9: Verify budget** — `pnpm type-check 2>&1 | grep -cE "error ts|error TS"` ⇒ ≤27.

- [ ] **Step 10: Commit**

```bash
git add src/pages/api/topics/create.ts src/pages/api/events/create.ts src/pages/api/announcements/create.ts src/pages/api/recommendations/create.ts src/pages/api/listings/create.ts 'src/pages/api/listings/draft/[id]/publish.ts' src/pages/api/news/submit.ts src/pages/api/comments/create.ts
git commit -m "feat: admin alerts on create/publish endpoints"
```

---

### Task 3: Hooks on edits, register, reports, contact relay

**Files (Modify):**
- `src/pages/api/topics/edit/[id].ts`, `src/pages/api/events/edit/[id].ts`, `src/pages/api/comments/edit/[commentId].ts`, `src/pages/api/listings/edit/[id].ts` (flagged-on-edit)
- `src/pages/api/auth/register.ts` (member_new)
- `src/pages/api/reports/submit.ts` (report_new, both branches)
- `src/pages/api/listings/[id]/contact.ts` (contact_relay)

**Interfaces:**
- Consumes: `alertModerationFlagged`, `alertNewMember`, `alertReport`, `alertContactRelay` from Task 1.

- [ ] **Step 1: The four edit paths** — in each, inside the existing flagged block (`if (mergedModerationResult)` in topics/edit; `if (mergedResult)` in the other three), immediately after the `flaggedCollection.insertOne(...)` line, add one call (no extra guard needed — merged is always null for admins):
  - topics/edit: `await alertModerationFlagged({ contentType: 'topic', title, authorName: session.user.name });`
  - events/edit: `await alertModerationFlagged({ contentType: 'event', title: nextTitle, authorName: session.user.name });`
  - comments/edit: VERIFIED — this file has NO `flaggedCollection.insertOne` (it only flips the comment's status back to pending). Place `await alertModerationFlagged({ contentType: 'comment', title: body.slice(0, 80), authorName: session.user.name });` after the `findOneAndUpdate`, wrapped in `if (mergedResult) { ... }`.
  - listings/edit: `await alertModerationFlagged({ contentType: 'marketplace', title, authorName: session.user.name });` (inside its `if (mergedResult)` block, after the flagged insert; `title` is already in scope there).

- [ ] **Step 2: register.ts** — import `alertNewMember` (path `'../../../lib/adminAlerts'`). After the `if (!result) {...}` guard (so registration definitely succeeded) and BEFORE the verification-email block, add:

```typescript
        // Operational admin alert (never-throw; no-op without env). The final
        // handle is whatever the retry loop landed on — recompute is not
        // possible here, so re-derive from the last loop state: re-read it.
        const createdUser = await db.collection('users').findOne(
          { _id: result.insertedId },
          { projection: { name: 1, handle: 1 } }
        );
        await alertNewMember({ name: createdUser?.name ?? name, handle: createdUser?.handle ?? '' });
```
(The `handle` const is loop-scoped; one projected read is simpler and correct. No self-suppression: registration has no session.)

- [ ] **Step 3: reports/submit.ts** — import `alertReport`. Two insertion points, both guarded by `if (session.user.role !== 'admin')`:
  1. In the existing-record branch, after the `flaggedCollection.updateOne(...)` (additional reporter), before its return.
  2. In the new-record branch, after `await flaggedCollection.insertOne(flaggedRecord as FlaggedContent);`.
Both calls: `await alertReport({ contentType, title: contentSnapshot.title, reason });`

- [ ] **Step 4: contact.ts** — import `alertContactRelay`. VERIFIED: this handler reads NO session (auth is enforced by the middleware gate; the buyer is anonymous-by-design in this endpoint — GDPR Option C). Therefore NO self-suppression guard here (an admin using the relay is a legitimate rare event, and no role is available to check). After the `contactsCol.insertOne({...})` metadata write, add:

```typescript
    // Admin alert: fact of contact only, never message content (GDPR stance).
    await alertContactRelay({ listingTitle: safeTitle });
```

- [ ] **Step 5: Verify budget** — `pnpm type-check` ⇒ ≤27 errors.

- [ ] **Step 6: Commit**

```bash
git add 'src/pages/api/topics/edit/[id].ts' 'src/pages/api/events/edit/[id].ts' 'src/pages/api/comments/edit/[commentId].ts' 'src/pages/api/listings/edit/[id].ts' src/pages/api/auth/register.ts src/pages/api/reports/submit.ts 'src/pages/api/listings/[id]/contact.ts'
git commit -m "feat: admin alerts on edits, registration, reports, contact relay"
```

---

### Task 4: Sentry → Telegram bridge

**Files:**
- Create: `src/pages/api/hooks/sentry.ts`
- Modify: `src/middleware.ts` (API_ALLOWLIST, currently `['/api/news/fetch-daily']` at ~line 77)

**Interfaces:**
- Consumes: `alertSentryIssue` from Task 1.

- [ ] **Step 1: Write the endpoint**

```typescript
// POST /api/hooks/sentry — bridge: Sentry alert-rule webhook → Telegram.
// Public route (middleware-allowlisted) guarded by SENTRY_WEBHOOK_SECRET in
// the query string (Sentry internal-integration webhooks can't set custom
// headers per-rule). Fail-closed: unset secret ⇒ always 401.
// ACCEPTED TRADE-OFF: a query-string secret can surface in request logs;
// it guards only alert spam (worst case: bogus Telegram pings) and is
// rotatable at zero cost. Upgrade path if ever needed: verify Sentry's
// sentry-hook-signature header instead.
import type { APIRoute } from 'astro';
import { timingSafeEqual } from 'node:crypto';
import { alertSentryIssue } from '../../../lib/adminAlerts';

function secretOk(given: string | null): boolean {
  const expected = import.meta.env.SENTRY_WEBHOOK_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const POST: APIRoute = async ({ request, url }) => {
  if (!secretOk(url.searchParams.get('secret'))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Payload shapes differ per Sentry alert type — parse defensively and
  // VERIFY against one real delivery at rollout (never guess silently:
  // unknown shapes still alert, with a generic title).
  let title = 'Sentry issue';
  let link: string | undefined;
  try {
    const body = await request.json();
    title =
      body?.data?.event?.title ??
      body?.data?.issue?.title ??
      body?.data?.triggered_rule ??
      title;
    link =
      body?.data?.event?.web_url ??
      body?.data?.issue?.web_url ??
      body?.data?.event?.issue_url ??
      undefined;
  } catch {
    // Malformed body: still forward a generic ping; 200 below stops retries.
  }

  await alertSentryIssue({ title, url: link });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
```

- [ ] **Step 2: Middleware allowlist** — change `const API_ALLOWLIST = ['/api/news/fetch-daily'];` to:

```typescript
    const API_ALLOWLIST = ['/api/news/fetch-daily', '/api/hooks/sentry'];
```
NOTE: check whether `/api/hooks` is even inside `GATED_APIS` prefixes — if not, the allowlist entry is harmless belt-and-suspenders; add it anyway with a one-line comment `// sentry webhook: authenticates via its own secret`.

- [ ] **Step 3: Curl smoke (no dev server needed? — it IS needed; if not running, defer to Task 5)**

With the dev server up and `SENTRY_WEBHOOK_SECRET=test123` temporarily in `.env` (restart dev server to pick it up — or defer this to Task 5's E2E where env is arranged once):
- `curl -s -o /dev/null -w '%{http_code}' -X POST 'http://localhost:3000/api/hooks/sentry?secret=wrong'` ⇒ `401`
- `curl -s -X POST 'http://localhost:3000/api/hooks/sentry?secret=test123' -H 'Content-Type: application/json' -d '{"data":{"event":{"title":"Test issue","web_url":"https://x"}}}'` ⇒ `{"ok":true}` (Telegram leg no-ops without token — fine).

- [ ] **Step 4: Verify budget** — `pnpm type-check` ⇒ ≤27 errors.

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/hooks/sentry.ts src/middleware.ts
git commit -m "feat: sentry webhook bridge to admin alerts"
```

---

### Task 5: E2E verification + docs

**Files:**
- Create: `scripts/e2e-admin-alerts.mts`
- Modify: `CLAUDE.md` (short "Admin alerts" paragraph in the architecture section)

**Interfaces:**
- Consumes: the full pipeline; dev server on port 3000 (user-run — if down, ask); seeded users `admin@mahalle-dev.test` / `ayse@mahalle-dev.test`; password via `PW_FILE` env (never printed).

- [ ] **Step 1: Write the E2E script** — clone the login/cookie-jar/assert skeleton from `scripts/e2e-admin-moderation-exemption.mts` (same repo, same contract: localhost-guard regex, PW_FILE, never print secrets). Phases:

```typescript
// Phase A (env-less contract): with no TELEGRAM_* in the dev server's env,
// every flow below must behave EXACTLY as before (alerts are silent no-ops)
// — the assertions are the same status/shape checks the exemption E2E used:
// 1. login ayse → POST /api/topics/create (clean text) → 201, topic approved.
// 2. login ayse → POST /api/topics/create (blocklist word, parsed from
//    src/lib/moderation.ts like the exemption script) → 201, pending.
// 3. login admin → POST /api/topics/create (clean) → 201, no moderationStatus.
// 4. login ayse → POST /api/reports/submit on the admin topic → success.
// 5. DELETE both topics (cleanup; the report's flaggedContent row remains —
//    acceptable dev residue, note it in output).
// Phase B (manual, printed as instructions at the end, NOT executed):
// "To verify live delivery: add TELEGRAM_BOT_TOKEN/TELEGRAM_ADMIN_CHAT_ID to
//  .env, restart dev, re-run this script — expect 3 Telegram messages
//  (content_new, moderation_flagged, report_new) and NONE for the admin post."
```

Full script: same `login()`/`storeCookies()`/`assert()` helpers as `e2e-admin-moderation-exemption.mts` verbatim, plus a `postTopic(bodyText)` variant taking the body text, a `submitReport(contentId)` helper (`POST /api/reports/submit` with `{ contentId, contentType: 'topic', reason: 'spam' }` — VERIFIED: `'spam'` is in `ReportReasonSchema`, `src/schemas/moderation.schema.ts:32`), and the cleanup deletes. Exit non-zero on any FAIL.

- [ ] **Step 2: Run it**

Run: `PW_FILE=<dev password file path> npx tsx scripts/e2e-admin-alerts.mts`
Expected: all PASS — proving the alert calls are transparent no-ops without env (the never-throw + no-behavior-change contract), which is the property that protects prod requests.

- [ ] **Step 3: CLAUDE.md paragraph** — add to the root CLAUDE.md architecture sections (after "### Outgoing Email (shared mailer)"):

```markdown
### Admin alerts (Telegram + email mirror)
`src/lib/adminAlerts.ts` (server-only) pings the single admin: Telegram for everything (new member, moderation-queue item, report, new content/comment, marketplace contact, Sentry issue via `POST /api/hooks/sentry` — secret-guarded, middleware-allowlisted), email mirror (`ADMIN_ALERT_EMAIL`) only for member/moderation/report. Contract: never-throw (static `captureMessage` + flush), awaited best-effort in the request window, 10s TG timeout, silent no-op without `TELEGRAM_BOT_TOKEN`/`TELEGRAM_ADMIN_CHAT_ID` (preview/dev default). Self-suppression: the admin's own actions never alert (rides the `skipModeration` gates). Either/or rule: a creation sends `content_new` OR `moderation_flagged`, never both; news always sends `moderation_flagged` (editorial queue). The `moderation_flagged` alert on fail-safe `moderation_error` records doubles as an OpenAI-outage tripwire.
```

- [ ] **Step 4: Final budgets** — `pnpm type-check` ⇒ ≤27; `npx -y svelte-check@4 2>&1 | tail -3` ⇒ ≤94.

- [ ] **Step 5: Commit**

```bash
git add scripts/e2e-admin-alerts.mts CLAUDE.md
git commit -m "test: admin alerts E2E + docs"
```

---

## Rollout (post-merge, with the user — NOT part of the SDD tasks)
1. User: @BotFather → `/newbot` → token (plain terminal into `.env`, piped into Vercel as Sensitive).
2. User sends `/start` to the bot; assistant reads chat id via `curl https://api.telegram.org/bot<TOKEN>/getUpdates` (token via env, never printed) → `TELEGRAM_ADMIN_CHAT_ID` to `.env` + Vercel.
3. `ADMIN_ALERT_EMAIL` + `SENTRY_WEBHOOK_SECRET` (generated) to `.env` + Vercel; empty-commit redeploy.
4. Sentry: create an Internal Integration with webhook URL `https://mahalle.digital/api/hooks/sentry?secret=<value>`, add it as action to alert rule "New issue in production"; verify the REAL payload shape against the parser with one test issue and adjust the field paths if needed.
5. Smoke: non-admin dev post → TG message; admin post → silence; forced Sentry test issue → TG message; check the email mirror on one report.
