# Admin Gate Fix + Auth Rate-Limit (State 05) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the admin-moderation authorization hole (any logged-in user can approve/reject content today), then add persistent rate limiting across the auth surface: login lockout (design state 05 — 5 failed attempts → banner + disabled form), forgot-password/register/resend throttles, TTL indexes, CSRF-origin guard on resend, and email case-normalization.

**Architecture:** Task 1 swaps the three moderation endpoints' dead `ADMIN_USER_IDS` stopgap for the existing `requireAdminSession()` helper — independently shippable. The rate-limit layer is a small server-only lib over a new `rateLimits` MongoDB collection (fixed-window buckets keyed `<baseKey>#<windowId>`, atomic `$inc`, TTL-cleaned — serverless-safe, no Redis), mirroring the shipped contact-relay limiter's IP-hashing. Login lockout enforces inside `authorize()` (server truth) with a peek-only `login-status` endpoint feeding the state-05 UI.

**Tech Stack:** Astro 5 API routes, MongoDB 6 direct driver (TTL indexes via `pnpm tsx` script), auth-astro/NextAuth `authorize()`, Svelte 5 runes (AuthLoginInner), kiosk-i18n DE/EN.

## Global Constraints

- **Lockout policy (design state 05):** 5 failed login attempts per identifier per 15 minutes → identifier locked (even a correct password is refused until the window passes). UI = danger banner "Zu viele Versuche" + body with live m:ss countdown + BOTH fields and CTA disabled (mock: `disabled={state === "ratelimited"}`).
- **Anti-enumeration is inviolable:** lockout applies identically to existing and unknown emails (attempts are counted per submitted identifier regardless of account existence); `login-status` is PEEK-only and never reveals account existence; forgot-password stays generic-200 always — rate-limited requests silently skip the send.
- **IP privacy:** raw IPs never stored — sha256(ip + CONTACT_IP_SALT) truncated to 32 hex chars, same as the contact relay. Reuse `CONTACT_IP_SALT` (no new env var).
- **No new dependencies.** mongodb, crypto, tsx, zod are all present.
- **Limits (exact values):** login 5 fails / 15 min per email; forgot-password 5/h per IP AND 3/h per email; register 5/h per IP; resend-verification 10/h per user (on top of the existing 60s token guard).
- **No unit-test runner.** Gates per task: `pnpm type-check` (baseline: pre-existing kiosk-i18n `Dict = typeof de` TS2322 + node_modules/Navbar/sync-stats errors — no NEW errors), curl against dev server on :3000, playwright-cli, throwaway scripts with TEMP users only (self-cleaning, deleted before commit, scratchpad-dir only).
- **Commits:** simple concise messages, NO AI signature, NO Co-Authored-By. Never `--no-verify`.
- **i18n:** every new UI string gets DE + EN keys in `src/lib/kiosk-i18n.ts`.
- **Prod env pre-flight (user-facing note, verify during Task 7/8):** `ALLOWED_ORIGINS` in Vercel prod must either be UNSET or exactly contain the real origin `https://mahalle-das-kiezgesichterbuch.vercel.app` — a stale value (e.g. `https://mahalle.berlin`) would 403 both the existing contact relay and the new resend guard. `CONTACT_IP_SALT` must be set in prod (32+ chars). Also: `scripts/create-auth-indexes.ts` must be run once against the prod DB at deploy.

---

### Task 1: Admin moderation gate → `requireAdminSession()`

**Files:**
- Modify: `src/pages/api/admin/moderation/review.ts` (lines ~24-50, ~83)
- Modify: `src/pages/api/admin/moderation/bulk-review.ts` (lines ~14-35, ~82)
- Modify: `src/pages/api/admin/moderation/index.ts` (lines ~13-40)
- Modify: `src/components/admin/CLAUDE.md` (auth-gate bullet)
- Modify: `CLAUDE.md` (root — remove the "Pre-existing security TODO" bullet in Authentication Flow)

**Interfaces:**
- Consumes: `requireAdminSession(request: Request): Promise<{ ok: true; userId: string } | { ok: false; response: Response }>` from `src/lib/auth.ts` (exists, used by `/api/admin/announcements/*`).
- Produces: all three moderation endpoints return 401 (no session) / 403 (non-admin) / normal flow (admin). No other behavior change.

- [ ] **Step 1: Refactor `review.ts`**

Remove the local stopgap (the `// TODO: Add proper admin role check` comment + `isAdmin` function):

```ts
// TODO: Add proper admin role check (same as index.ts)
const isAdmin = (userId: string): boolean => {
  const ADMIN_USER_IDS: string[] = [];
  return ADMIN_USER_IDS.length === 0 || ADMIN_USER_IDS.includes(userId);
};
```

