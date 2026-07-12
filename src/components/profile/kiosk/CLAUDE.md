# Profile (kiosk) notes

Loaded lazily when Claude reads/edits files in `src/components/profile/kiosk/`
(or any subtree). The root `CLAUDE.md` keeps a pointer to this file. Also
relevant when working on `src/lib/profile/*` and `src/pages/api/profile/*` /
`src/pages/api/users/{update,profiles}.ts` — read this file directly when
touching those server-side pieces from outside this directory.

**Scope**: Plan A = own profile only (`/profile`, logged-in user viewing/
editing their own Meldebogen). Plan B (in progress, see bottom) = public
profile, konto-change flows, account deletion. Plan B Task 1 (`getChronik()`),
Task 2 (`PChronikStrip`), and Task 8 (e-mail change flow — see "E-mail
change" below) are done. The public-profile route itself is still deferred.

## Architecture

`src/pages/profile.astro` — thin shell: SSR session + `getProfileMe()` +
`getChronik()` (both fast paths, avoid a client round-trip on first paint),
passes `initialProfile` + `initialChronik` + `loggedIn` into
`ProfileInner.svelte` (`client:load` — SSR renders the shell, then hydrates;
no SEO stakes on this private, logged-in-only page).

`ProfileInner.svelte` is the **single orchestrator** — it owns every piece of
fetch/mutation state (`profile`, `standing`, `standingError`, `banned`) and
passes it down as props. Child cards are either genuinely stateful (mounted
exactly once, reflow via CSS) or presentational (mounted twice, once per
breakpoint — see "Mobile fold layout" below).

```
ProfileTitleBlock        — §-eyebrow + h1 ("Dein Meldebogen")
PIdentityCard            — avatar + name/handle/since + verified + stats +
                            hobbies + in-card edit (STATEFUL, single mount)
PModerationCard          — §02 standing display (stateless, `bare` prop)
PKontoCard                — §03 email/password rows + logout + "ändern" action
                            + §08 pending banner (stateless, `bare` prop)
PEmailChangePanel         — e-mail change stages 01/02 (STATEFUL, single
                            mount; see "E-mail change" below)
PChronikStrip             — Kiez-Chronik tenure strip (stateless, SSR-only
                            data, single mount; see "Kiez-Chronik strip" below)
PActivityLedger           — §01 Archiv cross-surface feed (STATEFUL, own
                            fetch, single mount)
PMobileFold (atoms/)       — accordion wrapper, mobile-only
```

## API contracts

All under `src/pages/api/profile/*` (session-gated, `getSession(request)`,
401 if absent) except `update` which lives at `/api/users/update.ts`
(pre-existing route, reused rather than duplicated under `/profile/`).

- **`GET /api/profile/me`** → `{ profile: ProfileMe }` (404 if the session's
  user record vanished). `ProfileMe` = `{ id, name, handle, email, image,
  hobbies, verified, memberSince (year), isBanned, stats: { posts, listings,
  events, danke } }`. `getProfileMe()` (`src/lib/profile/profileQuery.ts`)
  computes `stats` via parallel `countDocuments` + a `$group` danke-sum
  aggregate across topics/announcements/recommendations/events (listings
  excludes drafts: `status: { $ne: 'draft' }`).
- **`GET /api/profile/standing`** → `ProfileStanding` = `{ strikes, isBanned,
  bannedAt (ISO|null), rejected: StandingRejectedItem[] }` (max 20, newest
  first, sourced from `flaggedContent` where `reviewStatus: 'rejected'`).
  Drives both `PModerationCard` and the `banned` gate.
- **`GET /api/profile/activity`** → `ActivityPage` = `{ items:
  ActivityItem[], nextBefore }`, query params `filter` (alle/forum/markt/
  kalender/kurier/gespeichert) + `limit` + `before` (cursor). See Task 9's
  notes inline in `PActivityLedger.svelte` / `src/lib/profile/profileShared.ts`
  for the full per-kind field mapping — not duplicated here.
- **`POST /api/users/update`** → body `{ name, hobbies }`, returns the
  echoed `{ name, hobbies }` on success. Validates `PROFILE_NAME_REGEX`
  server-side too (client validates first to save the round-trip).
- **`POST /api/profile/avatar`** → `multipart/form-data` with an `image`
  field. Returns `{ url }` on success or `{ error: 'no_file' | 'bad_type' |
  'file_too_large' | 'upload_failed' | 'server_error' }`. Ban-gated via
  `rejectIfBanned()` (`src/lib/auth/banGuard.ts`) — banned accounts get a
  403 before the upload even starts. Uploads to Cloudinary folder
  `mahalle/profile`, `300x300 crop:fill gravity:face`, writes
  `users.userPicture`.
- **`POST /api/profile/email-change/{start,resend,cancel}`** + **`POST
  /api/profile/email-change/confirm`** (sessionless, no `getSession()` gate —
  see "E-mail change" below for the full flow). `start`/`resend`/`cancel` are
  session-gated like every other route in this list; `confirm` deliberately
  is not.

All shared types/constants (`ProfileMe`, `ProfileStanding`, `ActivityItem`,
`ActivityFilter`, `PROFILE_NAME_REGEX`, `HOBBY_MAX_COUNT`, `AVATAR_MAX_BYTES`,
...) live in `src/lib/profile/profileShared.ts` — a dependency-free module
(no `mongodb`, no `fs`) so it's safe to import from both server routes and
`client:*` Svelte islands. `src/lib/profile/profileQuery.ts` and
`src/lib/profile/handle.ts` are the two server/pure siblings: `profileQuery.ts`
imports `connectDB` (server-only), `handle.ts` is pure (imported by both
server code and the standalone backfill script).

## Handle system

- **Format**: `HANDLE_REGEX = /^[a-z0-9_]{3,20}$/`, generated by
  `slugifyHandle()` (`src/lib/profile/handle.ts`) — lowercases, NFD-strips
  diacritics (ö/ü/ä → o/u/a; a small `MANUAL_MAP` covers chars NFD can't
  decompose: ß→ss, ı→i, ø→o, æ→ae, œ→oe, đ→d, ł→l, þ→th — deliberately NOT
  ö→oe/ü→ue so one rule serves both German and Turkish names), collapses
  whitespace to `_`, strips anything outside `[a-z0-9_]`, clamps to 20 chars,
  falls back to `HANDLE_FALLBACK = 'nachbar'` if the result is under 3 chars.
- **Uniqueness**: `users_handle_unique` — a **partial** unique index
  (`{ handle: 1 }`, `partialFilterExpression: { handle: { $type: 'string' } }`,
  created by `scripts/backfill-user-handles.ts`). Partial, not a plain unique
  index, because a plain unique index on `handle` would make EVERY user
  missing a handle (i.e. `handle: undefined`) collide on the same implicit
  `null` key — the second registration without a handle would throw E11000
  and break prod registration outright. The partial filter only enforces
  uniqueness among documents where `handle` is actually a string.
- **Assignment paths**: (1) set at registration for new users going forward;
  (2) `scripts/backfill-user-handles.ts` — one-time batch backfill for
  pre-existing accounts; (3) **lazy self-heal** — `ensureHandle(userId)` in
  `profileQuery.ts`, called from `getProfileMe()` whenever a fetched user
  doc has no `handle` field. Generates a candidate via `slugifyHandle`, then
  loops appending `2`, `3`, ... on `E11000` (index collision with another
  user), using a `updateOne({ _id, handle: { $exists: false } })` guard so
  a concurrent request that already assigned a handle doesn't get
  clobbered — on `matchedCount === 0` it re-reads and returns the ACTUAL
  handle rather than the one it generated but never wrote.

## Optimistic-save pattern (PIdentityCard)

Same shape as the rest of the kiosk system (forum/marketplace mutations):
`handleSave()` validates client-side, immediately flips to read state with
an `optimisticOverride` value + a "speichert …" chip, then POSTs. Success
clears the override and calls `onSaved()` (parent updates the real
`profile`, which then matches what was already showing). Failure clears the
override too (falls back to the real `profile` values, not the rejected
edit) and returns to edit state with a danger banner + retry — `editName`/
`editHobbies` are left untouched so retry resends the identical payload.

**Task 8 lesson, load-bearing**: every guard variable an `$effect` reads to
decide whether to re-run (`saveSeq`-adjacent booleans, `standingRequested`
in `ProfileInner`, etc.) **must be declared with `$state`, not a plain
`let`**. A plain `let` mutated inside the effect's own body doesn't trigger
Svelte's dependency tracking, so resetting it (e.g. `retryStanding()`
setting `standingRequested = false`) silently fails to re-arm the effect —
the retry button does nothing. `saveSeq`/`standingSeq` themselves are
intentionally plain (non-reactive) counters used only for stale-response
guarding, not for effect re-arming — don't confuse the two categories.

