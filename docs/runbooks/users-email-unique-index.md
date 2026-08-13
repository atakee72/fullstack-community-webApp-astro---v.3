# `users_email_unique` — runbook

Created 2026-08-13. Closes the check-then-act race that allowed two accounts to
share an e-mail address (register, e-mail-change start/confirm, and
register-vs-confirm across flows). Before this, `users` carried only `_id_` and
`users_handle_unique`, so nothing at the database level enforced it.

## The index

```js
db.users.createIndex(
  { email: 1 },
  { unique: true,
    partialFilterExpression: { email: { $type: 'string' } },
    collation: { locale: 'en', strength: 2 },
    name: 'users_email_unique' }
)
```

Created idempotently by `scripts/create-auth-indexes.ts` (`pnpm tsx scripts/create-auth-indexes.ts`),
which prints the resulting `users` index list as evidence.

### Why each option is there — do not "simplify" these

- **`partialFilterExpression: { email: { $type: 'string' } }`** is load-bearing.
  `src/lib/auth/accountDeletion.ts` tombstones a deleted user with
  `$unset: { email: '' }`. A plain unique index treats every missing field as
  the same `null` key, so the **second** account deletion would fail — and fail
  *silently*, since that step swallows its error into `steps.tombstone = -1`.
  Same reason `users_handle_unique` is partial.
  Do **not** change this to `$exists: true`: that would index a literal `null`
  and reopen the collision.
- **`collation: { locale: 'en', strength: 2 }`** matches all five app-side
  lookups (`auth.config.ts` login, `register.ts`, `email-change/start.ts`,
  `emailChange.ts`, `forgot-password.ts`). Without it the index would be weaker
  than the checks it backs and would miss legacy mixed-case rows.
- **The collation is a one-way door.** MongoDB ≥ 7.3 refuses two partial indexes
  with the same keys and filter differing only by collation, so it cannot be
  changed online — only dropped and recreated, leaving a window with no
  uniqueness enforcement. Server is 8.0.29, so this applies.

### What the index does NOT do

It is **not** used by any current query. A partial index only becomes
plan-eligible when the query itself restates the filter, and none of the five
lookups do. Verified: equality on `handle` against the analogous
`users_handle_unique` still plans a `COLLSCAN` with zero candidate plans. This
index exists for the write-side guarantee only — do not expect a read speedup,
and do not add `{ $type: 'string' }` conjuncts to the lookups chasing one
without a measured reason.

## Pre-flight (re-run before recreating on any database)

```js
db.version()                                        // ≥ 4.2 for keyPattern on dup-key errors
db.users.getIndexes()
db.users.countDocuments({ email: '' })              // must be 0 — '' would squat a slot
db.users.countDocuments({ email: null })
db.users.aggregate(                                  // collation-accurate dupes, NOT $toLower:
  [ { $match: { email: { $type: 'string' } } },      // ICU strength 2 treats ß ≡ ss, so a
    { $group: { _id: '$email', n: { $sum: 1 } } },   // toLowerCase() check proves nothing
    { $match: { n: { $gt: 1 } } } ],
  { collation: { locale: 'en', strength: 2 } })
```

Measured 2026-08-13 on `CommunityWebApp-test`: server 8.0.29, 12 users, 0
collation-accurate duplicates, 0 empty/null/non-string emails. No dedupe
migration was needed.

## Application code that depends on it

- `src/pages/api/auth/register.ts` — the insert retry loop discriminates code
  11000 on `e.keyPattern`: `handle` → retry with a new suffix, `email` → 409,
  **anything else → rethrow** (fail closed). Adding a third unique index to
  `users` means revisiting this branch. Never read `e.keyValue`: for a collated
  index the server returns the raw ICU sort key, which is not valid UTF-8
  (SERVER-50454).
- `src/lib/auth/emailChange.ts` — returns `email_taken` on 11000 **before** the
  token rollback, because the documented contract for that status is that the
  claim stays burnt. Moving the check after the rollback would leave the link
  live and re-hitting the same violation forever.
- `auth.config.ts` — carries a note that `@auth/mongodb-adapter`'s `createUser`
  inserts the provider e-mail verbatim and `getUserByEmail` queries without
  collation. Unreachable today (Credentials-only + JWT sessions); adding any
  OAuth provider requires wrapping both first.

## Verification (as run 2026-08-13)

Duplicate inserts fail and persist nothing, so these probes are effectively
read-only — confirm the document count is unchanged afterwards.

| Probe | Result |
|---|---|
| insert duplicate email, exact | `11000`, `keyPattern={"email":1}` |
| insert duplicate email, MIXED CASE | `11000` — collation enforced |
| insert duplicate handle | `11000`, `keyPattern={"handle":1}` |
| insert doc with **no** email field | **succeeds** — partial filter excludes it, so the tombstone cannot collide |
| `POST /api/auth/register` whitespace / malformed email | `400 Invalid email address` |
| same, existing address (exact and mixed case) | `409 User with this email already exists` |

Re-running `create-auth-indexes.ts` must be a clean no-op. A spec conflict
prints `IndexOptionsConflict (85)` / `IndexKeySpecsConflict (86)` and the run
continues rather than skipping every later index.

## Rollback

```js
db.users.dropIndex('users_email_unique')
```

Instant. The application code stays correct and inert without it — the
`keyPattern` branch simply never fires, and behaviour reverts to the
pre-existing findOne + 409.

## Database layout (since 2026-08-14)

Prod and dev were split on 2026-08-14: production is `mahalle`, local dev and
Vercel Preview use `mahalle-dev` (same Atlas cluster). Both carry this index —
`mahalle` inherited it via the migration restore, `mahalle-dev` via
`create-auth-indexes.ts`. The pre-split database `CommunityWebApp-test` is kept
as a frozen snapshot; nothing writes to it. If a third database is ever
created, run `create-auth-indexes.ts` against it before any registration
traffic.
