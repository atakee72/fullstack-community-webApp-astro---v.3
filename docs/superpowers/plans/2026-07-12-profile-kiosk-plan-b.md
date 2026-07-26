# Profile Kiosk Redesign — Plan B (Public Profile + Chronik + Steckbrief + Konto Flows + Delete Account) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the profile pass: public neighbor profiles at `/nachbarn/[handle]` with entry links from every author byline, the derived Kiez-Chronik timeline, the printable Steckbrief (+ `motto`), the e-mail-change and password-change flows, and delete-account with a 7-day grace + anonymization cron.

**Architecture:** Public data flows through new handle-keyed resolvers (`getPublicProfile`, `fetchPublicActivityPage`) that apply approved/available/upcoming gates the own-profile feed deliberately lacks. Bylines everywhere link to a tiny id→handle redirect route so no content payload needs new fields. Konto flows are in-card panels backed by token libs cloned from the existing `emailVerify.ts`/`passwordReset.ts` patterns; other-device sign-out uses `passwordChangedAt` vs JWT `iat` with a 5-minute recheck cadence; deletion is a scheduled tombstone-anonymization run by a Vercel cron.

**Tech Stack:** Astro 5, Svelte 5 runes, MongoDB 6, Zod, Resend + react-email, `qrcode` (new dep, server-side SVG), kiosk design system, `src/lib/kiosk-i18n.ts`.

## Prerequisite

Plan A is fully shipped (commits `a65e70a7..0ed7a11d`): handles + partial unique index, `/api/profile/me|standing|activity|avatar`, rebuilt `/profile` (ProfileInner orchestrator, PIdentityCard with edit+avatar, PModerationCard/PKontoCard, PActivityLedger with `publicView` prop plumbed, atoms, ~82 `profile.*` i18n keys). Read `src/components/profile/kiosk/CLAUDE.md` before any task.

## Global Constraints

- **JSX is the design source of truth.** `design/handoffs/design_handoff_profile/jsx/*.jsx` defines layout + ALL copy. Tasks cite components (e.g. `PublicProfileDesktop` in `kiosk-profile-public.jsx`); implementers read that section and reproduce structure + copy verbatim.
- **German curly quotes** `„` (U+201E) / `“` (U+201C) in ALL German strings; ASCII `"` inside German copy is a defect.
- **DE + EN key parity** in `src/lib/kiosk-i18n.ts` (compile-enforced via `Dict`); every new key in BOTH dicts, EN verbatim from JSX.
- **Token mapping**: `kiosk.color.*` → `var(--k-*)`; fonts → `font-bricolage`/`font-instrument`/`font-dmmono`; `print(c)`/`printSm(c)` → `3px 3px 0 c` / `2px 2px 0 c`; borders 1.5px/2px ink; radii sm/md/lg/pill → 8/12/16/999px; dashed rules `1px dashed var(--k-rule)`.
- **Svelte 5 runes**; i18n via `$t`/`tStr`; seq-guarded fetches; **any variable an `$effect` reads as a guard MUST be `$state`** (Task 8 of Plan A shipped a dead retry from violating this — reviewers check this class explicitly).
- **Server/client boundary**: `.svelte` files never import `mongodb`/`connectDB`/server libs; pure shared code lives in `src/lib/profile/profileShared.ts` (keep it import-free).
- **`pnpm type-check` baseline is 29 errors.** Add none. (tsc does not check `.svelte` internals — browser-verify UI paths, and LIVE-exercise failure branches; code-trace alone let a Critical slip in Plan A.)
- **Shared prod DB** (`CommunityWebApp-test`): tmp users only as `tmp-*@example.invalid`, content titled `[TMP-E2E]`, manifest-driven cleanup + residual scan 0 after every task that writes. `emailVerifyTokens.userId` is stored as **ObjectId** (cleanup filter accordingly); same for new token collections.
- **Anti-enumeration posture**: mirrors Auth pass. E-mailed links built via `getTrustedBaseUrl()` (`src/lib/auth/baseUrl.ts` — NEXTAUTH_URL, prod fail-closed: if it returns `''` in prod, SKIP sending). Token endpoints return generic `invalid_or_expired`.
- **SECURITY ESCALATION RULE**: implementers/reviewers hitting a security decision not covered here report NEEDS_CONTEXT/BLOCKED — never improvise. Deletion/anonymization code paths are the highest-stakes in this plan: any ambiguity there is an automatic escalation.
- **Commits**: plain concise messages, no AI footers, never `--no-verify`.
- **Verification**: dev server :3000 (controller-managed), curl + `playwright-cli` (use `goto` after login — `open` drops cookies; route-blocking via `playwright-cli route "<glob>" --status 500` works for failure branches).

## Decisions locked (audited with the user — do not re-litigate)

