# READ ME FIRST — Auth pass (Batch 3 lead surface)

Hi Claude Code. This package is the **Editorial Kiosk** redesign of Mahalle's front door:
**splash · login · register · email-verify · forgot-password**, desktop + mobile, DE + EN,
with a full 13-state matrix.

This is the **5th surface** in the Kiosk rollout. Forum, Calendar, Marketplace and Newsboard
are already shipped in the codebase — the design system, paper-grain technique, fonts, riso
shadows and `--carved-accent` per-page variable are all live. **You are not bootstrapping a
design system here. You are applying the existing one to auth.**

---

## ⚠️ THREE THINGS TO CONFIRM WITH THE USER BEFORE YOU WRITE CODE

These were design-side assumptions. The user said "go with my opinionated scope," but each
touches the real codebase, so verify before building:

1. **Sign-in methods.** The mocks assume **email + password only** — no social login, no
   magic-link. Confirm that's all the codebase actually supports. (We deliberately did **not**
   design an OAuth row or a passwordless path. If the codebase has Google/GitHub/etc., flag it
   and we'll add a treatment — don't invent one.)
2. **Identifier-first login was considered and REJECTED.** The user asked about the
   "enter-email-first, then reveal password" pattern (Google/Slack style). We **dropped it** —
   it leaks account existence, which breaks the anti-enumeration rule we hold everywhere else.
   Ship the **single-screen email + password** login. Do not build the two-step variant.
3. **Splash + accent approval.** Confirm the user is happy with (a) the **ochre** carved accent
   for auth and (b) the **CSS-reveal splash** treatment standing in for the H.264 video, before
   you wire either.

If any answer differs from the above, stop and reconcile with the user — don't paper over it.

---

## What's in this folder

```
design_handoff_auth/
  READMEFIRST.md          ← you are here
  AUTH_SCOPING.md         ← the full spec: decisions, states, security rules, open questions
  Mahalle Redesign.html   ← self-contained bundle of the whole canvas (open in a browser to SEE the auth pass)
  tokens-auth.css         ← auth token extension (ochre accent, card anatomy, pw-meter ramp, security knobs)
  motion-auth.css         ← splash reveal + heartbeat keyframes + reduced-motion rules
  jsx/
    kiosk-system.jsx      ← the base design system (already in your context — included for reference)
    kiosk-auth.jsx        ← atoms + shells + splash + login + register + verify
    kiosk-auth-flows.jsx  ← forgot-password (4 stages) + the 13-state matrix
```

**The JSX is the source of truth for layout + copy.** Past surfaces went best when you read the
JSX directly rather than working from the CSS docs alone — same here. The `.css` files give you
the tokens and keyframes; the `.jsx` gives you exact structure, spacing and both-language strings.

---

## Step-by-step

**Step 0 — Look at it.** Open `Mahalle Redesign.html` in a browser. The top three canvas
sections are the auth pass: `◆ AUTH PASS`, `◆ AUTH · forgot-password flow`, `◆ AUTH · state
matrix`. The splash artboards animate live (they loop — production plays once).

**Step 1 — Confirm the three items above with the user.** Don't skip this.

**Step 2 — Read the scoping doc.** `AUTH_SCOPING.md` end to end. It has every locked decision,
the security rules (anti-enumeration, rate-limit, token TTL), and the open questions for you.

**Step 3 — Wire the tokens.** Add `tokens-auth.css` + `motion-auth.css` to the auth route group.
Confirm `KioskLayout` emits `data-page="auth"` on the auth pages (mirrors the
`data-page="marketplace"` pattern). If it doesn't, add it — `tokens-auth.css` scopes the ochre
accent on that attribute.

**Step 4 — Migrate auth pages onto `KioskLayout`.** Per the Forum handoff notes, the login page
currently uses `BaseLayout` and is therefore **grain-less**. Moving auth to `KioskLayout` brings
the paper grain + masthead with it. This is the intended change.

**Step 5 — Build the surfaces, in JSX dependency order:**
1. `kiosk-system.jsx` — already in your context; tokens + atoms.
2. `kiosk-auth.jsx` — atoms (`AuthField`, `AuthStrength`, `AuthPrimaryBtn`, `AuthBanner`,
   `KiezHeartbeat`), the two shells (`AuthShellDesktop` / `AuthShellMobile`), the splash
   (`AuthSplash` + spec stills), and login / register / verify bodies.
3. `kiosk-auth-flows.jsx` — forgot-password (`AuthForgotBody`, 4 stages) + the state matrix.

**Step 6 — Honour the state matrix.** 13 states (sign-in 6 · register 4 · verify 3). The
matrix artboard is the contract for inline errors, banners, loading and success. See
`AUTH_SCOPING.md` §States.

**Step 7 — Splash.** Keep the real **56KB H.264 one-per-session video**; the CSS reveal is the
**fallback / reduced-motion** path and the timing spec. Gate on `sessionStorage "splashSeen"`.
`prefers-reduced-motion` skips the reveal and shows the settled frame.

---

## Non-negotiables (don't regress these)

- **Ochre is auth's accent.** Forum=wine · Calendar=teal · Marketplace=wine · Newsboard=ink ·
  **Auth=ochre** (`#e8a53a`). It's the one primary hue no other surface claims.
- **Anti-enumeration.** Wrong-password and email-not-found return the **same generic external
  tone** — no "this email doesn't exist." The finer copy in the matrix is for **design review
  only**; the shipped external message must not distinguish the two. Forgot-password stage 02
  confirms **identically** for known and unknown addresses. (This is exactly why we dropped the
  identifier-first login — see item 2 up top.)
- **Rate-limit after 5 failed sign-ins.** Token for password reset is **single-use, 30 min,
  bound to the user hash.**
- **Kiez-verification stays OUT of auth.** Register asks only **name · email · password**. The
  „Verifiziert im Kiez" badge is granted later by the team — keep the footnote that says so.
- **Curly quotes in German strings.** Opener `„` (U+201E) + closer `"` (U+201C). Straight ASCII
  `"` breaks Babel and is wrong typography. This bit us on four prior surfaces — the JSX here is
  already clean; keep it that way if you touch the strings.
- **DE + EN parity.** Every screen has both. No Turkish (project ships DE/EN).

---

## Out of scope for this pass

- Social / OAuth / magic-link (unless the codebase already has it — then ask).
- Identifier-first / two-step login (rejected — see item 2).
- 2FA / TOTP.
- Account-deletion + profile editing (those belong to the **Profile** surface, still upcoming
  in Batch 3).
- Admin login differentiation (admins use the same door; role is read post-auth).

When in doubt about app behaviour, read from the `feature/dark-glass-redesign` branch.
