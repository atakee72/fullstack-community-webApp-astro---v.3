# Hardening Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the six known account-deletion-pipeline gaps (plus two adjacent cascade bugs found during exploration), punycode IDN email domains in the mailer, fix the dev-seed script's schema drift, and add a budget-gated svelte-check + tsc CI workflow.

**Architecture:** All fixes are surgical edits to existing files following each file's established patterns (the deletion pipeline's `fail()`/`steps` envelope, the seed script's interlock, the stats workflow's pnpm setup block). One new pure module (`src/lib/email/idn.ts`), one new verification script (`scripts/verify-deletion-pipeline.ts`), one new workflow (`.github/workflows/checks.yml`).

**Tech Stack:** Astro 5 API routes, MongoDB driver (no Mongoose), tsx scripts, GitHub Actions, pnpm.

**Spec:** none — scope fixed by memory `project_open_followups.md` ("hardening batch") + three exploration reports whose verified facts are embedded inline below. Work happens directly on `main` in the main checkout (the SEO session is isolated in its own worktree).

## Global Constraints

- Commit messages: simple and concise (e.g. `fix: prune likedBy in deletion pipeline`). NO "🤖 Generated with Claude Code" signature, NO "Co-Authored-By: Claude" footer.
- Never stage secrets. Never print the dev seed password into chat/logs — Task 6 reseeds with the EXISTING password read from the scratchpad `devpw.txt` via command substitution, with seed output redirected to a file and the password line grep-filtered out.
- Database writes go to `mahalle-dev` only (the local `.env` `MONGODB_URI` already points there). Production db `mahalle` must never be written; reads are not needed by this plan.
- The dev server on port 3000 belongs to the user: curl/fetch against it is fine, never start or kill it.
- `pnpm type-check` baseline is 27 errors. No task may raise it; touched files must introduce zero new errors.
- There is NO test framework in this repo (verified: no vitest/jest, no `test` script). Verification is via tsx scripts, `pnpm type-check`, and the CI budgets themselves.
- Every new deletion-pipeline step follows the existing pattern: own `try/catch`, `fail('<name>', err)` on error, count recorded in `steps.<name>`. Do not touch the `Sentry.flush(2000)` tail or the `fail()` helper.
- All content-doc user references (`likedBy`, `author`, `sellerId`, `rsvps.*`, `savedBy`, rateLimit `baseKey`) are **userId strings**; only `users._id` and token-collection `userId` fields are ObjectIds.

---

### Task 1: Comment-cascade fixes (two one-line endpoint bugs)

**Files:**
- Modify: `src/pages/api/comments/delete/[commentId].ts:67`
- Modify: `src/pages/api/topics/delete/[id].ts:67`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing other tasks rely on.

Background (verified): comments live in the `comments` collection with parent link `relevantPostId`, **stored as an ObjectId** (`comments/create.ts:55`: `relevantPostId: new ObjectId(topicId)`; `src/pages/api/events/delete/[id].ts:67` already cascades via it). Parent docs (`topics`, `announcements`, `recommendations`, **and `events`** — see `comments/create.ts:70-72,97-106`) hold comment ObjectIds in a `comments` array.

- [ ] **Step 1: Add `'events'` to the comment-delete parent sweep**

In `src/pages/api/comments/delete/[commentId].ts` change line 67:

```ts
// Before:
const collections = ['topics', 'announcements', 'recommendations'];
// After (events also embed comment ids — comments/create.ts pushes into all four):
const collections = ['topics', 'announcements', 'recommendations', 'events'];
```

- [ ] **Step 2: Fix the no-op comment cascade in topic delete**

In `src/pages/api/topics/delete/[id].ts` change line 67. The `Comment` type has no `topic` field — the filter matches nothing and every comment on a deleted topic is orphaned:

```ts
// Before (silent no-op — comments have no `topic` field):
await commentsCollection.deleteMany({ topic: new ObjectId(id) });
// After (same field events/delete/[id].ts:67 uses):
await commentsCollection.deleteMany({ relevantPostId: new ObjectId(id) });
```

- [ ] **Step 3: Type-check**

Run: `pnpm type-check 2>&1 | tail -3`
Expected: exactly the pre-existing 27 errors, none in the two touched files.

- [ ] **Step 4: Commit**

```bash
git add src/pages/api/comments/delete/[commentId].ts src/pages/api/topics/delete/[id].ts
git commit -m "fix: comment cascades — events parent sweep + topic-delete relevantPostId"
```

---

### Task 2: kiezKontextCache invalidation on topic delete/edit

**Files:**
- Modify: `src/lib/kiez/kontext.ts` (add exported invalidator)
- Modify: `src/pages/api/topics/delete/[id].ts` (call after successful delete)
- Modify: `src/pages/api/topics/edit/[id].ts` (path verified to exist; call after its successful update write)

**Interfaces:**
- Consumes: nothing from other tasks (Task 1 touches `topics/delete/[id].ts` too — this task runs after it; re-read the file before editing).
- Produces: `invalidateKiezKontext(): Promise<void>` exported from `src/lib/kiez/kontext.ts`.