(KEEP the separate "TODO: Implement ban enforcement" comment block above it — that's a different, still-open item.)

Add to the imports:

```ts
import { requireAdminSession } from '../../../../lib/auth';
```

Remove the now-unused `import { getSession } from 'auth-astro/server';` line. Then replace the handler's auth block — currently:

```ts
    // Check authentication
    const session = await getSession(request);

    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check admin role
    if (!isAdmin(session.user.id)) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
```

with:

```ts
    // Admin gate: session + role === 'admin' (no fallback — see src/lib/auth.ts)
    const guard = await requireAdminSession(request);
    if (!guard.ok) return guard.response;
```

Finally replace the later usage `session.user.id` (in the `processReviewAction(db, flaggedContent, action, session.user.id, {` call, ~line 83) with `guard.userId`.

- [ ] **Step 2: Refactor `bulk-review.ts`**

Same three edits: delete its local `isAdmin` block (`// TODO: Add proper admin role check (same as index.ts)` + function), swap the `getSession` import for `requireAdminSession`, replace its session/isAdmin block (same shape as Step 1's) with the two guard lines, and change `session.user.id` → `guard.userId` in its `processReviewAction(db, item, action, session.user.id, {` call (~line 82).

- [ ] **Step 3: Refactor `index.ts`**

Same edits: delete its local `isAdmin` block (the one with the `// For now, you can hardcode…` comments), swap imports, replace the session/isAdmin block with the guard lines. `index.ts` has no later `session.user.id` usage — confirm with `grep -n "session\." src/pages/api/admin/moderation/index.ts` (expected: no matches after the edit).

- [ ] **Step 4: Verify (dev server on :3000)**

`pnpm type-check` → no NEW errors. Then:

```bash
grep -rn "ADMIN_USER_IDS" src/  # Expected: no matches
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/api/admin/moderation
# Expected: 401
```

Role-based check with TEMP users (playwright-cli; clean up both users + tokens after):
1. Register `tmp-admin-gate-user@example.invalid` via `POST /api/auth/register` → log in via playwright → in the page context run `fetch('/api/admin/moderation').then(r => r.status)` → expected **403** (this is the fix — was 200 before).
2. One-off scratchpad node script: set that temp user's `role: 'admin'` in Mongo → re-login (fresh JWT required) → same fetch → expected **200**.
3. `playwright-cli close`; delete temp user + emailVerifyTokens rows; delete the script.

- [ ] **Step 5: Update docs**

`src/components/admin/CLAUDE.md` auth-gate bullet: replace the sentence starting "The older `/api/admin/moderation/…` still use a degraded…" with:

```markdown
  All `/api/admin/*` endpoints (announcements AND moderation) now gate via `requireAdminSession()` — the old `ADMIN_USER_IDS` stopgap was removed (2026-07).
```

Root `CLAUDE.md`: delete the entire bullet beginning `- **Pre-existing security TODO**: `/api/admin/moderation/…` in the Authentication Flow section.

- [ ] **Step 6: Commit**

```bash
git add src/pages/api/admin/moderation/review.ts src/pages/api/admin/moderation/bulk-review.ts src/pages/api/admin/moderation/index.ts src/components/admin/CLAUDE.md CLAUDE.md
git commit -m "fix(admin): enforce role-based admin gate on moderation endpoints"
```

---

### Task 2: Rate-limit lib + auth indexes script

**Files:**
- Create: `src/lib/auth/rateLimit.ts`
- Create: `scripts/create-auth-indexes.ts`

**Interfaces:**
- Consumes: `connectDB` from `src/lib/mongodb.ts`.
- Produces (Tasks 4–7 rely on these exact signatures):
  - `consumeRateLimit(baseKey: string, max: number, windowMs: number): Promise<{ limited: boolean; retryAfterSec: number }>` — counts an attempt; `limited` when the window now holds MORE than `max`.
  - `peekRateLimit(baseKey, max, windowMs)` — same shape, counts nothing; `limited` when the window already holds `max` or more.
  - `clearRateLimit(baseKey: string): Promise<void>` — drops all windows for the key.
  - `hashIp(ip: string): string` · `clientIpFrom(request: Request, clientAddress?: string): string`
  - Exported constants `LOGIN_MAX_FAILS = 5`, `LOGIN_WINDOW_MS = 15 * 60 * 1000`.
  - Semantics: with `max = 5`, attempts 1–5 pass, the 6th is limited (consume) / the gate closes once 5 are recorded (peek).

- [ ] **Step 1: Create `src/lib/auth/rateLimit.ts`**

```ts
// src/lib/auth/rateLimit.ts
// SERVER-ONLY (mongodb + crypto). Fixed-window rate limiting backed by the
// `rateLimits` collection. Buckets are keyed `<baseKey>#<windowId>` so every
// window upserts a fresh doc (atomic $inc — no cross-window races); expired
// buckets are removed by the TTL index (scripts/create-auth-indexes.ts).
//
// Semantics: `max` = allowed attempts per window. consume() flags the
// attempt that EXCEEDS max; peek() flags once max attempts are already
// recorded (so a gate checked before work closes on attempt max+1).
import { createHash } from 'crypto';
import { connectDB } from '../mongodb';

// Reuses the contact relay's IP salt (same semantics: keyed hashing so raw
// IPs never land in the DB). Fixed across deploys.
const IP_SALT = import.meta.env.CONTACT_IP_SALT || '';
if (!IP_SALT && import.meta.env.PROD) {
  console.error('[rateLimit] CONTACT_IP_SALT is required in production');
}

// Login lockout policy (design state 05: "triggers after 5 failed attempts").
export const LOGIN_MAX_FAILS = 5;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export interface RateLimitResult {
  limited: boolean;
  retryAfterSec: number;
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip + IP_SALT).digest('hex').slice(0, 32);
}

/** Best-effort client IP: Astro's clientAddress, else first X-Forwarded-For hop. */
export function clientIpFrom(request: Request, clientAddress?: string): string {
  return (
    clientAddress ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}

function windowInfo(windowMs: number) {
  const windowId = Math.floor(Date.now() / windowMs);
  const windowEnd = (windowId + 1) * windowMs;
  return {
    windowId,
    retryAfterSec: Math.max(1, Math.ceil((windowEnd - Date.now()) / 1000)),
    // Keep the bucket one extra window past its end so peek() near a
    // boundary never reads a just-TTL'd doc; TTL cleanup is hygiene only.
    expiresAt: new Date(windowEnd + windowMs),
  };
}

/** Count one attempt against `baseKey`; report whether the limit is now exceeded. */
export async function consumeRateLimit(
  baseKey: string,
  max: number,
  windowMs: number
): Promise<RateLimitResult> {
  const db = await connectDB();
  const col = db.collection('rateLimits');
  const { windowId, retryAfterSec, expiresAt } = windowInfo(windowMs);
  const filter = { key: `${baseKey}#${windowId}` };
  const update = { $inc: { count: 1 }, $setOnInsert: { baseKey, expiresAt } };
  let doc;
  try {
    doc = await col.findOneAndUpdate(filter, update, { upsert: true, returnDocument: 'after' });
  } catch (err: any) {
    // Two concurrent first-attempts can race the upsert against the unique
    // key index (E11000). The doc exists now — retry once, non-upsert path.
    if (err?.code !== 11000) throw err;
    doc = await col.findOneAndUpdate(filter, update, { returnDocument: 'after' });
  }
  const count = (doc as any)?.count ?? 1;
  return { limited: count > max, retryAfterSec };
}

/** Report the current window's state WITHOUT counting an attempt. */
export async function peekRateLimit(
  baseKey: string,
  max: number,
  windowMs: number
): Promise<RateLimitResult> {
  const db = await connectDB();
  const { windowId, retryAfterSec } = windowInfo(windowMs);
  const doc = await db.collection('rateLimits').findOne({ key: `${baseKey}#${windowId}` });
  return { limited: ((doc as any)?.count ?? 0) >= max, retryAfterSec };
}

/** Drop all windows for `baseKey` (e.g. successful login clears the lockout). */
export async function clearRateLimit(baseKey: string): Promise<void> {
  const db = await connectDB();
  await db.collection('rateLimits').deleteMany({ baseKey });
}
```

- [ ] **Step 2: Create `scripts/create-auth-indexes.ts`**

```ts
/**
 * Idempotent index creation for auth collections. Run manually at deploy
 * (dev DB now, prod DB when this ships):
 *   pnpm tsx scripts/create-auth-indexes.ts
 *
 * Raw MongoClient + dotenv (not src/lib/mongodb.ts) because import.meta.env
 * isn't available to plain tsx — same pattern as scripts/create-listing-indexes.ts.
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required (set in .env or shell env).');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = new URL(uri).pathname.slice(1) || 'CommunityWebApp-test';
  const db = client.db(dbName);

  // Token collections: TTL hygiene (queries already filter expiresAt/usedAt —
  // this just stops dead rows accumulating) + hash-lookup index.
  await db.collection('passwordResetTokens').createIndex(
    { expiresAt: 1 }, { expireAfterSeconds: 0, name: 'prt_ttl' });
  await db.collection('passwordResetTokens').createIndex(
    { tokenHash: 1 }, { name: 'prt_tokenHash' });
  await db.collection('emailVerifyTokens').createIndex(
    { expiresAt: 1 }, { expireAfterSeconds: 0, name: 'evt_ttl' });
  await db.collection('emailVerifyTokens').createIndex(
    { tokenHash: 1 }, { name: 'evt_tokenHash' });

  // rateLimits: exact-key bucket lookup (unique — consume() handles the
  // E11000 upsert race), TTL cleanup, clear-by-baseKey.
  await db.collection('rateLimits').createIndex(
    { key: 1 }, { unique: true, name: 'rl_key' });
  await db.collection('rateLimits').createIndex(
    { expiresAt: 1 }, { expireAfterSeconds: 0, name: 'rl_ttl' });
  await db.collection('rateLimits').createIndex(
    { baseKey: 1 }, { name: 'rl_baseKey' });

  console.log('Auth indexes ensured on', dbName);
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 3: Run the script + verify**

Run: `pnpm tsx scripts/create-auth-indexes.ts`
Expected: `Auth indexes ensured on CommunityWebApp-test`

Run: `pnpm type-check` → no NEW errors.

Behavior smoke (scratchpad one-off `rl-smoke.mjs`, plain node + mongodb, run from repo root, delete after): insert-free test through the collection — call the same fixed-window logic by exercising it via mongo ops is NOT possible without importing the lib (import.meta.env). Instead verify structurally: run three raw `findOneAndUpdate` upserts against `rateLimits` with key `test:smoke#1`, assert count increments 1→2→3, then `deleteMany({ baseKey: 'test:smoke' })` cleans up and assert the unique index exists via `db.collection('rateLimits').indexes()` (expect `rl_key` unique). Print PASS/FAIL lines. (Full lib-level behavior is exercised end-to-end in Tasks 4–7.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/rateLimit.ts scripts/create-auth-indexes.ts
git commit -m "feat(auth): fixed-window rate-limit lib + TTL/auth indexes script"
```

---

### Task 3: i18n keys (state 05 + register throttle)

**Files:**
- Modify: `src/lib/kiosk-i18n.ts` (DE auth block ends at `'auth.banner.verifyDismiss': 'Ausblenden'` ~line 1124; EN at `'auth.banner.verifyDismiss': 'Dismiss'` ~line 2111)

**Interfaces:**
- Produces: keys below, consumed by Tasks 4 and 6 via `$t[...]`. The lock body is split a/b so the component can splice a live `m:ss` countdown between them.

- [ ] **Step 1: Add DE keys**

Add a trailing comma to `'auth.banner.verifyDismiss': 'Ausblenden'` and insert after it (before the DE block's `} as const;`):

```ts
  'auth.banner.verifyDismiss': 'Ausblenden',

  // ── Auth (rate-limit, state 05) ──
  'auth.err.lockedTitle': 'Zu viele Versuche',
  'auth.err.lockedBody.a': 'Aus Sicherheitsgründen pausiert. Versuch es in ',
  'auth.err.lockedBody.b': ' Min. erneut.',
  'auth.err.tooMany': 'Zu viele Versuche — warte kurz und versuch es später erneut.'
```

- [ ] **Step 2: Add EN keys**

Same at the end of the `en` object (trailing comma on `'auth.banner.verifyDismiss': 'Dismiss'`):

```ts
  'auth.banner.verifyDismiss': 'Dismiss',

  // ── Auth (rate-limit, state 05) ──
  'auth.err.lockedTitle': 'Too many attempts',
  'auth.err.lockedBody.a': 'Paused for security. Try again in ',
  'auth.err.lockedBody.b': ' min.',
  'auth.err.tooMany': 'Too many attempts — wait a bit and try again later.'
```

- [ ] **Step 3: Verify + commit**

`pnpm type-check` → no NEW errors (DE/EN key parity is what keeps the baseline `Dict` errors from growing).
`grep -c "auth.err.locked\|auth.err.tooMany" src/lib/kiosk-i18n.ts` → Expected: `8` (4 keys × 2 locales).

```bash
git add src/lib/kiosk-i18n.ts
git commit -m "feat(auth): i18n keys for login lockout + register throttle"
```

---

### Task 4: Login lockout (authorize + login-status + state-05 UI)

**Files:**
- Modify: `auth.config.ts` (authorize callback)
- Create: `src/pages/api/auth/login-status.ts`
- Modify: `src/components/auth/kiosk/AuthLoginInner.svelte`

**Interfaces:**
- Consumes: `peekRateLimit`, `consumeRateLimit`, `clearRateLimit`, `LOGIN_MAX_FAILS`, `LOGIN_WINDOW_MS` from `src/lib/auth/rateLimit.ts` (Task 2); i18n keys (Task 3); `AuthField`/`AuthPrimaryBtn` primitives (both already accept `disabled`); `AuthBanner` (`kind`, `title`, `body?`).
- Produces: `POST /api/auth/login-status` body `{ email }` → always `200 { locked: boolean, retryAfterSec: number }` (peek-only, no enumeration surface — lockout state exists for unknown emails too).

- [ ] **Step 1: Enforce the lockout in `auth.config.ts`**

Add the import (after the bcrypt import at the top):

```ts
import { peekRateLimit, consumeRateLimit, clearRateLimit, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS } from "./src/lib/auth/rateLimit";
```

Replace the whole `authorize` callback body with:

```ts
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                // Normalized identifier for lockout + lookup. Collation
                // strength 2 makes the lookup case-insensitive so legacy
                // docs with mixed-case stored emails keep working.
                const emailNorm = String(credentials.email).trim().toLowerCase();
                const lockKey = `login:${emailNorm}`;

                // State-05 lockout: 5 failed attempts per 15 min per
                // identifier — checked BEFORE any DB/bcrypt work, and it
                // applies to existing AND unknown emails identically (no
                // enumeration signal). While locked, even a correct
                // password is refused (design: fields disabled).
                const gate = await peekRateLimit(lockKey, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS);
                if (gate.limited) return null;

                const client = await clientPromise;
                const db = client.db();

                const user = await db.collection('users').findOne(
                    { email: emailNorm },
                    { collation: { locale: 'en', strength: 2 } }
                );

                if (!user) {
                    await consumeRateLimit(lockKey, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS);
                    return null;
                }

                // Verify password using bcrypt
                const isValidPassword = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!isValidPassword) {
                    await consumeRateLimit(lockKey, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS);
                    return null;
                }

                // Success — clear accumulated failures for this identifier.
                await clearRateLimit(lockKey);

                // Return user object that will be stored in the session.
                // `role` defaults to 'user' if the field is missing on the
                // doc — admin role must be explicitly set in the DB.
                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.name || user.userName || '',
                    image: user.image || user.userPicture || '',
                    role: (user.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
                    // Boolean-normalized: legacy docs may hold false/null/Date.
                    emailVerified: user.emailVerified === true,
                };
            }
```

(The return object is IDENTICAL to today's — only the lookup + rate-limit lines are new. Note: the collation query bypasses any non-collated index on `email` and falls back to a scan — acceptable at this user-collection size; revisit with a collated index if users grow past ~10k.)

- [ ] **Step 2: Create `src/pages/api/auth/login-status.ts`**

```ts
import type { APIRoute } from 'astro';
import { peekRateLimit, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS } from '../../../lib/auth/rateLimit';

// UI helper for the login page's state-05 banner: is this identifier
// currently locked out? PEEK-only (never counts an attempt, so polling can't
// extend a lockout). No enumeration surface: the lockout state derives purely
// from failed attempts against the submitted identifier — it exists for
// unknown emails too and says nothing about whether an account exists.
export const POST: APIRoute = async ({ request }) => {
  const json = (body: object) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) return json({ locked: false, retryAfterSec: 0 });

    const { limited, retryAfterSec } = await peekRateLimit(`login:${email}`, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS);
    return json({ locked: limited, retryAfterSec: limited ? retryAfterSec : 0 });
  } catch (err) {
    console.error('login-status error:', err);
    return json({ locked: false, retryAfterSec: 0 });
  }
};
```

- [ ] **Step 3: State-05 UI in `AuthLoginInner.svelte`**

Replace the whole `<script lang="ts">` block with:

```svelte
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { signIn } from 'auth-astro/client';
  import { t } from '../../../lib/kiosk-i18n';
  import { LoginSchema } from '../../../schemas/auth.schema';
  import AuthField from './primitives/AuthField.svelte';
  import AuthPrimaryBtn from './primitives/AuthPrimaryBtn.svelte';
  import AuthBanner from './primitives/AuthBanner.svelte';

  let email = $state('');
  let password = $state('');
  let emailErr = $state<string | null>(null);
  let pwErr = $state<string | null>(null);
  let credErr = $state(false);     // generic wrong email-or-password
  let status = $state<'idle' | 'loading' | 'success'>('idle');

  // State 05 — locked out. >0 seconds remaining → danger banner + disabled form.
  let lockSec = $state(0);
  let lockTimer: ReturnType<typeof setInterval> | null = null;
  const locked = $derived(lockSec > 0);
  const lockLabel = $derived(`${Math.floor(lockSec / 60)}:${String(lockSec % 60).padStart(2, '0')}`);

  function startLock(sec: number) {
    lockSec = Math.max(1, Math.round(sec));
    credErr = false;
    if (lockTimer) clearInterval(lockTimer);
    lockTimer = setInterval(() => {
      lockSec -= 1;
      if (lockSec <= 0 && lockTimer) {
        clearInterval(lockTimer);
        lockTimer = null;
      }
    }, 1000);
  }
  onDestroy(() => {
    if (lockTimer) clearInterval(lockTimer);
  });

  async function submit(e: Event) {
    e.preventDefault();
    if (locked) return;
    emailErr = null; pwErr = null; credErr = false;

    const parsed = LoginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      if (fields.email) emailErr = $t['auth.err.emailInvalid'];
      if (fields.password) pwErr = $t['auth.err.pwShort'];
      return;
    }

    status = 'loading';
    try {
      const result = await signIn('credentials', {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
      });
      if (result?.error) {
        // Distinguish lockout (state 05) from plain bad credentials via the
        // peek-only status endpoint — reveals lockout state, never existence.
        try {
          const res = await fetch('/api/auth/login-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: parsed.data.email }),
          });
          const data = await res.json().catch(() => ({}));
          if (data?.locked) {
            startLock(data.retryAfterSec);
            status = 'idle';
            return;
          }
        } catch { /* fall through to generic */ }
        // Anti-enumeration: ONE generic message for wrong-pw AND email-not-found.
        credErr = true;
        status = 'idle';
        return;
      }
      status = 'success';
      window.location.href = '/';
    } catch {
      credErr = true;
      status = 'idle';
    }
  }
