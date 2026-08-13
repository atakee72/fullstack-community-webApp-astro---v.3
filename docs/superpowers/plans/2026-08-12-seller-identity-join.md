# Marketplace Seller Identity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every marketplace listing show its seller's name and avatar by resolving seller identity at read time, and close the unauthenticated `GET /api/listings/[id]` endpoint that currently returns seller e-mail addresses, rejected content, and drafts to anyone.

**Architecture:** Add one batched `$in` join helper (`populateSellers`) to `src/lib/listingsQuery.ts` and call it from the three SSR fetchers that already serve every marketplace surface. A **live join** — not write-time denormalization — because `src/lib/auth/accountDeletion.ts` step 6 tombstones a deleted user's `name` to `"Ehemaliges Mitglied"` and relies on authored content resolving that name at read time; a stored copy would freeze the old name and defeat GDPR anonymization (it would also go stale on every rename). Mirrors the forum precedent `populateAuthors` in `src/lib/topicsQuery.ts:67`. Task 2 then rewires the JSON detail endpoint onto `fetchListingDetailForSSR`, the canonical visibility helper the detail page already uses.

**Tech Stack:** Astro 5 (SSR, `output: 'server'`), TypeScript, MongoDB 6.3 native driver, Svelte 5 kiosk islands.

## Verified starting state (measured 2026-08-13 — do not re-derive, but see the fixture warning)

- `listings`: **11 documents, 0 with `sellerName`, 0 with `sellerImage`.** Every real listing renders an empty seller name today. All `sellerId` values are **strings** (not `ObjectId`), across 2 distinct sellers.
- None of the three SSR fetchers in `src/lib/listingsQuery.ts` join `users`. `LISTINGS_QUERY_OPTIONS.fields` lists `sellerName`/`sellerImage`, so the projection asks for fields that do not exist on the documents.
- `src/pages/api/listings/[id].ts` runs a bare `findOne({ _id })` with **no session check, no moderation filter, no status filter, and no freshness filter**, and adds `sellerEmail` to the response. Verified by grep: the file contains no `getSession`, no `moderationStatus`, no `isPubliclyHidden`. Today an anonymous caller can read the **moderation-rejected** listing `69b8268b909f15a484b4f222` and the **drafts** `6a34eaf127656bef515f1ffa` / `6a3530e17be80307cd05efda`, and harvest seller e-mail by enumerating IDs. It has **zero in-app consumers** (grep across `src/`).
- `POST /api/listings/create.ts` does an extra `users.findOne` purely to echo `sellerName`/`sellerEmail`/`sellerImage` in its response body. **That echo is dead code:** the only caller, `src/components/marketplace/kiosk/compose/MarketComposeInner.svelte:295`, reads only `data.moderationStatus` and then redirects. It never touches `data.listing`.
- `sellerEmail` appears in exactly three places repo-wide (`src/types/listing.ts:86`, `src/pages/api/listings/[id].ts:42`, `src/pages/api/listings/create.ts:126`). No component or hook reads it.
- The contact relay (`src/pages/api/listings/[id]/contact.ts:179`) resolves the seller's e-mail from `users` itself and does **not** depend on the listing document. Unaffected by this plan.
- `pnpm type-check 2>&1 | grep -icE "error ts"` → **28** (pre-existing baseline).
- No test framework exists — no vitest, no jest, no `*.test.ts`. Verification is live HTTP assertions, `pnpm type-check` against the baseline, `pnpm build`, and a browser gate.

### ⚠️ Fixture warning — read before writing any verification command

Only **3 of 11** listings are visible to an anonymous caller, and **all three are 18 days old**. The public feed hides anything past the 21-day freshness clock (`buildListingsFilter`), so those three drop out of every anonymous response around **2026-08-16**. After that date an unauthenticated `GET /api/listings` returns **zero items**, and any assertion shaped like "the list is non-empty and every row has a name" fails no matter how correct the code is.

