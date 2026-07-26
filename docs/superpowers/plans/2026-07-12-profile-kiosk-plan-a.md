# Profile Kiosk Redesign — Plan A (Backend + Own Profile + Edit + Avatar) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/profile` on the kiosk design system (ochre accent, Meldebogen + Archiv metaphor) with working backend: unique user handles, a hardened profile API, a cross-surface activity feed, a self-service moderation-standing card, edit-in-place with optimistic save, and an avatar upload that actually persists.

**Architecture:** New `src/lib/profile/*` server libs + `/api/profile/*` endpoints feed one Svelte 5 orchestrator island (`ProfileInner.svelte`) mounted from a rebuilt `profile.astro` on `KioskLayout page="profile"`. The legacy React profile cluster (`UserProfile.tsx`, `UserProfileWrapper.tsx`, `ImageUpload.tsx`, JWT-based `/api/upload/image`) is deleted at the end. Handles are backfilled onto the shared DB with a **partial** unique index so the currently-deployed prod code (which doesn't set handles) cannot break.

**Tech Stack:** Astro 5, Svelte 5 runes islands, MongoDB 6 direct driver, Zod, Cloudinary, kiosk design system (`--k-*` tokens, `data-page` accents), `src/lib/kiosk-i18n.ts`.

## Plan split (user-approved 2026-07-12)

This is **Plan A of 2**. Deferred to **Plan B** (do NOT build, do NOT leave broken stubs for):
public profile `/nachbarn/[handle]` + not-found state §03 · Kiez-Chronik strip + resolver · Steckbrief route + „Steckbrief drucken" button + `motto` field · Konto „ändern" actions (e-mail change flow §03 + `pendingEmail` + state §08, password change §04 + sessionVersion sign-out) · Gefahrenzone/delete account §05 + 7-day grace + cron · author-name entry links on Forum/Markt/Kalender.
Plan A's PKontoCard therefore renders the E-MAIL and PASSWORT rows **display-only (no „ändern" links)** and no Gefahrenzone — Plan B adds them. The own-profile right column ships with the Archiv only; Plan B inserts the PChronikStrip above it.

## Global Constraints

- **JSX is the design source of truth.** `design/handoffs/design_handoff_profile/jsx/*.jsx` defines exact layout, spacing, and ALL copy (DE + EN). When a task cites a JSX component (e.g. `PIdentityCard` in `kiosk-profile.jsx`), the implementer MUST read that section of the JSX file and reproduce structure + copy verbatim. The plan gives skeletons and integration code; visual details and strings come from the JSX.
- **German curly quotes:** opener `„` (U+201E), closer `“` (U+201C) in ALL German strings. Straight ASCII `"` inside copy is a defect.
- **DE + EN full key parity** in `src/lib/kiosk-i18n.ts` (the `Dict` type enforces it — `type Dict = Record<keyof typeof de, string>`). Every new key added to BOTH dicts; EN copy verbatim from the JSX.
- **Accent:** ochre. Exactly one new line in `src/styles/tokens.css`: `[data-page="profile"] { --k-accent: var(--k-ochre); }`. Do NOT set `--k-accent-italic` (marketplace-only by decree). Italic headline emphasis on profile is styled explicitly with `color: var(--k-ochre)`.
- **Don't touch semantic/sticker accents:** live-now dots, required asterisks, wine CTA shadows stay wine; strike dots stay danger.
- **Token mapping (JSX → code):** `kiosk.color.*` → `var(--k-*)`; `kiosk.font.display/serif/mono` → `font-bricolage`/`font-instrument`/`font-dmmono`; `kiosk.shadow.print(c)` → `box-shadow: 3px 3px 0 c`; `printSm(c)` → `2px 2px 0 c`; `kiosk.border.ink` → `border: 1.5px solid var(--k-ink)`; `inkBold` → `2px solid`; radii sm/md/lg/pill → 8/12/16/999px; dashed rules → `1px dashed var(--k-rule)`.
- **Svelte 5 runes** (`$state`/`$derived`/`$effect`/`$props`), i18n via `import { t } from '.../kiosk-i18n'` + `$t['key']`, interpolation via `tStr`. No TanStack in Svelte islands (plain seq-guarded fetch, marketplace pattern).
- **`pnpm type-check` baseline is 30 errors.** No new errors over baseline. (It does not check `.svelte` internals — browser-verify UI work.)
- **Shared prod DB** (`CommunityWebApp-test`): test data only as `tmp-*@example.invalid` users / `[TMP-E2E]`-titled docs, manifest-driven cleanup after every task that writes data. The handle backfill in Task 1 is a deliberate, additive, user-approved production migration — it only ADDS a `handle` field + a partial index; it must never modify or delete anything else.
- **SECURITY ESCALATION RULE:** implementers/reviewers who hit a security-relevant decision not covered by this plan report status NEEDS_CONTEXT or BLOCKED — never improvise.
- **Commits:** plain concise messages, no AI footers, never `--no-verify`.
- **Server/client boundary:** anything imported by a Svelte island must be dependency-pure. `src/lib/profile/profileShared.ts` (types/constants) is pure; `profileQuery.ts`/`activityFeed.ts` import `connectDB` and are server-only — never import them from a component.
- **Verification:** dev server on :3000 (controller manages it), `curl` for APIs, `playwright-cli` for UI (desktop 1280 + mobile 390×844). Re-snapshot after hydration for `client:only` islands.

## Decisions locked (do not re-litigate)

1. **Route stays `/profile`** (design shorthand `/profil` — English routes are the codebase convention: `/calendar`, `/marketplace`).
2. **Handle = migrated unique slug** (user chose option a): lowercase `[a-z0-9_]{3,20}`, derived from `name`, collisions get numeric suffixes; **partial** unique index (`{handle: {$type: 'string'}}`) so prod registrations without handles never collide on null. Handle is NOT user-editable in this pass.
3. **Display-name rule widened vs the design hint:** existing prod names contain spaces + unicode ("Deniz Yılmaz") and registration never enforced the narrow regex. Edit validation = `3–30 chars, unicode letters/numbers/space/-/_` (`/^[\p{L}\p{N} _-]{3,30}$/u`). The design's hint copy stays verbatim.
4. **Verified badge:** interim rule mirrors the forum (`ForumPostDetail.svelte:236` — every resident counts as verified until a real pipeline ships): `verified = user.verified ?? true`. Team can set `verified: false`/`true` manually in DB. No self-serve.
5. **Logged-out `/profile` renders state §10** (card „Der Meldebogen braucht einen Schlüssel.") instead of redirecting — remove `"/profile"` from `protectedRoutes` in `src/middleware.ts:43`.
6. **RSVP rows („Zusage") in the Archiv are dated by the event's `startDate`** (the `rsvps.going` array stores no timestamps). Only events the user did NOT author (author's own events already appear as „Termin erstellt").
7. **Nav avatar elsewhere lags after avatar change** (JWT snapshots `image` at login — same accepted pattern as `emailVerified`). Live update within the current page via a `profile:avatar-updated` CustomEvent that `KioskNav` listens to; document the residual.
8. **„Beiträge" stat** = authored `topics` + `announcements` + `recommendations`. „danke" = sum of `likes` across those three + `events` authored by the user. Comments are NOT in the Archiv (matches the design seeds).

## Design source map

| JSX file (in `design/handoffs/design_handoff_profile/jsx/`) | Used by tasks |
|---|---|
| `kiosk-profile.jsx` — atoms, PIdentityCard, PModerationCard, PKontoCard, PActivityLedger/Row, ProfileTitleBlock, ProfileOwnDesktop | 5, 6, 8, 9 |
| `kiosk-profile-flows.jsx` — §01 edit-in-place, §02 avatar 5-states (§03–§05 are Plan B) | 6, 7 |
| `kiosk-profile-states.jsx` — states §01, §02, §04–§07, §09, §10 (§03/§08 Plan B) | 5, 6, 7, 8, 9 |
| `kiosk-profile-public.jsx` — **ProfileOwnMobile** (own-profile mobile lives here), PMobileFold, PMobileTopBar, PActivityRowMobile | 10 |
| `tokens-profile.css` / `motion-profile.css` — values for `src/styles/profile.css` | 5 |

## File structure (final state)

```
src/lib/profile/
  handle.ts            # PURE: slugifyHandle(), HANDLE_REGEX
  profileShared.ts     # PURE: types + constants (imported by islands AND server)
  profileQuery.ts      # server-only: getProfileMe(), ensureHandle()
  activityFeed.ts      # server-only: fetchActivityPage()
src/pages/api/profile/
  me.ts                # GET identity + stats
  standing.ts          # GET strikes + rejected list
  activity.ts          # GET merged feed page
  avatar.ts            # POST session-based avatar upload
scripts/backfill-user-handles.ts
src/components/profile/kiosk/
  ProfileInner.svelte  ProfileTitleBlock.svelte
  PIdentityCard.svelte PModerationCard.svelte PKontoCard.svelte
  PActivityLedger.svelte PActivityRow.svelte
  atoms/ PCard.svelte PCardHead.svelte PBtn.svelte PAvatar.svelte
         PHobbyChip.svelte PStrikeDots.svelte PSurfaceTag.svelte
         PFilterChip.svelte PStrap.svelte PMobileFold.svelte
  states/ ProfileSkeleton.svelte
src/styles/profile.css
DELETED: src/components/UserProfile.tsx, UserProfileWrapper.tsx, ImageUpload.tsx,
         src/pages/api/upload/image.ts
```

---

### Task 1: Handle foundation (lib + backfill script + register + partial unique index)

**Files:**
- Create: `src/lib/profile/handle.ts`
- Create: `scripts/backfill-user-handles.ts`
- Modify: `src/pages/api/auth/register.ts` (~line 75, the insert)

**Interfaces:**
- Produces: `slugifyHandle(name: string): string` (pure, no collision handling), `HANDLE_REGEX = /^[a-z0-9_]{3,20}$/`, `HANDLE_FALLBACK = 'nachbar'`. Task 2's `ensureHandle()` and register both build collision suffixes on top of `slugifyHandle`.

- [ ] **Step 1: Write `src/lib/profile/handle.ts`** (dependency-pure — no mongodb import):

```typescript
// src/lib/profile/handle.ts
// PURE module — imported by server code AND scripts. Never import DB here.

export const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;
export const HANDLE_FALLBACK = 'nachbar';

/** Chars NFD can't decompose. German ö/ü/ä decompose to o/u/a via NFD —
 *  deliberately NOT oe/ue/ae, to keep one rule for Turkish + German names. */
const MANUAL_MAP: Record<string, string> = {
  ß: 'ss', ı: 'i', ø: 'o', æ: 'ae', œ: 'oe', đ: 'd', ł: 'l', þ: 'th',
};

/** "Deniz Yılmaz" -> "deniz_yilmaz". Deterministic; caller handles collisions. */
export function slugifyHandle(name: string): string {
  let s = name
    .toLowerCase()
    .replace(/[ßıøæœđłþ]/g, (c) => MANUAL_MAP[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics (escaped range — do not paste literal combining chars)
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (s.length > 20) s = s.slice(0, 20).replace(/_$/, '');
  if (s.length < 3) s = HANDLE_FALLBACK; // suffixing at the caller keeps it unique
  return s;
}
```

- [ ] **Step 2: Write `scripts/backfill-user-handles.ts`** — copy the connection pattern of `scripts/create-auth-indexes.ts` verbatim (dotenv + raw MongoClient + dbName from URI path, fallback `'CommunityWebApp-test'`):

```typescript
// scripts/backfill-user-handles.ts
// Run: pnpm tsx scripts/backfill-user-handles.ts
// ADDITIVE production migration (shared DB): sets users.handle where missing,
// then creates a PARTIAL unique index. Never modifies any other field.
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { slugifyHandle } from '../src/lib/profile/handle';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI missing'); process.exit(1); }
  const client = new MongoClient(uri);
  await client.connect();
  const dbName = new URL(uri).pathname.slice(1) || 'CommunityWebApp-test';
  const users = client.db(dbName).collection('users');

  const taken = new Set<string>(
    (await users.find({ handle: { $type: 'string' } }, { projection: { handle: 1 } }).toArray())
      .map((u) => u.handle as string)
  );

  const missing = await users
    .find({ handle: { $exists: false } }, { projection: { name: 1 } })
    .toArray();
  console.log(`${missing.length} users without handle, ${taken.size} handles taken`);

  for (const u of missing) {
    const base = slugifyHandle(String(u.name ?? ''));
    let handle = base;
    for (let n = 2; taken.has(handle); n++) {
      const suffix = String(n);
      handle = base.slice(0, 20 - suffix.length) + suffix;
    }
    taken.add(handle);
    await users.updateOne({ _id: u._id, handle: { $exists: false } }, { $set: { handle } });
    console.log(`  ${u._id} -> ${handle}`);
  }

  // PARTIAL index: users created by the currently-deployed prod code have no
  // handle; a full unique index would treat those as duplicate nulls and break
  // prod registration. Partial index only constrains docs that HAVE a handle.
  await users.createIndex(
    { handle: 1 },
    { unique: true, partialFilterExpression: { handle: { $type: 'string' } }, name: 'users_handle_unique' }
  );
  console.log('users_handle_unique index ensured');
  await client.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Register sets a handle.** In `src/pages/api/auth/register.ts` the insert is currently `const result = await db.collection('users').insertOne({ name, email: emailNorm, password: hashedPassword, image: '', emailVerified: false, roleBadge: 'resident', hobbies: [], createdAt: ..., updatedAt: ... });` and `result.insertedId` is used right after for the verify-email token — the retry loop must end with `result` bound the same way. Import at top: `import { slugifyHandle } from '../../../lib/profile/handle';`. Replace the single `insertOne` with:

```typescript
// Handle collisions: users_handle_unique is the ONLY unique index on users
// (email uniqueness is the findOne+409 check above), so code 11000 here can
// only mean a handle collision — safe to retry with a suffix.
const baseHandle = slugifyHandle(name);
let result: { insertedId: any } | null = null;
for (let attempt = 0; attempt < 6 && !result; attempt++) {
  const suffix = attempt === 0 ? '' : String(attempt + 1);
  const handle = baseHandle.slice(0, 20 - suffix.length) + suffix;
  try {
    result = await db.collection('users').insertOne({
      name,
      email: emailNorm,
      password: hashedPassword,
      image: '',
      emailVerified: false,
      roleBadge: 'resident',
      hobbies: [],
      handle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (e: any) {
    if (e?.code !== 11000) throw e;
  }
}
if (!result) {
  return new Response(JSON.stringify({ error: 'Registration failed' }), { status: 500 });
}
```

- [ ] **Step 4: Verify pure lib via one-off script** (scratchpad, delete after):
`slugifyHandle('Deniz Yılmaz') === 'deniz_yilmaz'`, `slugifyHandle('Łukasz Groß') === 'lukasz_gross'`, `slugifyHandle('李')` → `'nachbar'`, `slugifyHandle('Ali-Öztürk!!') === 'aliozturk'` — print results with `pnpm tsx`.
- [ ] **Step 5: Run the backfill against the shared DB**: `pnpm tsx scripts/backfill-user-handles.ts`. Expected: every user listed with a unique handle, index created. Run it a second time — expected `0 users without handle` (idempotent).
- [ ] **Step 6: Verify registration** (dev server): register `tmp-handle-test@example.invalid` (name `Tmp Handle Test`), then check in mongo that the doc has `handle: 'tmp_handle_test'`. **Record in the cleanup manifest; delete the tmp user afterwards.**
- [ ] **Step 7: `pnpm type-check`** — no new errors over the 30 baseline.
- [ ] **Step 8: Commit** — `feat(profile): user handles — pure slug lib, backfill script, partial unique index, register integration`

---

### Task 2: Profile identity API (`GET /api/profile/me`, `GET /api/profile/standing`) + hardened update

**Files:**
- Create: `src/lib/profile/profileShared.ts`
- Create: `src/lib/profile/profileQuery.ts`
- Create: `src/pages/api/profile/me.ts`
- Create: `src/pages/api/profile/standing.ts`
- Modify: `src/pages/api/users/update.ts` (whole handler body)

**Interfaces:**
- Consumes: `slugifyHandle`, `HANDLE_FALLBACK` from Task 1; `connectDB` (`src/lib/mongodb.ts`); `rejectIfBanned` (`src/lib/auth/banGuard.ts`); `checkNameProfanity` (`src/lib/moderation.ts`).
- Produces (used by Tasks 5–10):

```typescript
// src/lib/profile/profileShared.ts (PURE — types + constants only)
export interface ProfileMe {
  id: string; name: string; handle: string; email: string;
  image: string | null; hobbies: string[]; verified: boolean;
  memberSince: number;              // year, from users.createdAt (ISO string OR Date — handle both)
  isBanned: boolean;
  stats: { posts: number; listings: number; events: number; danke: number };
}
export interface StandingRejectedItem {
  date: string;                     // ISO (flaggedContent.reviewedAt ?? updatedAt)
  contentType: 'topic' | 'announcement' | 'recommendation' | 'comment' | 'event' | 'marketplace' | 'news';
  title: string; reason: string;
}
export interface ProfileStanding {
  strikes: number; isBanned: boolean; bannedAt: string | null;
  rejected: StandingRejectedItem[]; // newest first, max 20
}
export const PROFILE_NAME_REGEX = /^[\p{L}\p{N} _-]{3,30}$/u;
export const HOBBY_MAX_COUNT = 10;
export const HOBBY_MAX_LEN = 50;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
```

- `getProfileMe(userId: string): Promise<ProfileMe | null>` and `ensureHandle(userId: string): Promise<string>` in `profileQuery.ts` (server-only).
- `GET /api/profile/me` → 200 `{ profile: ProfileMe }` | 401. `GET /api/profile/standing` → 200 `ProfileStanding` | 401.
- `POST /api/users/update` keeps its path + `{ name, hobbies }` request shape but now validates, profanity-checks, and returns 200 `{ success: true, name, hobbies }` | 400 `{ error }` | 401 | 403.

- [ ] **Step 1: `profileShared.ts`** as above (pure — no imports).
- [ ] **Step 2: `profileQuery.ts`:**

```typescript
// src/lib/profile/profileQuery.ts — SERVER-ONLY (imports mongodb)
import { ObjectId } from 'mongodb';
import { connectDB } from '../mongodb';
import { slugifyHandle } from './handle';
import type { ProfileMe } from './profileShared';

/** Lazy self-heal: users registered by old prod code lack a handle. */
export async function ensureHandle(userId: string): Promise<string> {
  const db = await connectDB();
  const users = db.collection('users');
  const _id = new ObjectId(userId);
  const u = await users.findOne({ _id }, { projection: { handle: 1, name: 1 } });
  if (!u) throw new Error('user not found');
  if (typeof u.handle === 'string') return u.handle;
  const base = slugifyHandle(String(u.name ?? ''));
  for (let n = 0; n < 20; n++) {
    const suffix = n === 0 ? '' : String(n + 1);
    const handle = base.slice(0, 20 - suffix.length) + suffix;
    try {
      const res = await users.updateOne({ _id, handle: { $exists: false } }, { $set: { handle } });
      if (res.matchedCount === 0) {
        // Concurrent request already assigned one — return the ACTUAL handle,
        // not the one we generated but never wrote.
        const fresh = await users.findOne({ _id }, { projection: { handle: 1 } });
        if (typeof fresh?.handle === 'string') return fresh.handle;
        throw new Error('user disappeared during handle assignment');
      }
      return handle;
    } catch (e: any) {
      if (e?.code !== 11000) throw e; // collision with ANOTHER user -> next suffix
    }
  }
  throw new Error('could not assign handle');
}

export async function getProfileMe(userId: string): Promise<ProfileMe | null> {
  const db = await connectDB();
  const _id = new ObjectId(userId);
  const user = await db.collection('users').findOne(
    { _id },
    { projection: { name: 1, handle: 1, email: 1, userPicture: 1, image: 1, hobbies: 1, verified: 1, createdAt: 1, isBanned: 1 } }
  );
  if (!user) return null;
  const handle = typeof user.handle === 'string' ? user.handle : await ensureHandle(userId);

  const [posts, ann, rec, listings, events] = await Promise.all([
    db.collection('topics').countDocuments({ author: userId }),
    db.collection('announcements').countDocuments({ author: userId }),
    db.collection('recommendations').countDocuments({ author: userId }),
    db.collection('listings').countDocuments({ sellerId: userId, status: { $ne: 'draft' } }),
    db.collection('events').countDocuments({ author: userId }),
  ]);
  const dankeAgg = await Promise.all(
    ['topics', 'announcements', 'recommendations', 'events'].map((c) =>
      db.collection(c).aggregate([
        { $match: { author: userId } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$likes', 0] } } } },
      ]).toArray()
    )
  );
  const danke = dankeAgg.reduce((sum, r) => sum + (r[0]?.total ?? 0), 0);

  const created = user.createdAt instanceof Date ? user.createdAt : new Date(String(user.createdAt));
  return {
    id: userId,
    name: String(user.name ?? ''),
    handle,
    email: String(user.email ?? ''),
    image: (user.userPicture || user.image || null) as string | null,
    hobbies: Array.isArray(user.hobbies) ? user.hobbies : [],
    // Interim rule — mirrors ForumPostDetail.svelte:236 (no verification pipeline yet)
    verified: user.verified ?? true,
    memberSince: Number.isNaN(created.getTime()) ? new Date().getFullYear() : created.getFullYear(),
    isBanned: user.isBanned === true,
    stats: { posts: posts + ann + rec, listings, events, danke },
  };
}
```

- [ ] **Step 3: `me.ts`** — standard API pattern (`getSession` → 401 without `session?.user?.id`; then `getProfileMe`, 404 if null, else 200 `{ profile }`). Set `Cache-Control: no-store` on the response.
- [ ] **Step 4: `standing.ts`:**

```typescript
// src/pages/api/profile/standing.ts
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { ObjectId } from 'mongodb';
import { connectDB } from '../../../lib/mongodb';

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  const userId = (session?.user as any)?.id;
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const db = await connectDB();
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(userId) },
    { projection: { moderationStrikes: 1, isBanned: 1, bannedAt: 1 } }
  );
  if (!user) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });

  const rejectedDocs = await db.collection('flaggedContent')
    .find(
      { authorId: userId, reviewStatus: 'rejected' },
      { projection: { contentType: 1, title: 1, rejectionReason: 1, reviewedAt: 1, updatedAt: 1 } }
    )
    .sort({ reviewedAt: -1 })
    .limit(20)
    .toArray();

  return new Response(JSON.stringify({
    strikes: user.moderationStrikes ?? 0,
    isBanned: user.isBanned === true,
    bannedAt: user.bannedAt ? new Date(user.bannedAt).toISOString() : null,
    rejected: rejectedDocs.map((d) => ({
      date: new Date(d.reviewedAt ?? d.updatedAt ?? Date.now()).toISOString(),
      contentType: d.contentType,
      title: d.title ?? '—',
      reason: d.rejectionReason ?? '',
    })),
  }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
};
```

- [ ] **Step 5: Harden `POST /api/users/update`** (path + request shape unchanged: `{ name, hobbies }`; both now optional-but-at-least-one). Replace the body with: session 401 → `rejectIfBanned` 403 → zod validation → profanity gate → `$set` only provided fields:

```typescript
const BodySchema = z.object({
  name: z.string().regex(PROFILE_NAME_REGEX, 'Invalid display name').optional(),
  hobbies: z.array(z.string().trim().min(1).max(HOBBY_MAX_LEN)).max(HOBBY_MAX_COUNT).optional(),
}).refine((d) => d.name !== undefined || d.hobbies !== undefined, { message: 'Nothing to update' });
```
On name change: `const nameCheck = await checkNameProfanity(parsed.name)` → 400 `{ error: nameCheck.reason || 'Invalid display name' }` if not clean (same contract as register.ts:44-49). `$set` `{ ...(name && {name}), ...(hobbies && {hobbies}), updatedAt: new Date().toISOString() }` (keep the ISO-string convention this endpoint already uses). Response 200 `{ success: true, name: <final>, hobbies: <final> }` echoing the persisted values.
Imports: `z` from `zod`, `PROFILE_NAME_REGEX`/`HOBBY_*` from `../../../lib/profile/profileShared`, `checkNameProfanity` from `../../../lib/moderation`.
- [ ] **Step 6: Verify with curl** (dev server; create `tmp-profileapi@example.invalid` via register, log in with a cookie jar):
  - `GET /api/profile/me` unauthenticated → 401; authenticated → profile JSON with `handle`, `stats` all 0, `verified: true`, `memberSince` = current year.
  - `GET /api/profile/standing` → `{ strikes: 0, isBanned: false, bannedAt: null, rejected: [] }`.
  - `POST /api/users/update` `{ "name": "x" }` → 400 (too short); `{ "name": "Tmp Profile Zwei", "hobbies": ["Çay & Tavla"] }` → 200 echo; profanity name → 400; 11-item hobbies array → 400.
  - **Cleanup the tmp user + any tokens (manifest).**
- [ ] **Step 7: `pnpm type-check`** — baseline only.
- [ ] **Step 8: Commit** — `feat(profile): me/standing endpoints + hardened users/update (zod, profanity, handle self-heal)`

---

### Task 3: Cross-surface activity feed (`src/lib/profile/activityFeed.ts` + `GET /api/profile/activity`)

**Files:**
- Create: `src/lib/profile/activityFeed.ts`
- Create: `src/pages/api/profile/activity.ts`
- Modify: `src/lib/profile/profileShared.ts` (add feed types)

**Interfaces:**
- Consumes: `connectDB`; collection facts: `topics/announcements/recommendations/events` author field `author` (string), `listings.sellerId`, `news.submittedBy` + `source: 'user_submitted'`; `savedPosts {userId, postId, savedAt}`, `savedNews {userId, newsId, savedAt}`, `savedEvents {userId, eventId, savedAt}`, `listings.savedBy: string[]`; events `startDate: Date`, `rsvps.going: string[]`; listings `price`, `listingType`, `status`; all content `moderationStatus`, `createdAt`.
- Produces (append to `profileShared.ts`; consumed by Task 9's ledger):

```typescript
export type ActivityFilter = 'alle' | 'forum' | 'markt' | 'kalender' | 'kurier' | 'gespeichert';
export type ActivitySurface = 'forum' | 'markt' | 'kalender' | 'kurier';
export type ActivityKind =
  | 'diskussion' | 'empfehlung' | 'ankuendigung'   // forum
  | 'anzeige'                                      // markt
  | 'termin' | 'zusage'                            // kalender
  | 'news'                                         // kurier
  | 'artikel';                                     // kurier (saved news by others)
export interface ActivityItem {
  id: string; surface: ActivitySurface; kind: ActivityKind;
  title: string;
  date: string;                    // ISO — sort key (createdAt; zusage -> event startDate; saved -> savedAt)
  strap: 'pruefung' | 'reserviert' | 'abgelehnt' | null;
  saved: boolean;                  // true in the gespeichert view
  by: string | null;               // author display name (gespeichert view) or source name (kurier)
  href: string | null;             // detail link ('/topics/{id}', '/marketplace/{id}', '/calendar', '/newsboard/{id}')
  meta: { likes?: number; comments?: number; price?: number | null;
          listingType?: 'sell' | 'exchange' | 'gift'; eventDate?: string; going?: number };
}
export interface ActivityPage { items: ActivityItem[]; nextBefore: string | null; }
export const ACTIVITY_PAGE_SIZE = 20;
```

- `fetchActivityPage(userId: string, filter: ActivityFilter, before: Date | null, limit: number): Promise<ActivityPage>` (server-only).
- `GET /api/profile/activity?filter=alle&before=<ISO>&limit=20` → 200 `ActivityPage` | 400 bad filter | 401.

- [ ] **Step 1: Implement `activityFeed.ts`.** Strategy: per surface, query only what the filter needs, each sub-query `sort desc, limit`, merge in JS, sort by `date` desc, slice to `limit`; `nextBefore` = last returned item's `date` when `merged.length > limit` OR any sub-query returned a full `limit` (else `null`). Sub-queries (all with `...(before && { <dateField>: { $lt: before } })`):
  - **forum** (`filter alle|forum`): `topics|announcements|recommendations.find({ author: userId })` proj `{title, createdAt, moderationStatus, likes, comments}` → kind `diskussion|ankuendigung|empfehlung`, strap `pruefung` if `moderationStatus==='pending'`, `abgelehnt` if `'rejected'`, meta `{likes, comments: Array.isArray(doc.comments) ? doc.comments.length : 0}` (embedded `comments: ObjectId[]` is maintained on comment approval — count = approved comments, accepted). **Per-kind detail routes** (verified — `detailHref` in `ForumIndexInner.svelte:221-225`): topics → `/topics/{id}`, announcements → `/announcements/{id}`, recommendations → `/recommendations/{id}`.
  - **markt** (`alle|markt`): `listings.find({ sellerId: userId, status: { $ne: 'draft' } })` proj `{title, createdAt, price, listingType, status, moderationStatus}` → kind `anzeige`, strap: `pruefung` if pending moderation, `reserviert` if `status==='reserved'`, `abgelehnt` if rejected (moderation strap wins over reserviert), meta `{price, listingType}`, href `/marketplace/{id}`.
  - **kalender created** (`alle|kalender`): `events.find({ author: userId })` proj `{title, createdAt, startDate, moderationStatus, rsvps}` → kind `termin`, strap from moderationStatus, meta `{eventDate: startDate.toISOString(), going: rsvps?.going?.length ?? 0}`, href `/calendar`.
  - **kalender zusagen** (`alle|kalender`): `events.find({ 'rsvps.going': userId, author: { $ne: userId } })` — `date` = `startDate` (Decision 6), kind `zusage`, no strap, href `/calendar`. `before` filter applies to `startDate` here.
  - **kurier** (`alle|kurier`): `news.find({ submittedBy: userId, source: 'user_submitted' })` → kind `news`, strap from moderationStatus, `by: doc.sourceName ?? null`, href `/newsboard/{id}` (detail route `src/pages/newsboard/[id].astro` exists).
  - **gespeichert** (only when `filter==='gespeichert'`; never mixed into `alle`): union of (a) `savedPosts.find({userId})` sort savedAt desc limit → resolve ids against `topics`, then leftovers against `announcements` + `recommendations` (probe by `_id: {$in}` — savedPosts has no type discriminator); (b) `savedNews` → `news` (kind `artikel`, `by: sourceName`); (c) `savedEvents` → `events`; (d) `listings.find({ savedBy: userId })` (kind `anzeige`, date = the listing's `createdAt` since `savedBy` has no timestamp — accept and comment). `date` = `savedAt` where available. `saved: true` on all. `href` per resolved collection (same per-kind routes as above — a savedPosts id resolved from `announcements` links to `/announcements/{id}`, etc.). Resolve author names in ONE batch: collect the resolved docs' `author`/`sellerId` strings → `users.find({_id: {$in: ids.map(oid)}}, {projection: {name: 1}})` → `by` = author name (format „von {name}" client-side). Skip docs that no longer exist or are not publicly visible (`moderationStatus === 'rejected'`).
- [ ] **Step 2: `activity.ts` endpoint** — session 401; validate `filter` against the six literals (400 otherwise); `before` parsed with `new Date(param)` (400 if `isNaN`); `limit` = `Math.min(Number(param) || ACTIVITY_PAGE_SIZE, 50)`. Return JSON, `Cache-Control: no-store`.
- [ ] **Step 3: Verify with curl + tmp fixtures.** Create TWO tmp users: `tmp-archiv@example.invalid` (A) and `tmp-archiv-b@example.invalid` (B). As A create 1 topic + 1 listing + 1 event titled `[TMP-E2E] …` via the existing create APIs (they'll run moderation — fine, `pending` items still show for the author with a `pruefung` strap). As B create 1 future `[TMP-E2E]` event and 1 `[TMP-E2E]` topic; as A, RSVP `going` to B's event and save B's topic (so the Gespeichert byline shows B's name). **Never write to real users' documents** — all fixture writes stay inside `[TMP-E2E]` docs owned by tmp users. Then:
  - `filter=alle` → topic + listing + event rows, dates desc, straps present, RSVP row `kind: 'zusage'` dated by the event's startDate.
  - `filter=markt` → only the listing. `filter=gespeichert` → the saved topic with `by` = its author's name, `saved: true`.
  - Pagination: `limit=2` → `nextBefore` set; second call with `before=` returns the remainder, no overlap/duplicates.
  - **Cleanup manifest: delete both tmp users, all 5 `[TMP-E2E]` docs, their flaggedContent records, and the savedPosts row** (the RSVP dies with B's event). Verify residual scans are 0 across users/topics/listings/events/savedPosts/flaggedContent.
- [ ] **Step 4: `pnpm type-check`** — baseline only.
- [ ] **Step 5: Commit** — `feat(profile): cross-surface activity feed lib + /api/profile/activity`

---

### Task 4: Session-based avatar endpoint (`POST /api/profile/avatar`)

**Files:**
- Create: `src/pages/api/profile/avatar.ts`

**Interfaces:**
- Consumes: `AVATAR_MAX_BYTES`, `AVATAR_ACCEPTED_TYPES` from `profileShared.ts`; `rejectIfBanned`; Cloudinary env — **the real var name is `CLOUD_NAME`** (verified in `.env` and all four existing upload endpoints; the root CLAUDE.md's `CLOUDINARY_CLOUD_NAME` is aspirational docs, do not use it). **Template to copy: `src/pages/api/posts/upload.ts`** — it already has the session-based pattern (getSession → rejectIfBanned → formData → Cloudinary config), NOT the legacy JWT `upload/image.ts`.
- Produces: `POST multipart/form-data { image: File }` → 200 `{ url: string }` | 400 `{ error: 'file_too_large' | 'bad_type' | 'no_file' }` | 401 | 403 `{ error: 'account_banned' }` | 500. Persists `users.userPicture` (+ `updatedAt`). Task 7's uploader consumes this contract.

- [ ] **Step 1: Implement** — pattern: `getSession` (NOT the legacy JWT header — that path is why avatars never worked; the auth-astro login never sets `localStorage.token`), `rejectIfBanned(session.user.id)`, `formData()`, validate `file.size <= AVATAR_MAX_BYTES` and `AVATAR_ACCEPTED_TYPES.includes(file.type)`, base64 data-URI → `cloudinary.uploader.upload(dataUri, { folder: 'mahalle/profile', public_id: `${userId}_${Date.now()}`, transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face' }], quality: 'auto:good' })`, then `users.updateOne({_id}, { $set: { userPicture: secure_url, updatedAt: new Date().toISOString() } })`, return `{ url: secure_url }`. Cloudinary config block copied from `src/pages/api/posts/upload.ts:7-11` (`cloud_name: import.meta.env.CLOUD_NAME`).
- [ ] **Step 2: Verify with curl** — unauthenticated → 401; authenticated (tmp user + cookie jar) with a ~100KB test JPG from the scratchpad → 200 with a `res.cloudinary.com` URL; a `.txt` file → 400 `bad_type`; a >5MB file (generate with `dd`) → 400 `file_too_large`. Confirm `userPicture` persisted in mongo. **Cleanup: tmp user + note the Cloudinary asset id in the manifest (delete via dashboard is fine to skip — folder `mahalle/profile` tmp asset, name it in the report).**
- [ ] **Step 3: `pnpm type-check`** — baseline only.
- [ ] **Step 4: Commit** — `feat(profile): session-based avatar upload endpoint persisting userPicture`

---

### Task 5: Page scaffold — tokens, profile.css, i18n keys, `profile.astro` rebuild, title block, skeleton, orchestrator shell

**Files:**
- Modify: `src/styles/tokens.css` (accent block, ~line 117)
- Create: `src/styles/profile.css`
- Modify: `src/lib/kiosk-i18n.ts` (both dicts)
- Modify: `src/middleware.ts:43` (remove `"/profile"` from `protectedRoutes`)
- Rewrite: `src/pages/profile.astro`
- Create: `src/components/profile/kiosk/ProfileTitleBlock.svelte`, `states/ProfileSkeleton.svelte`, `atoms/PCard.svelte`, `atoms/PCardHead.svelte`, `atoms/PBtn.svelte`, `ProfileInner.svelte`

**Interfaces:**
- Consumes: `getProfileMe` (SSR prefetch), `ProfileMe` type, KioskLayout `page="profile"` (union already includes it), `.k-skeleton` shimmer (`src/styles/motion.css`).
- Produces: `ProfileInner` props `{ initialProfile: ProfileMe | null, loggedIn: boolean }`; atoms with props `PCard { accent?: string /* CSS color, default 'var(--k-ochre)' */, pad?: number }`, `PCardHead { n: string, title: string, accent?: string }`, `PBtn { primary?, danger?, small?, disabled? }` (design source: `kiosk-profile.jsx` PCard/PCardHead/PBtn). Tasks 6–9 mount their cards inside `ProfileInner`'s grid slots.

- [ ] **Step 1: tokens.css** — add `[data-page="profile"] { --k-accent: var(--k-ochre); }` to the accent block with a one-line comment (`/* profile — ochre, deliberately shared with auth ("your door" pair) */`).
- [ ] **Step 2: `src/styles/profile.css`** — port from `motion-profile.css` + `tokens-profile.css` (values verbatim): keyframes `profSweep`, `profSaveTick`, `profChipIn`, `profUploadBar` (skip `profPulse` — Chronik is Plan B) + classes `.prof-skeleton-bar`, `.prof-save-chip`, `.prof-chip-in`, `.prof-upload-indeterminate`, and `.prof-nav-avatar-active { box-shadow: 0 0 0 2px var(--k-paper), 0 0 0 4px var(--k-ochre); }`. Also add `[data-page="profile"] .kiosk-headline em { color: var(--k-ochre); font-style: italic; }` — the global `.kiosk-headline em` rule references `--k-accent-italic`, which is unset outside marketplace (invalid-var → inherited color), so the carved title's `<em>` needs this explicit rule. Full `@media (prefers-reduced-motion: reduce)` block (animations none; chips snap to end state; skeleton static `var(--k-paper-soft)`). Import in `profile.astro` via `<style is:global>@import '../styles/profile.css';</style>` (KioskLayout already imports global.css; this is additive — the admin.css pattern).
- [ ] **Step 3: i18n keys** — add the `profile.*` namespace to BOTH dicts, copy **verbatim from the JSX** (DE from the `lang="DE"` branches, EN from `EN`; curly German quotes). Key list (≈60):
  `profile.eyebrow.own` (`PROFIL · @{h} · IM KIEZ SEIT {y}`), `profile.heading.own` (`Dein <em>Meldebogen</em>` — rendered `{@html}`, `<em>` styled `font-instrument italic font-normal` + `style="color: var(--k-ochre)"`),
  identity: `profile.since`, `profile.verified`, `profile.stats.posts|listings|events|danke`, `profile.interests`, `profile.action.edit`,
  edit: `profile.edit.name.label`, `profile.edit.name.hint`, `profile.edit.hobbies.label`, `profile.edit.hobbies.add`, `profile.edit.email.label`, `profile.edit.email.note`, `profile.edit.save`, `profile.edit.cancel`, `profile.chip.saving`, `profile.chip.saved`, `profile.save.failed`, `profile.save.retry`,
  avatar: `profile.avatar.change`, `profile.avatar.drop`, `profile.avatar.hint` (format/size line), `profile.avatar.cancel`, `profile.avatar.saved`, `profile.avatar.err.size`, `profile.avatar.err.format`, `profile.avatar.err.network`, `profile.avatar.retry`, `profile.avatar.pickother`,
  moderation: `profile.mod.title`, `profile.mod.warnings`, `profile.mod.clean`, `profile.mod.rejected.label`, `profile.mod.reason`, `profile.mod.footer`,
  konto: `profile.konto.title`, `profile.konto.email`, `profile.konto.password`, `profile.konto.logout`,
  archiv: `profile.archiv.title`, `profile.archiv.note`, `profile.filter.alle|forum|markt|kalender|kurier|gespeichert`, `profile.archiv.older`, `profile.archiv.by` (`von {name}`), `profile.empty.line`, `profile.empty.cta.topic|listing|events`,
  surfaces/kinds/straps: `profile.surface.forum|markt|kalender|kurier`, `profile.kind.diskussion|empfehlung|ankuendigung|anzeige|termin|zusage|news|artikel`, `profile.kind.gratis` (`verschenken`), `profile.strap.pruefung|reserviert|abgelehnt`,
  meta: `profile.meta.danke` (`{n} danke`), `profile.meta.antworten`, `profile.meta.zusagen`,
  states: `profile.state.banned` (`Konto gesperrt seit {d} — kein Posten mehr. Details im Moderations-Block.`), `profile.state.loggedout`, `profile.state.login`, `profile.mobile.title`.
- [ ] **Step 4: middleware** — remove `"/profile"` from the `protectedRoutes` array (logged-out now renders state §10 in-page).
- [ ] **Step 5: rewrite `profile.astro`:**

```astro
---
import KioskLayout from '../layouts/KioskLayout.astro';
import ProfileInner from '../components/profile/kiosk/ProfileInner.svelte';
import { getSession } from 'auth-astro/server';
import { getProfileMe } from '../lib/profile/profileQuery';

Astro.response.headers.set('Cache-Control', 'no-store, must-revalidate');
const session = await getSession(Astro.request);
const userId = (session?.user as any)?.id ?? null;
const initialProfile = userId ? await getProfileMe(userId) : null;
---
<KioskLayout title="Profil — Mahalle" page="profile">
  <ProfileInner client:load initialProfile={initialProfile} loggedIn={!!userId} />
</KioskLayout>
<style is:global>@import '../styles/profile.css';</style>
```

- [ ] **Step 6: atoms + title block + skeleton + shell.** `PCard`/`PCardHead`/`PBtn` per `kiosk-profile.jsx` (paperWarm bg, 1.5px ink border, 4px accent top-rule, radius 16, `3px 3px 0` ink shadow / btn variants incl. primary `printSm(ochre)` shadow, disabled opacity 0.45). `ProfileTitleBlock` per JSX (`{ handle, since }` props; eyebrow via `tStr($t['profile.eyebrow.own'], {h: handle, y: since})`; carved h1 via `{@html $t['profile.heading.own']}`; bottom dashed rule). `ProfileSkeleton` mirrors the real 2-col layout with `.prof-skeleton-bar`/`.k-skeleton` bars per states-JSX §01 (no emoji). `ProfileInner`: props per interface; three top-level branches — `!loggedIn` → state §10 card (serif-italic line + `PBtn primary small` „anmelden" linking `/login`, per states JSX); `loggedIn && !profile` → `ProfileSkeleton` + client refetch of `/api/profile/me` (seq-guarded); else → `ProfileTitleBlock` + content grid `lg:grid-cols-[384px_1fr] gap-[26px] px-4 lg:px-9 py-6` with named slots/placeholder comments where Tasks 6/8/9 mount cards. Left column order: identity, moderation, konto; right: archiv (Chronik lands above it in Plan B).
- [ ] **Step 7: Verify in browser** (playwright-cli, desktop 1280 + mobile 390): logged out → §10 card, ochre accents, no redirect to /login; logged in (cookie state per `reference_playwright_auth` memory) → title block with real `@handle` + „IM KIEZ SEIT" year, empty grid shell, skeleton visible before hydration data lands. No console errors; check the island actually hydrates (client:load + server-only import stays in .astro frontmatter only).
- [ ] **Step 8: `pnpm type-check`** — baseline only (i18n parity will surface here if a key is missing on one side).
- [ ] **Step 9: Commit** — `feat(profile): kiosk scaffold — ochre accent, profile.css, i18n namespace, rebuilt page + shell`

---

### Task 6: Identity card + edit-in-place (flow §01, states §04/§05)

**Files:**
- Create: `src/components/profile/kiosk/PIdentityCard.svelte`, `atoms/PAvatar.svelte`, `atoms/PHobbyChip.svelte`
- Modify: `src/components/profile/kiosk/ProfileInner.svelte` (mount card, own the profile `$state`)

**Interfaces:**
- Consumes: `ProfileMe`; `POST /api/users/update` contract (Task 2); `PROFILE_NAME_REGEX`, `HOBBY_MAX_COUNT`, `HOBBY_MAX_LEN`; atoms from Task 5; `showError` from `src/utils/toast.ts`.
- Produces: `PAvatar { name: string, image: string | null, size?: number, editable?: boolean, onOpenUpload?: () => void }` — wine circle monogram (`initialsOf` logic like `KioskNav.svelte:48`: first letters of first two name words), serif-italic paper initials at `size*0.36`, `<img>` cover when `image` set, ochre ÄNDERN chip when editable (Task 7 wires `onOpenUpload`). `PIdentityCard { profile: ProfileMe, banned: boolean, onSaved: (p: {name: string; hobbies: string[]}) => void }`. Design source: `kiosk-profile.jsx` (PIdentityCard, PAvatar, PHobbyChip) + `kiosk-profile-flows.jsx` §01 + `kiosk-profile-states.jsx` §04/§05.

- [ ] **Step 1: Read state** per JSX: avatar 92px + name (display 26/800) + `@handle · im Kiez seit {y}` mono line + verified teal pill (`profile.verified`, only if `profile.verified`) + 4-stat dashed ledger (`stats.posts/listings/events/danke`, labels from i18n) + INTERESSEN chips + „Profil bearbeiten" `PBtn primary small` (no Steckbrief button — Plan B; `disabled` + wrapped `opacity-[0.45]` span when `banned`, per state §09).
- [ ] **Step 2: Edit state (in the card, no modal):** name `PField`-style input (label/hint copy from flows-JSX §01; recessed paperSoft box, 1.5px border: danger on error / ink on focus / rule idle), hobby chips with `✕` remove + dashed „+ hinzufügen und ⏎" ghost input (Enter adds trimmed value; enforce `HOBBY_MAX_COUNT`/`HOBBY_MAX_LEN` client-side; new chips get `.prof-chip-in`), e-mail display-only dashed box with the §01 note copy, Speichern/Abbrechen buttons. Client-side validation vs `PROFILE_NAME_REGEX` with inline `✕` error line.
- [ ] **Step 3: Optimistic save (states §04/§05):** on Speichern — snapshot old values, immediately flip to read state showing the new values + „speichert …" chip (`.prof-save-chip`), `POST /api/users/update`. Success → chip „gespeichert ✓" for 1.5s then fade; call `onSaved(serverEcho)` so `ProfileInner` updates its `$state`. Failure/non-200 → restore snapshot INTO EDIT STATE with inputs intact + danger mini-banner (`profile.save.failed` + retry link per states-JSX §05). No silent console-only errors.
- [ ] **Step 4: Verify in browser** (logged-in tmp user): edit name + add/remove hobbies → optimistic flip + chip lifecycle; reload → persisted; kill the dev server mid-save (or block the request via devtools offline) → edit state restored with banner + retry works; name `"x"` → inline error, no request; 11th hobby blocked. Mobile 390: hit targets ≥ 44px. **Cleanup tmp user.**
- [ ] **Step 5: `pnpm type-check`** + commit — `feat(profile): identity card with in-card edit, optimistic save + failure restore`

---

### Task 7: Avatar upload flow (flow §02 — 5 states; states §06/§07)

**Files:**
- Modify: `src/components/profile/kiosk/PIdentityCard.svelte` (upload panel below the header row) and `atoms/PAvatar.svelte` (chip triggers `onOpenUpload`)
- Modify: `src/components/forum/kiosk/KioskNav.svelte` (listen for live avatar update)

**Interfaces:**
- Consumes: `POST /api/profile/avatar` (Task 4), `AVATAR_MAX_BYTES`, `AVATAR_ACCEPTED_TYPES`.
- Produces: window `CustomEvent('profile:avatar-updated', { detail: { url: string } })` after a successful save (KioskNav updates its avatar `$state` from it — Decision 7; sitewide staleness until re-login is a documented residual).

- [ ] **Step 1: The 5 states** per flows-JSX §02, rendered in-card (profile stays usable, state §06): idle (monogram + hover/always-on-touch ÄNDERN chip) → picking (dashed dropzone `⇪` + „Foto hierher ziehen" + hidden `<input type="file" accept="image/jpeg,image/png,image/webp">`; drag-over highlight; also opens straight from the ÄNDERN chip) → uploading (progress BAR 140×10, ochre fill, live percent + „abbrechen"; `.prof-upload-indeterminate` only while percent is unknown) → error (danger box with the CONCRETE reason key: `err.size` client-side pre-check, `err.format`, `err.network`; „nochmal versuchen"/„andere Datei wählen"; old image untouched) → saved (✓ success badge `.prof-chip-in` + „gespeichert" caption, then back to idle with the new image).
- [ ] **Step 2: Upload with real progress** — `fetch` has no upload progress; use `XMLHttpRequest`: `xhr.upload.onprogress` → `percent = Math.round(e.loaded / e.total * 100)`; „abbrechen" → `xhr.abort()` → back to picking, no error banner. Client-side pre-validation (size/type) BEFORE the request. On 200: update local `profile.image`, dispatch `profile:avatar-updated`, show saved state.
- [ ] **Step 3: KioskNav live update** — add in `KioskNav.svelte`: `let liveImage = $state<string | null>(null);` + a `$effect` registering `window.addEventListener('profile:avatar-updated', (e) => { liveImage = (e as CustomEvent).detail.url; })` (cleanup on destroy); avatar `<img src={liveImage ?? user.image}>` when either exists.
- [ ] **Step 4: Verify in browser**: upload a real JPG → progress bar moves, ✓ badge, avatar swaps in card AND nav without reload; persisted after reload (SSR session image is stale but `initialProfile.image` is fresh — the card must prefer the API value); oversize file → immediate `err.size`, no network call; `.gif` → `err.format`; abort mid-flight → clean return to picking. **Cleanup: tmp user + note Cloudinary tmp assets.**
- [ ] **Step 5: `pnpm type-check`** + commit — `feat(profile): avatar upload flow with XHR progress, cancel, concrete errors, nav live-update`

---

### Task 8: Moderation card („Leumund") + Konto card + gesperrt state §09

**Files:**
- Create: `src/components/profile/kiosk/PModerationCard.svelte`, `PKontoCard.svelte`, `atoms/PStrikeDots.svelte`
- Modify: `ProfileInner.svelte` (fetch standing, mount cards, banned banner)

**Interfaces:**
- Consumes: `GET /api/profile/standing` (`ProfileStanding`). The rejected-row surface tag + ABGELEHNT strap need shared atoms — **create `atoms/PSurfaceTag.svelte` and `atoms/PStrap.svelte` in THIS task**; Task 9 consumes them.
- Produces: `PStrap { kind: 'pruefung' | 'reserviert' | 'abgelehnt' }` — applies existing global `.kiosk-strap kiosk-strap--small` classes + per-kind bg/fg (ochre/ink, plum/paper, danger/paper per `tokens-profile.css`), label from `profile.strap.*`. `PSurfaceTag { surface: ActivitySurface }` — 7px dot + mono label, colors wine/wine/teal/ink per JSX `SURFACE_META`. `PStrikeDots { strikes: number }` — 3× 11px circles, danger fill. `contentTypeToSurface(ct): ActivitySurface` helper in `profileShared.ts` (`topic|announcement|recommendation|comment → 'forum'`, `marketplace → 'markt'`, `event → 'kalender'`, `news → 'kurier'`).

- [ ] **Step 1: PModerationCard** per JSX: accent flip (`strikes > 0 || rejected.length ? var(--k-warn) : var(--k-success)`), `PCardHead n="02"` „Moderation"; warnings row `{strikes} / 3` + `PStrikeDots`; clean → single serif-italic line `profile.mod.clean`; else `ABGELEHNTE INHALTE` list (44px date col, `PSurfaceTag` + `PStrap abgelehnt`, line-through danger title, „Grund: {reason}" mono) + footer note `profile.mod.footer`. Dates `dd.MM` via `Intl.DateTimeFormat` on the locale.
- [ ] **Step 2: PKontoCard** per JSX minus Plan-B parts: `PCardHead n="03"` „Konto"; rows E-MAIL → email value, PASSWORT → `••••••••••` — **display-only, no „ändern" actions, no Gefahrenzone** (Plan B); „Abmelden" `PBtn small` → `signOut` from `auth-astro/client` then `window.location.href = '/'` (the legacy logout pattern).
- [ ] **Step 3: Gesperrt binding (state §09):** `ProfileInner` fetches standing once (seq-guarded) and derives `banned = standing?.isBanned || initialProfile?.isBanned`. When banned: danger mini-banner above the grid with `profile.state.banned` (interpolate `bannedAt` as `dd.MM`), edit action disabled at 0.45 opacity (Task 6 already takes the `banned` prop), moderation card shows ●●● (strikes=3) + ban reason context via its rejected list. Page stays fully readable.
- [ ] **Step 4: Verify** — clean account: green-accent card + „Alles im Reinen"; then via mongo shell set `moderationStrikes: 1` + insert one `flaggedContent` rejected fixture (`[TMP-E2E]` title, authorId = tmp user) → warn accent, dot filled, rejected row with reason; set `isBanned: true, bannedAt: new Date()` → §09 banner + disabled edit. **Revert all fixture writes (manifest).** Abmelden → lands on `/` logged out.
- [ ] **Step 5: `pnpm type-check`** + commit — `feat(profile): moderation standing + konto cards, gesperrt read-only state`

---

### Task 9: Archiv activity ledger (filters, Gespeichert, pagination, empty state §02)

**Files:**
- Create: `src/components/profile/kiosk/PActivityLedger.svelte`, `PActivityRow.svelte`, `atoms/PFilterChip.svelte`
- Modify: `ProfileInner.svelte` (mount in right column)

**Interfaces:**
- Consumes: `GET /api/profile/activity` (`ActivityPage`, `ActivityFilter`, `ACTIVITY_PAGE_SIZE`), atoms `PSurfaceTag`/`PStrap` (Task 8), `scrollFade` action (`src/lib/scrollFade.ts`) for the mobile filter row.
- Produces: `PActivityLedger { publicView?: boolean }` (default false — Plan B reuses it with `true` on `/nachbarn/[handle]`, which hides the Gespeichert filter + divider). `PActivityRow { item: ActivityItem, saved: boolean }`.

- [ ] **Step 1: Ledger card** per JSX: `PCard pad=24`, `PCardHead n="01"` „Archiv" + right note mono `profile.archiv.note`; filter chip row (`PFilterChip { label, active, count? }` — active = ink bg/paper text) with Alle/Forum/Markt/Kalender/Kurier, divider (1×20 rule), `◈ Gespeichert` (hidden when `publicView`); mobile: row scrolls horizontally (`kiosk-scroll-fade no-scrollbar overflow-x-auto` + `use:scrollFade`, chips `shrink-0`). Count shown only on the active „Alle" chip (from the loaded page length — no expensive total; render count only when known).
- [ ] **Step 2: Data flow** — `$state` per filter: `items`, `nextBefore`, `status: 'loading' | 'ready' | 'error'`; seq-guarded fetch on filter change (reset list); „ältere laden ↓" ghost `PBtn small` appends the next page (dedupe by `id` defensively). Straight fetch, no TanStack.
- [ ] **Step 3: Row anatomy** per JSX: desktop grid `52px 1fr auto` gap 14, dashed top rule; date col `dd.MM<br>HH:mm` (zusage rows: event date, no time — render `—` or the weekday, copy the JSX seed format); body = `PSurfaceTag` + kind label (`profile.kind.*`; markt composes `Anzeige · {price} €` or `Anzeige · verschenken` via `profile.kind.gratis` when `listingType==='gift'`/price null) + title (display 15.5/700, `<a href={item.href}>` when set) + meta line (mono 10.5 — danke/Antworten/Zusagen counts via `tStr`, saved rows show `profile.archiv.by` serif-italic byline); right rail = `PStrap` when set + ochre `◈` when `saved`. Below `md`: stacked variant per `PActivityRowMobile` in the public JSX (no fixed date col).
- [ ] **Step 4: Empty state §02** — when `alle` returns zero items: serif-italic `profile.empty.line` + three `PBtn small` CTAs linking `/topics/create`, `/marketplace/create`, `/calendar` (copy from states-JSX). Per-filter empty (non-alle) just shows the line, no CTAs.
- [ ] **Step 5: Verify in browser** with the Task 3 fixture recipe (create fresh tmp content): rows render with straps + correct kind labels DE and EN (toggle locale), filters isolate surfaces, Gespeichert shows byline + ◈, „ältere laden" appends without duplicates, empty tmp user sees §02 with 3 CTAs. Mobile 390: chip row scrolls with fade, rows stack. **Full fixture cleanup (manifest, residual scan 0).**
- [ ] **Step 6: `pnpm type-check`** + commit — `feat(profile): archiv cross-surface ledger with filters, saved view, pagination, empty state`

---

### Task 10: Mobile folds + nav ring + legacy deletion + docs

**Files:**
- Create: `src/components/profile/kiosk/atoms/PMobileFold.svelte`
- Modify: `ProfileInner.svelte` (mobile stack order), `src/components/forum/kiosk/KioskNav.svelte` (ochre ring)
- Delete: `src/components/UserProfile.tsx`, `src/components/UserProfileWrapper.tsx`, `src/components/ImageUpload.tsx`, `src/pages/api/upload/image.ts`
- Docs: root `CLAUDE.md`, `README.md`; create `src/components/profile/kiosk/CLAUDE.md`

**Interfaces:**
- Consumes: everything above. Design source: `ProfileOwnMobile` + `PMobileFold` in `kiosk-profile-public.jsx`.

- [ ] **Step 1: Mobile layout** — below `lg`, `ProfileInner` renders the single stack per `ProfileOwnMobile`: compact identity card (avatar 68, display-20 name, stats grid 17/8.5, Bearbeiten button) → Archiv card (Task 9's component; first page + „ältere laden") → Moderation `PMobileFold` (accordion: 4px accent top-rule, title + `PStrikeDots` badge, `▾/▴` toggle, default open) → Konto `PMobileFold` (default open). `PMobileFold { title, accent?, open? }` uses a local `$state` toggle below `lg` and renders as an always-open plain region on `lg+` (desktop keeps the Task 8 PCard versions — implement folds as mobile-only wrappers around the same card components, `lg:hidden` / `hidden lg:block` pairing is acceptable if state duplication is avoided by lifting fetch state to `ProfileInner`). All hit targets ≥ 44px.
- [ ] **Step 2: Nav ring** — `KioskNav.svelte`: `const profileActive = $derived(currentPath === '/profile' || currentPath.startsWith('/profile/'));` and on the avatar `<a>` add `class:prof-nav-avatar-active={profileActive}` + `aria-current={profileActive ? 'page' : undefined}` (class defined in profile.css — global, loads on the profile page; for other pages the ring is irrelevant since it only activates on /profile).
- [ ] **Step 3: Delete legacy** — remove the four files; `grep -rn "UserProfile\|ImageUpload\|upload/image" src/` must return only the new profile island's own names / zero legacy refs (the `UserProfile` TYPE in `src/lib/userProfilesQueries.ts` stays — unrelated). `pnpm build` green AND load `/profile` + one forum page in the browser (server-module-bleed check per root CLAUDE.md).
- [ ] **Step 4: Docs** — write `src/components/profile/kiosk/CLAUDE.md` (surface notes: API contracts, handle system + partial-index rationale, optimistic-save pattern, avatar XHR flow + `profile:avatar-updated` event + JWT-staleness residual, banned §09 binding, Plan-B deferred list). Root `CLAUDE.md`: users collection bullet gains `handle` (unique, partial index) + `verified?`; add the profile section pointer; middleware note (profile no longer redirect-protected). `README.md`: migration table Profile → ✅ kiosk (Plan A scope note), accent table row Profile/ochre.
- [ ] **Step 5: Full-pass verification** (playwright-cli, both locales, 1280 + 390): logged-out §10 → login → skeleton → full profile; edit + avatar + filters + folds; banned fixture spot-check if still cheap. `pnpm type-check` baseline; `pnpm build` green. **Confirm zero tmp data remains (final residual scan across users/topics/listings/events/savedPosts/flaggedContent/rateLimits).**
- [ ] **Step 6: Commit** — `feat(profile): mobile folds + nav ring, delete legacy profile cluster, docs`

---

## Plan self-review notes (already applied)

- Spec coverage vs `PROFILE_SCOPING.md` §§01–02, 04–07, §08-avatar, §11 (A§01/§02, B all, C§09/§10), §12: covered by Tasks 5–10. §03, §06-actions, §08-flows §03–05, §09–§10 novel, states §03/§08: explicitly Plan B (top of file).
- Atom ownership resolved: `PSurfaceTag`/`PStrap` are created in Task 8 (moderation card needs them first), consumed by Task 9.
- Legacy `/api/upload/image` stays alive until Task 10 (Task 4 copies its Cloudinary config), then deleted with its only client.
- Type consistency: `ProfileMe`/`ProfileStanding`/`ActivityItem`/`ActivityFilter` defined once in `profileShared.ts` (Tasks 2–3) and consumed by name everywhere after.
