# listingContacts Hashing + Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop storing marketplace buyers' plaintext PII: hash `buyerEmail` (salted, matching the existing `senderIpHash` convention), drop `buyerName` from storage entirely, add a 90-day TTL, migrate existing rows, and re-point every consumer (rate limits, deletion pipeline, verify script, indexes, docs).

**Architecture:** One new pure helper (`hashContactEmail(email, salt)`) shared by the contact route and the deletion pipeline (each passes its own env-read salt) and replicated by construction in the tsx verify script (which cannot import `import.meta.env` modules). The migration + new indexes ride the existing idempotent `scripts/create-listing-indexes.ts`. The relay emails themselves are untouched — buyer name/email still flow through them transiently; only what lands in MongoDB changes.

**Tech Stack:** Astro API routes, MongoDB driver, node:crypto sha256, tsx scripts.

**Spec:** none — user decision "Option C" (hash + TTL) from the 2026-08-31 conversation; ground-truth facts embedded below (verified by direct reads of `contact.ts`, `create-listing-indexes.ts`, `accountDeletion.ts`).

## Global Constraints

- Commit messages: simple and concise; NO "🤖 Generated with Claude Code" signature, NO "Co-Authored-By" footer.
- `pnpm type-check` baseline is 27 errors; no task may raise it. CI budgets (tsc ≤27, svelte-check ≤94) must stay green.
- Hash construction (everywhere, byte-identical): `createHash('sha256').update(email + salt).digest('hex').slice(0, 32)` with salt = `CONTACT_IP_SALT` — the exact `hashIp` convention from `contact.ts:45-47`. Email is already normalized lowercase by the Zod schema (`contact.ts:38`) and by the deletion pipeline's claim capture; the helper must NOT re-normalize (single source of truth stays with the callers).
- Retention: TTL index on `sentAt`, `expireAfterSeconds: 7776000` (90 days — matches the notifications-collection convention; all rate-limit windows are ≤24h so the TTL can never break them).
- Database writes: `mahalle-dev` only during this plan. The PROD migration run is the USER's command (documented in the final task), never the assistant's.
- The dev server on port 3000: the controller manages it (permission granted this session); implementers never start/kill one.
- No test framework exists; verification = tsx assertions + the existing `scripts/verify-deletion-pipeline.ts` integration flow.
- Field name for the hash: `buyerEmailHash` (mirrors `senderIpHash`).

---

### Task 1: Pure hash helper + contact route conversion

**Files:**
- Create: `src/lib/listings/contactHash.ts`
- Modify: `src/pages/api/listings/[id]/contact.ts` (queries at :132-149, insert at :229-236)

**Interfaces:**
- Consumes: nothing.
- Produces: `hashContactEmail(email: string, salt: string): string` — pure, no imports, no env reads. Tasks 2 and 3 use it / replicate it.

- [ ] **Step 1: Write the helper**

```ts
// src/lib/listings/contactHash.ts
// PURE (no imports beyond node:crypto, no env reads) — the salt is the
// caller's problem: contact.ts and accountDeletion.ts each read
// CONTACT_IP_SALT via import.meta.env; scripts replicate via process.env.
// Construction is byte-identical to contact.ts's hashIp so one salt
// serves both families. Callers pass the ALREADY-normalized (lowercase,
// trimmed) email — this function must not re-normalize.
import { createHash } from 'crypto';

export function hashContactEmail(email: string, salt: string): string {
  return createHash('sha256').update(email + salt).digest('hex').slice(0, 32);
}
```

- [ ] **Step 2: Verify the helper standalone (tsx — pure module, so this works)**

```bash
pnpm tsx -e "
import { hashContactEmail } from './src/lib/listings/contactHash.ts';
import { createHash } from 'crypto';
const ref = createHash('sha256').update('a@b.de' + 'SALT').digest('hex').slice(0, 32);
if (hashContactEmail('a@b.de', 'SALT') !== ref) { console.error('FAIL construction'); process.exit(1); }
if (hashContactEmail('a@b.de', 'SALT').length !== 32) { console.error('FAIL length'); process.exit(1); }
if (hashContactEmail('a@b.de', 'SALT') === hashContactEmail('a@b.de', 'OTHER')) { console.error('FAIL salt sensitivity'); process.exit(1); }
console.log('PASS');"
```

