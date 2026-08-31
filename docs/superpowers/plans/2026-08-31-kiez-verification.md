# Kiez Verification Pipeline v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the "Verifiziert im Kiez" badge earned instead of default: badge renders only on `users.verified === true`, toggled by an admin from a new `/admin/mitglieder` members-list page.

**Architecture:** Flip every `verified ?? true` / hardcoded-true badge site to strict `=== true` (server fetchers + two Svelte islands). Add two `requireAdminSession`-guarded APIs (GET list with allowlist projection, PATCH toggle) and a kiosk members-list page (plum, `AdminLayout`) that self-gates exactly like `/admin/moderation`. `users.verified` stays the single source of truth — future proof sources (postcard code, event QR) can set the same flag; nothing here precludes them and nothing is built for them (YAGNI).

**Tech Stack:** Astro 5 SSR pages + API routes, Svelte 5 (`client:only="svelte"` islands, runes), MongoDB direct driver, Zod, kiosk design system (`AdminLayout.astro`, `--k-*` tokens, `kiosk-i18n.ts`).

**Spec:** The kickoff brief in the session that created this plan (binding decisions 1–5 reproduced inline below). No separate spec file.

## Global Constraints

- Work happens in the worktree at `.claude/worktrees/feat+kiez-verification`, branch `feat/kiez-verification`. Never commit to main, never push to main. All file paths below are relative to the worktree root.
- Commit messages: simple + concise, NO "Generated with Claude Code" signature, NO Co-Authored-By footer. Never stage secrets.
- This repo has **no unit-test infrastructure**. The verification cycle per task is: `pnpm astro sync && pnpm exec tsc --noEmit` (error count must stay ≤ 27) and `npx -y svelte-check@4 --output machine` (COMPLETED line ERRORS must stay ≤ 94) — baseline in this worktree is exactly 27/94 — plus curl/browser checks as specified per task.
- Do NOT use port 3000 (the user's own dev server for the main checkout runs there, and it would not reflect worktree changes anyway). When a task needs a live server, run `pnpm dev --port 4331` inside the worktree and kill it when done.
- Browser verification of `.svelte` changes uses playwright-cli. Login recipe: redirect-bounce login (open `/login?redirect=<target>`, fill email + password, click submit). Admin dev credentials: email `atakee@gmail.com`, password in `~/.claude/projects/-home-atakee-projects-fullstack-community-webApp-astro---v-3/scratchpad/devpw.txt`. **NEVER capture a snapshot while a password field is filled.** Always `playwright-cli close` at session end.
- Badge predicate everywhere is strictly `=== true` (never truthiness, never `?? true`). `verified` is server-controlled: no non-admin input path may ever write it.
- i18n: every new UI string gets a DE key AND an EN key in `src/lib/kiosk-i18n.ts` (the file holds one `de` dict then one `en` dict with identical key sets — a missing key in either breaks the `Record` type).
- Admin surface conventions: plum accent comes from `AdminLayout`'s `data-page="admin"`; components live in `src/components/admin/kiosk/`; admin pages are NOT middleware-gated (they self-gate in frontmatter); admin APIs guard with `requireAdminSession()` as the very first statement.

## Binding decisions from the brief

1. **Strict flip**: badge renders only on `verified === true`. Existing members lose the badge until an admin toggles them — accepted.
2. **Primary admin UI**: members list at `/admin/mitglieder` listing ALL users (name, @handle, join date, email-verified state, verified toggle per row), excluding tombstoned users (`anonymized: true`). Kiosk, plum, `AdminLayout`. Self-gates EXACTLY like `moderation.astro` (logged-out → 302 `/login?redirect=…`, logged-in non-admin → §09 "Kein Zugriff" inline state).
3. **APIs**: `GET /api/admin/users` (allowlist projection `{ name, handle, createdAt, emailVerified, verified, role }` — never a full doc, never a `{password:0}` blocklist) + PATCH toggle. Both `requireAdminSession`-guarded. Server-controlled only.
4. **Tombstones**: deletion pipeline already `$unset`s `verified` — don't touch it; with the strict flip, "Ehemaliges Mitglied" is badge-free automatically (confirmed: `src/lib/auth/accountDeletion.ts` unsets `verified`, and `?? true` was the only thing that ever made an absent flag render a badge).
5. **i18n** DE/EN via the existing kiosk-i18n pattern.

**Discovered during planning (in scope, same goal):** the marketplace seller card is a FOURTH badge site the brief missed — `src/components/marketplace/kiosk/detail/MarketDetailInner.svelte:355` passes `isVerified={true}` to `SellerCard`, which renders the identical "VERIFIZIERT IM KIEZ" text. Leaving it would keep the badge default-on for every seller, contradicting the goal. Task 1 flips it via the seller read-time join.

## File map

| File | Action | Task |
|---|---|---|
| `src/lib/profile/profileQuery.ts` | Modify (strict flip, line ~72) | 1 |
| `src/lib/profile/publicProfile.ts` | Modify (strict flip, line ~128) | 1 |
| `src/components/forum/kiosk/ForumPostDetail.svelte` | Modify (derive from `topic.author`, line ~244) | 1 |
| `src/lib/listingsQuery.ts` | Modify (`SELLER_PROJECTION` + `sellerVerified` join field) | 1 |
| `src/types/listing.ts` | Modify (add `sellerVerified?: boolean`) | 1 |
| `src/components/marketplace/kiosk/detail/MarketDetailInner.svelte` | Modify (wire real flag) | 1 |
| `src/pages/api/admin/users/index.ts` | Create (GET list) | 2 |
| `src/pages/api/admin/users/[id].ts` | Create (PATCH toggle) | 2 |
| `src/lib/kiosk-i18n.ts` | Modify (add `admin.users.*` DE + EN) | 3 |
| `src/components/admin/kiosk/MitgliederApp.svelte` | Create (orchestrator island) | 3 |
| `src/pages/admin/mitglieder.astro` | Create (gated page) | 3 |
| `CLAUDE.md` (root) | Modify (users-collection `verified` note) | 4 |
| `src/components/admin/CLAUDE.md` | Modify (new page + APIs) | 4 |

---

### Task 1: Strict badge flip at all four sites

**Files:**
- Modify: `src/lib/profile/profileQuery.ts:71-72`
- Modify: `src/lib/profile/publicProfile.ts:126-128`
- Modify: `src/components/forum/kiosk/ForumPostDetail.svelte:241-244`
- Modify: `src/lib/listingsQuery.ts:20` and `:74-81`
- Modify: `src/types/listing.ts:85-86`
- Modify: `src/components/marketplace/kiosk/detail/MarketDetailInner.svelte:349-356`

**Interfaces:**
- Consumes: existing `topic.author.verified` (already in `populateAuthors`' projection at `src/lib/topicsQuery.ts:103` and flows through all three detail routes' `populateAuthors` calls — verified during planning).
- Produces: `populateSellers()` now also returns `sellerVerified: boolean` on every listing (Task 2/3 don't consume this; the marketplace island does). `ProfileMe.verified` / `PublicProfile.verified` semantics change from "default true" to "strictly earned" — downstream consumers (`PIdentityCard`, `PPublicIdentityCard`, Steckbrief print) need no code change, they already render on boolean truth.

- [ ] **Step 1: Flip `getProfileMe` (own profile)**

In `src/lib/profile/profileQuery.ts`, replace:

```ts
    // Interim rule — mirrors ForumPostDetail.svelte:236 (no verification pipeline yet)
    verified: user.verified ?? true,
```

with:

```ts
    // Strict since the Kiez-verification pipeline (Aug 2026): the badge is
    // earned (admin toggle on /admin/mitglieder), absent/undefined = NOT verified.
    verified: user.verified === true,
```

- [ ] **Step 2: Flip `getPublicProfile`**

In `src/lib/profile/publicProfile.ts`, replace:

```ts
    // Interim rule — mirrors getProfileMe()/ForumPostDetail.svelte:236 (no
    // verification pipeline yet).
    verified: user.verified ?? true,
```

with:

```ts
    // Strict since the Kiez-verification pipeline (Aug 2026): earned via
    // admin toggle on /admin/mitglieder, absent/undefined = NOT verified.
    verified: user.verified === true,
```

- [ ] **Step 3: Flip the forum detail badge**

In `src/components/forum/kiosk/ForumPostDetail.svelte`, replace:

```ts
  // No verification pipeline yet — every signed-in kiez resident counts as
  // "in kiez" for now. When real address-verification or onboarding ships,
  // gate this on `topic.author?.verified === true`.
  const isVerified = $derived(true);
```

with:

```ts
  // Kiez-verification pipeline (Aug 2026): the badge is earned (admin
  // toggle), strictly on the author's flag. `topic.author` is populated
  // server-side by populateAuthors() with `verified` in its projection.
  const isVerified = $derived(topic.author?.verified === true);
```

- [ ] **Step 4: Add `verified` to the seller join**

In `src/lib/listingsQuery.ts`, replace:

```ts
const SELLER_PROJECTION = { name: 1, image: 1, userPicture: 1 } as const;
```

with:

```ts
// Allowlist projection — widen only after auditing every client-visible
// consumer (same discipline as populateAuthors in topicsQuery.ts).
// `verified` is public-by-display: it drives the seller card's
// "Verifiziert im Kiez" badge.
const SELLER_PROJECTION = { name: 1, image: 1, userPicture: 1, verified: 1 } as const;
```

and in the same file's `populateSellers` return-map, replace:

```ts
    return {
      ...doc,
      sellerName: u?.name ?? null,
      sellerImage: u?.userPicture ?? u?.image ?? null,
    };
```

with:

```ts
    return {
      ...doc,
      sellerName: u?.name ?? null,
      sellerImage: u?.userPicture ?? u?.image ?? null,
      sellerVerified: u?.verified === true,
    };
```

- [ ] **Step 5: Add the field to the `Listing` type**

In `src/types/listing.ts`, replace:

```ts
  sellerName?: string | null;
  sellerImage?: string | null;
```

with:

```ts
  sellerName?: string | null;
  sellerImage?: string | null;
  sellerVerified?: boolean;
```

- [ ] **Step 6: Wire the real flag into the seller card**

In `src/components/marketplace/kiosk/detail/MarketDetailInner.svelte`, replace:

```svelte
      <SellerCard
        sellerId={String(listing.sellerId)}
        sellerName={listing.sellerName}
        sellerImage={listing.sellerImage}
        listingCount={0}
        isVerified={true}
      />
```

with:

```svelte
      <SellerCard
        sellerId={String(listing.sellerId)}
        sellerName={listing.sellerName}
        sellerImage={listing.sellerImage}
        listingCount={0}
        isVerified={listing.sellerVerified === true}
      />
```

(Client-side refetches of the listing go through `/api/listings/[id]` → `fetchListingDetailForSSR` → `populateSellers`, so `sellerVerified` survives refetch.)

- [ ] **Step 7: Confirm no site still defaults the badge on**

Run: `grep -rn "verified ?? true\|isVerified = \$derived(true)\|isVerified={true}" src/`
Expected: no matches. Also run `grep -rn "verified" src/components/marketplace/kiosk/detail/SellerCard.svelte` — `SellerCard` itself keeps `isVerified = true` as its **prop default** (line 11); change that default to `false`:

In `src/components/marketplace/kiosk/detail/SellerCard.svelte`, replace:

```ts
    isVerified = true,
```

with:

```ts
    isVerified = false,
```

- [ ] **Step 8: Type/diagnostic budgets**

Run: `pnpm astro sync && pnpm exec tsc --noEmit 2>&1 | grep -c 'error TS'` → must print ≤ 27.
Run: `npx -y svelte-check@4 --output machine 2>&1 | grep COMPLETED` → ERRORS ≤ 94.

- [ ] **Step 9: Commit**

```bash
git add src/lib/profile/profileQuery.ts src/lib/profile/publicProfile.ts src/components/forum/kiosk/ForumPostDetail.svelte src/lib/listingsQuery.ts src/types/listing.ts src/components/marketplace/kiosk/detail/MarketDetailInner.svelte src/components/marketplace/kiosk/detail/SellerCard.svelte
git commit -m "feat: strict Kiez-verification badge — verified === true only"
```

(Browser verification of the two touched islands happens in Task 4's sweep, once the admin toggle exists to produce both badge states.)

---

### Task 2: Admin user APIs (GET list + PATCH toggle)

**Files:**
- Create: `src/pages/api/admin/users/index.ts`
- Create: `src/pages/api/admin/users/[id].ts`

**Interfaces:**
- Consumes: `requireAdminSession(request)` from `src/lib/auth.ts` (returns `{ ok: true, userId } | { ok: false, response }`), `connectDB()` from `src/lib/mongodb.ts`.
- Produces (Task 3 consumes these exact shapes):
  - `GET /api/admin/users` → `200 { users: AdminUserRow[] }` where `AdminUserRow = { id: string; name: string; handle: string | null; createdAt: string | null; emailVerified: boolean; verified: boolean; role: 'user' | 'admin' }`, sorted `createdAt` desc.
  - `PATCH /api/admin/users/[id]` body `{ verified: boolean }` (strict — unknown keys rejected) → `200 { success: true, verified: boolean }` | `400 { error: 'invalid_id' | 'invalid_json' | 'invalid_body' }` | `404 { error: 'not_found' }` | 401/403 from the guard.

- [ ] **Step 1: Write the GET endpoint**

Create `src/pages/api/admin/users/index.ts`:

```ts
import type { APIRoute } from 'astro';
import { connectDB } from '../../../../lib/mongodb';
import { requireAdminSession } from '../../../../lib/auth';

// GET /api/admin/users — full members list for /admin/mitglieder.
// ALLOWLIST projection only (never a full doc, never a {password:0}-style
// blocklist — this payload reaches the admin's browser). Tombstoned
// accounts (anonymized: true) are excluded: their verified flag is
// $unset by the deletion pipeline and they must stay untogglable.
// Capped at 1000 — a neighborhood app; revisit with pagination if the
// community ever outgrows it.

export const GET: APIRoute = async ({ request }) => {
  const guard = await requireAdminSession(request);
  if (!guard.ok) return guard.response;

  try {
    const db = await connectDB();
    const docs = await db
      .collection('users')
      .find(
        { anonymized: { $ne: true } },
        { projection: { name: 1, handle: 1, createdAt: 1, emailVerified: 1, verified: 1, role: 1 } }
      )
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray();

    const users = docs.map((u) => ({
      id: u._id.toString(),
      name: typeof u.name === 'string' ? u.name : '',
      handle: typeof u.handle === 'string' ? u.handle : null,
      createdAt:
        u.createdAt instanceof Date
          ? u.createdAt.toISOString()
          : typeof u.createdAt === 'string'
            ? u.createdAt
            : null,
      emailVerified: u.emailVerified === true,
      verified: u.verified === true,
      role: u.role === 'admin' ? ('admin' as const) : ('user' as const),
    }));

    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

- [ ] **Step 2: Write the PATCH endpoint**

Create `src/pages/api/admin/users/[id].ts`:

```ts
import type { APIRoute } from 'astro';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { connectDB } from '../../../../lib/mongodb';
import { requireAdminSession } from '../../../../lib/auth';

// PATCH /api/admin/users/[id] — toggle users.verified (Kiez-verification
// v1: an admin toggle IS the proof mechanism). Strictly server-controlled:
// this admin-gated endpoint is the ONLY writer of `verified` — keep it
// that way (no client/self-serve path may ever set it).
// Tombstoned accounts (anonymized: true) are excluded from the match →
// 404, so a deleted user can't be re-verified.

const BodySchema = z.object({ verified: z.boolean() }).strict();

export const PATCH: APIRoute = async ({ request, params }) => {
  const guard = await requireAdminSession(request);
  if (!guard.ok) return guard.response;

  const id = params.id ?? '';
  if (!ObjectId.isValid(id)) {
    return new Response(JSON.stringify({ error: 'invalid_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'invalid_body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const db = await connectDB();
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id), anonymized: { $ne: true } },
      { $set: { verified: parsed.data.verified } }
    );
    if (result.matchedCount === 0) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ success: true, verified: parsed.data.verified }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Admin user verify toggle error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

- [ ] **Step 3: Type budget**

Run: `pnpm astro sync && pnpm exec tsc --noEmit 2>&1 | grep -c 'error TS'` → ≤ 27.

- [ ] **Step 4: Live guard + contract check (curl)**

Start the worktree dev server: `pnpm dev --port 4331` (background). Then:

```bash
# Unauthenticated → guard fires first, 401:
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4331/api/admin/users            # expect 401
curl -s -o /dev/null -w '%{http_code}\n' -X PATCH http://localhost:4331/api/admin/users/000000000000000000000000 -H 'Content-Type: application/json' -d '{"verified":true}'   # expect 401
```

Expected: both print `401`. (Admin-authenticated happy path is exercised end-to-end in Task 3 Step 6 / Task 4 with the browser session — no creds in shell history.) Kill the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/admin/users/index.ts "src/pages/api/admin/users/[id].ts"
git commit -m "feat: admin user APIs — members list + verified toggle"
```

---

### Task 3: `/admin/mitglieder` members page (kiosk, plum)

**Files:**
- Modify: `src/lib/kiosk-i18n.ts` (DE keys after the `'admin.errors.count'` line ~1471; EN keys after the `'admin.errors.count'` line ~3262 — grep for the two occurrences, DE dict first)
- Create: `src/components/admin/kiosk/MitgliederApp.svelte`
- Create: `src/pages/admin/mitglieder.astro`

**Interfaces:**
- Consumes: `GET /api/admin/users` → `{ users: AdminUserRow[] }` and `PATCH /api/admin/users/[id]` with `{ verified: boolean }` → `{ success: true, verified }` (Task 2 shapes, exactly); `t`, `locale` stores + `tStr` helper from `src/lib/kiosk-i18n.ts`; `showError` from `src/utils/toast.ts`; `AdminLayout.astro` props (`title`, `adminName`, `wordmark`, `backHref`, `backLabel`, `ribbonEcho`).
- Produces: the page + island; nothing downstream consumes them.

- [ ] **Step 1: Add i18n keys (DE dict, insert directly after the DE `'admin.errors.count': '{n}×',` line)**

```ts
  // ── Mitglieder (admin members list, /admin/mitglieder) ──
  'admin.users.kicker': 'MITGLIEDER · KIEZ-VERIFIZIERUNG',
  'admin.users.heading': 'Das Melderegister',
  'admin.users.sub': 'Verifiziert wird von Hand — der Schalter ist der Nachweis (v1).',
  'admin.users.count': '{n} Mitglieder',
  'admin.users.search': 'Name oder @handle suchen …',
  'admin.users.since': 'dabei seit {d}',
  'admin.users.emailok': 'E-MAIL ✓',
  'admin.users.emailno': 'E-MAIL —',
  'admin.users.adminchip': 'ADMIN',
  'admin.users.verifiedchip': '✓ VERIFIZIERT',
  'admin.users.action.verify': 'Verifizieren',
  'admin.users.action.unverify': 'Entziehen',
  'admin.users.empty': 'Keine Mitglieder gefunden.',
  'admin.users.loading': 'Melderegister wird geladen …',
  'admin.users.error': 'Liste konnte nicht geladen werden.',
  'admin.users.retry': '↻ neu laden',
  'admin.users.toast.fail': 'Änderung fehlgeschlagen — bitte erneut versuchen.',
```

- [ ] **Step 2: Add the same keys to the EN dict (insert directly after the EN `'admin.errors.count': '{n}×',` line)**

```ts
  // ── Mitglieder (admin members list, /admin/mitglieder) ──
  'admin.users.kicker': 'MEMBERS · KIEZ VERIFICATION',
  'admin.users.heading': 'The member register',
  'admin.users.sub': 'Verification is manual — the toggle is the proof (v1).',
  'admin.users.count': '{n} members',
  'admin.users.search': 'Search name or @handle …',
  'admin.users.since': 'joined {d}',
  'admin.users.emailok': 'EMAIL ✓',
  'admin.users.emailno': 'EMAIL —',
  'admin.users.adminchip': 'ADMIN',
  'admin.users.verifiedchip': '✓ VERIFIED',
  'admin.users.action.verify': 'Verify',
  'admin.users.action.unverify': 'Revoke',
  'admin.users.empty': 'No members found.',
  'admin.users.loading': 'Loading the member register …',
  'admin.users.error': 'Could not load the list.',
  'admin.users.retry': '↻ reload',
  'admin.users.toast.fail': 'Change failed — please try again.',
```

- [ ] **Step 3: Write the island**

Create `src/components/admin/kiosk/MitgliederApp.svelte`:

```svelte
<script lang="ts">
  /**
   * Members list — Kiez-verification v1 admin surface (/admin/mitglieder).
   * Lists ALL non-tombstoned users so every member is reachable even if
   * they never posted; per-row toggle writes users.verified via
   * PATCH /api/admin/users/[id] (the flag's ONLY writer).
   * Optimistic toggle with rollback + error toast. Client-side search
   * (name/@handle) — the list is capped at 1000 server-side, no pager v1.
   */
  import { t, tStr, locale } from '../../../lib/kiosk-i18n';
  import { showError } from '../../../utils/toast';

  type AdminUserRow = {
    id: string;
    name: string;
    handle: string | null;
    createdAt: string | null;
    emailVerified: boolean;
    verified: boolean;
    role: 'user' | 'admin';
  };

  let users = $state<AdminUserRow[]>([]);
  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let query = $state('');
  // Rows with an in-flight PATCH — disables the row's toggle.
  let busy = $state<Set<string>>(new Set());

  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.handle ?? '').toLowerCase().includes(q.replace(/^@/, ''))
    );
  });

  function fmtDate(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString($locale === 'de' ? 'de-DE' : 'en-GB', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  async function fetchUsers() {
    status = 'loading';
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (!res.ok) throw new Error(`list failed (${res.status})`);
      const data = await res.json();
      users = Array.isArray(data.users) ? data.users : [];
      status = 'ready';
    } catch {
      status = 'error';
    }
  }

  async function toggleVerified(row: AdminUserRow) {
    if (busy.has(row.id)) return;
    const next = !row.verified;
    busy = new Set(busy).add(row.id);
    // Optimistic flip
    users = users.map((u) => (u.id === row.id ? { ...u, verified: next } : u));
    try {
      const res = await fetch(`/api/admin/users/${row.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: next })
      });
      if (!res.ok) throw new Error(`toggle failed (${res.status})`);
    } catch {
      // Rollback
      users = users.map((u) => (u.id === row.id ? { ...u, verified: !next } : u));
      showError($t['admin.users.toast.fail']);
    } finally {
      const s = new Set(busy);
      s.delete(row.id);
      busy = s;
    }
  }

  $effect(() => {
    fetchUsers();
  });
</script>

<div style="max-width: 880px; margin: 0 auto; padding: 26px 18px 60px;">
  <!-- Title block -->
  <div style="margin-bottom: 18px;">
    <div class="font-dmmono" style="font-size: 10px; color: var(--k-accent); letter-spacing: 0.14em;">
      {$t['admin.users.kicker']}
    </div>
    <h1 class="font-bricolage" style="font-size: 28px; font-weight: 800; letter-spacing: -0.03em; margin: 4px 0 2px;">
      {$t['admin.users.heading']}
    </h1>
    <p class="font-instrument" style="font-style: italic; font-size: 14px; color: var(--k-ink-soft); margin: 0;">
      {$t['admin.users.sub']}
    </p>
  </div>

  {#if status === 'loading'}
    <div class="font-dmmono" style="font-size: 12px; color: var(--k-ink-mute); padding: 40px 0; text-align: center;">
      {$t['admin.users.loading']}
    </div>
  {:else if status === 'error'}
    <div style="text-align: center; padding: 40px 0;">
      <p class="font-bricolage" style="font-size: 14px; color: var(--k-danger); margin: 0 0 12px;">{$t['admin.users.error']}</p>
      <button
        type="button"
        class="font-dmmono"
        style="border: 1.5px solid var(--k-ink); border-radius: 999px; padding: 7px 16px; font-size: 12px; font-weight: 700; background: var(--k-paper-warm); cursor: pointer;"
        onclick={fetchUsers}
      >{$t['admin.users.retry']}</button>
    </div>
  {:else}
    <!-- Search + count row -->
    <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px;">
      <input
        type="search"
        class="font-bricolage"
        style="
          flex: 1; min-width: 220px; background: var(--k-paper-warm);
          border: 1.5px solid var(--k-ink); border-radius: var(--k-radius-md);
          padding: 8px 12px; font-size: 13px; color: var(--k-ink);
        "
        placeholder={$t['admin.users.search']}
        bind:value={query}
      />
      <span class="font-dmmono" style="font-size: 11px; color: var(--k-ink-mute); letter-spacing: 0.08em;">
        {tStr($t['admin.users.count'], { n: filtered.length })}
      </span>
    </div>

    {#if filtered.length === 0}
      <div class="font-instrument" style="font-style: italic; font-size: 14px; color: var(--k-ink-mute); padding: 30px 0; text-align: center;">
        {$t['admin.users.empty']}
      </div>
    {:else}
      <ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px;">
        {#each filtered as row (row.id)}
          <li
            style="
              background: var(--k-paper-warm); border: 1.5px solid var(--k-ink);
              border-radius: var(--k-radius-md); padding: 12px 16px;
              display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
              {row.verified ? 'box-shadow: 2px 2px 0 var(--k-accent);' : ''}
            "
          >
            <div style="flex: 1; min-width: 180px;">
              <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
                <span class="font-bricolage" style="font-size: 15px; font-weight: 700;">{row.name || '—'}</span>
                {#if row.handle}
                  <span class="font-dmmono" style="font-size: 11px; color: var(--k-ink-mute);">@{row.handle}</span>
                {/if}
                {#if row.role === 'admin'}
                  <span class="font-dmmono" style="font-size: 9px; font-weight: 600; background: var(--k-accent); color: var(--k-paper); padding: 1px 6px; border-radius: 999px; letter-spacing: 0.08em;">{$t['admin.users.adminchip']}</span>
                {/if}
              </div>
              <div class="font-dmmono" style="font-size: 10px; color: var(--k-ink-mute); margin-top: 3px; letter-spacing: 0.05em;">
                {tStr($t['admin.users.since'], { d: fmtDate(row.createdAt) })}
                &nbsp;·&nbsp;
                {row.emailVerified ? $t['admin.users.emailok'] : $t['admin.users.emailno']}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              {#if row.verified}
                <span class="font-dmmono" style="font-size: 10px; font-weight: 600; background: var(--k-moss); color: var(--k-paper); padding: 2px 8px; border-radius: var(--k-radius-sm); border: 1px solid var(--k-ink); letter-spacing: 0.08em;">
                  {$t['admin.users.verifiedchip']}
                </span>
              {/if}
              <button
                type="button"
                class="font-dmmono"
                style="
                  border: 1.5px solid var(--k-ink); border-radius: 999px;
                  padding: 6px 14px; font-size: 11px; font-weight: 700;
                  cursor: pointer; min-height: 32px;
                  {row.verified
                    ? 'background: var(--k-paper); color: var(--k-ink);'
                    : 'background: var(--k-ink); color: var(--k-paper);'}
                  {busy.has(row.id) ? 'opacity: 0.5; cursor: wait;' : ''}
                "
                disabled={busy.has(row.id)}
                onclick={() => toggleVerified(row)}
              >
                {row.verified ? $t['admin.users.action.unverify'] : $t['admin.users.action.verify']}
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>
```

(Export names verified during planning: `kiosk-i18n.ts` exports `locale` (writable store), `t` (derived dict store), and `tStr(template, vars)`; `--k-radius-sm` = 4px and `--k-radius-md` = 8px both exist in `tokens.css`.)

- [ ] **Step 4: Write the page**

Create `src/pages/admin/mitglieder.astro` (gating copied verbatim from `moderation.astro`, only the redirect target and mounted island differ):

```astro
---
import AdminLayout from '../../layouts/AdminLayout.astro';
import MitgliederApp from '../../components/admin/kiosk/MitgliederApp.svelte';
import { getSession } from 'auth-astro/server';

const session = await getSession(Astro.request);
if (!session?.user) {
  return Astro.redirect('/login?redirect=/admin/mitglieder', 302);
}
const isAdmin = session.user.role === 'admin';
const adminName = session.user.name ?? '';
---

<AdminLayout
  title="Mahalle · Mitglieder"
  adminName={adminName}
  wordmark="mitglieder"
  backHref="/admin/moderation"
  backLabel="← zur Moderation"
  ribbonEcho="users.verified === true"
>
  {isAdmin ? (
    <MitgliederApp client:only="svelte" />
  ) : (
    /* §09 Kein Zugriff — kiosk-admin-states.jsx §09, DE-only */
    <div class="mx-auto text-center" style="max-width:420px; padding:80px 24px;">
      <div style="width:44px; height:44px; margin:0 auto 14px; background:var(--k-accent); border:1.5px solid var(--k-ink); border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--k-paper); font-size:17px;">⚑</div>
      <h1 class="font-bricolage" style="font-size:22px; font-weight:800; letter-spacing:-0.02em; margin:0;">Dieser Bereich gehört der Moderation.</h1>
      <p class="font-bricolage" style="font-size:13px; color:var(--k-ink-soft); margin:8px 0 18px;">Dein Konto hat keine Admin-Rechte.</p>
      <a href="/forum" class="font-bricolage no-underline" style="display:inline-block; border:1.5px solid var(--k-ink); border-radius:999px; padding:7px 16px; font-size:12.5px; font-weight:700; color:var(--k-ink);">← zurück zum Forum</a>
    </div>
  )}
</AdminLayout>
```

(Note the back-link targets `/forum` — the forum index moved there in Aug 2026; `moderation.astro`'s copy of this block predates the move and still points at `/`; don't "fix" moderation.astro here, out of scope.)

- [ ] **Step 5: Budgets**

Run: `pnpm astro sync && pnpm exec tsc --noEmit 2>&1 | grep -c 'error TS'` → ≤ 27.
Run: `npx -y svelte-check@4 --output machine 2>&1 | grep COMPLETED` → ERRORS ≤ 94.

- [ ] **Step 6: Browser-verify (playwright-cli, dev server on :4331)**

Start `pnpm dev --port 4331`. Using the login recipe from Global Constraints (admin account, NEVER snapshot a filled password field):

1. Open `http://localhost:4331/admin/mitglieder` logged-out → expect redirect to `/login?redirect=/admin/mitglieder`.
2. Log in as admin via redirect-bounce → lands on `/admin/mitglieder`; snapshot: title block, search input, rows with name/@handle/join date/email chip, toggle buttons.
3. Click a non-admin test user's "Verifizieren" → chip `✓ VERIFIZIERT` appears without reload; re-snapshot.
4. Reload the page → chip persists (server truth, not just optimistic state).
5. Click "Entziehen" on the same user → chip disappears; reload → still gone (leave the dev DB as found).
6. Toggle language EN via masthead toggle → strings flip.

`playwright-cli close`, kill dev server.

- [ ] **Step 7: Commit**

```bash
git add src/lib/kiosk-i18n.ts src/components/admin/kiosk/MitgliederApp.svelte src/pages/admin/mitglieder.astro
git commit -m "feat: /admin/mitglieder members list with Kiez-verification toggle"
```

---

### Task 4: End-to-end badge sweep + docs

**Files:**
- Modify: `CLAUDE.md` (root — users collection bullet, the `verified?: boolean` clause)
- Modify: `src/components/admin/CLAUDE.md` (new page + APIs)

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces: docs; the pushed branch.

- [ ] **Step 1: End-to-end badge verification (playwright-cli, dev server :4331)**

With the dev server running and an admin browser session (login recipe, no password snapshots):

1. Pick a test user with a forum post and a marketplace listing in the dev DB (the seeded dev data has both; find one via the mitglieder list + forum index). Ensure the user is UNVERIFIED via `/admin/mitglieder`.
2. Visit one of their topic detail pages (`/topics/<id>`) → NO "VERIFIZIERT IM KIEZ" badge next to the byline.
3. Visit their public profile (`/nachbarn/<handle>`) → no verified pill. Visit own `/profile` as admin (admins are unverified too until toggled) → no pill.
4. Visit one of their marketplace listing detail pages (`/marketplace/<id>`) → SellerCard shows NO badge.
5. Toggle the user to verified on `/admin/mitglieder`; revisit the same three pages → badge/pill present on all three.
6. Toggle back if the dev DB should stay as found (leave the admin's own state as the user prefers).

Any mismatch = bug in Task 1's wiring; fix before proceeding (most likely suspect: a serialization path dropping the field — `JSON.parse(JSON.stringify(...))` keeps booleans, so look at projections first).

- [ ] **Step 2: Update root `CLAUDE.md`**

In the `users` collection bullet, replace the clause:

```
plus `verified?: boolean` — interim rule, absent/undefined is treated as verified (mirrors the equivalent forum author-verification default), no real verification pipeline yet
```

with:

```
plus `verified?: boolean` — Kiez-verification v1 (Aug 2026): STRICT, badge renders only on `verified === true` (absent/undefined = not verified); toggled by admins on `/admin/mitglieder` via `PATCH /api/admin/users/[id]` (the flag's only writer — keep it server-controlled); single source of truth so future proof sources (postcard code, event QR) can set the same flag
```

- [ ] **Step 3: Update `src/components/admin/CLAUDE.md`**

Append a short section after the announcements block:

```markdown
## Members list (`MitgliederApp.svelte` + `/admin/mitglieder`)
Kiez-verification v1 (Aug 2026): `users.verified` is strict (`=== true`) and admin-toggled — the toggle IS the proof mechanism for now. Page self-gates like `moderation.astro` (302 → login when logged out, §09 state for non-admins), `AdminLayout` with `wordmark="mitglieder"`, `backHref="/admin/moderation"`. Reached by direct URL (same convention as `/admin/announcements` — no inbound nav link).
- **`GET /api/admin/users`** — all non-tombstoned users (`anonymized: { $ne: true }`), ALLOWLIST projection `{ name, handle, createdAt, emailVerified, verified, role }`, createdAt desc, cap 1000. Never widen to a blocklist projection.
- **`PATCH /api/admin/users/[id]`** — body strictly `{ verified: boolean }` (Zod `.strict()`), match excludes tombstones (404). This endpoint is the ONLY writer of `users.verified`.
- Badge sites flipped to strict in the same feature: `getProfileMe`/`getPublicProfile` (`verified === true`), `ForumPostDetail` (`topic.author?.verified === true`), marketplace `populateSellers` → `sellerVerified` → `SellerCard`.
```

- [ ] **Step 4: Final budgets + full build**

Run: `pnpm astro sync && pnpm exec tsc --noEmit 2>&1 | grep -c 'error TS'` → ≤ 27.
Run: `npx -y svelte-check@4 --output machine 2>&1 | grep COMPLETED` → ERRORS ≤ 94.
Run: `pnpm build` → green. (MitgliederApp is imported by an `.astro` page directly, so its scoped styles are route-linked — the nested-island CSS-orphan trap doesn't apply, and it has no `<style>` block anyway.)

- [ ] **Step 5: Commit docs + push branch, then STOP**

```bash
git add CLAUDE.md src/components/admin/CLAUDE.md
git commit -m "docs: Kiez-verification v1 — strict verified flag + /admin/mitglieder"
git push -u origin feat/kiez-verification
```

Do NOT merge, do NOT push main. Review + merge happen elsewhere.
