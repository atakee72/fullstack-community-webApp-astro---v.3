# Auth pass · Scoping & decisions

Batch 3 lead surface · Editorial Kiosk · designed Jun 25 2026, packaged Jun 26 2026.
Read `READMEFIRST.md` first. This doc is the full spec.

---

## 1 · Direction

Auth is the **brand-front** — the first thing a new neighbour sees and the thing a returning one
touches daily. So it gets the warmest, most "come in" treatment in the system: a centered
editorial card on paper, under a slim masthead ribbon, signed with a 4px accent top-rule.

- **Carved accent: OCHRE** (`#e8a53a` = `kiosk.color.ochre`). The one primary hue no other
  surface uses (Forum=wine, Calendar=teal, Marketplace=wine, Newsboard=ink). Auth is brand-front
  so it earns its own.
- **Layout:** centered card (`paperWarm`, ink border, 4px ochre top-rule, riso print shadow) on
  `paper`, under an `AuthMasthead` ribbon (logo + DE/EN switcher). Paper grain via the standard
  `paperGrainStyle`.
- **Voice:** direct, warm, local — "Willkommen zurück im Kiez", "Werde Teil vom Kiez". Same
  voice rules as the design system §08 (JA / NEIN list).

---

## 2 · Surfaces & files

| Surface | Component(s) | File |
|---|---|---|
| Splash | `AuthSplash`, `AuthSplashStill`, `AuthSplashSpec` | `kiosk-auth.jsx` |
| Login | `AuthLoginBody` → `AuthLoginDesktop` / `AuthLoginMobile` | `kiosk-auth.jsx` |
| Register | `AuthRegisterBody` → `AuthRegisterDesktop` / `AuthRegisterMobile` | `kiosk-auth.jsx` |
| Email verify | `AuthVerifyBody` → `AuthVerifyDesktop` / `AuthVerifyMobile` | `kiosk-auth.jsx` |
| Forgot password | `AuthForgotBody` (4 stages) → `AuthForgotDesktop` / `AuthForgotMobile` | `kiosk-auth-flows.jsx` |
| State matrix | `AuthStateMatrixDesktop` / `AuthStateMatrixMobile` | `kiosk-auth-flows.jsx` |

Shared atoms (in `kiosk-auth.jsx`): `AuthField`, `AuthStrength`, `AuthPrimaryBtn`, `AuthBanner`,
`AuthOrRule`, `AuthEyebrow`, `AuthHeadline`, `AuthAccentWord`, `AuthMonogram`, `AuthMasthead`,
`AuthLangToggle`, `KiezHeartbeat`, `AuthShellDesktop`, `AuthShellMobile`, `AuthCard`.

---

## 3 · Locked decisions

1. **Methods: email + password only.** No social, no magic-link assumed. *Confirm against the
   codebase before building* (README item 1).
2. **Identifier-first login: REJECTED.** The "email first → reveal password" pattern leaks
   account existence. Ship single-screen email + password. (README item 2.)
3. **Kiez-verification is NOT part of auth.** Register collects name · email · password only.
   The „Verifiziert im Kiez" badge is granted later by the team — register carries a footnote
   saying so. Matches the existing hardcoded-badge note from the Forum pass.
4. **No legal name.** Register asks for a **display name** ("wie sollen Nachbarn dich nennen?"),
   not a real name.
5. **Splash = the existing 56KB H.264 one-per-session video.** The CSS reveal in the mock is the
   fallback + reduced-motion path + timing spec, not a replacement. `sessionStorage "splashSeen"`
   gates once-per-session.
6. **Novel feature: `KiezHeartbeat`** — a "live im Kiez" strip (3 events · 12 posts · 18 µg/m³
   air) with a pulsing dot, on splash + login + register footers. Makes the door feel alive
   before you're in. Counts are illustrative in the mock; wire to real cheap aggregates if easy,
   otherwise a daily-cached snapshot is fine — it's ambient, not load-bearing.

---

## 4 · States (13 total)

### Sign-in · 6
| # | State | Treatment |
|---|---|---|
| 01 | Idle | empty fields, default |
| 02 | Wrong password | inline error on pw field, attempts-remaining copy |
| 03 | Email not found | inline error — **same external tone as 02** (see §5) |
| 04 | Unverified | warn banner + "resend link" action |
| 05 | Rate-limited | danger banner + disabled fields, countdown |
| 06 | Success | success banner, "redirecting…" |

### Register · 4
| # | State | Treatment |
|---|---|---|
| 07 | Email taken | danger banner + "sign in instead" |
| 08 | Weak password | strength meter at score 1 + inline error |
| 09 | Password mismatch | inline error on repeat field |
| 10 | Terms unchecked | blocked submit, checkbox + label turn danger |

### Verify · 3
| # | State | Treatment |
|---|---|---|
| 11 | Mail sent | await-confirm card with envelope |
| 12 | Resent | success note "new link sent — valid 30 min" |
| 13 | Confirmed | success check, "account active, redirecting…" |

Mobile carries a 7-tile vertical subset of the key states (`AuthStateMatrixMobile`).

---

## 5 · Security rules (must hold in the shipped product)

- **Anti-enumeration.** States 02 (wrong-pw) and 03 (email-not-found) show **finer copy in the
  matrix for design review only**. The **external** message the user actually sees must be the
  **same generic tone** for both, so an attacker can't probe which emails exist.
- **Forgot-password stage 02 confirms identically** for known and unknown addresses — no "we
  don't know that email."
- **Rate-limit after 5 failed sign-ins** → state 05. Countdown copy in the mock shows 4:32 as an
  example; back it with the real lockout window.
- **Reset token:** single-use, **30 minutes**, bound to the user hash.
- Both knobs are surfaced as tokens in `tokens-auth.css` (`--auth-ratelimit-attempts`,
  `--auth-reset-token-minutes`) for reference — the real enforcement is server-side, the tokens
  are just the single source of the numbers used in copy.

---

## 6 · Motion

See `motion-auth.css`. Two families: the **splash reveal** (carve-in → wordmark track-in →
tagline + heartbeat fade-up, production target ≈2.6s then auto-advance) and **door-is-alive
micro-motion** (heartbeat ping, caret blink, button spinner, strength-meter transition).

`prefers-reduced-motion: reduce` **skips the splash reveal** and shows the settled frame; the
heartbeat dot stays solid (no ping). The spinner is a functional progress signal — keep it, or
swap for a static "…" if you prefer.

---

## 7 · Open questions for CC

1. **Sign-in methods** — is it truly email + password only in the codebase? (Blocks whether we
   need an OAuth treatment.)
2. **`KiezHeartbeat` data source** — cheap live aggregates, or a daily-cached snapshot? Either is
   fine; it's ambient.
3. **Splash auto-advance target** — after the reveal, does it land on `/login` (logged-out) or
   straight into the feed (session present)? Confirm the routing.
4. **`KioskLayout` + `data-page="auth"`** — does the layout already emit a `data-page` attr? If
   not, add it so `tokens-auth.css` can scope the ochre accent (same as marketplace).
5. **Verify-email resend throttle** — is there an existing send-rate cap to reuse, or do we set
   one? (The mock implies a 30-min link TTL; resend cadence is separate.)

---

## 8 · Out of scope

Social/OAuth/magic-link (unless already present), identifier-first login (rejected), 2FA,
profile editing + account deletion (→ Profile surface), admin-specific login. DE + EN only.