**Therefore every list assertion in this plan is driven by an authenticated `view=mine` request**, where owner scope ignores both age and status and all of the owner's listings are returned. Anonymous requests are used only where the assertion is meaningful on an empty result (PII greps, 404 checks). Where a specific listing ID is needed, the commands **derive it at runtime** rather than hardcoding one that may have aged out.

Current fixture snapshot, for orientation only — **do not hardcode these**:

| id | status | moderation | age | anon-visible |
|---|---|---|---|---|
| `69b94dcab3a898fc3abf1c47` | available | approved | 18d | yes (until ~08-16) |
| `6966c507e7ec5ff88064e17b` | available | approved | 18d | yes (until ~08-16) |
| `69bc4d18472232d4efce5dd8` | available | approved | 18d | yes (until ~08-16) |
| `69b8268b909f15a484b4f222` | available | **rejected** | 150d | no — but leaks today via `[id].ts` |
| `6a34eaf127656bef515f1ffa` | **draft** | — | 55d | no — but leaks today via `[id].ts` |
| `696686023b1481942b392089` | available | approved | 212d | no (past 21d) |

## Global Constraints

- **Never write seller identity into the `listings` collection.** Read-time join only, for the tombstone/rename reason above.
- **Seller projection is an allowlist: `{ name: 1, image: 1, userPicture: 1 }`.** Never `{ password: 0 }` — that returns email, `isBanned`, `pendingEmail`, strike counts and more into client-visible payloads. Same narrowing already documented at `src/lib/topicsQuery.ts:93-101`.
- **`sellerEmail` must not appear in any API response.** It is removed from the type so the compiler rejects reintroduction.
- **`src/lib/listingsQuery.ts` is SERVER-ONLY** (it imports `connectDB`). Never import it from a Svelte/React component — that pulls Node built-ins into the browser bundle and silently breaks hydration. Pure constants belong in `src/lib/marketplaceQueryOptions.ts`.
- **Prod and local dev share the MongoDB database `CommunityWebApp-test`.** Every database interaction in this plan is **read-only**. Do not create, update, or delete any document. Do not create test users or test listings. Do not bump a listing to make it fresh.
- **Never touch port 3000** — that is the user's own dev server. Use port 4655, and only after verifying it is free.
- **Never print, echo, cat, or commit the session cookie.** Always interpolate it as `$(cat ~/.local/share/claude-mahalle/session.cookie)` inside the curl invocation.
- **Commit messages are plain.** No "🤖 Generated with Claude Code" line, no "Co-Authored-By: Claude" footer. Never `git commit --no-verify` (a gitleaks pre-commit hook is armed).
- **Do not push.** Commit only; the user pushes.
- Type-check gate: `error TS` line count must be **28 or fewer** after each task. Pre-existing baseline, not a target to fix.

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/lib/listingsQuery.ts` | Server-only marketplace queries + SSR serialization | **Modify** — add `populateSellers`, call it from all three fetchers |
| `src/types/listing.ts` | Shared `Listing` shape | **Modify** — widen `sellerName`/`sellerImage` to `string \| null`, delete `sellerEmail` |
| `src/lib/marketplaceQueryOptions.ts` | Dependency-free field list shared by server + client | **Modify** — comment only, marking the two fields as join-populated |
| `src/pages/api/listings/[id].ts` | Public single-listing JSON endpoint | **Rewrite** — route through `fetchListingDetailForSSR` |
| `src/pages/api/listings/create.ts` | Listing creation | **Modify** — delete the dead seller lookup + echo |

No new files. Both tasks touch `src/lib/listingsQuery.ts` and Task 2 consumes Task 1's helper, so they must run in order.

**Explicitly out of scope** (pre-existing gaps, not part of this bug): `SellerCard`'s hardcoded `listingCount={0}` and `isVerified={true}` at `src/components/marketplace/kiosk/detail/MarketDetailInner.svelte:354-355`, and its unpassed `memberSince` prop. Leave them exactly as they are.

---

## Shared verification harness

Both tasks use this. Start it once per task, tear it down at the end of the task.

**Start.** Port 4655 must be free — this must print nothing:

```bash
ss -tlnp 2>/dev/null | grep 4655
```

If it prints anything, stop and report BLOCKED. Do not pick another port and do not touch 3000.

```bash
pnpm exec astro dev --port 4655 > /tmp/seller-dev.log 2>&1 &
echo $! > /tmp/seller-dev.pid
sleep 12
curl -s --max-time 20 -o /dev/null -w '%{http_code}\n' http://localhost:4655/api/listings
```

Expected: `200`. If not, read `/tmp/seller-dev.log`.

**Cookie pre-flight.** The authenticated assertions need a live session. The token lives at `~/.local/share/claude-mahalle/session.cookie` (mode 600, minted 2026-08-10). On a dev server over http the cookie name is `authjs.session-token` — **no** `__Secure-` prefix.

```bash
curl -s --max-time 20 http://localhost:4655/api/auth/session \
  -H "Cookie: authjs.session-token=$(cat ~/.local/share/claude-mahalle/session.cookie)" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=s?JSON.parse(s):null;const u=j&&j.user;console.log('session user id:',u&&u.id||null);process.exit(u&&u.id?0:1)})"
