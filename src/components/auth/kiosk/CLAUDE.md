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

## Phase 1 scope / deferred
Phase 1 = login + register reskin ONLY. Deferred to later phases: splash,
`KiezHeartbeat`, email-verify (states 11–13), forgot-password backend, rate-limit
(state 05), unverified banner (state 04). The "Passwort vergessen?" link points to
`/forgot-password` (a Phase-2 route) and 404s until built.