Expected: `PASS`. (If `tsx -e` balks at ESM imports, write the same assertions to a temp file under the job tmp dir and run `pnpm tsx <file>` — do not skip.)

- [ ] **Step 3: Convert the contact route**

In `src/pages/api/listings/[id]/contact.ts`:

1. Add the import: `import { hashContactEmail } from '../../../../lib/listings/contactHash';`
2. After `const senderIpHash = hashIp(ip);` (line ~109) add:

```ts
  // Buyer identity is stored HASHED only (Option C, 2026-08-31): same
  // salt+construction as senderIpHash, shared with the deletion pipeline
  // via hashContactEmail. The plaintext email still flows transiently
  // through the relay emails (replyTo + confirmation) — never to Mongo.
  const buyerEmailHash = hashContactEmail(email, IP_SALT);
```

3. Rate-limit query #8 (line ~133): `buyerEmail: email,` → `buyerEmailHash,`
4. Rate-limit query #9 (line ~142): `buyerEmail: email,` → `buyerEmailHash,`
5. The insert (lines ~229-236): remove `buyerName: name,` and replace `buyerEmail: email,` with `buyerEmailHash,`. Update the comment above it from "Metadata-only record (no message body — GDPR A6)" to "Metadata-only record (no message body, hashed buyer identity — GDPR A6/Option C)".

Nothing else in the route changes — `name`/`email` keep flowing into the two email renders and `sendMail` calls (transient use, deliberate).

- [ ] **Step 4: Type-check**

Run: `pnpm type-check 2>&1 | tail -3` — expected: unchanged 27.

- [ ] **Step 5: Commit**

```bash
git add src/lib/listings/contactHash.ts "src/pages/api/listings/[id]/contact.ts"
git commit -m "feat: hash buyer email in listingContacts, drop buyerName"
```

---

### Task 2: Deletion-pipeline buyer sweep matches by hash

**Files:**
- Modify: `src/lib/auth/accountDeletion.ts` (the `listingContactsByBuyer` step, currently `deleteMany({ buyerEmail: claimedEmail })`)