Background (verified): `kiezKontextCache` is a single doc `{ key: 'kiez-kontext-v1', computedAt, payload }` with a 24h in-code TTL (`kontext.ts:9-10,25-28`) whose payload freezes `{ id, title, href: '/topics/<id>' }` chips. Nothing invalidates it — a deleted topic leaves chips linking to a 404 for up to 24h; an edited title stays stale.

- [ ] **Step 1: Add the invalidator to `src/lib/kiez/kontext.ts`**

Append after `getKiezKontext` (uses the module-private `CACHE_KEY` — do not export the constant):

```ts
/**
 * Drop the cached chip payload. Call after any topic delete/edit that could
 * invalidate a frozen chip title/link — next read recomputes. Best-effort by
 * contract: callers MUST NOT fail their request on invalidation errors (a
 * stale chip for up to 24h beats failing a delete).
 */
export async function invalidateKiezKontext(): Promise<void> {
  try {
    const db = await connectDB();
    await db.collection('kiezKontextCache').deleteOne({ key: CACHE_KEY });
  } catch {
    // swallowed — see contract above
  }
}
```

- [ ] **Step 2: Call it from topic delete**

In `src/pages/api/topics/delete/[id].ts`, after the comment cascade (post-Task-1 state), before the success response:

```ts
import { invalidateKiezKontext } from '../../../../lib/kiez/kontext';
// ...after: await commentsCollection.deleteMany({ relevantPostId: new ObjectId(id) });
// Kiez-Daten Anwohner-Kontext chips freeze topic titles/links for 24h —
// drop the cache so a deleted topic never serves a 404 chip.
await invalidateKiezKontext();
```

- [ ] **Step 3: Call it from topic edit**

Same import + call in the topic edit endpoint, after its successful update write (only needed on paths that can change `title`; if the endpoint updates title/body unconditionally, call it unconditionally).

- [ ] **Step 4: Type-check**

Run: `pnpm type-check 2>&1 | tail -3` — expected: unchanged 27.

- [ ] **Step 5: Commit**

```bash
git add src/lib/kiez/kontext.ts "src/pages/api/topics/delete/[id].ts" src/pages/api/topics/edit/
git commit -m "fix: invalidate kiezKontextCache on topic delete/edit"
```

---

### Task 3: Deletion-pipeline gaps (likedBy, listingContacts, email rateLimits, tours tombstone)

**Files:**
- Modify: `src/lib/auth/accountDeletion.ts` (claim projection + 3 new/extended steps + tombstone `$unset`)
- Modify: `src/pages/api/listings/delete/[id].ts` (manual-delete contact cascade)
- Modify: `CLAUDE.md` (correct the `listingContacts` collection description — it currently claims hash-only metadata; the truth is plaintext `buyerName`/`buyerEmail`)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: new `steps` keys `likedByPulled`, `listingContactsBySeller`, `listingContactsByBuyer`; extended `rateLimits` semantics. Task 4's verification script asserts on these behaviors (not on the step names).