1. **Route**: `/nachbarn/[handle]` canonical (German — it's the user-facing "neighbors" concept; design-mandated, unlike the English app-section routes). Entry links go to **`/nachbarn/id/[userId]`**, a resolver that looks up the handle (with `ensureHandle` self-heal) and 302s to the canonical URL — so NO content payload anywhere needs a new `handle` field.
2. **`dankeCrossedAt` stamp** (deviation from the handoff's "zero new schema fields", flagged + approved): like timestamps don't exist, so the „100. danke" milestone is undateable retroactively. The Chronik resolver stamps `users.dankeCrossedAt = new Date()` the FIRST time it observes total danke ≥ 100 and the field is absent. Before any stamp exists the milestone is omitted. Honest, self-populating, one auto field.
3. **Chronik 24h cache**: `chronikCache` collection `{ userId: ObjectId (unique), payload, computedAt, expiresAt }` with a TTL index — one read replaces ~9 queries; serverless-safe. Milestones barely change; 24h staleness accepted (design-specified).
4. **`motto` is edited in the edit-in-place card** (design leaves the edit location unspecified; the Steckbrief is a print preview, not a form). One optional field under the name input, ≤80 chars.
5. **Delete-account confirm types the HANDLE** (design placeholder is `emre_a` — the handle). Unambiguous + unique, unlike display names.
6. **Anonymization = tombstone user doc** (keeps `_id`, so `populateAuthors`/bylines keep working): `$set { name: 'Ehemaliges Mitglied', anonymized: true, deletedAt }` + `$unset { email, password, image, userPicture, hobbies, handle, verified, emailVerified, roleBadge, role, motto, pendingEmail, dankeCrossedAt, deletionScheduledAt }`. Removing `handle` frees it (partial index) and makes the public profile 404 → state §03; removing `email` frees registration. `strikeHistory`/`moderationStrikes`/`isBanned` STAY (Nachweispflicht — the design's consequences ledger). `likedBy` arrays keep the orphaned id (counts stay correct; the id no longer maps to a person).
7. **Other-device sign-out**: `users.passwordChangedAt` vs JWT `iat`, checked in the `jwt` callback at most every 5 minutes per token (`token.pwdCheckedAt`); mismatch → return `null` (kills the session). Current device survives via silent `signIn('credentials', { redirect: false })` with the new password right after the change (pattern verified in `AuthLoginInner.svelte:58-68`). Other devices lag ≤5 min — same accepted-lag class as the suspended banner.
8. **E-mail-taken neutral error** („Diese Adresse kann nicht verwendet werden.") is shown per design. It is a weak oracle, but only behind a correct current-password + rate limit (3/h/user), and registration already exposes a 409 oracle — consistent posture, accepted.
9. **PMobileTopBar is NOT built** — shipped pages use KioskNav (Plan A precedent); the JSX top bar is canvas chrome.
10. **`populateAuthors` projection is tightened** (security hardening bundled into Task 5): today it attaches the full user doc minus only `password` — **e-mails end up in forum SSR payloads/HTML**. New projection: `{ name: 1, image: 1, userPicture: 1, createdAt: 1, verified: 1 }`.
11. **Public activity gates**: forum approved-only (`moderationStatus` `'approved'` or absent), listings `status ∈ {available, reserved}` AND not publicly hidden (>21d freshness — reuse `isPubliclyHiddenFrom` semantics via the `$expr` in `buildListingsFilter`), events approved + `startDate >= now` (upcoming only), kurier approved-only. NO zusage rows, NO gespeichert. Public profiles of banned users stay visible (ban keeps read access; their content already follows content-level rules).
12. **Steckbrief QR**: new dependency `qrcode` (server-side `QRCode.toString(url, { type: 'svg' })` in `.astro` frontmatter — zero client JS, no external service).

## Design source map

| JSX (in `design/handoffs/design_handoff_profile/jsx/`) | Tasks |
|---|---|
| `kiosk-profile-novel.jsx` — Chronik full anatomy + ChronikMilestone, Steckbrief card + cut marks + rules | 2, 6 |
| `kiosk-profile.jsx` — PChronikStrip (compact strip, lines ~330-351), ProfileTitleBlock `own` branches, PIdentityCard `own={false}` gates | 2, 4 |
| `kiosk-profile-public.jsx` — PublicProfileDesktop/Mobile, contact-note cards, SEED_PUBLIC_ACTIVITY, „Im Kiez unterwegs" | 4 |
| `kiosk-profile-flows.jsx` — §03 e-mail change (3 stages), §04 password change, §05 delete modal (consequences ledger) | 8, 9, 10 |
| `kiosk-profile-states.jsx` — §03 not-found, §08 e-mail pending banner | 4, 8 |

## File structure (new/modified, final state)

```
src/lib/profile/
  chronik.ts                    # NEW server-only: getChronik(userId) + cache + dankeCrossedAt stamp
  publicProfile.ts              # NEW server-only: getPublicProfile(handle)
  activityFeed.ts               # + fetchPublicActivityPage(userId, filter, before, limit)
  profileShared.ts              # + ChronikData/PublicProfile/MOTTO_MAX_LEN types (stays import-free)
src/lib/auth/
  emailChange.ts                # NEW token lib (mirrors emailVerify.ts, + newEmail field)
  accountDeletion.ts            # NEW: schedule/cancel/undo-token + runDeletionPipeline(userId)
  sendEmailChangeEmails.ts      # NEW: verify-new + notice-old senders
  sendDeletionEmails.ts         # NEW: scheduled-notice (with undo link) sender
src/emails/
  EmailChangeVerify.tsx  EmailChangeNotice.tsx  AccountDeletionScheduled.tsx   # NEW react-email templates
src/pages/api/profile/
  public-activity.ts            # NEW public GET (handle-keyed)
  email-change/start.ts | confirm.ts | resend.ts | cancel.ts                   # NEW
  change-password.ts            # NEW
  delete-account/schedule.ts | cancel.ts                                       # NEW
src/pages/api/auth/cancel-deletion.ts     # NEW sessionless token undo
src/pages/api/cron/process-deletions.ts   # NEW cron
src/pages/
  nachbarn/[handle].astro  nachbarn/id/[userId].astro                          # NEW
  confirm-email-change.astro  widerrufen.astro  steckbrief.astro               # NEW
src/components/profile/kiosk/
  PChronikStrip.svelte  PPublicIdentityCard.svelte  PublicProfileInner.svelte  # NEW
  PEmailChangePanel.svelte  PPasswordChangePanel.svelte  PDeleteAccountModal.svelte  # NEW
  ProfileTitleBlock.svelte (+own prop)  PKontoCard.svelte (+ändern/Gefahrenzone)
  PIdentityCard.svelte (+motto edit, +Steckbrief button)  PActivityLedger.svelte (+publicHandle)
  states/PublicNotFound.astro   # NEW (ListingUnavailable pattern, DE-only static)
Modified elsewhere: auth.config.ts (jwt callback), src/schemas/auth.schema.ts (motto),
  src/lib/topicsQuery.ts (projection), ForumPostCard/ForumPostDetail/ForumComment.svelte,
  SellerCard.svelte, EventDetailModal.svelte, vercel.json, scripts/create-auth-indexes.ts,
  src/pages/api/users/update.ts (motto), src/pages/profile.astro (chronik SSR), ProfileInner.svelte
```

---

### Task 1: Chronik resolver (`src/lib/profile/chronik.ts` + cache + `dankeCrossedAt`)

**Files:**
- Create: `src/lib/profile/chronik.ts`
- Modify: `src/lib/profile/profileShared.ts` (types), `scripts/create-auth-indexes.ts` (cache TTL index)

**Interfaces:**
- Consumes: `connectDB`; collection facts: `users.createdAt` (ISO string OR Date), authored content per Plan A (`topics|announcements|recommendations|events.author` string, `listings.sellerId` string, `likes` numeric counters).
- Produces (append to `profileShared.ts`, import-free):

```typescript
export type ChronikStopKind = 'dabei' | 'erstesThema' | 'ersteAnzeige' | 'ersterTermin' | 'danke100' | 'heute';
export interface ChronikStop { kind: ChronikStopKind; date: string | null; /* ISO; null only for 'heute' */ active?: boolean; }
export interface ChronikData { stops: ChronikStop[]; } // ordered, max 5, 'heute' always last
```
- `getChronik(userId: string): Promise<ChronikData>` (server-only). Labels/sublabels are i18n keys on the client (`profile.chronik.stop.<kind>` / `.sub.<kind>`), NOT resolver output.

- [ ] **Step 1: Implement `getChronik`** in `src/lib/profile/chronik.ts`:

```typescript
// src/lib/profile/chronik.ts — SERVER-ONLY. Derived tenure timeline, cached 24h.
import { ObjectId } from 'mongodb';
import { connectDB } from '../mongodb';
import type { ChronikData, ChronikStop } from './profileShared';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const DANKE_THRESHOLD = 100;

async function oldest(db: any, coll: string, filter: Record<string, unknown>): Promise<Date | null> {
  const doc = await db.collection(coll).find(filter, { projection: { createdAt: 1 } })
    .sort({ createdAt: 1 }).limit(1).next();
  return doc?.createdAt ? new Date(doc.createdAt) : null;
}
async function newest(db: any, coll: string, filter: Record<string, unknown>): Promise<Date | null> {
  const doc = await db.collection(coll).find(filter, { projection: { createdAt: 1 } })
    .sort({ createdAt: -1 }).limit(1).next();
  return doc?.createdAt ? new Date(doc.createdAt) : null;
}

export async function getChronik(userId: string): Promise<ChronikData> {
  const db = await connectDB();
  const _id = new ObjectId(userId);

  const cached = await db.collection('chronikCache').findOne({ userId: _id });
  if (cached && Date.now() - new Date(cached.computedAt).getTime() < CACHE_TTL_MS) {
    return cached.payload as ChronikData;
  }

  const user = await db.collection('users').findOne(
    { _id }, { projection: { createdAt: 1, dankeCrossedAt: 1 } }
  );
  if (!user) return { stops: [] };

  // Milestone gate: exclude only REJECTED content ($ne — deliberately includes
  // pending, which is usually approved shortly after; a milestone is just a date).
  const approvedGate = { moderationStatus: { $ne: 'rejected' } };
  const [firstTopic, firstListing, firstEvent] = await Promise.all([
    oldest(db, 'topics', { author: userId, ...approvedGate }),
    oldest(db, 'listings', { sellerId: userId, status: { $ne: 'draft' }, ...approvedGate }),
    oldest(db, 'events', { author: userId, ...approvedGate }),
  ]);

  // danke total (same aggregation as getProfileMe) — stamp-on-first-observation (Decision 2)
  let dankeCrossedAt: Date | null = user.dankeCrossedAt ? new Date(user.dankeCrossedAt) : null;
  if (!dankeCrossedAt) {
    const sums = await Promise.all(
      ['topics', 'announcements', 'recommendations', 'events'].map((c) =>
        db.collection(c).aggregate([
          { $match: { author: userId } },
          { $group: { _id: null, total: { $sum: { $ifNull: ['$likes', 0] } } } },
        ]).toArray()
      )
    );
    const total = sums.reduce((s, r) => s + (r[0]?.total ?? 0), 0);
    if (total >= DANKE_THRESHOLD) {
      dankeCrossedAt = new Date();
      await db.collection('users').updateOne(
        { _id, dankeCrossedAt: { $exists: false } }, { $set: { dankeCrossedAt } }
      );
    }
  }

  const latest = await Promise.all([
    newest(db, 'topics', { author: userId }), newest(db, 'listings', { sellerId: userId }),
    newest(db, 'events', { author: userId }), newest(db, 'news', { submittedBy: userId }),
  ]);
  const lastActive = latest.filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null;
  const active = lastActive != null && Date.now() - lastActive.getTime() < ACTIVE_WINDOW_MS;

  const created = user.createdAt instanceof Date ? user.createdAt : new Date(String(user.createdAt));
  const middle: ChronikStop[] = [
    firstTopic && { kind: 'erstesThema' as const, date: firstTopic.toISOString() },
    firstListing && { kind: 'ersteAnzeige' as const, date: firstListing.toISOString() },
    firstEvent && { kind: 'ersterTermin' as const, date: firstEvent.toISOString() },
    dankeCrossedAt && { kind: 'danke100' as const, date: dankeCrossedAt.toISOString() },
  ].filter(Boolean) as ChronikStop[];
  middle.sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

  // max 5 stops total incl. dabei + heute → keep the 3 earliest middle stops
  const stops: ChronikStop[] = [
    { kind: 'dabei', date: Number.isNaN(created.getTime()) ? null : created.toISOString() },
    ...middle.slice(0, 3),
    { kind: 'heute', date: null, active },
  ];
  const payload: ChronikData = { stops };

  const now = new Date();
  await db.collection('chronikCache').updateOne(
    { userId: _id },
    { $set: { payload, computedAt: now, expiresAt: new Date(now.getTime() + CACHE_TTL_MS) } },
    { upsert: true }
  );
  return payload;
}
```

- [ ] **Step 2: Types** appended to `profileShared.ts` (as in Interfaces; zero imports — verify `grep -c "^import" src/lib/profile/profileShared.ts` is 0).
- [ ] **Step 3: Indexes** — extend `scripts/create-auth-indexes.ts` with `chronikCache`: `createIndex({ userId: 1 }, { unique: true, name: 'chronik_user' })` and `createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'chronik_ttl' })`. Run `pnpm tsx scripts/create-auth-indexes.ts` (idempotent; additive on the shared DB — allowed).
- [ ] **Step 4: Verify with a scratchpad tsx script** against a tmp user (`tmp-chronik@example.invalid` + one `[TMP-E2E]` topic via API): stops = dabei + erstesThema + heute; second call within 24h hits the cache (assert via a `computedAt` equality check); a user with 0 content → dabei + heute only; danke <100 → no danke100 stop and no `dankeCrossedAt` written. **Cleanup: tmp user, topic, flaggedContent, chronikCache row, emailVerifyTokens (ObjectId userId). Residual 0.**
- [ ] **Step 5: `pnpm type-check`** → 29. **Commit** — `feat(profile): kiez-chronik resolver with 24h cache and danke milestone stamp`

---

### Task 2: PChronikStrip UI (+ profPulse) on the own profile

**Files:**
- Create: `src/components/profile/kiosk/PChronikStrip.svelte`
- Modify: `src/styles/profile.css` (add `profPulse`), `src/lib/kiosk-i18n.ts` (chronik keys), `src/pages/profile.astro` (SSR chronik), `src/components/profile/kiosk/ProfileInner.svelte` (prop + mount)

**Interfaces:**
- Consumes: `ChronikData` (Task 1); design: `PChronikStrip` in `kiosk-profile.jsx` (~lines 330-351: ink border, radius-md, paperSoft bg, padding 14px 20px; mono label „KIEZ-CHRONIK"; stops = 10×10 dots with ink border, dashed `flex:1` connectors; `now` dot ochre + profPulse; year mono 9.5/600 + label mono 8.5 ink-mute) and the full-anatomy reference in `kiosk-profile-novel.jsx` (dot color rules: first stop wine, heute ochre, others ink).
- Produces: `PChronikStrip { chronik: ChronikData }` — Task 4 mounts the SAME component on the public profile.

- [ ] **Step 1: profile.css** — add the `profPulse` keyframe verbatim from `motion-profile.css` (2.4s ease-in-out infinite, opacity 1→0.55 + scale 1→0.82, class `.prof-chronik-now`) + reduced-motion override (dot stays solid ochre, `animation: none`).
- [ ] **Step 2: i18n keys** (both dicts, copy from novel-JSX/strip-JSX): `profile.chronik.label` (KIEZ-CHRONIK), `profile.chronik.stop.dabei|erstesThema|ersteAnzeige|ersterTermin|danke100|heute` (DE: dabei seit / erstes Thema / erste Anzeige / erster Termin / 100. danke / aktiv; EN: joined / first topic / first listing / first event / 100th danke / active). Year rendering: `MMM yyyy` short (e.g. `Nov 2019`) via `Intl.DateTimeFormat($locale === 'de' ? 'de-DE' : 'en-GB', { month: 'short', year: 'numeric' })`; `dabei` in the strip shows the year only; `heute` shows the literal label (DE `heute` / EN `today`) — add `profile.chronik.heute` for it.
- [ ] **Step 3: Component** per strip-JSX anatomy; `heute` stop dot: ochre bg + `.prof-chronik-now` only when `stop.active`; first (`dabei`) dot wine, middle stops ink.
- [ ] **Step 4: Wire own profile** — `profile.astro`: `const initialChronik = userId ? await getChronik(userId) : null;` (import from `../lib/profile/chronik`, frontmatter-only), pass to `ProfileInner`; ProfileInner accepts `initialChronik: ChronikData | null = null` and mounts the strip in the right column ABOVE PActivityLedger (mobile: directly after the identity card, before Archiv — per ProfileOwnMobile order; use the same order utilities as Task 10 of Plan A).
- [ ] **Step 5: Verify in browser** (tmp user with 1 topic): strip renders dabei + erstesThema + heute; heute dot pulses only if content was created in the last 7 days (it was — verify pulse class present); DE/EN labels flip; mobile 390 position correct; reduced-motion emulation (playwright can set it) → no animation. **Cleanup + residual 0.**
- [ ] **Step 6: `pnpm type-check`** → 29. **Commit** — `feat(profile): kiez-chronik strip on own profile`

---

### Task 3: Public backend (`getPublicProfile`, `fetchPublicActivityPage`, public API) + `populateAuthors` hardening

**Files:**
- Create: `src/lib/profile/publicProfile.ts`, `src/pages/api/profile/public-activity.ts`
- Modify: `src/lib/profile/activityFeed.ts`, `src/lib/profile/profileShared.ts` (PublicProfile type), `src/lib/topicsQuery.ts:92` (projection)

**Interfaces:**
- Consumes: `HANDLE_REGEX` (`src/lib/profile/handle.ts`); Plan A's per-surface query helpers in `activityFeed.ts`; `buildListingsFilter`'s freshness `$expr` (`src/lib/listingsQuery.ts:33-88`) as the reference for the 21-day public-visibility gate.
- Produces:

```typescript
// profileShared.ts additions (import-free)
export interface PublicProfile {
  id: string; name: string; handle: string;
  image: string | null;             // userPicture || image || null — the public avatar
  hobbies: string[]; verified: boolean; memberSince: number;
  stats: { posts: number; listings: number; events: number; danke: number };
}
```
- `getPublicProfile(handle: string): Promise<PublicProfile | null>` (server-only, `publicProfile.ts`) — case-exact handle lookup (handles are stored lowercase; lowercase the input); returns null for unknown handle OR anonymized tombstone (`anonymized: true`). NEVER returns email/isBanned/pendingEmail/strikes.
- `fetchPublicActivityPage(userId: string, filter: Exclude<ActivityFilter, 'gespeichert'>, before: Date | null, limit: number): Promise<ActivityPage>` in `activityFeed.ts` — public gates per Decision 11, NO zusage sub-query, NO gespeichert branch. Structure: add an options param to the existing per-surface helpers (`{ public?: boolean }`) that ANDs the public filters, rather than duplicating the query functions.
- `GET /api/profile/public-activity?handle=<h>&filter=alle|forum|markt|kalender|kurier&before=&limit=` — NO session (public read, like `/api/users/profiles`); 400 on bad handle format (HANDLE_REGEX) / bad filter / bad before; 404 `{ error: 'not_found' }` for unknown handle; 200 `ActivityPage`. `Cache-Control: no-store`. Public stats in `getPublicProfile` use the SAME public gates (posts = approved forum items; listings = available/reserved non-hidden; events = approved created (all-time count, not only upcoming — a count is not a listing); danke = same aggregation as `/me`).
- **Hardening (Decision 10):** `populateAuthors` projection at `src/lib/topicsQuery.ts:92` changes from `{ password: 0 }` to `{ name: 1, image: 1, userPicture: 1, createdAt: 1, verified: 1 }`. Forum components read only `name/image/createdAt` (verified per research: ForumPostCard:52, ForumPostDetail:123-128,562, ForumComment:33) — but grep every `.author?.` / `author.` access across `src/components/forum/` + `src/pages/topics|announcements|recommendations/**` and list each accessed field in the report; if anything reads a field outside the new projection, STOP → NEEDS_CONTEXT.

- [ ] **Step 1** implement `publicProfile.ts` + the `public` option in `activityFeed.ts` helpers + `fetchPublicActivityPage` + endpoint. Public gates verbatim: forum/kurier `moderationStatus: { $in: ['approved'] }` OR field-absent (use `$or: [{ moderationStatus: 'approved' }, { moderationStatus: { $exists: false } }]`); markt `status: { $in: ['available', 'reserved'] }` + NOT publicly hidden (copy the exact freshness `$expr` used by `buildListingsFilter` — cite the line in a comment); kalender `author` + approved-or-absent + `startDate: { $gte: new Date() }`.
- [ ] **Step 2** tighten the `populateAuthors` projection + run the field-access grep audit.
- [ ] **Step 3: Verify with curl + fixtures** (2 tmp users; B authors: 1 approved-able topic, 1 listing, 1 future event, 1 past event, plus 1 topic left pending): `GET /api/profile/public-activity?handle=<B>` shows ONLY the approved topic + listing + future event (no pending topic, no past event, no zusage/gespeichert even with `filter=gespeichert` → 400); unknown handle → 404; malformed handle → 400. Forum SSR check: `curl -s localhost:3000/topics/<id> | grep -c '@example.invalid'` → **0** (email no longer in HTML; before the fix it would appear). **Cleanup + residual 0.**
- [ ] **Step 4: `pnpm type-check`** → 29. **Commit** — `feat(profile): public profile + activity resolvers, harden author projection`

---

### Task 4: Public profile UI (`/nachbarn/[handle]` + id-redirect + not-found §03)

**Files:**
- Create: `src/pages/nachbarn/[handle].astro`, `src/pages/nachbarn/id/[userId].astro`, `src/components/profile/kiosk/PublicProfileInner.svelte`, `PPublicIdentityCard.svelte`, `states/PublicNotFound.astro`
- Modify: `ProfileTitleBlock.svelte` (`own` prop), `PActivityLedger.svelte` (`publicHandle` prop), `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: `getPublicProfile`, `getChronik` (chronik is public — no private data), `PChronikStrip`, `PActivityLedger`, atoms. Design: `PublicProfileDesktop`/`PublicProfileMobile` in `kiosk-profile-public.jsx` (grid 384px/1fr; left col: identity → chronik strip → contact-note dashed card; right: ledger `publicView`; mobile: compact identity (no stats, no buttons) → chronik → „Im Kiez unterwegs" ledger card → contact note) + `ProfileTitleBlock own={false}` (eyebrow `NACHBARSCHAFT · @handle · IM KIEZ SEIT {y}`, headline „Aus der *Nachbarschaft*") + states-JSX §03.
- Produces: `PPublicIdentityCard { profile: PublicProfile }` — slim read-only card: `PAvatar` with `editable={false}` and `image={profile.image}`; name, handle+seit line, verified pill, stats grid (desktop only — mobile public shows none per JSX), hobby chips; NO buttons. `PActivityLedger` gains `publicHandle: string | null = null` — when set, fetches `/api/profile/public-activity?handle=...` instead of `/api/profile/activity`, implies `publicView` behavior (hide Gespeichert), and the empty state shows the line WITHOUT the 3 own-authoring CTAs. `ProfileTitleBlock` gains `own: boolean = true` + keys `profile.eyebrow.public` / `profile.heading.public`.

- [ ] **Step 1: i18n keys** (both dicts, JSX-verbatim): `profile.eyebrow.public`, `profile.heading.public` (`Aus der <em>Nachbarschaft</em>`), `profile.public.contact` (desktop note: „Kontakt läuft über Inhalte: Anzeige anfragen oder im Forum antworten. E-Mail, Gespeichertes und Moderation bleiben privat."), `profile.public.contact.mobile` („Kontakt über Anzeige oder Forum — E-Mail bleibt privat."), `profile.public.ledger` („Im Kiez unterwegs" — the mobile ledger heading).
- [ ] **Step 2: `PublicNotFound.astro`** — static DE-only card per `ListingUnavailable.astro` precedent (paperWarm panel, dashed border, kicker `NACHBARSCHAFT · SCHILLERKIEZ` in ochre, title „Diese Nachbarin ist nicht (mehr) hier.", CTA „← zurück zum Forum" → `/`). Rendered at HTTP **200** inside KioskLayout (marketplace precedent).
- [ ] **Step 3: `[handle].astro`** — `Cache-Control: no-store`; strip one leading `@` (or `%40`) from the param first — the design writes `/nachbarn/@handle` and users will type it — then validate `HANDLE_REGEX` → not-found card on mismatch; `getPublicProfile(handle)` → null → `<PublicNotFound/>`; else `getChronik(profile.id)` and mount `<PublicProfileInner client:load profile={profile} chronik={chronik} />` in `KioskLayout page="profile" title={`@${handle} — Mahalle`}`. (Session NOT needed; if the visitor IS this user, still show the public view — simple, honest preview.)
- [ ] **Step 4: `id/[userId].astro`** — resolver: validate `ObjectId.isValid` → 302 `Astro.redirect('/nachbarn/@…')`... concretely: `ensureHandle(userId)` in try/catch (server lib, frontmatter-only) → `return Astro.redirect(`/nachbarn/${handle}`, 302)`; unknown user/anonymized → render `<PublicNotFound/>` directly. NOTE: `ensureHandle` throws for missing users; also guard: if the user doc is `anonymized: true`, not-found (do NOT mint a handle for a tombstone — check before calling; add a `getHandleForPublic(userId): Promise<string | null>` helper in `publicProfile.ts` that returns null for missing/anonymized and self-heals otherwise, and use THAT here instead of raw ensureHandle).
- [ ] **Step 5: `PublicProfileInner` + `PPublicIdentityCard` + ledger/titleblock props** per JSX (desktop grid + mobile stack; contact-note dashed cards with the two copy variants; ledger heading swaps to `profile.public.ledger` on mobile public per JSX — implement via a `headingKey` prop or the `publicHandle` implying it on <lg).
- [ ] **Step 6: Verify in browser**: fixture user B (approved content per Task 3 recipe) → `/nachbarn/<B-handle>` renders public card (no email anywhere in DOM — assert), chronik strip, public-only rows; `/nachbarn/id/<B-id>` 302s to the handle URL; unknown handle + tombstone-simulated user → friendly card, HTTP 200; logged-out visitor sees everything (public); mobile 390 stack per JSX; DE/EN toggle. **Cleanup + residual 0.**
- [ ] **Step 7: `pnpm type-check`** → 29. **Commit** — `feat(profile): public neighbor profile route, slim identity card, id redirect, not-found state`

---

### Task 5: Entry links — author bylines → `/nachbarn/id/[userId]`

**Files:**
- Modify: `src/components/forum/kiosk/ForumPostCard.svelte:224`, `ForumPostDetail.svelte:562-564`, `ForumComment.svelte:188-190`, `src/components/marketplace/kiosk/detail/SellerCard.svelte:68-74`, `src/components/calendar/kiosk/EventDetailModal.svelte:322-335`

**Interfaces:**
- Consumes: existing `authorIdOf()` helpers (ForumPostDetail:57-62, ForumComment:49-54), `SellerCard.sellerId` prop, EventDetailModal's `authorId` derive (:82-89). Task 4's redirect route.

- [ ] **Step 1**: wrap each byline name in `<a href={`/nachbarn/id/${id}`} class="hover:underline underline-offset-2">` ONLY when an id is available (author may be null/string-only — fall back to the current plain span). ForumPostCard: derive the id via the same `authorIdOf` logic (add the tiny helper locally if that component lacks it). Keep all existing classes/typography on the name; the anchor wraps, adds nothing visual beyond hover underline. EventDetailModal: link the BY-slab name when `authorId` is set and the event is NOT `isOfficial` (Mahalle-Team has no profile). SellerCard: wrap the seller-name div's text in the anchor using `sellerId`.
- [ ] **Step 2**: a11y — each anchor gets `aria-label={tStr(<key>, {name})}` with new key `profile.public.viewprofile` (DE `Profil von {name} ansehen`, EN `View {name}’s profile` — note the EN curly apostrophe U+2019) in both dicts.
- [ ] **Step 3: Verify in browser** (fixtures from Task 3/4 recipe): click author name on a forum card → lands on `/nachbarn/<handle>`; same from a topic detail byline, a comment byline, a listing's SellerCard, an event detail BY slab; an official event shows NO link. **Cleanup + residual 0.**
- [ ] **Step 4: `pnpm type-check`** → 29. **Commit** — `feat(profile): author bylines link to public neighbor profiles`

---

### Task 6: Motto + Steckbrief (print route + QR)

**Files:**
- Modify: `src/pages/api/users/update.ts` (motto), `src/lib/profile/profileShared.ts` (`MOTTO_MAX_LEN = 80`, `ProfileMe.motto`), `src/lib/profile/profileQuery.ts` (projection + field), `PIdentityCard.svelte` (motto input + Steckbrief button), `src/lib/kiosk-i18n.ts`
- Create: `src/pages/steckbrief.astro`
- Dependency: `pnpm add qrcode && pnpm add -D @types/qrcode`

**Interfaces:**
- Consumes: design `SteckbriefCard` + cut marks in `kiosk-profile-novel.jsx` (420×297px card = A6 landscape 148×105mm; bg `#f9f3e4`; ochre corner stamp 88px circle at top -22/right -22 opacity .85; kicker `MAHALLE · STECKBRIEF · SCHILLERKIEZ` mono 8.5 tracking .2em wine; 64px wine monogram (photo renders as monogram — riso-honest); name 22/800; handle+seit mono 9.5; motto serif italic 12.5 ink-soft (omitted when empty); hobby pills 1.5px ink border display 10.5/700; footer: `mahalle.berlin/nachbarn/{handle}` + „gedruckt {MMM yyyy} · 2-farb-riso" mono 8.5 + QR 44×44).
- Produces: `users.motto?: string` (≤80, optional); `POST /api/users/update` accepts `motto` (empty string clears via `$unset`); `ProfileMe.motto: string | null`.

- [ ] **Step 1: Schema + endpoint** — update.ts zod: `motto: z.string().trim().max(MOTTO_MAX_LEN).optional()`; run the motto through `checkNameProfanity` too when non-empty (it's printed + public); `$set` when non-empty, `$unset` when explicitly `''`. Echo it in the response. `getProfileMe` projects + returns `motto ?? null`.
- [ ] **Step 2: Edit-in-place** — one optional input in PIdentityCard's edit state under the name field: label mono `MOTTO · OPTIONAL · MAX 80` (new key `profile.edit.motto.label`; hint key `profile.edit.motto.hint` DE `Eine Zeile für den Steckbrief — z. B. „Man trifft mich in der Fahrrad-Werkstatt.“`), maxlength 80, included in the optimistic-save payload (extend the existing saveSeq flow — do NOT fork it).
- [ ] **Step 3: Read state** — motto renders as a serif-italic line under the handle line when set (matches Steckbrief typography, 13px ink-soft). Add the „Steckbrief drucken" outline `PBtn small` beside „Profil bearbeiten" (design had it from the start; gate `disabled` when banned like the edit button) → `href="/steckbrief"`.
- [ ] **Step 4: `steckbrief.astro`** — session-gated (no session → redirect `/login`); frontmatter: `getProfileMe(userId)` + `getTrustedBaseUrl(Astro.request)` for the public URL (`${base}/nachbarn/${handle}`; dev fallback origin fine) + `const qrSvg = await QRCode.toString(publicUrl, { type: 'svg', margin: 0, color: { dark: '#1b1a17', light: '#0000' } })`. Render the card per JSX inside a minimal print-preview shell (KioskLayout page="profile", short intro line + a `PBtn primary` „Drucken" → `onclick window.print()` via a tiny inline script) with cut marks + caption `SCHNITTMARKEN · A6 QUER · 148 × 105 MM`. Print CSS in a scoped `<style>`: `@media print { @page { size: 148mm 105mm; margin: 0 } }` (two explicit lengths — do NOT also write the `landscape` keyword, that combination is invalid CSS), hide everything but the card (`.steckbrief-only` pattern), card sized in mm for print. QR embedded via `<Fragment set:html={qrSvg} />` inside the 44px box (SAFE: string generated server-side by qrcode from our own URL — note this justification in a comment; never pass user input to set:html).
- [ ] **Step 5: Verify in browser**: set a motto via edit (persists, echoes, renders italic; 81 chars blocked client+server); clear motto → line disappears (card + Steckbrief); `/steckbrief` renders card + QR (decode check optional — visually a QR renders); playwright print-emulation (`media: print`) snapshot shows ONLY the card; logged-out `/steckbrief` → redirect `/login`. Profanity motto → 400. **Cleanup + residual 0.**
- [ ] **Step 6: `pnpm type-check`** → 29. **Commit** — `feat(profile): motto field + printable steckbrief route with QR`

---

### Task 7: E-mail change backend (token lib, 4 endpoints, 2 mail templates)

**Files:**
- Create: `src/lib/auth/emailChange.ts`, `src/lib/auth/sendEmailChangeEmails.ts`, `src/emails/EmailChangeVerify.tsx`, `src/emails/EmailChangeNotice.tsx`, `src/pages/api/profile/email-change/{start,confirm,resend,cancel}.ts`
- Modify: `scripts/create-auth-indexes.ts` (emailChangeTokens TTL + tokenHash indexes), `src/lib/profile/profileQuery.ts` (+`pendingEmail`), `src/lib/profile/profileShared.ts` (`ProfileMe.pendingEmail: string | null`)

**Interfaces:**
- Consumes: `src/lib/auth/emailVerify.ts` as the token-lib template (sha256 hash, 60s resend guard, latest-wins deleteMany, atomic findOneAndUpdate claim, rollback); `consumeRateLimit` (`src/lib/auth/rateLimit.ts`); bcrypt compare pattern (auth.config.ts:39-56); `sendVerifyEmail.ts` as the sender template (dev-log fallback when no RESEND_API_KEY); `getTrustedBaseUrl` (fail-closed).
- Produces:

```typescript
// src/lib/auth/emailChange.ts — collection emailChangeTokens
// { tokenHash, userId: ObjectId, newEmail: string, expiresAt, usedAt: null, createdAt }
export const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 min per design
export async function createEmailChangeToken(userId: string, newEmail: string): Promise<string | null>; // null = 60s resend guard
export async function confirmEmailChange(rawToken: string): Promise<'ok' | 'invalid' | 'email_taken'>;
export async function cancelEmailChange(userId: string): Promise<void>; // deleteMany tokens + $unset pendingEmail
```
- Endpoints (all under `/api/profile/email-change/`, session-gated except none — all four are session-gated EXCEPT `confirm`, which is sessionless like verify-email since the link may open elsewhere):
  - `POST start` `{ newEmail, currentPassword }` → 401 no session · 403 banned (`rejectIfBanned`) · 429 `throttled` on `consumeRateLimit('emailch:${userId}', 3, 3600000)` · 400 `invalid_password` (generic; bcrypt.compare against the user's hash) · 400 `invalid_email` (zod email) · 400 `email_unavailable` when a user already owns it (findOne with `collation: { locale: 'en', strength: 2 }` — the register.ts pattern; also when it equals the CURRENT email) · else: `$set pendingEmail` (normalized lowercase), create token, send verify mail to NEW address + notice mail to OLD (notice best-effort try/catch), 200 `{ ok: true }`. If `getTrustedBaseUrl` returns `''` (prod misconfig): do NOT send, do NOT set pendingEmail, 500 `config`.
  - `POST confirm` `{ token }` (sessionless) → `confirmEmailChange`: atomic claim; **re-check uniqueness at consume time** (same collation) — taken since request → `'email_taken'` (map to the same generic 400 `invalid_or_expired` externally — no oracle on a sessionless route); on ok: `$set { email: newEmail, emailVerified: true, updatedAt }` + `$unset pendingEmail` + delete sibling tokens. 200 `{ ok: true }` / 400 `{ error: 'invalid_or_expired' }`.
  - `POST resend` → session · 429 rate limit (`emailchr:${userId}`, 5, 3600000) · 400 `no_pending` when no `pendingEmail` · re-create token (60s guard → 429 `throttled`) + resend to pendingEmail. 
  - `POST cancel` → session · `cancelEmailChange(userId)` → 200 `{ ok: true }` (idempotent).
- Mail templates (react-email, mirror `VerifyEmail.tsx` structure/styles): `EmailChangeVerify({ verifyLink, newEmail })` — subject `Mahalle — neue E-Mail-Adresse bestätigen`, link to `${base}/confirm-email-change?token=${raw}`, 30-min note. `EmailChangeNotice({ newEmailMasked })` — to the OLD address, subject `Mahalle — E-Mail-Änderung angefordert`, body: change requested to a masked address (`m***@mailbox.org` — mask helper: first char + `***` + domain), „falls das nicht du warst, ändere dein Passwort" + link `${base}/profile`. No token in the notice.
- `getProfileMe` returns `pendingEmail ?? null` (own view only — public resolver never touches it).

- [ ] Steps: implement lib (clone emailVerify.ts, add `newEmail`) → senders → templates → endpoints → indexes script entries + run it → **curl matrix**: anon 401s; wrong password → `invalid_password` (and consumes the rate limit); own current email → `email_unavailable`; another tmp user's email → `email_unavailable`; fresh address → 200, `pendingEmail` set, token row exists, dev-log shows both mail links (no RESEND key locally → console fallback per sender template — capture from dev-server log); confirm with the logged raw token → 200, `users.email` swapped, `emailVerified: true`, `pendingEmail` gone, old token unusable (second confirm → 400); race case: set up two tmp users, A starts change to address X, B registers X before A confirms → A's confirm → 400 generic, A's email unchanged; cancel → pendingEmail cleared; resend guard 60s → 429; 4th start in an hour → 429. **Cleanup: tmp users, emailChangeTokens + emailVerifyTokens (ObjectId userIds), rateLimits rows (`baseKey` prefixes `emailch`), residual 0.**
- [ ] `pnpm type-check` → 29. **Commit** — `feat(profile): email-change backend — token lib, endpoints, mail templates`

---

### Task 8: E-mail change UI (Konto „ändern" → 3-stage panel, §08 banner, confirm page)

**Files:**
- Create: `src/components/profile/kiosk/PEmailChangePanel.svelte`, `src/pages/confirm-email-change.astro`
- Modify: `PKontoCard.svelte` (ändern link + §08 banner + panel mount), `ProfileInner.svelte` (pendingEmail threading), `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: Task 7 endpoints/contracts; design `EmailChangeFlow` §03 in `kiosk-profile-flows.jsx` (3 stages: 01 NEUE ADRESSE — new-email field + current-password field with hint „zur Sicherheit — nicht das neue" + CTA „Bestätigungslink senden"; 02 BESTÄTIGEN — ✉, „Link ist unterwegs an {addr}", 30-min single-use note, old-address-stays note, „erneut senden" + „abbrechen"; 03 GEWECHSELT — success card ✓ „Neue Adresse bestätigt.", sessions-stay note, „zurück zum Profil") + states-JSX §08 (warn PMiniBanner: „Wechsel zu {addr} wartet auf Bestätigung · erneut senden · abbrechen"); `AuthField`-style inputs (Plan A precedent: PIdentityCard's 3-way border field).
- Produces: PKontoCard E-MAIL row gains the underlined „ändern" action (per PKontoRow design anatomy — display 12.5/700, 2px ochre bottom border) toggling the in-card panel (stages 01↔02 driven by `pendingEmail`; stage 03 lives on the confirm PAGE, not in-card).

- [ ] **Step 1: i18n** — `profile.email.*` key block (both dicts, flows-JSX-verbatim): stage labels, field labels/hints, CTA, sent-note with `{addr}`, resend/cancel, banner text `profile.email.pending` („Wechsel zu {addr} wartet auf Bestätigung"), errors (`invalid_password` → generic wrong-password line on the password field; `email_unavailable` → „Diese Adresse kann nicht verwendet werden."; `throttled` → try-later line), konto action `profile.konto.change` („ändern").
- [ ] **Step 2: Panel** — stage 01 form (zod-light client checks: email format, password non-empty) → POST start; success → stage 02 (shows `pendingEmail`); stage 02 resend/cancel buttons → respective endpoints (toasts via `showSuccess`/`showError`); seq-guarded, all post-await writes behind the guard; errors mapped per key. §08 warn banner renders on the Konto card whenever `pendingEmail` is set AND the panel is closed (banner's „erneut senden"/„abbrechen" links call the same handlers). Panel state machine: `closed | form | sent`; opening with `pendingEmail` set jumps to `sent`.
- [ ] **Step 3: Confirm page** — `confirm-email-change.astro` mirrors the verify-email page pattern (sessionless; reads `?token=`, client island or tiny inline script POSTs to confirm — check `src/pages/verify-email.astro` and copy its mechanism exactly); success → stage-03 card per JSX („Neue Adresse bestätigt." + „zurück zum Profil" → `/profile`); failure → generic invalid/expired card with a link to `/profile`. New keys `profile.email.confirm.*`.
- [ ] **Step 4: Verify in browser** (tmp user): ändern → form → wrong password inline error → correct + fresh address → sent stage + §08 banner after closing; dev-log link → confirm page → success card → `/profile` shows NEW email in Konto row (fresh `/me` — reload) while the session stays logged in; cancel path clears banner; resend throttle → toast. Mobile 390. DE/EN. **Cleanup incl. rateLimits rows + residual 0.**
- [ ] **Step 5: `pnpm type-check`** → 29. **Commit** — `feat(profile): email-change flow UI, pending banner, confirm page`

---

### Task 9: Password change (endpoint + JWT other-device sign-out + panel UI)

**Files:**
- Create: `src/pages/api/profile/change-password.ts`, `src/components/profile/kiosk/PPasswordChangePanel.svelte`
- Modify: `auth.config.ts` (jwt callback), `PKontoCard.svelte` (PASSWORT „ändern" + panel), `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: `ChangePasswordSchema` (`src/schemas/auth.schema.ts:73-83`, verbatim — currentPassword min 1; newPassword 8-100 + upper/lower/digit regex; confirm refine); bcrypt patterns (compare + hash 12); `AuthStrength.svelte` (`src/components/auth/kiosk/primitives/AuthStrength.svelte` — props `{ score: 0|1|2|3|4 }`; score computed caller-side — copy the scorer from `AuthRegisterInner.svelte`, cite its lines in a comment); `signIn` from `auth-astro/client` (silent re-login: `await signIn('credentials', { email, password: newPassword, redirect: false })` then verify via `GET /api/auth/session` — the AuthLoginInner:58-68 mechanism); design flows-JSX §04 (current + new + AuthStrength + repeat + CTA „Passwort ändern"; note „alle anderen Geräte werden abgemeldet, dieses bleibt angemeldet."; „Vergessen?" → `/forgot-password`; wrong current → generic inline error on the FIRST field).
- Produces:
  - `POST /api/profile/change-password` `{ currentPassword, newPassword, confirmPassword }` → 401 · 403 banned · 429 (`consumeRateLimit('pwch:${userId}', 5, 3600000)`) · 400 zod issues · 400 `invalid_password` (generic, on bcrypt mismatch) · 400 `same_password` when new equals current (compare before hashing) · 200: `$set { password: bcrypt.hash(new, 12), passwordChangedAt: new Date(), updatedAt: ISO }`. The response returns `{ ok: true, email }` (email needed client-side for the silent re-login — it's the user's own session email, no leak).
  - **auth.config.ts jwt callback** (Decision 7) — replace the current callback with:

```typescript
async jwt({ token, user }) {
    if (user) {
        token.id = user.id;
        token.role = (user as any).role ?? 'user';
        token.emailVerified = (user as any).emailVerified === true;
        token.pwdCheckedAt = Date.now();
        return token;
    }
    // Other-device sign-out: invalidate tokens issued before passwordChangedAt.
    // DB read at most every 5 min per token (accepted ≤5-min lag, see profile CLAUDE.md).
    const PWD_RECHECK_MS = 5 * 60 * 1000;
    const last = typeof token.pwdCheckedAt === 'number' ? token.pwdCheckedAt : 0;
    if (Date.now() - last > PWD_RECHECK_MS && token.id) {
        try {
            const client = await clientPromise;
            const u = await client.db().collection('users').findOne(
                { _id: new ObjectId(String(token.id)) },
                { projection: { passwordChangedAt: 1 } }
            );
            if (u?.passwordChangedAt && typeof token.iat === 'number'
                && token.iat * 1000 < new Date(u.passwordChangedAt).getTime()) {
                return null; // token predates the change -> session invalidated
            }
            token.pwdCheckedAt = Date.now();
        } catch { /* DB hiccup: keep session, recheck next window */ }
    }
    return token;
},
```
  (`ObjectId` is a NEW import in auth.config.ts — `import { ObjectId } from "mongodb";`; `clientPromise` is already imported (line 4). Extend `src/types/next-auth.d.ts` JWT augmentation with `pwdCheckedAt?: number`. VERIFIED against installed `@auth/core`: the jwt callback type is `Awaitable<JWT | null>` (`node_modules/@auth/core/index.d.ts:285-331`) — returning null invalidates the session; `JWT.iat?: number` exists (`@auth/core/jwt.d.ts:79`).) **CAUTION — this touches login for the whole app**: verify normal login/session flows after the change; any surprise → BLOCKED.
- Panel per §04: 3 fields + AuthStrength under the new-password field + „Vergessen?" link; on 200 → immediately `signIn('credentials', { email, password: newPassword, redirect: false })`, verify session survives via `/api/auth/session`, then success toast (`showSuccess`) + note-copy about other devices; if the silent re-login unexpectedly fails, hard-redirect to `/login` (honest fallback — the session may die at the next JWT recheck otherwise).

- [ ] Steps: endpoint → jwt callback + type augmentation → i18n block `profile.pw.*` (flows-JSX-verbatim incl. the other-devices note) → panel → **verify**: (a) curl matrix (401/429/zod 400s/wrong current generic/same password/success + `passwordChangedAt` set); (b) browser: change password → stay logged in (navigate around, still authenticated) → login with OLD password fails, NEW works; (c) **two-device test**: playwright session A (default profile) + a second context/cookie-jar B logged in BEFORE the change; after A changes the password, B's session dies within the 5-min window — for the test, temporarily set `PWD_RECHECK_MS` low? NO — never commit test-tuned auth code; instead verify B's invalidation by asserting the jwt-callback logic with token.iat math in a unit-style scratchpad check AND by waiting out one real 5-min window in the browser (schedule the check; if impractical, document the wait was performed with timestamps in the report); (d) whole-app login smoke: fresh login, admin login unaffected. **Cleanup + residual 0.**
- [ ] `pnpm type-check` → 29. **Commit** — `feat(profile): password change with other-device sign-out via passwordChangedAt`

---

### Task 10: Delete account (modal, schedule/cancel endpoints, undo token + mail, banners)

**Files:**
- Create: `src/lib/auth/accountDeletion.ts`, `src/lib/auth/sendDeletionEmails.ts`, `src/emails/AccountDeletionScheduled.tsx`, `src/pages/api/profile/delete-account/{schedule,cancel}.ts`, `src/pages/api/auth/cancel-deletion.ts`, `src/pages/widerrufen.astro`, `src/components/profile/kiosk/PDeleteAccountModal.svelte`
- Modify: `PKontoCard.svelte` (Gefahrenzone + vorgemerkt banner), `profileQuery.ts`/`profileShared.ts` (`ProfileMe.deletionScheduledAt: string | null`), `scripts/create-auth-indexes.ts` (accountDeletionTokens indexes), `src/lib/kiosk-i18n.ts`

**Interfaces:**
- Consumes: design flows-JSX §05 (danger modal 560px, 5px danger top-rule, headline „Das ist ein *Abschied*, kein Umzug", 6-row consequences ledger ◍ keep / ✕ delete, confirm = type-handle + password, CTA disabled until handle matches, „endgültig löschen" danger btn); token-lib template; `AdmModalShell`-style focus trap is NOT reused (different subtree) — use the design's own modal + `<RemoveScroll>`-equivalent: Svelte subtree convention is manual — check how KioskReportModal handles scroll-lock and mirror it.
- Produces:
  - `src/lib/auth/accountDeletion.ts`: `GRACE_MS = 7*24*60*60*1000`; `scheduleDeletion(userId): Promise<{ deletionDate: Date, rawToken: string | null }>` ($set `deletionScheduledAt`, create `accountDeletionTokens` row `{ tokenHash, userId: ObjectId, expiresAt: deletionDate, usedAt: null, createdAt }`); `cancelDeletion(userId): Promise<void>` ($unset + deleteMany tokens, idempotent); `cancelDeletionWithToken(rawToken): Promise<boolean>` (atomic claim → cancelDeletion; token single-use).
  - `POST /api/profile/delete-account/schedule` `{ password, confirmHandle }` → 401 · 429 (`del:${userId}`, 3/h) · 400 `invalid_password` (bcrypt, generic) · 400 `handle_mismatch` (server re-verifies `confirmHandle === user.handle` — client gating is UX only) · 409 `already_scheduled` · 200 `{ ok: true, deletionScheduledAt }`; sends `AccountDeletionScheduled` mail (deletion date + undo link `${base}/widerrufen?token=${raw}`; fail-closed base handling: if no base in prod, still schedule but log — the in-app Widerrufen remains available; note this in the mail-send try/catch comment).
  - `POST /api/profile/delete-account/cancel` (session) → `cancelDeletion` → 200.
  - `POST /api/auth/cancel-deletion` `{ token }` (sessionless) → `cancelDeletionWithToken` → 200 / 400 `invalid_or_expired`. Page `widerrufen.astro` mirrors the confirm-email-change page mechanism (reads `?token=`, POSTs, success card „Löschung widerrufen — schön, dass du bleibst." / failure generic).
  - Login during grace: unchanged (authorize doesn't check `deletionScheduledAt`) — document.
  - Konto card: Gefahrenzone dashed danger box per JSX (label `GEFAHRENZONE`, row + `PBtn danger small` „löschen …") opening the modal; when `deletionScheduledAt` set: warn→danger banner on the Konto card (state §08 pattern, danger kind) with `tStr(profile.del.pending, { d: formatDdMm(...) })` + „Widerrufen" action → cancel endpoint; Gefahrenzone hidden while scheduled.
  - Modal per §05: consequences ledger rows from i18n keys `profile.del.ledger.{1..6}.what|fate` (JSX-verbatim: Beiträge & Kommentare → bleiben anonymisiert („Ehemaliges Mitglied") ◍ · Anzeigen → gelöscht ✕ · Erstellte Termine → bleiben anonymisiert, Zusagen entfernt ◍ · Gespeichertes & Zusagen → gelöscht ✕ · Name/E-Mail/Foto/Interessen → gelöscht ✕ · Moderations-Protokoll → anonymisierte Einträge (Nachweispflicht) ◍); handle-typing gate (`disabled` + 0.45 opacity until exact match), password field, cancel btn.

- [ ] Steps: lib → endpoints (+ indexes script + run) → mail template/sender → modal + Konto integration + banner + widerrufen page → i18n block `profile.del.*` → **verify** (tmp user): modal gates (wrong handle → CTA stays disabled; right handle + wrong password → 400 generic inline); schedule → 200, banner with date, Gefahrenzone hidden, mail link in dev-log; logout/login during grace works, banner persists; in-app Widerrufen → banner gone, Gefahrenzone back; re-schedule then use the MAIL token via `/widerrufen` → cancelled, second use of same token → 400; `already_scheduled` on double-schedule. **NO pipeline runs in this task — day-7 execution is Task 11.** **Cleanup: tmp user + accountDeletionTokens + rateLimits + residual 0.**
- [ ] `pnpm type-check` → 29. **Commit** — `feat(profile): delete-account scheduling with 7-day grace, undo via banner and mail token`

---

### Task 11: Deletion pipeline cron + docs + final full-pass

**Files:**
- Create: `src/pages/api/cron/process-deletions.ts`
- Modify: `src/lib/auth/accountDeletion.ts` (`runDeletionPipeline`), `vercel.json` (cron entry), `src/components/profile/kiosk/CLAUDE.md`, root `CLAUDE.md`, `README.md`

**Interfaces:**
- Consumes: cron auth pattern (`src/pages/api/news/fetch-daily.ts:321-330` — `Authorization: Bearer ${CRON_SECRET}`, GET); Decision 6 tombstone spec.
- Produces: `runDeletionPipeline(userId: string): Promise<{ ok: boolean, steps: Record<string, number> }>` in `accountDeletion.ts`, executing IN THIS ORDER (each step counted; continue on per-step errors but record them):
  1. listings: collect the user's listing ids → `deleteMany({ sellerId: userId })`; delete related `listingAuditTrail` rows for those ids; `flaggedContent` for those listings: `$unset { authorName, authorEmail }` (keep rows — Nachweispflicht).
  2. saved footprints: `savedPosts/savedNews/savedEvents.deleteMany({ userId })`; `listings.updateMany({ savedBy: userId }, { $pull: { savedBy: userId } })`.
  3. RSVPs: `events.updateMany({ $or: [{'rsvps.going': userId}, {'rsvps.maybe': userId}] }, { $pull: { 'rsvps.going': userId, 'rsvps.maybe': userId } })`. INTERPRETATION of the ledger's „Zusagen entfernt": the DELETED user's own RSVPs are pulled from all events; other users' RSVPs on the tombstone's created events are KEPT (that's their data, and the events remain). Documented in CLAUDE.md.
  4. content stays (topics/comments/announcements/recommendations/events/news authored) — rendered as „Ehemaliges Mitglied" via the tombstone (step 6). `flaggedContent` by `authorId: userId`: `$unset { authorName, authorEmail }`.
  5. tokens: `emailVerifyTokens/passwordResetTokens/emailChangeTokens/accountDeletionTokens.deleteMany({ userId: new ObjectId(userId) })`; `rateLimits.deleteMany({ baseKey: { $regex: userId } })` best-effort; `chronikCache.deleteOne({ userId: ObjectId })`.
  6. tombstone (Decision 6 verbatim): `$set { name: 'Ehemaliges Mitglied', anonymized: true, deletedAt: new Date(), updatedAt: ISO }` + `$unset { email: '', password: '', image: '', userPicture: '', hobbies: '', handle: '', verified: '', emailVerified: '', roleBadge: '', role: '', motto: '', pendingEmail: '', dankeCrossedAt: '', deletionScheduledAt: '' }`. KEEP `moderationStrikes/strikeHistory/isBanned/bannedAt/bannedReason/createdAt`.
  7. Cloudinary avatar destroy best-effort (derive public_id from the old userPicture URL if it matches `mahalle/profile/`; wrap in try/catch).
- `GET /api/cron/process-deletions` — Bearer CRON_SECRET (skip-if-unset mirrors fetch-daily); finds `users.find({ deletionScheduledAt: { $lte: new Date() }, anonymized: { $ne: true } })`, runs the pipeline per user, returns `{ processed, results }`. `vercel.json` crons gains `{ "path": "/api/cron/process-deletions", "schedule": "30 5 * * *" }`.

- [ ] **Step 1** pipeline + endpoint + vercel.json.
- [ ] **Step 2: E2E verify on the shared DB with EXTREME care** — tmp user ONLY (`tmp-del-pipeline@example.invalid`), fixtures: 1 topic + 1 comment on it + 1 listing + 1 event + 1 RSVP to a second tmp user's event + 1 saved post + avatar upload. Set `deletionScheduledAt` to the past via scratchpad script (never touch other users — filter by `_id`). Call the cron endpoint with the Bearer header → assert: listing GONE; savedPosts row GONE; RSVP pulled from tmp-B's event; topic + comment REMAIN and render as „Ehemaliges Mitglied" in the forum UI (browser check — populateAuthors resolves the tombstone name); `/nachbarn/id/<id>` → not-found card; login with the old credentials FAILS; user doc has no email/password/handle; flaggedContent rows keep `authorId` but no authorName/Email; second cron run → `processed: 0` for it (idempotent). **Then delete BOTH tmp users' remaining docs entirely (tombstone incl.) + all fixture rows — final residual scan across ALL collections (users, topics, comments, listings, events, news, savedPosts/News/Events, flaggedContent, emailVerifyTokens, emailChangeTokens, accountDeletionTokens, passwordResetTokens, rateLimits, chronikCache, listingAuditTrail) = 0.**
- [ ] **Step 3: Docs** — `src/components/profile/kiosk/CLAUDE.md`: new sections (public profile + gates + id-redirect, chronik resolver/cache/dankeCrossedAt, steckbrief/motto, email-change flow + token lib, password change + 5-min JWT recheck + silent re-login, deletion grace + tombstone spec + cron). Root `CLAUDE.md`: users bullet gains `motto`, `pendingEmail`, `passwordChangedAt`, `deletionScheduledAt`, `dankeCrossedAt`, `anonymized/deletedAt` (tombstone); collections list gains `emailChangeTokens`, `accountDeletionTokens`, `chronikCache`; env note: none new. `README.md`: Profile row → ✅ kiosk (complete — Plan A + B); feature bullet for public neighbor profiles + account lifecycle.
- [ ] **Step 4: Final full-pass** (browser, DE+EN, 1280+390): own profile complete (chronik, motto, Steckbrief btn), public profile via byline click, all three konto flows smoke, delete-schedule + widerrufen smoke. `pnpm type-check` → 29; `pnpm build` green + post-build bleed check on `/profile`, `/nachbarn/<handle>`, `/topics`.
- [ ] **Step 5: Commit** — `feat(profile): deletion pipeline cron + docs` (split docs into a second commit if cleaner).

---

## Plan self-review notes (already applied)

- Spec coverage vs PROFILE_SCOPING §03 (public), §06 (konto rows/actions), §08 flows §02-§05 → §03/§04/§05 here, §09 Chronik, §10 Steckbrief, §13 backend table, states §03/§08: Tasks 1-11. Plan A already covers everything else.
- `PublicProfile.image` added in Task 3/4 interface (avatar on the public card).
- Type consistency: `ChronikData/ChronikStop` (T1) consumed by T2/T4; `PublicProfile` (T3) by T4; token-lib names (`createEmailChangeToken/confirmEmailChange/cancelEmailChange`, `scheduleDeletion/cancelDeletion/cancelDeletionWithToken/runDeletionPipeline`) used consistently in their endpoint tasks.
- No placeholders: every endpoint has its full contract; jwt-callback and chronik resolver carry complete code; UI tasks point at exact JSX sections per the global JSX-as-source rule.
- Deliberate exclusions restated: no PMobileTopBar (Decision 9), no presence tracking (Chronik `active` from content timestamps), no un-ban/appeals UI (admin-pass out-of-scope), sessions stay after e-mail change (design), login allowed during grace (design).