**Interfaces:**
- Consumes: `hashContactEmail(email, salt)` from Task 1.
- Produces: nothing later tasks rely on (Task 3's verify script asserts the behavior).

- [ ] **Step 1: Convert the sweep**

In `src/lib/auth/accountDeletion.ts`:

1. Add imports near the top (alongside the existing imports):

```ts
import { hashContactEmail } from '../listings/contactHash';
```

2. Add the salt read next to the other module-level constants (mirror `contact.ts:18`'s pattern):

```ts
// Same salt contact.ts hashes with — needed to match buyerEmailHash rows.
const CONTACT_SALT = import.meta.env.CONTACT_IP_SALT || '';
```

3. In the `listingContactsByBuyer` step, replace the filter `{ buyerEmail: claimedEmail }` with:

```ts
        // Hash-first (rows written since Option C, 2026-08-31), plaintext
        // second (belt for any row the migration missed).
        { $or: [
          { buyerEmailHash: hashContactEmail(claimedEmail, CONTACT_SALT) },
          { buyerEmail: claimedEmail },
        ] }
```

Keep everything else about the step identical (its try/catch, `fail('listingContactsByBuyer', err)`, `steps` key, the `claimedEmail` null-guard).

- [ ] **Step 2: Type-check**

Run: `pnpm type-check 2>&1 | tail -3` — expected: unchanged 27.

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth/accountDeletion.ts
git commit -m "fix: deletion pipeline matches hashed buyer contact rows"
```

---

### Task 3: Indexes + migration + verify-script update

**Files:**
- Modify: `scripts/create-listing-indexes.ts` (replace buyerEmail indexes, add TTL, add row migration)
- Modify: `scripts/verify-deletion-pipeline.ts` (buyer-side artifact seeds/asserts the hash form)

**Interfaces:**
- Consumes: the hash construction (replicated inline — these tsx scripts cannot import modules that read `import.meta.env`, but `contactHash.ts` is pure so they CAN import it directly; do so).
- Produces: migrated `mahalle-dev` rows + new indexes; a verify script whose full flow Task 4 runs.

- [ ] **Step 1: Update `scripts/create-listing-indexes.ts`**

Replace the `listingContacts` block (lines 37-46) with:

```ts
  // listingContacts — rate-limit count queries (hashed buyer identity since
  // Option C, 2026-08-31) + 90d retention TTL.
  await db.collection('listingContacts').createIndex({ sentAt: -1 });
  // TTL rides its own ascending index (different key pattern than the -1
  // above, so both coexist). 90 days — all rate-limit windows are ≤24h.
  await db.collection('listingContacts').createIndex(
    { sentAt: 1 },
    { expireAfterSeconds: 7776000, name: 'listingContacts_sentAt_ttl' }
  );
  await db.collection('listingContacts').createIndex({ buyerEmailHash: 1, sentAt: -1 });
  await db.collection('listingContacts').createIndex({ senderIpHash: 1, sentAt: -1 });
  await db.collection('listingContacts').createIndex({ listingId: 1, sentAt: -1 });
  await db.collection('listingContacts').createIndex(
    { buyerEmailHash: 1, sellerId: 1, sentAt: -1 },
    { name: 'listingContacts_senderToOwner_daily_v2' }
  );
  // Old plaintext-keyed indexes: drop if present (idempotent — ignore absence).
  for (const old of ['buyerEmail_1_sentAt_-1', 'listingContacts_senderToOwner_daily']) {
    await db.collection('listingContacts').dropIndex(old).catch(() => {});
  }
  console.log('listingContacts indexes created');

  // One-time row migration (idempotent): plaintext → hash, name dropped.
  // REQUIRES the SAME CONTACT_IP_SALT the target deployment hashes with —
  // running against prod with a mismatched local salt writes hashes the
  // prod deletion sweep can never match. Fail closed if unset.
  const salt = process.env.CONTACT_IP_SALT;
  if (!salt) {
    console.error('CONTACT_IP_SALT is required (hash migration would be wrong without it).');
    process.exit(1);
  }
  const plaintextRows = await db
    .collection('listingContacts')
    .find({ buyerEmail: { $exists: true } })
    .toArray();
  for (const row of plaintextRows) {
    await db.collection('listingContacts').updateOne(
      { _id: row._id },
      {
        $set: { buyerEmailHash: hashContactEmail(String(row.buyerEmail).trim().toLowerCase(), salt) },
        $unset: { buyerEmail: '', buyerName: '' },
      }
    );
  }
  console.log(`listingContacts migrated: ${plaintextRows.length} plaintext row(s) hashed`);
```

Add the import at the top of the script: `import { hashContactEmail } from '../src/lib/listings/contactHash';` (works — the helper is dependency-pure).

**Also update the script's header comment** (it currently says it avoids `src/` imports because of `import.meta.env`): append one sentence — `The dependency-pure src/lib/listings/contactHash is the one deliberate exception (no env reads, no imports beyond node:crypto).` The same header-comment amendment applies to `scripts/verify-deletion-pipeline.ts` in Step 3 (its header claims "imports nothing from src/" — soften to name the pure-helper exception). Byte-identical hash construction across route/pipeline/scripts is the point of importing rather than replicating.

- [ ] **Step 2: Run against dev**

```bash
pnpm tsx scripts/create-listing-indexes.ts
```

Expected: index lines + `listingContacts migrated: N plaintext row(s) hashed` (N may be 0 on a fresh reseed), exit 0. Then assert no plaintext remains:

```bash
pnpm tsx -e "
import 'dotenv/config'; import { MongoClient } from 'mongodb';
const c = new MongoClient(process.env.MONGODB_URI); await c.connect();
const db = c.db(new URL(process.env.MONGODB_URI).pathname.slice(1));
const n = await db.collection('listingContacts').countDocuments({ \$or: [{ buyerEmail: { \$exists: true } }, { buyerName: { \$exists: true } }] });
const ttl = (await db.collection('listingContacts').indexes()).find(i => i.name === 'listingContacts_sentAt_ttl');
if (n !== 0) throw new Error(n + ' plaintext rows remain');
if (!ttl || ttl.expireAfterSeconds !== 7776000) throw new Error('TTL index wrong/missing');
console.log('PASS'); await c.close();"
```

Expected: `PASS`.

- [ ] **Step 3: Update `scripts/verify-deletion-pipeline.ts`**

1. Add the import: `import { hashContactEmail } from '../src/lib/listings/contactHash';`
2. In `--seed`, the buyer-side listingContacts artifact: replace `buyerName: 'Doomed', buyerEmail: DOOMED_EMAIL,` with `buyerEmailHash: hashContactEmail(DOOMED_EMAIL, process.env.CONTACT_IP_SALT || ''),` (and remove any other buyerName/buyerEmail fields on that artifact). The seller-side artifact likewise drops `buyerName`/`buyerEmail` in favor of one `buyerEmailHash: hashContactEmail('buyer@mahalle-dev.test', process.env.CONTACT_IP_SALT || '')`.
3. The `--assert` count check on marked listingContacts rows is field-agnostic (counts by mark) — leave it, but add one guard at the top of `--seed`: if `!process.env.CONTACT_IP_SALT`, print an error and exit 1 (a saltless seed would create rows the pipeline can't match, making the assert fail confusingly).

- [ ] **Step 4: Type-check**

Run: `pnpm type-check 2>&1 | tail -3` — expected: unchanged 27 (tsc covers `scripts/`).

- [ ] **Step 5: Commit**

```bash
git add scripts/create-listing-indexes.ts scripts/verify-deletion-pipeline.ts
git commit -m "chore: listingContacts hash migration, TTL index, verify-script update"
```

---

### Task 4: End-to-end verification (controller-run live phases)

**Files:** none (runs Tasks 1-3's results).

**Interfaces:**
- Consumes: everything above; the dev server on :3000 (controller-managed).

- [ ] **Step 1 (controller): ensure the dev server is up** (start it if down — session permission stands), confirm `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/` ≠ 000.

- [ ] **Step 2: Full pipeline integration flow**

```bash
pnpm tsx scripts/verify-deletion-pipeline.ts --seed
curl -s -H "Authorization: Bearer $(grep '^CRON_SECRET=' .env | cut -d= -f2- | tr -d '\"')" http://localhost:3000/api/cron/process-deletions
pnpm tsx scripts/verify-deletion-pipeline.ts --assert
pnpm tsx scripts/verify-deletion-pipeline.ts --cleanup
```

Expected: cron JSON shows `listingContactsByBuyer: 1` and `listingContactsBySeller: 1`; assert prints `PASS` (proves the hash-matched sweep works end-to-end against rows written in the new shape).

- [ ] **Step 3: Contact-route smoke on dev (writes the new row shape via the real route)**

The route needs no session (public + origin check disarmed in dev when ALLOWED_ORIGINS unset — verify: if dev `.env` sets ALLOWED_ORIGINS, pass `-H "Origin: <first allowed origin>"`). Pick a seeded approved listing id from dev, then:

```bash
lid=$(pnpm tsx -e "
import 'dotenv/config'; import { MongoClient } from 'mongodb';
const c = new MongoClient(process.env.MONGODB_URI); await c.connect();
const db = c.db(new URL(process.env.MONGODB_URI).pathname.slice(1));
const l = await db.collection('listings').findOne({ status: 'available', moderationStatus: 'approved' });
console.log(String(l._id)); await c.close();" | tail -1)
curl -s -X POST http://localhost:3000/api/listings/$lid/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Smoke Tester","email":"smoke@mahalle-dev.test","message":"Dies ist eine Test-Nachricht für den Kontakt-Relay-Smoke, bitte ignorieren."}'
```

Three possible outcomes — each with a defined action (dev has SMTP configured and BOTH recipients are fake `@mahalle-dev.test` addresses, so mailbox.org may reject at RCPT time and the route 500s before the insert):

- **200** → proceed to the shape assertion below (best case: real-route evidence).
- **500 with `[contact] error` showing a send/SMTP failure in the dev-server log** → the insert never ran (it sits after the owner-send by design). Do NOT retry with tricks; mark this step `SKIPPED (transport rejects fake recipient domains)` in the ledger — the new insert shape is still verified by Task 1's diff review plus the pipeline flow in Step 2, which exercises hash-matched deletion on rows of the new shape.
- **503 `email_unavailable`** → dev transport off; same SKIPPED treatment.

On 200, assert the stored shape:

```bash
pnpm tsx -e "
import 'dotenv/config'; import { MongoClient } from 'mongodb';
const c = new MongoClient(process.env.MONGODB_URI); await c.connect();
const db = c.db(new URL(process.env.MONGODB_URI).pathname.slice(1));
const r = await db.collection('listingContacts').findOne({}, { sort: { sentAt: -1 } });
if (!r) throw new Error('no row written');
if (r.buyerEmail || r.buyerName) throw new Error('plaintext PII stored!');
if (!/^[0-9a-f]{32}\$/.test(r.buyerEmailHash ?? '')) throw new Error('buyerEmailHash missing/malformed');
console.log('PASS'); await c.close();
// cleanup the smoke row
const c2 = new MongoClient(process.env.MONGODB_URI); await c2.connect();
await c2.db(new URL(process.env.MONGODB_URI).pathname.slice(1)).collection('listingContacts').deleteOne({ _id: r._id });
await c2.close();"
```

Expected: `PASS`.

- [ ] **Step 4: Ledger the results** (controller bookkeeping; no commit).

---

### Task 5: Documentation truth-pass

**Files:**
- Modify: root `CLAUDE.md` (the `listingContacts` bullet + the `CONTACT_IP_SALT` env line)
- Modify: `src/components/profile/kiosk/CLAUDE.md` (the hardening-batch paragraph's "(b)" clause)
- Modify: `src/components/marketplace/kiosk/CLAUDE.md` IF it describes the contact-relay storage (grep `buyerEmail\|listingContacts` there first; skip silently if no match)

**Interfaces:** none.

- [ ] **Step 1: Root CLAUDE.md**

Replace the `listingContacts` bullet's parenthetical with:

```
- `listingContacts` - Contact-relay metadata for buyer→seller emails (`{ listingId, sellerId, buyerEmailHash (sha256+CONTACT_IP_SALT, 32 hex), senderIpHash, sentAt }` — no message bodies, no plaintext buyer identity since Option C 2026-08-31; 90d TTL index). Deleted with the listing (manual delete cascade) and by the account-deletion pipeline (seller side via listingId/sellerId, buyer side via hash of the captured email).
```

And extend the `CONTACT_IP_SALT` env-var comment with: `Also salts buyerEmailHash in listingContacts — the migration in scripts/create-listing-indexes.ts must run with the TARGET deployment's salt.`

- [ ] **Step 2: profile/kiosk CLAUDE.md**

In the "Hardening batch additions (2026-08-30)" paragraph, replace the clause `(rows are plaintext buyer name+email, NOT hashed as older docs claimed)` with `(rows store buyerEmailHash since Option C 2026-08-31 — the sweep matches hash-first with a plaintext-fallback arm)`.

- [ ] **Step 3: Type-check + commit**

```bash
pnpm type-check 2>&1 | tail -3   # unchanged 27
git add CLAUDE.md src/components/profile/kiosk/CLAUDE.md src/components/marketplace/kiosk/CLAUDE.md 2>/dev/null; git add -u
git commit -m "docs: listingContacts hashed identity + 90d TTL"
```

---

## Post-merge handoff (user actions, documented not executed)

1. Push → deploy green (standard flow; CI budgets apply).
2. **PROD migration (user runs, via `!` with the prod URI):** **MANDATORY salt override — the default dotenv path is WRONG here:** local `.env`'s `CONTACT_IP_SALT` was freshly generated on 2026-08-31 (the var was previously absent locally) and is NOT prod's value. Always run with the prod value from Vercel prefixed: `CONTACT_IP_SALT="<prod value>" MONGODB_URI="<prod-uri>" pnpm tsx scripts/create-listing-indexes.ts`. A wrong-salt migration writes hashes prod's deletion sweep can never match — the fail-closed guard in the script only catches an ABSENT salt, not a mismatched one. Without the migration, prod rows stay plaintext (the sweep's `$or` fallback still covers them) and the TTL never starts.
3. TTL deletions begin working immediately for all rows once the index exists (Mongo TTL sweeps ~every 60s).

## Out of scope

- The relay emails (buyer name/email transient use) — deliberate, unchanged.
- rateLimits-collection families, notifications, or any other collection.
- Abuse-investigation tooling on top of hashes (lookup requires knowing the email to hash — that IS the design).