Background (all verified in `accountDeletion.ts:157-378`): the claim at `:183-187` projects only `{ userPicture: 1 }`; email-keyed rateLimit buckets (`login:<email>`, `banflag:<email>`, `fp:email:<email>` — emails stored normalized lowercase) survive; `listingContacts` rows (plaintext `buyerName`+`buyerEmail`+`listingId`+`sellerId`, insert at `contact.ts:229-236`) are deleted nowhere; `likedBy` (userId strings, with a lockstep `likes` counter `$inc`'d by `likes/toggle.ts:58-60` and `events/[id]/like.ts:50-52`) is never pruned; the tombstone `$unset` at `:333-348` misses `tours`, `tourHelloDismissedAt`, `deletionClaimedAt`.

- [ ] **Step 1: Capture the email at claim time**

Change the projection at `accountDeletion.ts:186` and add the capture after the `userPicture` capture at `:192-193`:

```ts
{ returnDocument: 'after', projection: { userPicture: 1, email: 1 } }
```

```ts
// Email captured at claim time — needed by the email-keyed rateLimits and
// buyer-side listingContacts sweeps below, and gone after step 6's $unset.
// Stored normalized (register.ts lowercases); trim().toLowerCase() is belt.
const claimedEmail: string | null =
  typeof (claimed as any).email === 'string'
    ? (claimed as any).email.trim().toLowerCase()
    : null;
```

- [ ] **Step 2: Seller-side listingContacts sweep (inside existing Step 1 block)**

After the `listingAuditTrail` delete (`:208-211`), still inside the same `try`:

```ts
    // Contact-relay rows carry buyer PII (plaintext name+email). Seller side:
    // rows for this user's listings (by listingId) or keyed to them directly
    // (sellerId — covers rows whose listing was already manually deleted).
    const delContactsSeller = await db.collection('listingContacts').deleteMany({
      $or: [{ listingId: { $in: listingIds } }, { sellerId: userId }],
    });
    steps.listingContactsBySeller = delContactsSeller.deletedCount ?? 0;
```

- [ ] **Step 3: likedBy prune (new step after the rsvps block, i.e. after `:273`)**

```ts
  // Pull this user's likes from all four likeable collections. The
  // denormalized `likes` counter is $inc'd in lockstep by the like
  // endpoints — a bare $pull here would drift it, so decrement together.
  try {
    let pulled = 0;
    const likePullOp: Record<string, any> = {
      $pull: { likedBy: userId },
      $inc: { likes: -1 },
    };
    for (const coll of ['topics', 'announcements', 'recommendations', 'events']) {
      const res = await db.collection(coll).updateMany({ likedBy: userId }, likePullOp);
      pulled += res.modifiedCount ?? 0;
    }
    steps.likedByPulled = pulled;
  } catch (err) {
    fail('likedBy', err);
  }
```

- [ ] **Step 4: Extend the rateLimits sweep to email-keyed families**

Replace the body of the existing rateLimits `try` (`:302-311`):

```ts
  try {
    // Safety assumption: userId is a 24-char hex ObjectId string (no regex
    // metacharacters) — safe to use unescaped as a $regex operand here.
    // Email-keyed families use EXACT $in match, never $regex — an email
    // legally contains regex metacharacters ('.', '+').
    const rateLimitFilters: Record<string, any>[] = [{ baseKey: { $regex: userId } }];
    if (claimedEmail) {
      rateLimitFilters.push({
        baseKey: {
          $in: [
            `login:${claimedEmail}`,
            `banflag:${claimedEmail}`,
            `fp:email:${claimedEmail}`,
          ],
        },
      });
    }
    const delRateLimits = await db
      .collection('rateLimits')
      .deleteMany({ $or: rateLimitFilters });
    steps.rateLimits = delRateLimits.deletedCount ?? 0;
  } catch (err) {
    fail('rateLimits', err);
  }
```

- [ ] **Step 5: Buyer-side listingContacts sweep (new step, place right after the rateLimits block)**

```ts
  // Buyer side of the contact relay: rows where THIS user wrote to some
  // seller are keyed only by their plaintext email.
  try {
    if (claimedEmail) {
      const delContactsBuyer = await db
        .collection('listingContacts')
        .deleteMany({ buyerEmail: claimedEmail });
      steps.listingContactsByBuyer = delContactsBuyer.deletedCount ?? 0;
    } else {
      steps.listingContactsByBuyer = 0;
    }
  } catch (err) {
    fail('listingContactsByBuyer', err);
  }
```

- [ ] **Step 6: Extend the tombstone `$unset`**

Add three fields to the `$unset` object at `:333-348` (after `deletionScheduledAt: ''`):

```ts
          tours: '',
          tourHelloDismissedAt: '',
          deletionClaimedAt: '',
```

(`$unset: { tours: '' }` drops the whole subdocument. `deletionClaimedAt` is set by the claim and otherwise only cleared on the cancel path — every tombstoned user currently keeps that breadcrumb.)

- [ ] **Step 7: Manual listing delete cascades its contact rows**

In `src/pages/api/listings/delete/[id].ts`, after the listing `deleteOne` (around `:57`):

```ts
    // Contact-relay rows for this listing hold buyer PII (plaintext
    // name+email) — cascade them with the listing. listingAuditTrail is
    // deliberately KEPT here (seller's own snapshots, no third-party PII;
    // the account-deletion pipeline removes it wholesale later).
    await db.collection('listingContacts').deleteMany({ listingId: id });
```

(Match the surrounding error-handling style of that endpoint; the delete is inside its existing try/catch.)

- [ ] **Step 8: Correct CLAUDE.md's `listingContacts` line**

In the root `CLAUDE.md` Database Collections section, replace the `listingContacts` bullet's description `(metadata-only per GDPR A6: { listingId, senderEmailHash, timestamp } — no message bodies stored)` with the truth:

```
- `listingContacts` - Contact-relay metadata for buyer→seller emails (`{ listingId, sellerId, buyerName, buyerEmail (plaintext, lowercased), senderIpHash, sentAt }` — no message bodies stored). Deleted with the listing (manual delete cascade) and by the account-deletion pipeline (seller side via listingId/sellerId, buyer side via captured email).
```

- [ ] **Step 9: Type-check**

Run: `pnpm type-check 2>&1 | tail -3` — expected: unchanged 27.

- [ ] **Step 10: Commit**

```bash
git add src/lib/auth/accountDeletion.ts "src/pages/api/listings/delete/[id].ts" CLAUDE.md
git commit -m "fix: deletion pipeline — likedBy prune, listingContacts sweeps, email rateLimits, tours tombstone"
```

---

### Task 4: Deletion-pipeline integration verification script

**Files:**
- Create: `scripts/verify-deletion-pipeline.ts`

**Interfaces:**
- Consumes: the Task-3 behaviors (asserts DB after-state, not internal step names).
- Produces: a rerunnable dev-only verification harness (kept in the repo — same status as `seed-dev-db.ts`).

Design: the script must NOT import from `src/` (modules there read `import.meta.env`, which is Vite-only — tsx scripts use `process.env` + `dotenv/config`, same as `seed-dev-db.ts`). Instead it drives the real pipeline over HTTP through the local dev server's cron endpoint (`GET /api/cron/process-deletions`, Bearer `CRON_SECRET` from `.env`), which runs against `mahalle-dev`. Three modes: `--seed` plants a doomed user + artifacts; `--assert` checks the after-state; `--cleanup` removes every marked doc (same block the `--seed` preamble runs).

**PREREQUISITE:** the user's dev server must be running on port 3000 (`curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` → non-000). If unreachable, STOP and escalate to the orchestrator — never start a dev server yourself.

- [ ] **Step 1: Write `scripts/verify-deletion-pipeline.ts`**

```ts
/**
 * Integration check for the account-deletion pipeline. DEV ONLY.
 *
 *   pnpm tsx scripts/verify-deletion-pipeline.ts --seed
 *   curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/process-deletions
 *   pnpm tsx scripts/verify-deletion-pipeline.ts --assert
 *
 * SAFETY INTERLOCK: refuses any DB whose name lacks "dev" (same rule as
 * seed-dev-db.ts). Deliberately imports nothing from src/ — those modules
 * read import.meta.env (Vite-only); the pipeline itself runs inside the
 * dev server via the cron endpoint, exercising the real code path.
 */
import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';

const DOOMED_EMAIL = 'doomed@mahalle-dev.test';
const MARK = 'verify-deletion-pipeline';

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI required'); process.exit(1); }
  const dbName = new URL(uri).pathname.slice(1);
  if (!/dev/i.test(dbName)) {
    console.error(`Refusing "${dbName}" — db name must contain "dev".`);
    process.exit(1);
  }
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const mode = process.argv[2];

  if (mode === '--seed') {
    // Clean any previous run first.
    const prev = await db.collection('users').findOne({ email: DOOMED_EMAIL });
    const prevId = prev ? String(prev._id) : null;
    await db.collection('users').deleteMany({ email: DOOMED_EMAIL });
    await db.collection('users').deleteMany({ name: 'Ehemaliges Mitglied', anonymized: true, [`meta_${MARK}`]: true } as any);
    for (const c of ['topics', 'events', 'listings', 'listingContacts', 'rateLimits']) {
      await db.collection(c).deleteMany({ [MARK]: true } as any);
    }
    if (prevId) {
      for (const c of ['topics', 'announcements', 'recommendations', 'events']) {
        await db.collection(c).updateMany({ likedBy: prevId }, { $pull: { likedBy: prevId } } as any);
      }
    }

    const uid = new ObjectId();
    const userId = String(uid);
    await db.collection('users').insertOne({
      _id: uid, name: 'Doomed Testuser', handle: 'doomed_test', email: DOOMED_EMAIL,
      password: 'x', emailVerified: true,
      tours: { forum: new Date() }, tourHelloDismissedAt: new Date(),
      deletionScheduledAt: new Date(Date.now() - 1000),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      [`meta_${MARK}`]: true,
    } as any);

    // Artifact 1: a topic the doomed user LIKED (someone else's).
    await db.collection('topics').insertOne({
      title: 'Verify-Pipeline-Topic', body: 'x', author: 'someoneelse', tags: [],
      comments: [], views: 0, likes: 1, likedBy: [userId],
      moderationStatus: 'approved', createdAt: new Date(), updatedAt: new Date(),
      [MARK]: true,
    } as any);
    // Artifact 2: a listing they SELL + a contact row on it.
    const listing = await db.collection('listings').insertOne({
      title: 'Verify-Pipeline-Listing', description: 'x', category: 'household',
      condition: 'good', price: 1, images: [], sellerId: userId, status: 'available',
      views: 0, savedBy: [], delivery: 'pickup', listingKind: 'sell',
      moderationStatus: 'approved', createdAt: new Date(), updatedAt: new Date(),
      lastBumpedAt: new Date(), [MARK]: true,
    } as any);
    await db.collection('listingContacts').insertOne({
      listingId: String(listing.insertedId), sellerId: userId,
      buyerName: 'Käufer', buyerEmail: 'buyer@mahalle-dev.test',
      senderIpHash: 'x', sentAt: new Date(), [MARK]: true,
    } as any);
    // Artifact 3: a contact row where the doomed user was the BUYER.
    await db.collection('listingContacts').insertOne({
      listingId: 'someotherlisting', sellerId: 'someoneelse',
      buyerName: 'Doomed', buyerEmail: DOOMED_EMAIL,
      senderIpHash: 'x', sentAt: new Date(), [MARK]: true,
    } as any);
    // Artifact 4: email-keyed + userId-keyed rateLimit buckets.
    const exp = new Date(Date.now() + 3600_000);
    await db.collection('rateLimits').insertMany([
      { key: `login:${DOOMED_EMAIL}#w`, baseKey: `login:${DOOMED_EMAIL}`, count: 1, expiresAt: exp, [MARK]: true },
      { key: `fp:email:${DOOMED_EMAIL}#w`, baseKey: `fp:email:${DOOMED_EMAIL}`, count: 1, expiresAt: exp, [MARK]: true },
      { key: `pwch:${userId}#w`, baseKey: `pwch:${userId}`, count: 1, expiresAt: exp, [MARK]: true },
    ] as any[]);

    console.log(`Seeded doomed user ${userId} (${DOOMED_EMAIL}). Now run the cron endpoint, then --assert.`);
  } else if (mode === '--assert') {
    const failures: string[] = [];
    const user = await db.collection('users').findOne({ [`meta_${MARK}`]: true } as any);
    if (!user) failures.push('doomed user doc not found at all');
    else {
      if (user.anonymized !== true) failures.push('user not anonymized');
      if (user.email) failures.push('email survived tombstone');
      if (user.tours) failures.push('tours survived tombstone');
      if (user.tourHelloDismissedAt) failures.push('tourHelloDismissedAt survived tombstone');
      if (user.deletionClaimedAt) failures.push('deletionClaimedAt survived tombstone');
    }
    const userId = user ? String(user._id) : '___none___';
    const topic = await db.collection('topics').findOne({ [MARK]: true } as any);
    if (!topic) failures.push('liked topic missing (should be KEPT)');
    else {
      if ((topic.likedBy ?? []).includes(userId)) failures.push('likedBy not pruned');
      if (topic.likes !== 0) failures.push(`likes counter not decremented (is ${topic.likes})`);
    }
    if (await db.collection('listings').findOne({ [MARK]: true } as any))
      failures.push('seller listing survived');
    const contacts = await db.collection('listingContacts').countDocuments({ [MARK]: true } as any);
    if (contacts !== 0) failures.push(`${contacts} listingContacts rows survived (seller+buyer sweeps)`);
    const rl = await db.collection('rateLimits').countDocuments({ [MARK]: true } as any);
    if (rl !== 0) failures.push(`${rl} rateLimit buckets survived (email + userId families)`);

    if (failures.length) {
      console.error('FAIL:\n  - ' + failures.join('\n  - '));
      process.exit(1);
    }
    console.log('PASS: all deletion-pipeline assertions hold.');
  } else {
    console.error('Usage: --seed | --assert');
    process.exit(1);
  }
  await client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Run the three-phase check against the dev server**

