# Auth (kiosk) notes

Loaded when working in `src/components/auth/kiosk/`. The login + register front
door, migrated to the Editorial Kiosk system (Phase 1, June 2026). Plan:
`docs/superpowers/plans/2026-06-26-auth-kiosk-redesign-phase1.md`.

## Layout — AuthLayout, NOT KioskLayout
Auth pages use `src/layouts/AuthLayout.astro` (sibling to KioskLayout). KioskLayout
hardcodes the full app `KioskNav` (Forum/Calendar/… links), which is wrong on a
logged-out front door. AuthLayout gives the same `.k-paper-bg` grain + tokens +
`data-page="auth"` but only a slim masthead (monogram + wordmark + region +
`AuthLangToggle`). No KioskNav, no bottom mobile nav, no KioskFooter.

## Accent = ochre
`tokens.css` sets `[data-page="auth"] { --k-accent: var(--k-ochre); }` (#e8a53a) —
the one primary hue no other surface claims. The handoff's `tokens-auth.css` (old
`--ink`/`--carved-accent` naming) was NOT imported; the accent is wired via the
established `--k-*` page-accent pattern instead.

## Pieces
- `AuthLayout.astro` — shell + masthead.
- `AuthLangToggle.svelte` — DE/EN pills → `setLocale` (existing `kiosk-i18n` store).
- `primitives/` — `AuthField` (input + error/hint/show-toggle/success), `AuthPrimaryBtn`
  (ink fill + ochre print shadow + spinner), `AuthBanner` (warn/danger/success/info),
  `AuthStrength` (4-segment pw meter).
- `AuthLoginInner.svelte` / `AuthRegisterInner.svelte` — orchestrators, mounted
  `client:only="svelte"` on `/login` + `/register`.

## Backend reused untouched
Login → `signIn('credentials', { redirect:false })`; register → `POST /api/auth/register`
({name,email,password}) then auto-login. Client validation reuses `LoginSchema` +
a local password scorer mirroring `RegisterSchema` (min 8 + upper/lower/digit). No
changes to `auth.config.ts` or `register.ts`.

## Anti-enumeration
Login shows ONE generic error ("E-Mail oder Passwort stimmt nicht.") for both
wrong-password and unknown-email. Never distinguish them externally.

## Phase 2A — Splash + KiezHeartbeat (shipped, 2026-06-27)

Frontend-only, no backend. Both live in `AuthLayout` (login/register only).

- **`KiezHeartbeat.svelte`** — ambient "live im Kiez" strip in the AuthLayout footer
  (`client:load`). Fetches three EXISTING public GETs client-side with a 3s abort
  and per-stat graceful fallback (a failed stat is omitted; the strip always renders
  the live label): air = `/api/kiez-air` `overallLabel`; posts = `/api/news?limit=1&dateFrom=<today>`
  `pagination.total`; events = `/api/events` count of `startDate === today` (counted from
  the API's default page, so approximate if there are many events — acceptable for an
  ambient strip). Pulse dot keyframe is reduced-motion-gated. It is ambient, not
  load-bearing — never throws, never blocks paint.