```

Expected: a real user id and exit 0. **If it prints `null`, the cookie has expired** — stop and ask the user to refresh it with the established one-liner (`read -rsp` into that path); do not attempt to log in with credentials and do not fall back to anonymous-only checks, because the fixture warning above makes them unreliable.

**Teardown.** `echo $!` captures the shell wrapper, **not** the process holding the port — killing that PID alone leaves the listener running (confirmed during Task 1). Kill by the port-specific command line instead:

```bash
pkill -f "astro dev --port 4655"
sleep 2
rm -f /tmp/seller-dev.pid /tmp/seller-dev.log
ss -tlnp 2>/dev/null | grep 4655
```

The last command must print nothing. If it still shows a listener, find the survivors with `pgrep -af 4655` and kill those PIDs explicitly. The pattern is pinned to `--port 4655`, so it can never match the user's server on port 3000.

---

### Task 1: Resolve seller identity at read time

**Files:**
- Modify: `src/lib/listingsQuery.ts` (add helper after the imports; call it in `fetchListingsForSSR`, `fetchListingForSSR`, `fetchListingDetailForSSR`)
- Modify: `src/types/listing.ts:85` and `:87`
- Modify: `src/lib/marketplaceQueryOptions.ts:24-25`

**Interfaces:**
- Consumes: `connectDB` from `./mongodb`, `ObjectId` from `mongodb` — both already imported at the top of `listingsQuery.ts`.
- Produces: `populateSellers<T extends Record<string, any>>(docs: T[]): Promise<T[]>`, exported from `src/lib/listingsQuery.ts`. Returns new objects with `sellerName: string | null` and `sellerImage: string | null` on every input document. (The `Record<string, any>` constraint was verified to accept the `Listing` interface under `--strict`.)

- [ ] **Step 1: Start the harness**

Run the **Start** and **Cookie pre-flight** blocks from the shared harness above.

- [ ] **Step 2: Write the failing check**

Save it as a shell function so Steps 2 and 8 run the identical assertion. It asks for the owner's own listings, which are returned regardless of age or status:

```bash
check_sellers() {
  curl -s --max-time 20 "http://localhost:4655/api/listings?view=mine&limit=50" \
    -H "Cookie: authjs.session-token=$(cat ~/.local/share/claude-mahalle/session.cookie)" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const i=(JSON.parse(s).items)||[];const named=i.filter(x=>x.sellerName);console.log('items:',i.length,'| with sellerName:',named.length);console.log('sample:',JSON.stringify(i.slice(0,3).map(x=>({t:String(x.title).slice(0,20),n:x.sellerName??null,img:x.sellerImage?'yes':null}))));process.exit(i.length>0&&named.length===i.length?0:1)})"
}
check_sellers; echo "exit=$?"
```

- [ ] **Step 3: Run it to confirm it fails**

Expected now: a non-zero `items:` count, `with sellerName: 0`, every sample entry showing `"n":null`, and `exit=1`. That is the bug reproduced.

If `items: 0`, the cookie authenticated as a user who owns no listings — stop and report; do not proceed against an empty result.

- [ ] **Step 4: Add the join helper**

In `src/lib/listingsQuery.ts`, insert this immediately after `import type { Listing } from '../types/listing';` (currently line 12), before the `buildListingsFilter` doc comment:

```ts
/**
 * Seller fields exposed to clients. ALLOWLIST — never `{ password: 0 }`,
 * which would ship email / isBanned / pendingEmail / strike counts into
 * client-visible SSR props and JSON responses. Same narrowing rationale as
 * populateAuthors in topicsQuery.ts.
 */