```bash
pnpm tsx scripts/verify-deletion-pipeline.ts --seed
source .env 2>/dev/null || true  # or read CRON_SECRET from .env explicitly
curl -s -H "Authorization: Bearer $(grep '^CRON_SECRET=' .env | cut -d= -f2- | tr -d '"')" http://localhost:3000/api/cron/process-deletions
pnpm tsx scripts/verify-deletion-pipeline.ts --assert
```

Expected: curl returns JSON with a processed user; assert prints `PASS`. If the curl returns 503/401, the dev server or `CRON_SECRET` needs checking — do not proceed on a failed curl. Note the dev server hot-reloads `src/` changes, so Task 3 must be saved (it is committed by now) before curling.

- [ ] **Step 3: Clean up the doomed tombstone**

Add a third mode `--cleanup` to the script (exact same delete block the `--seed` preamble runs: users by `meta_` mark + email, marked docs in topics/events/listings/listingContacts/rateLimits, and the likedBy pull), then run it:

```bash
pnpm tsx scripts/verify-deletion-pipeline.ts --cleanup
```

Expected: exits 0; `mahalle-dev` holds no `verify-deletion-pipeline`-marked docs afterwards.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-deletion-pipeline.ts
git commit -m "chore: add dev-only deletion-pipeline verification script"
```

---

### Task 5: IDN punycode in the mailer

**Files:**
- Create: `src/lib/email/idn.ts` (dependency-pure)
- Modify: `src/lib/email/mailer.ts:86-106`

**Interfaces:**
- Consumes: nothing.
- Produces: `punycodeEmailDomain(address: string): string` from `src/lib/email/idn.ts`.

Background (verified): register admits IDN addresses (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/u` at `register.ts:62`), Resend rejects non-ASCII recipients (`validation_error: Invalid to field` — real Sentry event MAHALLE-PROD-7). `sendMail` is the single choke point for both transports; `replyTo` is also an address (listing contact relay passes user-supplied emails at `contact.ts:217,:257`).