- **`KioskSplash.astro`** — once-per-session splash overlay on the auth front door.
  Reuses `SplashScreen.astro`'s proven logic (`/LogoVideo.mp4`, dual-gate dismiss =
  video-ended AND window-load, 4s safety timeout) but paper-skinned for kiosk. Gate =
  `sessionStorage['mahalle-splash-shown']` — the SAME key as the global SplashScreen,
  so it is once-per-session app-wide. `prefers-reduced-motion` (or video-can't-play)
  → skip the video and show the CSS carve-in reveal fallback (ochre monogram + wordmark
  + tagline). Scoped to AuthLayout; extending to `KioskLayout` (the deferred "Kiosk
  variant TBD") is a future follow-up, not done here. **Gotcha for that follow-up:**
  `KioskSplash` and the global `SplashScreen.astro` share the `mahalle-splash-shown`
  sessionStorage key — they must NEVER co-mount on the same page, or both `is:inline`
  scripts fight over the flag and one overlay flashes then vanishes. (Safe today:
  AuthLayout never includes SplashScreen.)

Rate-limit (state 05) shipped — see the Rate-limit / hardening section.

## Forgot / reset password (shipped, 2026-06-27)

Net-new secure backend, kiosk front-end. Reuses the existing Resend + `src/emails/`
react-email pattern.

- **Token lib** `src/lib/auth/passwordReset.ts` (SERVER-ONLY): `createPasswordResetToken`
  (single-use, 30-min, latest-wins + 60s resend guard, returns RAW token),
  `findValidResetToken` (read-only, for the SSR page check), `resetPasswordWithToken`
  (atomic `findOneAndUpdate` claim → bcrypt-12 rewrite of `users.password`). Tokens are
  stored ONLY as `sha256(raw)` in the new **`passwordResetTokens`** collection
  (`{ tokenHash, userId, expiresAt, usedAt, createdAt }`); the raw token lives only in
  the emailed link.
- **Email** `src/lib/auth/sendResetEmail.ts` + `src/emails/PasswordResetEmail.tsx`.
  Reset link is built from the trusted `NEXTAUTH_URL` (not request Host header) and fails
  closed in production if unset (CWE-640 host-header-injection protection). Dev-log fallback:
  when no mail transport is configured (`isMailerConfigured()` in `src/lib/email/mailer.ts`
  — SMTP or Resend) it `console.log`s the link instead of sending (so the flow is testable
  in dev) — read the dev server stdout to get the link.
- **Endpoints**: `POST /api/auth/forgot-password` (ALWAYS generic 200 — anti-enumeration;
  issues token + sends/logs link for real users only); `POST /api/auth/reset-password`
  (`ResetPasswordSchema` validation; generic `invalid_or_expired` for bad/expired/used
  tokens). Does NOT touch `emailVerified` (that's the verify plan).
- **Pages**: `/forgot-password` (`AuthForgotInner` request→sent, anti-enum identical
  confirm) and `/reset-password?token=…` (`reset-password.astro` SSR-validates the token
  → `AuthResetInner` reset→done, or a hardcoded-DE "invalid link" card). The Phase-1 login
  "Passwort vergessen?" link now resolves.

## Email verify — soft gate (shipped, 2026-07-03)

SOFT gate: login and all features work unverified — verification only drives
the nag surfaces. Mirrors the forgot-password stack.

- **Token lib** `src/lib/auth/emailVerify.ts` (SERVER-ONLY): `createEmailVerifyToken`
  (single-use, **24h** TTL, latest-wins + 60s resend guard, returns RAW token),
  `findValidVerifyToken` (read-only, SSR page check), `verifyEmailWithToken`
  (atomic claim → sets `users.emailVerified: true`, rollback on write failure).
  Tokens stored ONLY as `sha256(raw)` in **`emailVerifyTokens`**
  (`{ tokenHash, userId, expiresAt, usedAt, createdAt }`).
- **Base URL**: emailed links use `getTrustedBaseUrl()` from `src/lib/auth/baseUrl.ts`
  (extracted from forgot-password; NEXTAUTH_URL, prod fail-closed, CWE-640).
- **Email** `src/lib/auth/sendVerifyEmail.ts` + `src/emails/VerifyEmail.tsx`;
  dev-log fallback when no mail transport is configured (`isMailerConfigured()`,
  `src/lib/email/mailer.ts`) — link in dev-server stdout.
- **Endpoints**: `POST /api/auth/verify-email` ({token}, sessionless — link may open
  in another browser; POST-not-GET so scanner prefetches can't burn tokens);
  `POST /api/auth/resend-verification` (session-gated own-account, 429 on 60s guard);
  `GET /api/auth/verification-status` (session-gated LIVE DB read — beats stale JWT).
- **Page** `/verify-email` (`AuthVerifyInner`): no token → "sent" card (session
  required, redirects `/login`; already-verified redirects `/`); `?token=` →
  SSR read-only validate, island auto-POSTs to consume → confirmed card →
  redirect `/` (or `/login` if sessionless). Invalid/expired → resend (if logged
  in) or login CTA. Register now lands here after auto-login.
- **Session flag**: `emailVerified` propagates `authorize → jwt → session` (like
  `role`; augmentation in `src/types/next-auth.d.ts` — `User` side is
  `boolean | Date | null` to stay assignable from AdapterUser). **Stale-JWT
  gotcha**: the flag snapshots at login; anything that must be CURRENT reads
  `/api/auth/verification-status`, not the session.
- **Banner** `VerifyEmailBanner.svelte`, mounted in `KioskLayout` for sessions
  with `emailVerified !== true`. Hidden until a live status check confirms
  unverified; dismiss = `sessionStorage['mahalle-verify-banner-dismissed']`
  (per browser session). Design deviations from the mock: 24h copy (not 30 min),
  no "E-Mail ändern" button (email-change feature doesn't exist).
- Existing `emailVerified: false` users got NO email blast — banner + self-resend only.

## Rate-limit / hardening — state 05 (shipped, 2026-07-04)

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
- **Login/register failure detection** probes `/api/auth/session` after
  `signIn()` — auth-astro's `signIn` (redirect:false) returns a raw Response
  with no `.error`; never reintroduce a `result?.error` check.
- **Known limit of the anti-enum posture**: `register`'s 409-on-taken-email is
  an unavoidable account-existence oracle (inherent to signup UX) — bounded by
  the 5/h/IP throttle. Login/forgot-password stay fully generic.

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
- **Known gap (accepted 2026-07-09)**: `/api/admin/*` write endpoints gate on
  `role === 'admin'` only, not `isBanned` — a striked-to-ban admin would keep
  admin powers (auto-ban never demotes `role`). Narrow by construction
  (admins are trusted superusers); revisit when the admin moderation
  redesign touches these endpoints.

## Phase 1 scope / deferred
Phase 1 = login + register reskin ONLY. Splash + `KiezHeartbeat` shipped in
Phase 2A (above). Forgot/reset password + email-verify soft gate + unverified banner
shipped in subsequent phases (see sections above). Rate-limit (state 05) shipped —
see the Rate-limit / hardening section.
The "Passwort vergessen?" link resolves (shipped 2026-06-27).