## Avatar XHR flow

`PIdentityCard` runs its own 5-state machine (`idle → picking → uploading →
error → saved`), independent of the name/hobbies edit flow — the upload
panel renders under whichever header (read or edit state) is active, so the
rest of the card stays usable mid-upload. Uses raw `XMLHttpRequest` (not
`fetch`) specifically for `xhr.upload.onprogress` — real progress %, not a
fake bar. Re-opening the picker while an upload is in flight `abort()`s the
old XHR first (guards `avatarXhr !== xhr` in every callback so a
superseded/cancelled request can't clobber newer state).

On success: dispatches `window.dispatchEvent(new CustomEvent(
'profile:avatar-updated', { detail: { url } }))`. `KioskNav.svelte` listens
globally and stores it in a local `liveImage` `$state`, rendered in
preference to the `user.image` prop — this is how the nav avatar picture
updates immediately without a page reload.

**Accepted residual (documented, not a bug)**: the nav's `user` prop is a
**session snapshot** — it only re-derives on next login/SSR (JWT strategy,
see root CLAUDE.md's auth section). Other open tabs/windows, and this same
tab after a future full navigation that re-hydrates the island fresh, stay
on the old picture until the user logs in again or the session otherwise
refreshes. The `profile:avatar-updated` event only patches the *current*
nav island's in-memory state.

## Banned §09 binding

`ProfileInner` computes `banned = (standing?.isBanned ?? false) ||
(profile?.isBanned ?? false)` — the OR is intentional. `profile.isBanned`
comes from the SSR-fast `getProfileMe()` snapshot and is available
immediately (flips `banned` true before `standing` has even started
fetching), so `PIdentityCard`'s edit button disables right away rather than
having a window where a banned user can still click "bearbeiten". The §09
danger banner text prefers `standing.bannedAt` (exact date) but falls back
to an em-dash (`—`) if the standing fetch is still pending or failed — a
banned user is never left with a disabled edit button and zero explanation.
If the standing fetch itself fails, `standingError` swaps the §02 slot (both
the desktop card position AND the mobile fold) for a fallback line with a
retry link, rather than silently showing nothing.

## Mobile fold layout (Task 10)

Design source: `design/handoffs/design_handoff_profile/jsx/
kiosk-profile-public.jsx` (`ProfileOwnMobile` + `PMobileFold`).

Single `<div class="grid gap-[26px] items-start lg:grid-cols-[384px_1fr]">`
serves both breakpoints:

- **Desktop (`lg+`)**: explicit line placement — col 1 = identity →
  moderation → konto (`lg:row-start-{1,2,3}`), col 2 = archiv
  (`lg:row-start-1 lg:row-span-3`). Moderation/Konto desktop cards are
  `hidden lg:block`.
- **Mobile (`<lg`)**: the grid collapses to a single implicit column;
  `order-{1,2,3,4}` re-sequences it to identity → archiv → moderation fold
  → konto fold (matching `ProfileOwnMobile`, NOT the desktop DOM order).
  Moderation/Konto mobile folds are plain elements with `lg:hidden`
  (`PMobileFold` itself also carries `lg:hidden` internally, belt-and-braces).

**Why `PIdentityCard`/`PActivityLedger` are single-mounted but
`PModerationCard`/`PKontoCard` are double-mounted**: the former hold real
internal state (edit mode, avatar XHR, their own `fetch` for the ledger) —
mounting twice would split that state across two independent islands and
desync them (e.g. editing on the visible mobile fold wouldn't reflect on a
hidden desktop copy, or worse, both would independently fire the ledger's
mount-time fetch). They're mounted once and simply move around via CSS. The
latter two are pure props-in/markup-out — `standing` and `profile.email`
live in `ProfileInner`, both instances render off the *same* upstream state,
so duplicate mounts never disagree. Both accept a `bare` prop: `bare=false`
(default, desktop) renders the full `<PCard><PCardHead n="0X" .../>...`
shell; `bare=true` (mobile) skips the outer `PCard`/`PCardHead` — the
enclosing `PMobileFold` already supplies the card chrome + a title — reusing
a `{#snippet body()}` block internally so the actual content markup isn't
forked.

**Moderation fold accent tracks the same clean/warn logic as the desktop
card** — `ProfileInner`'s `modAccent` derived (`success` when
`strikes === 0 && rejected.length === 0`, else `warn`) is threaded into both
the desktop `PModerationCard`'s own internal accent AND the mobile fold's
`accent` prop. The design mock hardcodes `kiosk.color.warn` on `PMobileFold`
because its demo data always shows the rejected-content anatomy — a real
clean account must still show green on mobile, matching desktop.

**`PMobileFold`** (`atoms/PMobileFold.svelte`) is a thin presentational
accordion: `{ title, accent?, open?, badge?: Snippet, children?: Snippet }`.
`open` seeds a local `$state` (intentionally captures only the initial
value — Svelte's `state_referenced_locally` compiler warning on this line
is expected/benign, not a bug). Toggling is a local click handler, no
external wiring. Header is a real `<button>` (native `aria-expanded`
semantics, ≥44px tall via `min-height: 44px` + `padding: 13px 16px`).

**Grid item overflow gotcha (real bug hit + fixed during Task 10)**: every
direct child of the grid carries `min-w-0`. Without it, CSS Grid's default
"automatic minimum size" on a grid item is its content's min-content width
— below `lg` there's no explicit `grid-template-columns`, so the single
implicit column's width is the MAX of every item's min-content contribution.
One non-wrapping row deep inside any card (e.g. the identity card's 4-column
stat grid, or a fold's flex header) can force the *entire column* — and
therefore every card in it, including ones with no wide content of their
own — to blow out past the viewport width. Because `html`/`body` use
`overflow-x: clip` (see root CLAUDE.md's sticky-positioning note), this
doesn't show up as a horizontal scrollbar — it's silently, invisibly
clipped, cropping real content (e.g. the 4th "danke" stat column, or the
tail end of filter chip labels) with no visual error signal short of
measuring `getBoundingClientRect()` or diffing `scrollWidth`. `min-w-0`
resets the automatic minimum to 0 so grid items respect the container's
actual available width. If this profile page (or any other kiosk page that
adopts an `order-*`-reordered single-column-below-`lg` grid) starts clipping
content on mobile with no visible cause, check for missing `min-w-0` first.

## E-mail change (Plan B, Task 8)

Design source: `kiosk-profile-flows.jsx` §03 `EmailChangeFlow` (stages 01
NEUE ADRESSE / 02 BESTÄTIGEN — stage 03 GEWECHSELT lives on the confirm
PAGE, not in-card) + `kiosk-profile-states.jsx` §08 (pending banner).

**Layout decision (load-bearing)**: `PEmailChangePanel` is mounted **ONCE**
by `ProfileInner`, gated by a local `emailPanelOpen` boolean — it is
deliberately NOT mounted inside `PKontoCard` even though the "ändern" action
that opens it lives there. Reasoning: `PKontoCard` is double-mounted
(desktop card + mobile fold, see "Mobile fold layout" above) because it's
pure props-in/markup-out — both instances safely render off the same
upstream `standing`/`profile` state. `PEmailChangePanel` is different: it
holds real local state (the new-email/password input values, per-field
focus/error state). Mounting a stateful form twice would let the two
instances diverge (e.g. typing on the mobile fold's copy while the desktop
copy — hidden via `hidden lg:block`, but still MOUNTED and holding its own
independent Svelte state — sits with empty fields; whichever one becomes
visible on a breakpoint change shows stale/wrong content). Single-mounting
sidesteps this entirely, matching the same reasoning that already governs
`PIdentityCard`/`PActivityLedger` vs `PModerationCard`/`PKontoCard`.

The single mount is placed in its **own grid slot**, directly below the
Konto card/fold on both breakpoints — `lg:col-start-1 lg:row-start-4` on
desktop (row 4, under Konto's row 3; the right column's `lg:row-span-3` only
reserves rows 1–3 so this never forces Archiv taller) and `order-5` on
mobile (after Konto's `order-4` fold). This mirrors how the flows-JSX
presents 01/02 as their own stage cards rather than content living inside
the Konto card's body.

**State flow**: `ProfileInner` owns `emailPanelOpen` (mount gate) plus three
handlers passed down to BOTH `PKontoCard` (for the §08 banner's
"erneut senden"/"abbrechen" links) and `PEmailChangePanel` (for stage 02's
identical links) — `resendEmailChange()` and `cancelEmailChange()` are the
literal same function references in both places, so the two surfaces can
never drift in behavior. `cancelEmailChange()` also closes the panel
(`emailPanelOpen = false`) since there's nothing left to show once
`pendingEmail` is cleared. `handleEmailStarted(newEmail)` (start-success
callback, panel-only) sets `profile.pendingEmail` immediately — no refetch
needed, mirrors `PIdentityCard`'s `onSaved()` optimistic-echo pattern.
`PEmailChangePanel`'s own stage (`'form' | 'sent'`) is seeded ONCE from the
`pendingEmail` prop at mount time (`pendingEmail ? 'sent' : 'form'`) —
opening the panel while a change is already pending jumps straight to stage
02, per the brief.

**Confirm page** (`src/pages/confirm-email-change.astro` +
`ConfirmEmailChangeInner.svelte`) is sessionless, mirroring
`verify-email.astro`/`AuthVerifyInner.svelte` exactly: reads `?token=`,
POSTs to `/api/profile/email-change/confirm` on mount, shows a
success/failure card. Two differences from the verify-email precedent: (1)
no "sent" stage here — the panel already covers that, so the page only ever
shows confirming → confirmed | invalid; (2) `confirmEmailChange()`
(`src/lib/auth/emailChange.ts`) now returns `{ status: 'ok'; email: string
}` instead of a bare `'ok'` string — the sessionless page has no other way
to know which address just went live, and the design requires showing it
("Login now uses {addr}."). Not a new information-disclosure surface: the
caller already had to possess the correct 256-bit token (delivered only to
the new address's inbox) to reach that branch. `confirm.ts`'s response body
gained an `email` field on success accordingly (`{ ok: true, email }`).

**Reconciliation fallback**: `ProfileInner` listens for `visibilitychange`
and, if `profile.pendingEmail` is set when the tab regains focus,
re-fetches `/api/profile/me` and merges `email`/`pendingEmail` back in
(seq-guarded like every other fetch in this file). Covers the case where the
confirm link was opened in a DIFFERENT tab/browser (e.g. a phone's mail app)
while this tab still shows the pending banner — without it the banner would
linger until the next full page load.

## Archiv feed (pointer)

Full field-by-field notes (per-kind hrefs, `zusage` dated by event
`startDate` not creation date, `savedBy`-view's no-exact-timestamp
approximation, `gespeichert` filter excluded from `alle`) live inline in
`PActivityLedger.svelte` and `src/lib/profile/profileShared.ts` — not
duplicated here to avoid drift between two copies.

## Kiez-Chronik strip (Plan B, Task 2)

`PChronikStrip.svelte` — compact derived tenure timeline. Pure
props-in/markup-out (`{ chronik: ChronikData }`), no fetch of its own — data
comes from `getChronik(userId)` (`src/lib/profile/chronik.ts`, Task 1,
SERVER-ONLY — cached 24h in `chronikCache`) via `profile.astro`'s
`initialChronik` prop. Same component/contract is meant to be reused
unmodified by the public-profile route once that ships (Task 4) — the
Chronik carries no private data (see `chronik.ts`'s own comments).

- **Mount gate**: `ProfileInner`'s `showChronik = initialChronik.stops.length
  > 0` — belt-and-braces; `chronik.ts`'s contract always returns at least
  `dabei` + `heute`, but the strip renders nothing rather than an empty
  shell if that ever changes.
- **Layout**: nested inside the SAME single-mount right-column div as
  `PActivityLedger` (`display: flex; flex-direction: column`), not given its
  own grid row-line placement. Placing it in its own `lg:row-start-1` cell
  next to the left column's identity-card row would make that shared grid
  row as tall as the (much taller) identity card, leaving a dead gap between
  the short Chronik strip and Archiv below it — the nested-flex wrapper
  sidesteps that entirely and lets the two cards sit flush, matching
  `kiosk-profile.jsx`'s `ProfileOwnDesktop` (which nests both cards in the
  same right-hand flex column in the design mock). On mobile the single
  `order-2` slot this wrapper occupies already lands directly after the
  identity card (`order-1`) and before the moderation/konto folds
  (`order-3`/`order-4`) — Chronik-then-Archiv inside it satisfies "Chronik
  before Archiv" for free, no extra `order-*` needed.
- **Dot color rule** (`kiosk-profile-novel.jsx`'s `ChronikMilestone`, NOT the
  simplified strip-level JSX which predates it): stop index 0 (always
  `dabei` per `chronik.ts`'s ordering) = wine; `kind === 'heute'` = ochre;
  every stop in between = ink.
  `.prof-chronik-now` (→ `profPulse` keyframe, `src/styles/profile.css`) is
  applied ONLY when the `heute` stop's `active` flag is true (real content in
  the last 7 days) — an inactive `heute` dot is still ochre, just static.
  Reduced motion (`@media (prefers-reduced-motion: reduce)`) drops the
  animation globally regardless of `active`.
- **Date rendering**: the `dabei` stop shows the YEAR ONLY
  (`new Date(iso).getFullYear()`); middle stops (`erstesThema`,
  `ersteAnzeige`, `ersterTermin`, `danke100`) show `MMM yyyy` via
  `Intl.DateTimeFormat($locale === 'de' ? 'de-DE' : 'en-GB', { month:
  'short', year: 'numeric' })`; the `heute` stop's year-slot shows the
  literal i18n string (`profile.chronik.heute`: DE „heute" / EN "today"),
  not a date. Labels underneath each dot are resolved from
  `profile.chronik.stop.<kind>` — kept as i18n keys rather than resolver
  output so the derived-data layer (`chronik.ts`) stays copy-free.

## Plan B — deferred (out of scope for Plan A, do not build without a new brief)

- Public profile route `/nachbarn/[handle]` (neighbor view — trimmed
  Meldebogen: no email, no saved items, no moderation, no settings; entry
  point is clicking an author name in Forum/Market/Calendar). Task 4 mounts
  `PChronikStrip` (already built, see above) on this route once it ships.
- `Steckbrief` + motto (the "Bearbeiten" sibling button in
  `ProfileOwnMobile`'s identity card footer).
- Konto "ändern" action flow for PASSWORT (Task 9 — email's own flow shipped
  in Task 8, see "E-mail change" above; the PASSWORT row stays display-only
  until then).
- Gefahrenzone / account deletion.
- States §03 (loading→ready transition detail) from `kiosk-profile-states.jsx`
  beyond what §01/§02/§04–07/§09/§10 already cover. (§08 shipped in Task 8.)
- `publicView` prop on `PActivityLedger`/`PActivityRowMobile` has no real
  consumer yet — it's plumbed through (`publicView={false}` default) for
  when the public profile route ships, so the ledger doesn't need
  retrofitting then.