</script>
```

In the markup: add the locked banner directly above the existing `{#if credErr}` block:

```svelte
  {#if locked}
    <AuthBanner kind="danger" title={$t['auth.err.lockedTitle']}
      body={`${$t['auth.err.lockedBody.a']}${lockLabel}${$t['auth.err.lockedBody.b']}`} />
  {/if}
```

And disable the form while locked (design mock: both fields + CTA): add `disabled={locked}` to BOTH `<AuthField …/>` calls and to `<AuthPrimaryBtn …>`:

```svelte
    <AuthField
      label={$t['auth.login.email']} placeholder={$t['auth.login.emailPh']}
      type="email" name="email" autocomplete="email"
      value={email} error={emailErr} disabled={locked}
      oninput={(v) => (email = v)} />
```

```svelte
      <AuthField
        label={$t['auth.login.pw']} placeholder={$t['auth.login.pwPh']}
        type="password" name="password" autocomplete="current-password"
        value={password} error={pwErr} showToggle disabled={locked}
        oninput={(v) => (password = v)} />
```

```svelte
    <AuthPrimaryBtn loading={status === 'loading'} disabled={locked}>
```

Everything else in the file stays unchanged.

- [ ] **Step 4: Verify end-to-end (dev server on :3000, TEMP user)**

`pnpm type-check` → no NEW errors. Then with playwright-cli (clean up temp user + rateLimits rows after; `playwright-cli close` at the end):

1. Register `tmp-lockout@example.invalid` / `Abcdef12` via curl.
2. Playwright `/login`: submit wrong password 4× → each shows the generic credentials banner (the post-fail status peek reads counts 1–4, below the limit).
3. 5th wrong submit → the failure is consumed (count = 5), the status peek now trips → danger banner "Zu viele Versuche" with a live countdown (≤ 15:00), both fields + button disabled. (Server-side, attempt 6+ is refused before bcrypt by the peek gate in `authorize`.)
4. Reload the page mid-lockout and submit the CORRECT password → still refused (server-side gate, not just UI), and the status fetch re-locks the UI.
5. One-off scratchpad script: `deleteMany({ baseKey: 'login:tmp-lockout@example.invalid' })` on `rateLimits` (simulates window expiry). Then prove clear-on-success with fresh evidence: 2 wrong-password attempts (bucket now holds count 2 — confirm via the script), then the CORRECT password → login succeeds AND the `login:tmp-lockout@example.invalid` rows are gone (cleared by `clearRateLimit`, not by your delete).
6. curl contract check: `curl -s -X POST http://localhost:3000/api/auth/login-status -H 'Content-Type: application/json' -d '{"email":"nobody-here@example.invalid"}'` → `{"locked":false,"retryAfterSec":0}`.

- [ ] **Step 5: Commit**

```bash
git add auth.config.ts src/pages/api/auth/login-status.ts src/components/auth/kiosk/AuthLoginInner.svelte
git commit -m "feat(auth): login lockout after 5 failed attempts (state 05)"
```

---

### Task 5: forgot-password throttles + case-insensitive lookup

**Files:**
- Modify: `src/pages/api/auth/forgot-password.ts`

**Interfaces:**
- Consumes: `consumeRateLimit`, `hashIp`, `clientIpFrom` (Task 2).
- Produces: no contract change — the endpoint STILL always returns generic 200. Limited requests silently skip token+send.

- [ ] **Step 1: Add the limits + collation lookup**

Change the handler signature from `async ({ request })` to `async ({ request, clientAddress })` and add the import:

```ts
import { consumeRateLimit, hashIp, clientIpFrom } from '../../../lib/auth/rateLimit';
```

Directly after `const email = parsed.data.email;` insert:

```ts
    // Rate limits — SILENT: the response stays the same generic 200 either
    // way (no probing signal); limited requests just skip token+send.
    // 5/hour per IP + 3/hour per target email. Also bounds the known-vs-
    // unknown timing side-channel (CWE-208) to guarded volumes.
    const ipHash = hashIp(clientIpFrom(request, clientAddress));
    const [ipLimit, emailLimit] = await Promise.all([
      consumeRateLimit(`fp:ip:${ipHash}`, 5, 60 * 60 * 1000),
      consumeRateLimit(`fp:email:${email}`, 3, 60 * 60 * 1000),
    ]);
    if (ipLimit.limited || emailLimit.limited) return generic();
```

And replace the user lookup line `const user = await db.collection('users').findOne({ email });` with:

```ts
    // Collation strength 2 = case-insensitive: matches legacy docs whose
    // stored email casing differs from the (lowercased) submitted one.
    const user = await db.collection('users').findOne(
      { email },
      { collation: { locale: 'en', strength: 2 } }
    );
```

- [ ] **Step 2: Verify (dev server on :3000, TEMP user)**

`pnpm type-check` → no NEW errors. With a temp user `tmp-fp-limit@example.invalid` registered (clean up after, incl. `rateLimits` `fp:*` rows and `passwordResetTokens`):

```bash
for i in 1 2 3 4; do curl -s -o /dev/null -w "%{http_code} " -X POST http://localhost:3000/api/auth/forgot-password -H 'Content-Type: application/json' -d '{"email":"tmp-fp-limit@example.invalid"}'; sleep 61; done
# Expected: 200 200 200 200  (all generic — anti-enum preserved)
```

(The `sleep 61` clears the token lib's own 60s resend guard so the first 3 really send.) Check dev-server stdout: exactly **3** `[forgot-password] (dev)` link lines — the 4th request was silently dropped by `fp:email` (3/hour). Case-insensitivity: request with `{"email":"TMP-FP-LIMIT@example.invalid"}` → Zod lowercases → still matches (covered), and verify a mixed-case STORED email matches by flipping the temp user's stored email to `Tmp-Fp-Limit@example.invalid` via a one-off script, requesting again (after clearing `fp:*` buckets), and seeing a dev-log link.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/auth/forgot-password.ts
git commit -m "feat(auth): silent IP+email rate limits on forgot-password"
```

---

### Task 6: register throttle + email normalization

**Files:**
- Modify: `src/pages/api/auth/register.ts`
- Modify: `src/components/auth/kiosk/AuthRegisterInner.svelte` (429 handling)

**Interfaces:**
- Consumes: `consumeRateLimit`, `hashIp`, `clientIpFrom` (Task 2); i18n `auth.err.tooMany` (Task 3).
- Produces: register returns `429 { error: 'rate_limited' }` above 5/h per IP; all NEW users stored with lowercased email; duplicate check is case-insensitive.

- [ ] **Step 1: Throttle + normalize in `register.ts`**

Add the import:

```ts
import { consumeRateLimit, hashIp, clientIpFrom } from "../../../lib/auth/rateLimit";
```

Change the handler signature from `async ({ request })` to `async ({ request, clientAddress })`. Directly after the password-length check (before the `checkNameProfanity` call — the throttle must run BEFORE the paid OpenAI moderation) insert:

```ts
        // Per-IP throttle: 5 registrations/hour. Sits BEFORE the profanity
        // check so bulk signups can't burn OpenAI moderation calls.
        const ipHash = hashIp(clientIpFrom(request, clientAddress));
        const ipLimit = await consumeRateLimit(`reg:ip:${ipHash}`, 5, 60 * 60 * 1000);
        if (ipLimit.limited) {
            return new Response(
                JSON.stringify({ error: 'rate_limited' }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
        }
```

Then normalize the email everywhere in the file. After the destructuring line `const { name, email, password } = await request.json();` add:

```ts
        // Canonical form: emails are stored lowercase (legacy mixed-case docs
        // are matched via collation on lookups).
        const emailNorm = typeof email === 'string' ? email.trim().toLowerCase() : '';
```

Replace the existing-user check with a case-insensitive one:

```ts
        // Check if user already exists (case-insensitive — catches legacy
        // mixed-case docs too)
        const existingUser = await db.collection('users').findOne(
            { email: emailNorm },
            { collation: { locale: 'en', strength: 2 } }
        );
```

In the `insertOne` call change `email,` to `email: emailNorm,`. In the verification-email block change `await sendVerifyEmail(email, …)` to `await sendVerifyEmail(emailNorm, …)`. (The top-of-handler `if (!name || !email || !password)` check stays on the raw values.)

- [ ] **Step 2: 429 handling in `AuthRegisterInner.svelte`**

In `submit()`, the error branch currently reads:

```ts
      if (!res.ok) {
        if (res.status === 409) { emailTaken = true; status = 'idle'; return; }
        // 400 (e.g. profanity) or 500 → inline on the relevant field / generic
        nameErr = data?.error || $t['auth.err.generic'];
        status = 'idle';
        return;
      }
```

Change to:

```ts
      if (!res.ok) {
        if (res.status === 409) { emailTaken = true; status = 'idle'; return; }
        if (res.status === 429) { nameErr = $t['auth.err.tooMany']; status = 'idle'; return; }
        // 400 (e.g. profanity) or 500 → inline on the relevant field / generic
        nameErr = data?.error || $t['auth.err.generic'];
        status = 'idle';
        return;
      }
```

(Reuses the existing generic-error placement on the top field — consistent with how non-field errors surface today.)

- [ ] **Step 3: Verify (dev server on :3000)**

`pnpm type-check` → no NEW errors. Then (clean up ALL temp users + `reg:*`/`login:*` rateLimits rows + emailVerifyTokens after):

```bash
for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w "reg$i=%{http_code} " -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d "{\"name\":\"Tmp Reg $i\",\"email\":\"tmp-reg-$i@example.invalid\",\"password\":\"Abcdef12\"}"; done; echo
# Expected: reg1=201 reg2=201 reg3=201 reg4=201 reg5=201 reg6=429
```

Normalization: `curl … -d '{"name":"Tmp Case","email":"TMP-CASE@Example.Invalid","password":"Abcdef12"}'` (after clearing the `reg:ip` bucket) → 201, then confirm the stored doc's `email` is `tmp-case@example.invalid` (one-off script), and that logging in with `tmp-case@example.invalid` works (Task 4's collation lookup).

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/auth/register.ts src/components/auth/kiosk/AuthRegisterInner.svelte
git commit -m "feat(auth): per-IP register throttle + lowercase email normalization"
```

---

### Task 7: resend-verification hardening (origin guard + hourly cap)

**Files:**
- Modify: `src/pages/api/auth/resend-verification.ts`

**Interfaces:**
- Consumes: `consumeRateLimit` (Task 2); existing 429 handling in `AuthVerifyInner`/`VerifyEmailBanner` (they already map 429 → `auth.verify.throttled` — no UI change needed).
- Produces: cross-site POSTs → `403 { error: 'Forbidden' }` when `ALLOWED_ORIGINS` is configured; >10 resends/hour/user → `429 { error: 'throttled' }`.

- [ ] **Step 1: Add the origin guard + cap**

Add the import:

```ts
import { consumeRateLimit } from '../../../lib/auth/rateLimit';
```

Add above the handler (same pattern as the marketplace contact relay):

```ts
const ALLOWED_ORIGINS_RAW = import.meta.env.ALLOWED_ORIGINS || '';
function getAllowedOrigins(): string[] {
  if (!ALLOWED_ORIGINS_RAW) return [];
  return ALLOWED_ORIGINS_RAW.split(',').map((o: string) => o.trim()).filter(Boolean);
}
```

At the very top of the try block (before `getSession`) insert:

```ts
    // CSRF origin guard (same pattern as the contact relay): browsers always
    // send Origin on cross-site POSTs; our own fetches carry our origin.
    // Skipped when ALLOWED_ORIGINS is unset (dev).
    const origin = request.headers.get('origin') ?? '';
    const allowed = getAllowedOrigins();
    if (allowed.length > 0 && !allowed.includes(origin)) {
      return json({ error: 'Forbidden' }, 403);
    }
```

After the `if (user.emailVerified === true)` early-return insert:

```ts
    // Belt-and-braces on top of the token lib's 60s guard: 10 resends/hour.
    const cap = await consumeRateLimit(`resendv:${String(user._id)}`, 10, 60 * 60 * 1000);
    if (cap.limited) return json({ error: 'throttled' }, 429);
```

- [ ] **Step 2: Verify (dev server on :3000)**

`pnpm type-check` → no NEW errors.

```bash
grep -n "^ALLOWED_ORIGINS=" .env
# If set locally (e.g. http://localhost:3000), test the guard:
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/auth/resend-verification -H 'Origin: https://evil.example'
# Expected: 403 when ALLOWED_ORIGINS is set locally; 401 when it is unset (guard skipped, session gate hits)
```

Logged-in path (temp user via playwright, cleanup after): resend from `/verify-email` still works (200, dev-log link). **PROD PRE-FLIGHT (report, don't change):** run `vercel env ls production | grep ALLOWED_ORIGINS` — if it exists, the USER must confirm its value is exactly `https://mahalle-das-kiezgesichterbuch.vercel.app` (a stale domain would 403 resend AND the contact relay). Surface this in the task report.

- [ ] **Step 3: Commit**

```bash
git add src/pages/api/auth/resend-verification.ts
git commit -m "feat(auth): origin guard + hourly cap on resend-verification"
```

---

### Task 8: Docs + final E2E sweep

**Files:**
- Modify: `src/components/auth/kiosk/CLAUDE.md` (rate-limit section; drop the two "Still deferred: rate-limit (state 05)" mentions)
- Modify: `CLAUDE.md` (root — `rateLimits` collection entry, env-var doc updates)

**Interfaces:** none — docs + verification only.

- [ ] **Step 1: Update `src/components/auth/kiosk/CLAUDE.md`**

Add after the "Email verify" section:

```markdown
## Rate-limit / hardening — state 05 (shipped, <actual docs-commit date, e.g. 2026-07-04>)

Fixed-window limiter in `src/lib/auth/rateLimit.ts` (SERVER-ONLY) over the
**`rateLimits`** collection (`{ key: '<baseKey>#<windowId>', baseKey, count,
expiresAt }`, TTL-cleaned; indexes via `pnpm tsx scripts/create-auth-indexes.ts`
— run against prod at deploy). IPs stored only as sha256(ip + CONTACT_IP_SALT)
truncated to 32 chars (same salt as the contact relay).

- **Login lockout (state 05)**: 5 failed attempts / 15 min per lowercased
  email, enforced INSIDE `authorize()` (peek before bcrypt, consume on fail,
  clear on success). Applies to unknown emails identically — no enumeration.
  While locked even the correct password is refused. UI: `AuthLoginInner`
  asks peek-only `POST /api/auth/login-status` after a failed signIn and
  shows the danger banner + m:ss countdown + disabled fields.
- **forgot-password**: 5/h per IP + 3/h per email, SILENT (still generic 200,
  send skipped). Also bounds the CWE-208 timing side-channel. Lookup now
  collation-insensitive (strength 2).
- **register**: 5/h per IP → 429 (`auth.err.tooMany` in the UI), placed
  BEFORE the OpenAI profanity check (cost guard). New emails stored
  lowercase; duplicate check collation-insensitive.
- **resend-verification**: ALLOWED_ORIGINS CSRF origin guard (contact-relay
  pattern, skipped when unset) + 10/h per user cap on top of the 60s guard.
- **Not limited**: `POST /api/auth/verify-email` — 256-bit random tokens make
  brute force infeasible; a limiter would only add a DoS lever.
```

Then update the two stale mentions: in the "Phase 2A" section replace `Still deferred to later Phase-2 plans: rate-limit (state 05).` and in "Phase 1 scope / deferred" replace `Still deferred: rate-limit (state 05).` — both become a pointer like `Rate-limit (state 05) shipped — see the Rate-limit / hardening section.` (The auth surface is now feature-complete against the design's state matrix.)

- [ ] **Step 2: Update root `CLAUDE.md`**

In **Database Collections**, after the `emailVerifyTokens` entry, add:

```markdown
- `rateLimits` - Fixed-window rate-limit buckets (`{ key: '<baseKey>#<windowId>', baseKey, count, expiresAt }`, TTL index). Used by login lockout (5 fails/15min), forgot-password (5/h IP + 3/h email, silent), register (5/h IP), resend-verification (10/h user). See `src/lib/auth/rateLimit.ts`; indexes via `scripts/create-auth-indexes.ts`.
```

In **Environment Variables**, extend two comments:
- `CONTACT_IP_SALT=` line: append ` Also used by auth rate limiting (src/lib/auth/rateLimit.ts).` to its comment.
- `ALLOWED_ORIGINS=` line: change its comment to `# CSV of allowed origins for contact relay + resend-verification CSRF guard. Must match the real deploy origin (currently https://mahalle-das-kiezgesichterbuch.vercel.app) or be unset.`

- [ ] **Step 3: Final E2E sweep (dev server on :3000; TEMP data only, full cleanup)**

1. `pnpm type-check` AND `pnpm build` → green (baseline-only errors).
2. Admin gate regression: unauthenticated `GET /api/admin/moderation` → 401; non-admin temp user → 403; the `/admin/moderation` PAGE still works for an admin-role temp user (queue loads — proves the Svelte queue's fetch path is unaffected).
3. Login lockout: full Task-4 flow once more end-to-end (5 fails → locked banner + countdown + disabled form → cleared bucket → success login clears baseKey).
4. Normal-path regressions: fresh register (201, lands `/verify-email`, dev-log link), verify link confirms, login with the new account works, forgot-password sends 1 link.
5. Limits don't cross-contaminate: after the register-throttle test, a DIFFERENT flow (e.g. forgot-password) still works from the same IP (separate baseKeys).
6. Indexes: one-off script asserts `rateLimits`, `passwordResetTokens`, `emailVerifyTokens` each carry their TTL index (`rl_ttl`/`prt_ttl`/`evt_ttl`).
7. Cleanup: delete ALL temp users, their tokens, and ALL `rateLimits` rows created by testing (`deleteMany({ baseKey: { $regex: 'example.invalid' } })` plus the `reg:ip`/`fp:ip` buckets for the dev IP); no scripts left anywhere in the repo; `git status` clean except intended changes.
8. Report the PROD notes for the user: run `scripts/create-auth-indexes.ts` against prod DB at deploy; confirm `ALLOWED_ORIGINS` + `CONTACT_IP_SALT` values in Vercel prod.

- [ ] **Step 4: Commit**

```bash
git add src/components/auth/kiosk/CLAUDE.md CLAUDE.md
git commit -m "docs(auth): record rate-limit layer (state 05) + rateLimits collection"
```

---

## Deferred / explicitly out of scope

- **Full CWE-208 timing equalization** on forgot-password — the new limits bound probing volume; constant-time redesign remains deferred.
- **Legacy mixed-case email data migration** — lookups are now collation-insensitive everywhere that matters (login, register-dup-check, forgot-password); rewriting stored emails risks collisions for no additional behavior.
- **Ban enforcement** (`isBanned` at login) — pre-existing TODO in `review.ts`, untouched here.
- **CAPTCHA / proof-of-work on register** — revisit only if the 5/h IP throttle proves insufficient.
- **Per-IP login limits** — `authorize()` runs inside NextAuth without reliable access to `clientAddress`; the per-identifier lockout is the design-mandated behavior (state 05). Revisit only with real abuse data.