const SELLER_PROJECTION = { name: 1, image: 1, userPicture: 1 } as const;

/**
 * Resolve seller name + avatar for a batch of listings with ONE $in query.
 *
 * Deliberately a read-time join, never a stored copy: accountDeletion.ts
 * step 6 tombstones a deleted user's `name` to "Ehemaliges Mitglied" and
 * relies on authored content picking that up on the next read. A
 * denormalized sellerName would freeze the pre-deletion name (and go stale
 * on every rename).
 *
 * sellerId is stored as a plain string today, but ObjectId-valued documents
 * are handled too so a future writer can't silently break the join.
 * Unresolvable sellers (hard-deleted user, malformed id) yield null, which
 * the cards render as "—".
 */
export async function populateSellers<T extends Record<string, any>>(
  docs: T[],
): Promise<T[]> {
  if (docs.length === 0) return docs;

  const keyOf = (raw: unknown): string | null => {
    if (!raw) return null;
    const s = typeof raw === 'string' ? raw : String(raw);
    return ObjectId.isValid(s) ? s : null;
  };

  const idSet = new Set<string>();
  for (const doc of docs) {
    const key = keyOf(doc.sellerId);
    if (key) idSet.add(key);
  }

  let byId = new Map<string, any>();
  if (idSet.size > 0) {
    const db = await connectDB();
    const users = await db
      .collection('users')
      .find(
        { _id: { $in: Array.from(idSet).map((id) => new ObjectId(id)) } },
        { projection: SELLER_PROJECTION },
      )
      .toArray();
    byId = new Map(users.map((u) => [u._id.toString(), u]));
  }

  return docs.map((doc) => {
    const key = keyOf(doc.sellerId);
    const u = key ? byId.get(key) : undefined;
    return {
      ...doc,
      sellerName: u?.name ?? null,
      sellerImage: u?.userPicture ?? u?.image ?? null,
    };
  });
}
```

- [ ] **Step 5: Call it from the list fetcher**

`fetchListingsForSSR` currently ends with exactly these three lines:

```ts
  }) as Listing[];

  return { items, total };
```

Replace them with:

```ts
  }) as Listing[];

  // Seller name/avatar are join-populated, never stored (see populateSellers).
  const withSellers = (await populateSellers(items)) as Listing[];

  return { items: withSellers, total };
```

- [ ] **Step 6: Call it from `fetchListingForSSR`**

This function currently ends with a bare `return { ... } as Listing;`. Turn that `return` into a `const listing =` assignment and join before returning. Change **only** the `return` keyword and the closing lines — leave every property in the object literal exactly as it is:

```ts
  const listing = {
    ...it,
    // ... all existing properties unchanged ...
    isPubliclyHidden: isPubliclyHiddenFrom(it.lastBumpedAt, it.createdAt),
  } as Listing;

  const [withSeller] = await populateSellers([listing]);
  return withSeller as Listing;
```

- [ ] **Step 7: Call it from `fetchListingDetailForSSR`**

Here the object is **already** assigned to `const listing`, followed by `return { kind: 'visible', listing };`. Replace only that return statement:

```ts
  const [withSeller] = await populateSellers([listing]);
  return { kind: 'visible', listing: withSeller as Listing };