- [ ] **Step 1: Write the pure helper `src/lib/email/idn.ts`**

```ts
// Dependency-pure (no imports) — safe for any import graph.
//
// Normalize an email's DOMAIN to punycode: register.ts's structural regex
// deliberately admits IDN addresses (ali@müller.de), but Resend rejects
// non-ASCII recipients outright ("Invalid to field") and SMTP relays vary.
// Local parts are left untouched (SMTPUTF8 locals are out of scope; the
// fail-soft return means such an address still attempts delivery as-is).
export function punycodeEmailDomain(address: string): string {
  const at = address.lastIndexOf('@');
  if (at < 0) return address;
  const domain = address.slice(at + 1);
  if (/^[\x00-\x7F]*$/.test(domain)) return address; // already ASCII — no-op
  try {
    // WHATWG URL applies IDNA to hostnames: müller.de → xn--mller-kva.de
    const ascii = new URL(`http://${domain}`).hostname;
    return ascii ? `${address.slice(0, at)}@${ascii}` : address;
  } catch {
    return address; // fail-soft: let the transport produce the real error
  }
}
```

- [ ] **Step 2: Verify the helper standalone**

```bash
pnpm tsx -e "
import { punycodeEmailDomain as p } from './src/lib/email/idn.ts';
const eq = (a, b) => { if (a !== b) { console.error('FAIL', a, '!==', b); process.exit(1); } };
eq(p('ali@müller.de'), 'ali@xn--mller-kva.de');
eq(p('ümit@example.com'), 'ümit@example.com');   // ASCII domain: untouched
eq(p('plain@mahalle.digital'), 'plain@mahalle.digital');
eq(p('no-at-sign'), 'no-at-sign');
eq(p('x@bücher.de'), 'x@xn--bcher-kva.de');
console.log('PASS');"
```

Expected: `PASS`. (If `tsx -e` balks at ESM import syntax, write the same assertions to a temp file under the job tmp dir and run `pnpm tsx <file>` — do not skip the check.)

- [ ] **Step 3: Wire into `sendMail`**

At the top of the `try` block in `mailer.ts` (`:86`, BEFORE the `if (smtpConfigured)` branch — inside the try so a pathological throw still hits the Sentry capture+flush envelope):

```ts
import { punycodeEmailDomain } from './idn';
// ...
export async function sendMail(input: MailInput): Promise<void> {
  try {
    // IDN addresses (admitted by register's structural regex) must reach the
    // transports with an ASCII domain — Resend hard-rejects ümläüts.
    const to = punycodeEmailDomain(input.to);
    const replyTo = input.replyTo ? punycodeEmailDomain(input.replyTo) : undefined;
```

Then swap `to: input.to` → `to` (lines 90 and 102) and both `...(input.replyTo ? { replyTo: input.replyTo } : {})` spreads → `...(replyTo ? { replyTo } : {})` (lines 93 and 105).

- [ ] **Step 4: Type-check**

Run: `pnpm type-check 2>&1 | tail -3` — expected: unchanged 27.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/idn.ts src/lib/email/mailer.ts
git commit -m "fix: punycode IDN email domains in mailer (both transports)"
```

Note for the reviewer: `src/pages/api/profile/email-change/start.ts` remains zod-strict (ASCII-only) — the register/email-change asymmetry stays; documented follow-up, deliberately out of scope here.

---

### Task 6: Seed-script schema fixes

**Files:**
- Modify: `scripts/seed-dev-db.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a reseeded `mahalle-dev` whose docs match production shapes.

Background (all verified): real registration (`register.ts:123-134`, the only `users` insert in the codebase) never sets `_id` → users get **ObjectId** `_id`s, and ~20 lookups do `{ _id: new ObjectId(id) }` (banGuard, tour, profile, author-badge joins…) that silently miss seeded string-`_id` users. The seed header's "hex24 STRING (legacy from the Mongoose era)" claim is wrong. Also wrong: event categories `'Nachbarschaft'`/`'Markt'` (valid enum: `kiez | oeffentlich | markt | kultur | sport | sonstiges`, lowercase), `rsvps: {}` (real shape `{ going: [], maybe: [] }` — `events/create.ts:97`), recommendation `category: 'Essen & Trinken'` (valid enum: `restaurant | shop | service | event | place | activity | other`), users missing `image`/`roleBadge`/`hobbies` and using `Date` timestamps where registration writes ISO strings.

- [ ] **Step 1: Apply the fixes**

In `scripts/seed-dev-db.ts`:

1. Replace the `uid` helper + id block (lines 48-50):

```ts
  // users._id is a REAL ObjectId (registration never sets _id; ~20 lookups
  // do `new ObjectId(id)` and silently miss string _ids — banGuard, tour,
  // profile, author-badge joins). author/sellerId on content docs stay the
  // stringified form, matching what the session provides at write time.
  const [adminId, ayseId, jonasId] = [new ObjectId(), new ObjectId(), new ObjectId()];
  const [admin, ayse, jonas] = [adminId, ayseId, jonasId].map(String);
```

2. Users array — ObjectId `_id`s, registration-parity fields, ISO-string timestamps:

```ts
  const users = [
    { _id: adminId, name: 'Dev Admin', handle: 'dev_admin', email: 'admin@mahalle-dev.test', password: hash, role: 'admin', emailVerified: true, image: '', roleBadge: 'resident', hobbies: [], createdAt: daysAgo(90).toISOString(), updatedAt: now.toISOString() },
    { _id: ayseId, name: 'Ayşe Test', handle: 'ayse_test', email: 'ayse@mahalle-dev.test', password: hash, emailVerified: true, image: '', roleBadge: 'resident', hobbies: [], createdAt: daysAgo(60).toISOString(), updatedAt: now.toISOString() },
    { _id: jonasId, name: 'Jonas Test', handle: 'jonas_test', email: 'jonas@mahalle-dev.test', password: hash, emailVerified: false, image: '', roleBadge: 'resident', hobbies: [], createdAt: daysAgo(30).toISOString(), updatedAt: now.toISOString() },
  ];
```

3. Events — valid lowercase categories, real rsvps shape, visibility (mirror `events/create.ts`'s insert fields; check whether it also writes `isOfficial` and mirror if so):

```ts
  const events = [
    { ...post(ayse, 'Dev-Kiezfest', 'Testevent in der Zukunft.', ['fest']), startDate: daysAhead(7), endDate: daysAhead(7), location: 'Herrfurthplatz (Test)', category: 'kiez', capacity: null, allDay: false, rsvps: { going: [], maybe: [] }, visibility: 'public' },
    { ...post(jonas, 'Flohmarkt (Testdaten)', 'Noch ein Testevent.', ['markt']), startDate: daysAhead(14), endDate: daysAhead(14), location: 'Schillerpromenade (Test)', category: 'markt', capacity: null, allDay: true, rsvps: { going: [], maybe: [] }, visibility: 'public' },
    { ...post(admin, 'Vergangenes Event', 'Liegt in der Vergangenheit — testet die Vergangenheits-Ansicht.', ['test']), startDate: daysAgo(10), endDate: daysAgo(10), location: 'Kiezraum (Test)', category: 'sonstiges', capacity: null, allDay: false, rsvps: { going: [], maybe: [] }, visibility: 'public' },
  ];
```

4. Recommendation category: `'Essen & Trinken'` → `'restaurant'`.

5. Header comment (lines 11-13): delete the wrong "users._id is a hex24 STRING (legacy from the Mongoose era…)" sentence and state the ObjectId rule from the code comment in item 1.

6. The `console.log` admin marker (`'role' in u`) still works — leave it.

- [ ] **Step 2: Reseed `mahalle-dev` — KEEPING the current password, output away from chat**

The existing dev password lives in the session scratchpad as `devpw.txt` (find it: `ls ~/.claude/projects/-home-atakee-projects-fullstack-community-webApp-astro---v-3/*/scratchpad/devpw.txt` — if absent, ask the orchestrator rather than generating a new one, because browser-gate logins depend on it):

```bash
DEV_SEED_PASSWORD="$(cat <devpw.txt path>)" pnpm tsx scripts/seed-dev-db.ts > /tmp/seed-out.txt 2>&1; tail -8 /tmp/seed-out.txt | grep -v 'password'
```

Expected: per-collection seeded counts, no password echoed.

- [ ] **Step 3: Assert the seeded shapes**

```bash
pnpm tsx -e "
import 'dotenv/config'; import { MongoClient, ObjectId } from 'mongodb';
const c = new MongoClient(process.env.MONGODB_URI); await c.connect();
const db = c.db(new URL(process.env.MONGODB_URI).pathname.slice(1));
const users = await db.collection('users').find({ email: /mahalle-dev.test/ }).toArray();
if (users.length !== 3) throw new Error('expected 3 seeded users');
for (const u of users) if (!(u._id instanceof ObjectId)) throw new Error('string _id survived: ' + u.email);
const cats = await db.collection('events').distinct('category');
const valid = ['kiez','oeffentlich','markt','kultur','sport','sonstiges'];
for (const cat of cats) if (!valid.includes(cat)) throw new Error('invalid category: ' + cat);
const ev = await db.collection('events').findOne({});
if (!Array.isArray(ev.rsvps?.going)) throw new Error('rsvps shape wrong');
console.log('PASS'); await c.close();"
```

Expected: `PASS`.

- [ ] **Step 4: Browser-gate one seeded account**

Login as `ayse@mahalle-dev.test` (redirect-bounce via a gated URL, password from devpw.txt, `fill` output suppressed with `>/dev/null 2>&1`), open `/profile` — acceptance: the page loads its logged-in state and the browser console shows `/api/profile/me` answering 200 (that endpoint does an `_id: new ObjectId(...)` lookup that string ids used to 404 — the known "subline never observed rendering" symptom). Then `playwright-cli close`. Also note in the task report: reseeding regenerates all dev user `_id`s, so any ids recorded in older session notes are stale from here on.

- [ ] **Step 5: Commit**

```bash
git add scripts/seed-dev-db.ts
git commit -m "fix: seed script — ObjectId user _ids, valid categories, real rsvps shape"
```

---

### Task 7: CI checks workflow (svelte-check + tsc, budget-gated)

**Files:**
- Modify: `package.json` (add `svelte-check` devDependency + `check:svelte` script)
- Create: `.github/workflows/checks.yml`
- Modify: `CLAUDE.md` (Development Commands: note the CI budgets)

**Interfaces:**
- Consumes: nothing.
- Produces: a PR/push gate that fails when error counts EXCEED the recorded budgets (ratchet-only; budgets never rise).

Background (verified): no build/type/test CI exists (only gitleaks on PR). Local baselines: `tsc --noEmit` = **27 errors**; `svelte-check` = **99 errors / 8 warnings** (5 of the 99 are inside `node_modules/.pnpm/auth-astro…` via the tsconfig `"include": ["**/*"]` glob — absorbed by the budget, do NOT touch tsconfig in this task). `svelte-check` piped through anything takes the pipe's exit code — the workflow avoids pipes around it. `pnpm/action-setup@v4` reads the `packageManager` field (`pnpm@10.19.0`). `astro sync` may need env the CI lacks → run with `|| true`; if it succeeds it only lowers counts.

- [ ] **Step 1: Add the dependency + script**

```bash
pnpm add -D svelte-check@^4.3.4
```

(Any current 4.x is fine; pin whatever resolves.) In `package.json` scripts, after `"type-check"`:

```json
    "check:svelte": "svelte-check",
```

- [ ] **Step 2: Verify locally**

Run: `pnpm check:svelte 2>&1 | tail -2`
Expected: `svelte-check found 99 errors and 8 warnings in 58 files` (count may differ by ±few if `astro sync` state changed — record the ACTUAL number for Step 3's budget).

- [ ] **Step 3: Write `.github/workflows/checks.yml`**

Use the actual local counts from Step 2 / the known tsc 27 as budgets:

```yaml
name: checks

on:
  push:
    branches: [main]
  pull_request:

jobs:
  budgets:
    runs-on: ubuntu-latest
    env:
      # Ratchet-only error budgets: lower them as errors get fixed, never raise.
      # tsc baseline recorded 2026-08-30; svelte-check baseline same day
      # (includes 5 unfixable errors from auth-astro via tsconfig's include glob).
      TSC_ERROR_BUDGET: "27"
      SVELTE_CHECK_ERROR_BUDGET: "99"
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      # Generates astro:* module types; needs no secrets but tolerate failure —
      # without it a handful of TS2305/TS2307 errors appear, absorbed by budget.
      - run: pnpm astro sync || true
      - name: tsc budget
        run: |
          pnpm exec tsc --noEmit > tsc.log 2>&1 || true
          errors=$(grep -c 'error TS' tsc.log || true)
          echo "tsc errors: $errors (budget $TSC_ERROR_BUDGET)"
          if [ "$errors" -gt "$TSC_ERROR_BUDGET" ]; then
            grep 'error TS' tsc.log | tail -30
            exit 1
          fi
      - name: svelte-check budget
        run: |
          # No pipes around svelte-check (a pipe would mask its exit code);
          # we parse the machine-readable COMPLETED line instead.
          pnpm exec svelte-check --output machine > svelte-check.log 2>&1 || true
          line=$(grep ' COMPLETED ' svelte-check.log | tail -1)
          if [ -z "$line" ]; then
            echo "could not parse svelte-check output:"; tail -20 svelte-check.log; exit 1
          fi
          errors=$(echo "$line" | awk '{print $5}')
          echo "svelte-check errors: $errors (budget $SVELTE_CHECK_ERROR_BUDGET)"
          if [ "$errors" -gt "$SVELTE_CHECK_ERROR_BUDGET" ]; then
            grep ' ERROR ' svelte-check.log | tail -30
            exit 1
          fi
```

- [ ] **Step 4: Document in CLAUDE.md**

In the root `CLAUDE.md` Development Commands section, after the `npx -y svelte-check@4` line, add:

```
# CI (checks.yml) gates PRs on ratchet-only error budgets: tsc ≤27, svelte-check ≤99 (2026-08-30 baselines — lower them when errors get fixed, never raise them)
```

(Adjust 99 to the actual Step-2/Step-5 number.)

- [ ] **Step 5: Commit and verify on CI**

```bash
git add package.json pnpm-lock.yaml .github/workflows/checks.yml CLAUDE.md
git commit -m "ci: budget-gated tsc + svelte-check workflow"
```

After the orchestrator/user pushes: watch the run (`gh run list --workflow=checks -L 1`, then `gh run watch <id>` or poll). If a budget step fails because the CI count differs from local (astro sync succeeded/failed differently), set the budget env to the CI-observed number in a follow-up commit — budgets must start exactly at reality, then only ratchet down.

---

## Out of scope (declared, not forgotten)

- **`listingContacts` storage shape**: rows keep plaintext `buyerName`/`buyerEmail` by design of the current relay. Hashing/retention-TTL is a separate decision for the user (this batch adds deletion coverage + honest docs). Flag in the final report.
- **`email-change/start.ts` IDN alignment** (zod-strict, ASCII-only): documented follow-up, not touched.
- **tsconfig `include` glob** dragging `auth-astro` into svelte-check: absorbed by budget; cleaning it up would shift both baselines mid-batch.
- **kiezKontextCache read-path chip re-verification** (defensive filter): invalidation on delete/edit covers the real path; YAGNI.
- Deploy/push cadence: the user triggers commit-push per their workflow; the plan only commits locally per task.
