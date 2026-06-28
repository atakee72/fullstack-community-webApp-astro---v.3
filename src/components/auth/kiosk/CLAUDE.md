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

Still deferred to later Phase-2 plans (each needs net-new secure backend): email-verify
(soft gate — nag, don't block; dev-log link fallback when no `RESEND_API_KEY`),
rate-limit (state 05).

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
  when `RESEND_API_KEY` is empty it `console.log`s the link instead of sending (so the flow
  is testable in dev) — read the dev server stdout to get the link.
- **Endpoints**: `POST /api/auth/forgot-password` (ALWAYS generic 200 — anti-enumeration;
  issues token + sends/logs link for real users only); `POST /api/auth/reset-password`
  (`ResetPasswordSchema` validation; generic `invalid_or_expired` for bad/expired/used
  tokens). Does NOT touch `emailVerified` (that's the verify plan).
- **Pages**: `/forgot-password` (`AuthForgotInner` request→sent, anti-enum identical
  confirm) and `/reset-password?token=…` (`reset-password.astro` SSR-validates the token
  → `AuthResetInner` reset→done, or a hardcoded-DE "invalid link" card). The Phase-1 login
  "Passwort vergessen?" link now resolves.

## Phase 1 scope / deferred
Phase 1 = login + register reskin ONLY. Splash + `KiezHeartbeat` shipped in
Phase 2A (above). Still deferred to later phases: email-verify (states 11–13),
forgot-password backend, rate-limit (state 05), unverified banner (state 04). The
"Passwort vergessen?" link points to `/forgot-password` (a Phase-2 route) and 404s
until built.