```

- [ ] **Step 8: Widen the type**

In `src/types/listing.ts`, lines 85-87 currently read `sellerName?: string;` / `sellerEmail?: string;` / `sellerImage?: string;`. Change the first and third only — Task 2 removes `sellerEmail`:

```ts
  sellerName?: string | null;
  sellerEmail?: string;
  sellerImage?: string | null;
```

- [ ] **Step 9: Document the fields as join-populated**

In `src/lib/marketplaceQueryOptions.ts`, replace the bare entries at lines 24-25:

```ts
    'sellerId',
    // Join-populated by populateSellers() at read time, NOT stored on the
    // document. Kept in this list because it is part of the client contract.
    'sellerName',
    'sellerImage',
```

- [ ] **Step 10: Re-run the check to verify it passes**

The dev server hot-reloads. Re-run the identical assertion:

```bash
check_sellers; echo "exit=$?"
```

Expected: `with sellerName:` equal to `items:`, real names in the sample, `exit=0`.

- [ ] **Step 11: Verify the detail page renders the seller**

Derive an owned listing ID at runtime — no hardcoded ID, so this cannot break when fixtures age out. Request the detail page **with the cookie**, so owner scope guarantees the page renders regardless of the listing's age:

```bash
COOKIE="authjs.session-token=$(cat ~/.local/share/claude-mahalle/session.cookie)"
read -r ID NAME < <(curl -s --max-time 20 "http://localhost:4655/api/listings?view=mine&limit=1" -H "Cookie: $COOKIE" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const x=(JSON.parse(s).items||[])[0]||{};process.stdout.write((x._id||'')+' '+(x.sellerName||''))})")
echo "id=$ID expected-name=[$NAME]"
curl -s --max-time 20 "http://localhost:4655/marketplace/$ID" -H "Cookie: $COOKIE" | grep -c -F -- "$NAME"
```

Expected: a non-empty `expected-name`, and a grep count of **1 or more**. A count of `0` means Step 7's `fetchListingDetailForSSR` edit did not take effect.

- [ ] **Step 12: Confirm no seller PII entered the payload**

Run this against the **authenticated** response — an anonymous one may legitimately be empty and would pass vacuously:

```bash
curl -s --max-time 20 "http://localhost:4655/api/listings?view=mine&limit=50" \
  -H "Cookie: authjs.session-token=$(cat ~/.local/share/claude-mahalle/session.cookie)" \
  | grep -o "sellerEmail\|isBanned\|pendingEmail\|moderationStrikes\|passwordChangedAt\|emailVerified" | sort -u
```

Expected: **no output**. Any match is a Critical failure of the allowlist — fix before continuing.

- [ ] **Step 13: Tear down, type-check, build**

Run the **Teardown** block from the shared harness, then:

```bash
pnpm type-check 2>&1 | grep -icE "error ts"
```

Expected: `28` or fewer. A higher number is your regression.

```bash
pnpm build
```

Expected: completes without error.

- [ ] **Step 14: Commit**

```bash
git add src/lib/listingsQuery.ts src/types/listing.ts src/lib/marketplaceQueryOptions.ts
git commit -m "fix(marketplace): resolve seller name and avatar at read time"
```

---

### Task 2: Gate the public listing endpoint

**Files:**
- Rewrite: `src/pages/api/listings/[id].ts`
- Modify: `src/pages/api/listings/create.ts:115-128`
- Modify: `src/types/listing.ts:86`

**Interfaces:**
- Consumes: `fetchListingDetailForSSR(id: string, userId: string | null): Promise<{ kind: 'visible'; listing: Listing } | { kind: 'hidden_past_21d' } | { kind: 'not_found' }>` from `src/lib/listingsQuery.ts` — pre-existing, and after Task 1 it returns seller-joined listings.
- Produces: nothing consumed by later tasks.

**Why this is a defect, not a cleanup:** `GET /api/listings/<id>` takes no session and applies no visibility filter. It returns moderation-**rejected** content, **drafts**, sold items and past-21d listings to any anonymous caller, and attaches `sellerEmail` so enumerating IDs harvests seller addresses. Patching only the e-mail field would leave the content leak in place. Routing the endpoint through `fetchListingDetailForSSR` — the same helper `/marketplace/[id].astro` already trusts — fixes all four leaks at once, keeps the endpoint alive for any external caller, and drops `sellerEmail` for free because the helper never adds it.

- [ ] **Step 1: Start the harness**

Run the **Start** and **Cookie pre-flight** blocks from the shared harness.

- [ ] **Step 2: Write the failing check**

Three assertions against the live leaks. IDs are taken from the fixture table because these specific documents are the leak evidence; if one is missing the command says so rather than passing silently:

```bash
probe() { curl -s --max-time 20 -w '\nHTTP:%{http_code}\n' "http://localhost:4655/api/listings/$1"; }

