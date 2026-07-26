# Ban Enforcement (3-Strike Sperre) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `isBanned: true` actually enforce something — banned users cannot log in (kiosk "Konto gesperrt" card), existing sessions go read-only (403 on all content-write APIs + persistent danger banner), per the admin design handoff §8 (`design/handoffs/design_handoff_admin/`).

**Architecture:** A server-only `banGuard` helper does live `users.isBanned` reads (never trusts the JWT — bans happen mid-session). `authorize()` denies banned logins after bcrypt success and drops a short-lived "ban flag" marker into the existing `rateLimits` collection; the peek-only `login-status` endpoint surfaces it so the client can show the ban card without creating a new enumeration oracle. A `SuspendedBanner` (mirror of `VerifyEmailBanner`) live-checks a new `account-status` endpoint. 26 write endpoints get a 2-line guard; 6 compose pages get an SSR gate.

**Tech Stack:** Astro 5 API routes, auth-astro/NextAuth (Credentials, JWT), MongoDB 6 direct driver, Svelte 5 runes islands, kiosk design tokens (`--k-*`), `kiosk-i18n`.

## Global Constraints

- **Anti-enumeration invariants stay intact**: login shows ONE generic banner for wrong-pw/unknown-email; `login-status` stays peek-only (never counts attempts); the new `banned` flag in `login-status` may ONLY be true when a correct-password login attempt happened within the flag window (prove-then-tell).
- **Accepted residual (document, don't fix)**: for 5 minutes after a banned account's owner submits the CORRECT password, any caller asking `login-status` about that email learns `banned: true`. Requires a proven-password event to trigger; attackers cannot cause it themselves.
- **Live DB reads for enforcement** — never gate a write on `session.user` flags (JWT snapshots at login; bans happen mid-session).
- **`src/lib/auth/banGuard.ts` is SERVER-ONLY** (imports `connectDB`). Never import it from a `client:*` component (see root CLAUDE.md "Server-only modules bleeding into client bundles").
- **Design source of truth**: `design/handoffs/design_handoff_admin/jsx/kiosk-admin-flows.jsx` § "06 · User-side suspended screens" (lines 274–320). Copy is verbatim from there.
- **German strings use curly quotes** `„` (U+201E) / `“` (U+201C) where quoting occurs. DE + EN parity for all user-facing strings (these screens are user-side, not admin-internal).
- **Type-check gate**: `pnpm type-check` has a PRE-EXISTING baseline of ~814–818 errors. Gate = no NEW errors. When unsure, A/B via `git stash`.
- **Prod DB == local dev DB** (`CommunityWebApp-test`). Any test user must be `tmp-*@example.invalid` and rigorously cleaned up (user doc + its `rateLimits` docs).
- Commit messages: simple, concise, no AI signatures/footers. Never `--no-verify`.
- **Locked decisions** (from design review + this plan):
  - Deletes of own content stay ALLOWED for banned users (removing content ≠ posting).
  - Private bookmarks (`events/save`, `news/save`, `posts/save`, `listings/[id]/save`) and passive counters (`views/increment`, `listings/[id]/view`) stay ALLOWED ("mitlesen" includes private reading aids).
  - Public-facing writes are BLOCKED: content create/edit, comments, likes, RSVP, uploads, listings lifecycle, reports, profile update.
  - `listings/[id]/contact.ts` is NOT guarded — it is an anonymous endpoint (buyers need no account, there is no session identity to check). Its existing IP-hash + per-sender rate limits bound abuse; identity-based ban enforcement is impossible there by design.
  - Compose pages redirect banned users to `/` (the SuspendedBanner explains why). The design's inline "DEAKTIVIERT" composer state is a later polish item, not this pass.
  - Contact address in the ban card is `moderation@mahalle.berlin` per design — the mailbox doesn't exist yet (open ops item, flagged to user; copy ships as designed).

---

### Task 1: banGuard lib + authorize() ban check + login-status `banned` flag

**Files:**
- Create: `src/lib/auth/banGuard.ts`
- Modify: `src/lib/auth/rateLimit.ts` (add one exported constant)
- Modify: `auth.config.ts:62-64` (insert ban check after bcrypt success, before `clearRateLimit`)
- Modify: `src/pages/api/auth/login-status.ts`

**Interfaces:**
- Consumes: `consumeRateLimit(baseKey, max, windowMs)`, `peekRateLimit(baseKey, max, windowMs)` from `src/lib/auth/rateLimit.ts` (existing).
- Produces: `isUserBanned(userId: string): Promise<boolean>` and `rejectIfBanned(userId: string): Promise<Response | null>` from `src/lib/auth/banGuard.ts`; `BAN_FLAG_WINDOW_MS` from `rateLimit.ts`; `login-status` response shape `{ locked: boolean, retryAfterSec: number, banned: boolean }`.

- [ ] **Step 1: Create `src/lib/auth/banGuard.ts`**

```typescript
// src/lib/auth/banGuard.ts
// SERVER-ONLY (imports mongodb). Live ban checks for enforcement.
//
// Always reads the DB — never trust session.user for ban state. The JWT
// snapshots at login, but bans happen mid-session (3rd strike in the
// moderation queue), so a session flag would be stale exactly when it
// matters.
import { ObjectId } from 'mongodb';
import { connectDB } from '../mongodb';

export async function isUserBanned(userId: string): Promise<boolean> {
  if (!userId || !ObjectId.isValid(userId)) return false;
  const db = await connectDB();
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(userId) },
    { projection: { isBanned: 1 } }
  );
  return user?.isBanned === true;
}

/**
 * Write-endpoint guard. Call AFTER the session check:
 *
 *   const bannedRes = await rejectIfBanned(session.user.id);
 *   if (bannedRes) return bannedRes;
 *
 * Returns a pre-shaped 403 when the user is banned, else null.
 * `error: 'account_banned'` is the machine-readable discriminator
 * clients may use to show the suspended state.
 */
export async function rejectIfBanned(userId: string): Promise<Response | null> {
  if (!(await isUserBanned(userId))) return null;
  return new Response(
    JSON.stringify({
      error: 'account_banned',
      message: 'Dein Konto ist gesperrt. Du kannst mitlesen, aber nichts mehr posten.',
    }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
}
```

- [ ] **Step 2: Add the ban-flag window constant to `src/lib/auth/rateLimit.ts`**

Directly below the existing `LOGIN_WINDOW_MS` export (line 22), add:

```typescript
// Ban-notice flag: authorize() marks "correct password on a banned account"
// so the peek-only login-status endpoint can tell the login UI to show the
// „Konto gesperrt" card. Prove-then-tell: only a verified password sets it.
// authorize() and login-status MUST share this window (windowId derives
// from windowMs — mismatched values would read different buckets).
export const BAN_FLAG_WINDOW_MS = 5 * 60 * 1000;
```

- [ ] **Step 3: Insert the ban check in `auth.config.ts`**

Update the import on line 6 to include the new constant:

```typescript
import { peekRateLimit, consumeRateLimit, clearRateLimit, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS, BAN_FLAG_WINDOW_MS } from "./src/lib/auth/rateLimit";
```

Then insert between the `isValidPassword` failure block (ends line 61) and the `clearRateLimit` success line (line 64):

```typescript
                // Ban enforcement (3-strike Sperre): a banned account never
                // gets a session — even with the correct password. Because
                // the password IS proven at this point, it is safe to drop a
                // short-lived flag that login-status may reveal to the UI
                // (prove-then-tell; no new enumeration oracle). Deliberately
                // does NOT consume the login lockout (not a credential
                // failure) and does NOT clear it either.
                if (user.isBanned === true) {
                    await consumeRateLimit(`banflag:${emailNorm}`, 1, BAN_FLAG_WINDOW_MS).catch(() => {});
                    return null;
                }
```

- [ ] **Step 4: Extend `src/pages/api/auth/login-status.ts`**

Replace the full file body with:

```typescript
import type { APIRoute } from 'astro';
import { peekRateLimit, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS, BAN_FLAG_WINDOW_MS } from '../../../lib/auth/rateLimit';

// UI helper for the login page's state-05 banner + ban card. PEEK-only
// (never counts an attempt, so polling can't extend a lockout).
//
// `banned` is prove-then-tell: authorize() sets the `banflag:` marker ONLY
// after verifying the password of a banned account, so this endpoint never
// reveals ban state (or account existence) to a caller who hasn't proven
// the password within the last BAN_FLAG_WINDOW_MS. Accepted residual: a
// third party polling this endpoint for that email inside the window sees
// the flag too — it cannot be triggered without the password.
export const POST: APIRoute = async ({ request }) => {
  const json = (body: object) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email) return json({ locked: false, retryAfterSec: 0, banned: false });

    const [lock, ban] = await Promise.all([
      peekRateLimit(`login:${email}`, LOGIN_MAX_FAILS, LOGIN_WINDOW_MS),
      peekRateLimit(`banflag:${email}`, 1, BAN_FLAG_WINDOW_MS),
    ]);
    return json({
      locked: lock.limited,
      retryAfterSec: lock.limited ? lock.retryAfterSec : 0,
      banned: ban.limited,
    });
  } catch (err) {
    console.error('login-status error:', err);
    return json({ locked: false, retryAfterSec: 0, banned: false });
  }
};
```

- [ ] **Step 5: Type-check**

Run: `pnpm type-check 2>&1 | grep -c "error TS"`
Expected: same count as baseline on this branch (~814–818; verify via `git stash` A/B if unsure). No NEW errors.

- [ ] **Step 6: Manual verification against the dev server (:3000) — shared prod DB, use tmp user**

Write a throwaway script in the scratchpad dir (NOT the repo) that: (1) registers is skipped — insert directly: creates `users` doc `{ email: 'tmp-ban-test@example.invalid', name: 'Tempbantest', password: <bcrypt hash of 'Test1234x'>, isBanned: true, createdAt: new Date() }` via the `mongodb` driver + `.env` `MONGODB_URI`; (2) prints the inserted `_id`.

Then:
```bash
# correct password against banned account → authorize returns null (no session cookie)
curl -s -c /tmp/claude-1000/*/scratchpad/cj.txt -X POST http://localhost:3000/api/auth/callback/credentials \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'email=tmp-ban-test@example.invalid' --data-urlencode 'password=Test1234x' \
  --data-urlencode "csrfToken=$(curl -s -c /tmp/claude-1000/*/scratchpad/cj.txt http://localhost:3000/api/auth/csrf | python3 -c 'import sys,json;print(json.load(sys.stdin)["csrfToken"])')" -b /tmp/claude-1000/*/scratchpad/cj.txt -o /dev/null

# ban flag now visible via login-status
curl -s -X POST http://localhost:3000/api/auth/login-status -H 'Content-Type: application/json' \
  -d '{"email":"tmp-ban-test@example.invalid"}'
```
Expected: `{"locked":false,"retryAfterSec":0,"banned":true}`. And a wrong-password attempt against the same account must NOT set the flag (delete the `banflag:` doc first, try wrong pw, expect `banned:false`).

- [ ] **Step 7: Clean up test data** (KEEP the tmp user for Tasks 2–8 verification — clean rateLimits only for the wrong-pw check; final cleanup is Task 8)

- [ ] **Step 8: Commit**

```bash
git add src/lib/auth/banGuard.ts src/lib/auth/rateLimit.ts auth.config.ts src/pages/api/auth/login-status.ts
git commit -m "feat(auth): enforce isBanned at login + ban-flag signal for the UI"
```

---

### Task 2: Login "Konto gesperrt" card (design A) in AuthLoginInner + i18n

**Files:**
- Modify: `src/components/auth/kiosk/AuthLoginInner.svelte`
- Modify: `src/lib/kiosk-i18n.ts` (5 new keys × DE/EN)

**Interfaces:**
- Consumes: `login-status` response `{ locked, retryAfterSec, banned }` (Task 1).
- Produces: i18n keys `auth.banned.title.a`, `auth.banned.title.accent`, `auth.banned.body`, `auth.banned.contactQ`, `auth.banned.contactMail` (Task 8's docs reference them).

- [ ] **Step 1: Add i18n keys to `src/lib/kiosk-i18n.ts`**

In the DE dict (next to the existing `auth.err.*` keys):

```typescript
  'auth.banned.title.a': 'Konto ',
  'auth.banned.title.accent': 'gesperrt',
  'auth.banned.body': 'Dein Konto wurde nach drei Verstößen gegen die Kiez-Regeln gesperrt. Anmelden ist nicht mehr möglich.',
  'auth.banned.contactQ': 'Fragen zur Sperre?',
  'auth.banned.contactMail': 'moderation@mahalle.berlin',
```

In the EN dict (same positions):

```typescript
  'auth.banned.title.a': 'Account ',
  'auth.banned.title.accent': 'suspended',
  'auth.banned.body': 'Your account was suspended after three violations of the Kiez rules. Signing in is no longer possible.',
  'auth.banned.contactQ': 'Questions about the suspension?',
  'auth.banned.contactMail': 'moderation@mahalle.berlin',
```

- [ ] **Step 2: Wire the banned state in `AuthLoginInner.svelte`**

Add state next to `lockSec` (line ~18):

```typescript
  // Ban enforcement (design A): correct password on a banned account.
  // Replaces the whole card — there is nothing else to do on this page.
  let bannedState = $state(false);
```

In `submit()`, inside the failed-probe branch, the login-status handler currently checks `data?.locked`. Extend it — banned wins over locked:

```typescript
          const data = await res.json().catch(() => ({}));
          if (data?.banned) {
            bannedState = true;
            status = 'idle';
            return;
          }
          if (data?.locked) {
            startLock(data.retryAfterSec);
            status = 'idle';
            return;
          }
```

- [ ] **Step 3: Render the ban card (replaces the form entirely)**

Wrap the existing card content: the current `<div class="auth-card">…</div>` keeps its markup as the `{:else}` branch; the banned branch renders design A (kiosk-admin-flows.jsx lines 282–294) with kiosk tokens:

```svelte
<div class="auth-card" class:auth-card-banned={bannedState}>
  {#if bannedState}
    <div style="text-align:center;">
      <div class="banned-roundel" aria-hidden="true">✕</div>
      <h1 class="font-bricolage" style="font-weight:800; font-size:26px; letter-spacing:-0.025em; margin:0; color:var(--k-ink);">
        {$t['auth.banned.title.a']}<span class="font-instrument" style="font-style:italic; font-weight:400; color:var(--k-danger);">{$t['auth.banned.title.accent']}</span>
      </h1>
      <p class="font-bricolage" style="font-size:13.5px; line-height:1.55; color:var(--k-ink-soft); margin:10px 0 0;">
        {$t['auth.banned.body']}
      </p>
      <div class="font-dmmono banned-contact">
        {$t['auth.banned.contactQ']}<br />{$t['auth.banned.contactMail']}
      </div>
    </div>
  {:else}
    <!-- existing eyebrow + title + banners + form + footer, unchanged -->
  {/if}
</div>
```

Add to the component `<style>` block:

```css
  .auth-card-banned {
    border-top-color: var(--k-danger);
    box-shadow: 3px 3px 0 var(--k-danger);
  }
  .banned-roundel {
    width: 46px; height: 46px; margin: 0 auto 12px;
    background: var(--k-danger); border-radius: 50%;
    border: 1.5px solid var(--k-ink);
    display: flex; align-items: center; justify-content: center;
    color: var(--k-paper); font-size: 20px; font-weight: 700;
  }
  .banned-contact {
    font-size: 10.5px; color: var(--k-ink-mute); margin-top: 14px;
    padding: 9px 12px; background: var(--k-paper-soft);
    border-radius: 8px; border: 1px solid var(--k-rule); line-height: 1.5;
  }
```

(Design A specifies danger top-rule + danger print shadow on the card — the base `.auth-card` already has `border-top: 4px solid var(--k-accent)` and `box-shadow: 3px 3px 0 var(--k-ink)`; the `.auth-card-banned` overrides swap both to danger.)

- [ ] **Step 4: Type-check + browser verify**

Run: `pnpm type-check` → no new errors. Then on :3000 `/login`, submit `tmp-ban-test@example.invalid` / `Test1234x` → expect the gesperrt card (verify with playwright-cli if headless). Toggle the language switcher → EN copy renders.

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/kiosk/AuthLoginInner.svelte src/lib/kiosk-i18n.ts
git commit -m "feat(auth): kiosk 'Konto gesperrt' card on banned login"
```

---

### Task 3: account-status endpoint + SuspendedBanner (design B) in KioskLayout

**Files:**
- Create: `src/pages/api/auth/account-status.ts`
- Create: `src/components/auth/kiosk/SuspendedBanner.svelte`
- Modify: `src/layouts/KioskLayout.astro:68` (mount above VerifyEmailBanner)
- Modify: `src/lib/kiosk-i18n.ts` (2 new keys × DE/EN)

**Interfaces:**
- Consumes: `isUserBanned(userId)` from `src/lib/auth/banGuard.ts` (Task 1).
- Produces: `GET /api/auth/account-status` → 200 `{ banned: boolean }` (session-gated, 401 without session). Task 8's docs reference it.

- [ ] **Step 1: Create `src/pages/api/auth/account-status.ts`**

```typescript
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { isUserBanned } from '../../../lib/auth/banGuard';

// Live ban state for the session user. Mirrors verification-status: the JWT
// can't be trusted (bans happen mid-session), so the SuspendedBanner asks
// the DB. Session-gated — reveals nothing about other accounts.
export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const banned = await isUserBanned(session.user.id);
  return new Response(JSON.stringify({ banned }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

- [ ] **Step 2: Add i18n keys to `src/lib/kiosk-i18n.ts`**

DE:
```typescript
  'auth.banner.suspendedTitle': 'Dein Konto ist gesperrt.',
  'auth.banner.suspendedBody': 'Du kannst mitlesen, aber nichts mehr posten, kommentieren oder inserieren.',
```
EN:
```typescript
  'auth.banner.suspendedTitle': 'Your account is suspended.',
  'auth.banner.suspendedBody': 'You can still read along, but you can no longer post, comment or list items.',
```

- [ ] **Step 3: Create `src/components/auth/kiosk/SuspendedBanner.svelte`**

Design B (kiosk-admin-flows.jsx lines 296–304): danger fill, ink border, print shadow, ✕ glyph, bold title + body. NOT dismissible (hard account state). Once-per-browser-session negative cache so the extra GET doesn't hit every page view for every user; a banned result is never cached.

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from '../../../lib/kiosk-i18n';

  // Negative-result cache: most users are not banned; skip re-checking for
  // the rest of the browser session. A mid-session ban therefore shows up
  // on the next browser session (or after storage clear) — the write APIs'
  // 403 guard is the real enforcement; this banner is communication.
  const OK_KEY = 'mahalle-ban-checked-ok';

  let visible = $state(false);

  onMount(async () => {
    try {
      if (sessionStorage.getItem(OK_KEY)) return;
    } catch { /* storage disabled → just check */ }
    try {
      const res = await fetch('/api/auth/account-status');
      if (!res.ok) return; // no session / error → show nothing
      const data = await res.json();
      if (data?.banned === true) {
        visible = true; // never cache the banned state
      } else {
        try { sessionStorage.setItem(OK_KEY, '1'); } catch { /* best-effort */ }
      }
    } catch { /* network error → show nothing */ }
  });
</script>

{#if visible}
  <div class="suspended-banner" role="alert">
    <div class="suspended-banner-inner">
      <span class="suspended-banner-x" aria-hidden="true">✕</span>
      <span class="font-bricolage suspended-banner-text">
        <strong>{$t['auth.banner.suspendedTitle']}</strong>
        {$t['auth.banner.suspendedBody']}
      </span>
    </div>
  </div>
{/if}

<style>
  .suspended-banner {
    background: var(--k-danger);
    border-bottom: 1.5px solid var(--k-ink);
  }
  .suspended-banner-inner {
    max-width: 80rem;
    margin: 0 auto;
    padding: 10px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .suspended-banner-x { color: var(--k-paper); font-size: 17px; flex-shrink: 0; }
  .suspended-banner-text { font-size: 12.5px; line-height: 1.45; color: var(--k-paper); }
  .suspended-banner-text strong { font-weight: 700; margin-right: 6px; }
</style>
```

- [ ] **Step 4: Mount in `src/layouts/KioskLayout.astro`**

Import next to the VerifyEmailBanner import (line 15):
```typescript
import SuspendedBanner from '../components/auth/kiosk/SuspendedBanner.svelte';
```
Directly ABOVE the existing VerifyEmailBanner mount (line 68), add:
```astro
    {session?.user && <SuspendedBanner client:load />}
```

- [ ] **Step 5: Type-check + browser verify**

`pnpm type-check` → no new errors. With the tmp user temporarily UN-banned (scratchpad script flips `isBanned: false`), log in on :3000, then flip `isBanned: true`, clear `sessionStorage`, reload `/forum` → danger banner appears on every kiosk page. Flip back as needed; leave the tmp user banned for Task 4–7 verification.

- [ ] **Step 6: Commit**

```bash
git add src/pages/api/auth/account-status.ts src/components/auth/kiosk/SuspendedBanner.svelte src/layouts/KioskLayout.astro src/lib/kiosk-i18n.ts
git commit -m "feat(auth): suspended-account banner with live ban status"
```

---

### Task 4: Write-guard sweep A — forum, comments, likes, uploads, reports, profile

**Files (modify — 9):**
- `src/pages/api/topics/create.ts`
- `src/pages/api/topics/edit/[id].ts`
- `src/pages/api/comments/create.ts`
- `src/pages/api/comments/edit/[commentId].ts`
- `src/pages/api/likes/toggle.ts`
- `src/pages/api/posts/upload.ts`
- `src/pages/api/upload/image.ts`
- `src/pages/api/reports/submit.ts`
- `src/pages/api/users/update.ts`

**Interfaces:**
- Consumes: `rejectIfBanned(userId)` from `src/lib/auth/banGuard.ts` (Task 1).
- Produces: every listed endpoint returns 403 `{ error: 'account_banned', ... }` for banned users, before any other work (validation, moderation API spend, DB writes).

- [ ] **Step 1: Apply the guard to each file**

In each file, add the import (adjust the relative depth to match the file's existing `lib/` imports — e.g. `../../../lib/auth/banGuard` for 3-deep, `../../../../lib/auth/banGuard` for 4-deep):

```typescript
import { rejectIfBanned } from '../../../lib/auth/banGuard';
```

Then insert IMMEDIATELY after the endpoint's session-401 block (every file follows the root-CLAUDE.md pattern `if (!session?.user) { …401… }`):

```typescript
    // Ban enforcement: banned accounts are read-only (3-strike Sperre).
    const bannedRes = await rejectIfBanned(session.user.id);
    if (bannedRes) return bannedRes;
```

Notes for this sweep:
- `topics/create.ts`: insert after the 401 block (line 20), BEFORE the daily-limit check — a banned user must not spend a DB count or reach the OpenAI moderation calls.
- **`upload/image.ts` is a legacy JWT-Bearer endpoint** (custom `jwt.verify`, no `getSession`; still referenced by `ImageUpload.tsx`). It has no `session` variable — insert the guard AFTER the token-verify try/catch (line ~37), keyed off the decoded token:

  ```typescript
      // Ban enforcement: banned accounts are read-only (3-strike Sperre).
      const bannedRes = await rejectIfBanned(String(decoded.userId ?? ''));
      if (bannedRes) return bannedRes;
  ```
- Files with multiple mutating handlers (e.g. an endpoint exporting both `PUT` and `DELETE`): guard the create/edit handlers only. DELETE handlers stay unguarded (locked decision: own-content removal stays possible).
- If a file's session variable is named differently, adapt; the guard always takes the acting user's id.

- [ ] **Step 2: Type-check**

Run: `pnpm type-check` → no new errors.

- [ ] **Step 3: Verify one endpoint end-to-end**

With a logged-in session for the (banned) tmp user (cookie from a login while un-banned, then re-ban — Task 3 Step 5 flow), or simpler: temporarily un-ban → log in via browser/playwright → re-ban → then:

```bash
curl -s -X POST http://localhost:3000/api/likes/toggle -H 'Content-Type: application/json' \
  -H "Cookie: <session cookie>" -d '{"contentId":"000000000000000000000000","contentType":"topic"}'
```
Expected: `403` with `{"error":"account_banned",...}` (guard fires before any validation).

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/topics src/pages/api/comments src/pages/api/likes src/pages/api/posts/upload.ts src/pages/api/upload/image.ts src/pages/api/reports/submit.ts src/pages/api/users/update.ts
git commit -m "feat(moderation): ban guard on forum/comment/like/upload/report/profile writes"
```

---

### Task 5: Write-guard sweep B — events, announcements, recommendations

**Files (modify — 8):**
- `src/pages/api/events/create.ts`
- `src/pages/api/events/edit/[id].ts`
- `src/pages/api/events/[id]/rsvp.ts`
- `src/pages/api/events/[id]/like.ts`
- `src/pages/api/announcements/create.ts`
- `src/pages/api/announcements/edit/[id].ts`
- `src/pages/api/recommendations/create.ts`
- `src/pages/api/recommendations/edit/[id].ts`

**Interfaces:**
- Consumes: `rejectIfBanned(userId)` from `src/lib/auth/banGuard.ts` (Task 1).
- Produces: same 403 `account_banned` contract as Task 4.

- [ ] **Step 1: Apply the guard to each file** — identical mechanics to Task 4 Step 1 (import with correct relative depth; insert after the session-401 block, before daily-limit/validation/moderation work):

```typescript
import { rejectIfBanned } from '../../../lib/auth/banGuard';
```
```typescript
    // Ban enforcement: banned accounts are read-only (3-strike Sperre).
    const bannedRes = await rejectIfBanned(session.user.id);
    if (bannedRes) return bannedRes;
```

NOT touched (locked decisions): `events/save.ts` (private bookmark), `events/delete/[id].ts`, `announcements/delete/[id].ts`, `recommendations/delete/[id].ts` (own-content removal stays allowed).

- [ ] **Step 2: Type-check** — `pnpm type-check` → no new errors.

- [ ] **Step 3: Spot-verify** — with the banned session cookie: `POST /api/events/create` (any body) → 403 `account_banned` (before validation errors).

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/events src/pages/api/announcements src/pages/api/recommendations
git commit -m "feat(moderation): ban guard on event/announcement/recommendation writes"
```

---

### Task 6: Write-guard sweep C — marketplace + news

**Files (modify — 9):**
- `src/pages/api/listings/create.ts`
- `src/pages/api/listings/edit/[id].ts`
- `src/pages/api/listings/draft.ts`
- `src/pages/api/listings/draft/[id]/publish.ts`
- `src/pages/api/listings/[id]/bump.ts`
- `src/pages/api/listings/[id]/status.ts`
- `src/pages/api/listings/upload.ts`
- `src/pages/api/news/submit.ts`
- `src/pages/api/news/upload.ts`

**Interfaces:**
- Consumes: `rejectIfBanned(userId)` from `src/lib/auth/banGuard.ts` (Task 1).
- Produces: same 403 `account_banned` contract as Task 4.

- [ ] **Step 1: Apply the guard to each file** — identical mechanics to Task 4 Step 1. Depth note: `listings/draft/[id]/publish.ts` and `listings/[id]/*.ts` are deeper — count the segments and match the file's existing `lib/` import prefix.

Special cases:
- **`listings/[id]/bump.ts` and `listings/[id]/status.ts` use a different session shape** — no `if (!session?.user)` block; instead:

  ```typescript
    const session = await getSession(request);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }
  ```

  Insert the guard directly after that `if (!userId)` block, using `userId`:

  ```typescript
    // Ban enforcement: banned accounts are read-only (3-strike Sperre).
    const bannedRes = await rejectIfBanned(userId);
    if (bannedRes) return bannedRes;
  ```
- `listings/[id]/status.ts`: guards status changes (reserve/sold/reactivate) — lifecycle writes on public listings.
- NOT touched: `listings/[id]/contact.ts` (ANONYMOUS endpoint — buyers need no account; no session identity exists to check. Its IP-hash + per-sender rate limits bound abuse — locked decision in Global Constraints), `listings/delete/[id].ts`, `listings/[id]/save.ts` (bookmark), `listings/[id]/view.ts` (passive counter), `news/save.ts` (bookmark).

- [ ] **Step 2: Type-check** — `pnpm type-check` → no new errors.

- [ ] **Step 3: Spot-verify** — banned session cookie: `POST /api/listings/draft` with `{}` → 403 `account_banned`; `POST /api/news/submit` → 403 `account_banned`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/listings src/pages/api/news/submit.ts src/pages/api/news/upload.ts
git commit -m "feat(moderation): ban guard on marketplace and news writes"
```

---

### Task 7: SSR ban gates on compose pages

**Files (modify — 6):**
- `src/pages/topics/create.astro`
- `src/pages/events/create.astro`
- `src/pages/events/edit/[id].astro`
- `src/pages/marketplace/create.astro`
- `src/pages/marketplace/edit/[id].astro`
- `src/pages/newsboard/submit.astro`

**Interfaces:**
- Consumes: `isUserBanned(userId)` from `src/lib/auth/banGuard.ts` (Task 1) — frontmatter-only import (server context; safe).
- Produces: banned users are redirected to `/` before any compose UI renders (the SuspendedBanner there explains the state).

- [ ] **Step 1: Add the gate to each page's frontmatter**

Import (adjust relative depth per page — `../../lib/...` for 2-deep pages, `../../../lib/...` for 3-deep like `events/edit/[id].astro`):

```typescript
import { isUserBanned } from '../../lib/auth/banGuard';
```

Insert directly AFTER each page's existing `if (!session?.user) return Astro.redirect('/login', 302);` block:

```typescript
// Ban enforcement: banned accounts are read-only — no compose surfaces.
// The SuspendedBanner on the target page explains why.
if (await isUserBanned(session.user.id)) {
  return Astro.redirect('/', 302);
}
```

(Each of the 6 pages already has the frontmatter session gate — `topics/create.astro:14-16` is the canonical shape. If an edit page loads the entity first, insert the ban gate before the entity fetch.)

**Server/client boundary caution:** `banGuard.ts` imports `connectDB` → it must ONLY appear in frontmatter, never passed to or imported by an island. After this task, load one page in a real browser and confirm islands still hydrate (root CLAUDE.md "Server-only modules bleeding into client bundles").

- [ ] **Step 2: Type-check + browser verify**

`pnpm type-check` → no new errors. Banned session: visiting `/topics/create` → 302 to `/`. Un-banned control user: compose pages render + hydrate normally (check one page's island interactivity in the browser — not just the build).

- [ ] **Step 3: Commit**

```bash
git add src/pages/topics/create.astro src/pages/events/create.astro "src/pages/events/edit/[id].astro" src/pages/marketplace/create.astro "src/pages/marketplace/edit/[id].astro" src/pages/newsboard/submit.astro
git commit -m "feat(moderation): SSR ban gate on compose pages"
```

---

### Task 8: Docs, TODO cleanup, end-to-end verification, test-data cleanup

**Files:**
- Modify: `src/pages/api/admin/moderation/review.ts:18-19` (remove the stale TODO comment block — enforcement now exists)
- Modify: `src/components/auth/kiosk/CLAUDE.md` (new "Ban enforcement" section)
- Modify: `CLAUDE.md` (root — users-collection bullet + moderation section)

**Interfaces:**
- Consumes: everything above.
- Produces: docs matching shipped behavior; clean DB.

- [ ] **Step 1: Remove the stale TODO in `review.ts`**

Delete the comment block at lines 18-19 (`// When user is banned (isBanned: true), we need to: // 1. Check isBanned in auth callback → reject login...`) — replace with:

```typescript
// Ban enforcement lives in auth.config.ts (login block), src/lib/auth/banGuard.ts
// (write-API guard + compose-page SSR gate) and SuspendedBanner (user-facing).
```

- [ ] **Step 2: Add a "Ban enforcement" section to `src/components/auth/kiosk/CLAUDE.md`** (after the rate-limit section):

```markdown
## Ban enforcement — 3-strike Sperre (shipped, 2026-07-09)

`isBanned: true` (set by the moderation strike system) is now ENFORCED:

- **Login**: `authorize()` refuses banned accounts even with the correct
  password (no session). Prove-then-tell signal: after bcrypt success it
  drops a `banflag:<email>` marker (rateLimits collection, 5-min window,
  `BAN_FLAG_WINDOW_MS`); the peek-only `login-status` endpoint returns
  `banned: true` while the marker lives, and `AuthLoginInner` swaps the
  card for the „Konto gesperrt" screen (danger top-rule + roundel +
  moderation contact). No new enumeration oracle: only a proven password
  can set the flag. Accepted residual: third parties polling login-status
  for that email inside the 5-min window see the flag too.
- **Writes**: `rejectIfBanned(userId)` in `src/lib/auth/banGuard.ts`
  (SERVER-ONLY — never import from islands) guards all public-facing write
  APIs (content create/edit, comments, likes, RSVP, uploads, listings
  lifecycle, news submit, reports, profile update) with
  403 `{ error: 'account_banned' }`. LIVE DB read every time — the JWT
  snapshots at login and bans happen mid-session. Deliberately NOT
  guarded: deletes (own-content removal), bookmarks/saves, view counters,
  and the anonymous listing contact relay (no session identity to check;
  IP-hash rate limits bound abuse).
- **Session UX**: `SuspendedBanner.svelte` (KioskLayout, above
  VerifyEmailBanner) live-checks `GET /api/auth/account-status` and shows
  the non-dismissible danger banner. Negative results are cached in
  sessionStorage (`mahalle-ban-checked-ok`) so the check runs once per
  browser session; a banned result is never cached.
- **Compose pages**: SSR frontmatter gate redirects banned users to `/`.
  (Design's inline DEAKTIVIERT composer state deferred — server 403s are
  the enforcement.)
- **Un-ban**: manual DB flip (`isBanned: false`) — admin UI is future work.
```

- [ ] **Step 3: Update root `CLAUDE.md`**

Users collection bullet — extend `(includes 'moderationStrikes', 'isBanned', ...)` to note enforcement:

```markdown
- `users` - User accounts (includes `moderationStrikes`, `strikeHistory` (per-strike ledger: date/reason/contentType/contentId/reviewedBy), `isBanned` — ENFORCED: banned accounts cannot log in and all content-write APIs return 403 `account_banned` (see `src/lib/auth/banGuard.ts`); plus `role?: 'user' | 'admin'` — admin role unlocks `/admin/announcements`, the moderation queue, and the `isOfficial`-true admin-create endpoint; defaults to `'user'`)
```

Moderation section — extend the strike bullet:

```markdown
- **Strike system**: 3 strikes = automatic user ban — enforced at login (no session for banned accounts) and on all content-write APIs (403 `account_banned` via `src/lib/auth/banGuard.ts`); banned users keep read access
```

- [ ] **Step 4: Full end-to-end pass (dev server :3000, tmp user)**

1. `pnpm type-check` → baseline count, no new errors.
2. Banned login → gesperrt card (DE + EN).
3. Un-ban → login works → re-ban → clear sessionStorage → banner on `/forum`, `/calendar`, `/marketplace`.
4. Banned session: `POST /api/topics/create`, `POST /api/events/create`, `POST /api/listings/draft`, `POST /api/comments/create` → all 403 `account_banned`.
5. Banned session: `POST /api/posts/save` (bookmark) → NOT blocked (still works or fails for its own reasons, not 403 account_banned).
6. `/topics/create` → 302 `/`.
7. Control (non-banned real flow untouched): normal login + one topic create against a NON-tmp scratch check is NOT needed — instead un-ban the tmp user, create a topic, confirm 200, then delete that topic doc in cleanup.

- [ ] **Step 5: Clean up ALL test data (prod DB is shared!)**

Scratchpad script deletes: the tmp user doc (`tmp-ban-test@example.invalid`), any content it created (topics etc. by its userId), its `flaggedContent`/`comments` if any, and `rateLimits` docs `{ baseKey: { $in: ['login:tmp-ban-test@example.invalid', 'banflag:tmp-ban-test@example.invalid'] } }`. Print deleted counts. Then delete the scratchpad scripts.

- [ ] **Step 6: Commit**

```bash
git add src/pages/api/admin/moderation/review.ts src/components/auth/kiosk/CLAUDE.md CLAUDE.md
git commit -m "docs(moderation): record ban enforcement + remove stale TODO"
```

---

## Deferred / follow-ups (explicitly NOT in this plan)

- Inline "DEAKTIVIERT" composer states on kiosk surfaces (design B ghost composer) — server 403s enforce; polish later.
- Un-ban admin UI (handoff: protocol popover, future work; manual DB flip interim).
- `moderation@mahalle.berlin` mailbox does not exist (domain not owned) — ops item; copy ships as designed.
- Reporter-outcome notifications, tiered moderator roles, appeal flow (handoff out-of-scope list).
- Mid-session ban banner latency: sessionStorage negative cache means the banner can lag until the next browser session; enforcement (403s) is immediate.
- Banflag fixed-window boundary: a banned correct-password login in the final moments of a 5-min window can expire before the client's `login-status` call — the user sees the generic error instead of the ban card. Harmless (retry re-sets the flag); not worth a sliding window.