echo "--- rejected listing (must become 404) ---"
probe 69b8268b909f15a484b4f222 | tail -3
echo "--- draft listing (must become 404) ---"
probe 6a34eaf127656bef515f1ffa | tail -3
echo "--- email leak (must become empty) ---"
probe 69b8268b909f15a484b4f222 | grep -o "sellerEmail" | sort -u
```

- [ ] **Step 3: Run it to confirm it fails**

Expected now: both probes return `HTTP:200` with a full listing body — a rejected item and a draft, served to an unauthenticated caller — and the third prints `sellerEmail`.

- [ ] **Step 4: Rewrite the endpoint**

Replace the **entire contents** of `src/pages/api/listings/[id].ts` with:

```ts
import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import { fetchListingDetailForSSR } from '../../../lib/listingsQuery';
import { isValidObjectId } from '../../../schemas/validation.utils';

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id || !isValidObjectId(id)) {
      return new Response(JSON.stringify({ error: 'Invalid listing ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = await getSession(request);
    const userId = (session?.user as any)?.id ?? null;

    // Canonical visibility helper — the same one /marketplace/[id].astro uses.
    // Replaces a raw findOne that returned ANY document to ANY caller:
    // rejected content, drafts, sold items and past-21d listings were all
    // publicly readable, and the response carried the seller's e-mail.
    // Owners still reach their own drafts/sold/stale listings (owner scope
    // lives inside the helper). Both non-visible kinds collapse to 404 so the
    // endpoint doesn't disclose which listings merely exist.
    const result = await fetchListingDetailForSSR(id, userId);

    if (result.kind !== 'visible') {
      return new Response(JSON.stringify({ error: 'Listing not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ listing: result.listing }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching listing:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch listing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

The `connectDB`, `ObjectId` and `Listing` imports are gone on purpose — nothing in the new body uses them.

- [ ] **Step 5: Delete the dead seller echo from create**

In `src/pages/api/listings/create.ts`, the block starting at the `// Fetch seller info` comment through the end of the `createdListing` object (currently lines 115-128) does a `users.findOne` solely to decorate a response nobody reads. Replace that whole block with:

```ts
    // No seller lookup: the only caller (MarketComposeInner) reads just
    // `moderationStatus` off this response and redirects. Every read path
    // joins seller identity live via populateSellers (src/lib/listingsQuery.ts).
    const createdListing = {
      ...newListing,
      _id: result.insertedId
    };
```

That deletion removes the file's **only** two uses of `ObjectId` and `usersCollection` (verified: `ObjectId` appears at line 4 as an import and at line 118 inside the deleted block; nowhere else). So also delete the now-dead import on line 4:

```ts
import { ObjectId } from 'mongodb';
```

Leave every other import alone.

- [ ] **Step 6: Remove the field from the type**

In `src/types/listing.ts`, delete line 86 (`sellerEmail?: string;`) entirely, leaving:

```ts
  sellerName?: string | null;
  sellerImage?: string | null;
```

- [ ] **Step 7: Re-run the check to verify it passes**

```bash
probe() { curl -s --max-time 20 -w '\nHTTP:%{http_code}\n' "http://localhost:4655/api/listings/$1"; }
probe 69b8268b909f15a484b4f222 | tail -2
probe 6a34eaf127656bef515f1ffa | tail -2
probe 69b8268b909f15a484b4f222 | grep -c "sellerEmail"
```

Expected: both probes `HTTP:404` with `{"error":"Listing not found"}`, and a grep count of `0`.

- [ ] **Step 8: Verify owners did not lose access**

Regression guard for the new gate — the owner must still reach their own draft. The draft ID is derived at runtime:

```bash
COOKIE="authjs.session-token=$(cat ~/.local/share/claude-mahalle/session.cookie)"
DRAFT=$(curl -s --max-time 20 http://localhost:4655/api/listings/my-listings -H "Cookie: $COOKIE" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const d=(JSON.parse(s).drafts||[])[0];process.stdout.write(d&&d._id?String(d._id):'')})")
echo "draft=$DRAFT"
if [ -n "$DRAFT" ]; then
  echo "owner:"; curl -s --max-time 20 -o /dev/null -w '%{http_code}\n' "http://localhost:4655/api/listings/$DRAFT" -H "Cookie: $COOKIE"
  echo "anon:";  curl -s --max-time 20 -o /dev/null -w '%{http_code}\n' "http://localhost:4655/api/listings/$DRAFT"
else
  echo "SKIPPED: session user owns no drafts — note this in the task report"
fi
```

Expected: `owner: 200` and `anon: 404`. An `owner: 404` means the gate is too tight — that is a Critical regression, fix it before continuing.

- [ ] **Step 9: Confirm a publicly visible listing still returns 200**

Derived at runtime so it cannot break when the 18-day fixtures age past the freshness clock:

```bash
PUB=$(curl -s --max-time 20 "http://localhost:4655/api/listings?limit=1" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const x=(JSON.parse(s).items||[])[0];process.stdout.write(x&&x._id?String(x._id):'')})")
if [ -n "$PUB" ]; then
  curl -s --max-time 20 -w '\nHTTP:%{http_code}\n' "http://localhost:4655/api/listings/$PUB" | tail -2
else
  echo "SKIPPED: no anonymously-visible listings (fixtures aged past 21d) — note this in the task report"
fi
```

Expected: `HTTP:200`, and a `sellerName` present in the body. If it skips, say so in the report rather than treating it as a pass.

- [ ] **Step 10: Confirm the field is gone repo-wide**

Creating a listing writes to the shared production database, so **do not** exercise `POST /api/listings/create`. Verify statically:

```bash
grep -rn "sellerEmail" src/ scripts/
```

Expected: **no output**.

- [ ] **Step 11: Tear down, type-check, build**

Run the **Teardown** block, then:

```bash
pnpm type-check 2>&1 | grep -icE "error ts"
pnpm build
```

Expected: `28` or fewer, and a clean build.

- [ ] **Step 12: Commit**

```bash
git add "src/pages/api/listings/[id].ts" src/pages/api/listings/create.ts src/types/listing.ts
git commit -m "fix(marketplace): gate the public listing endpoint behind visibility rules"
```

---

## Final verification (after both tasks)

Kiosk rule: `.svelte` behavior changes need a browser gate. No `.svelte` file is modified here, but the data feeding four Svelte components changes, so confirm the rendered result rather than trusting JSON.

- [ ] Start the harness (Start + Cookie pre-flight).
- [ ] Load `http://localhost:4655/marketplace` **in the browser with the session cookie** — the lead listing and every grid card show a real seller name and avatar instead of `—` and `?`. If the anonymous feed is empty because the fixtures aged out, use `?view=mine`.
- [ ] Open a listing detail page — the Anbieter card shows the seller's name, and the name links to `/nachbarn/id/<sellerId>`.
- [ ] `curl -s "http://localhost:4655/api/listings?view=mine&limit=50" -H "Cookie: authjs.session-token=$(cat ~/.local/share/claude-mahalle/session.cookie)" | grep -c sellerEmail` → `0`.
- [ ] Tear down and confirm 4655 is free.
- [ ] `git log --oneline -2` shows exactly the two commits above; `git status` is clean apart from this plan file.
